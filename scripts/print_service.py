"""
Sistema de Impressão de Pedidos - v2.0
Lê pedidos pendentes do banco e envia para impressora térmica local.

Configuração via arquivo config.ini na mesma pasta do executável.

INSTALAÇÃO:
1. pip install requests pywin32
2. Crie o arquivo config.ini (veja config.ini.example)
3. Execute: python print_service.py

CRIAR EXECUTÁVEL:
pip install pyinstaller
pyinstaller --onefile --name "ImpressoraPedidos" print_service.py
"""

import requests
import time
import sys
import os
import configparser
from datetime import datetime
from typing import Optional, List, Dict

# Tenta importar bibliotecas do Windows
try:
    import win32print
except ImportError:
    win32print = None


# ============ CARREGAR CONFIGURAÇÃO ============
def load_config():
    """Carrega configurações do arquivo config.ini"""
    config = configparser.ConfigParser()
    
    # Caminho do config.ini (mesma pasta do executável)
    if getattr(sys, 'frozen', False):
        # Rodando como .exe
        base_path = os.path.dirname(sys.executable)
    else:
        # Rodando como script Python
        base_path = os.path.dirname(os.path.abspath(__file__))
    
    config_path = os.path.join(base_path, 'config.ini')
    
    if not os.path.exists(config_path):
        print("=" * 50)
        print("[ERRO] Arquivo 'config.ini' não encontrado!")
        print(f"Esperado em: {config_path}")
        print("")
        print("Crie o arquivo com o seguinte conteúdo:")
        print("-" * 50)
        print("""[GERAL]
SUPABASE_URL = https://ueddnccouuevidwrcjaa.supabase.co
SUPABASE_KEY = sua_anon_key_aqui

[RESTAURANTE]
ID = seu_restaurant_id_aqui
IMPRESSORA = 

[SISTEMA]
INTERVALO = 5
LARGURA_PAPEL = 48""")
        print("-" * 50)
        input("Pressione Enter para sair...")
        sys.exit(1)
    
    config.read(config_path, encoding='utf-8')
    return config


# Carrega configuração
cfg = load_config()

# Variáveis carregadas do arquivo
SUPABASE_URL = cfg.get('GERAL', 'SUPABASE_URL').strip()
SUPABASE_KEY = cfg.get('GERAL', 'SUPABASE_KEY').strip()
RESTAURANT_ID = cfg.get('RESTAURANTE', 'ID').strip()
PRINTER_NAME = cfg.get('RESTAURANTE', 'IMPRESSORA', fallback='').strip() or None
POLL_INTERVAL = cfg.getint('SISTEMA', 'INTERVALO', fallback=5)
PAPER_WIDTH = cfg.getint('SISTEMA', 'LARGURA_PAPEL', fallback=48)

# Se não especificou impressora, usa a padrão do Windows
if not PRINTER_NAME and win32print:
    try:
        PRINTER_NAME = win32print.GetDefaultPrinter()
    except Exception:
        PRINTER_NAME = None


# ============ FUNÇÕES DE API ============
def get_pending_orders() -> List[Dict]:
    """Busca pedidos pendentes via API REST do Supabase."""
    # Busca pedidos com print_status = 'pending'
    endpoint = f"{SUPABASE_URL}/rest/v1/orders"
    
    params = {
        "select": "*,order_items(*)",
        "restaurant_id": f"eq.{RESTAURANT_ID}",
        "print_status": "eq.pending",
        "order": "created_at.asc"
    }
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(endpoint, params=params, headers=headers, timeout=15)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        print("[AVISO] Timeout na conexão. Tentando novamente...")
        return []
    except requests.exceptions.ConnectionError:
        print("[AVISO] Sem conexão com a internet. Verificando...")
        return []
    except requests.RequestException as e:
        print(f"[ERRO] Falha na requisição: {e}")
        return []


def mark_order_printed(order_id: str) -> bool:
    """Atualiza o status do pedido para 'printed'."""
    endpoint = f"{SUPABASE_URL}/rest/v1/orders"
    
    params = {"id": f"eq.{order_id}"}
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    data = {
        "print_status": "printed",
        "printed_at": datetime.utcnow().isoformat() + "Z",
        "print_count": 1
    }
    
    try:
        response = requests.patch(endpoint, params=params, json=data, headers=headers, timeout=10)
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"[ERRO] Falha ao atualizar status: {e}")
        return False


def log_print_event(order: Dict, event_type: str, status: str, error_message: str = None) -> bool:
    """Registra um log de impressão no banco de dados."""
    endpoint = f"{SUPABASE_URL}/rest/v1/print_logs"
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    items = order.get('order_items', [])
    
    data = {
        "restaurant_id": RESTAURANT_ID,
        "order_id": order.get('id'),
        "event_type": event_type,
        "status": status,
        "printer_name": PRINTER_NAME,
        "error_message": error_message,
        "order_number": order.get('id', '')[:8],
        "items_count": len(items) if isinstance(items, list) else 0
    }
    
    try:
        response = requests.post(endpoint, json=data, headers=headers, timeout=10)
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"[AVISO] Falha ao registrar log: {e}")
        return False


# ============ FORMATAÇÃO DO RECIBO ============
def format_receipt(order: Dict) -> str:
    """Formata o pedido para impressão térmica."""
    w = PAPER_WIDTH
    lines = []
    
    # Cabeçalho
    lines.append("=" * w)
    lines.append("NOVO PEDIDO".center(w))
    lines.append("=" * w)
    
    # Data/Hora
    dt = order.get('created_at', '')
    if dt:
        try:
            parsed_dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
            lines.append(parsed_dt.strftime("%d/%m/%Y %H:%M").center(w))
        except Exception:
            pass
    
    lines.append("")
    
    # Tipo de pedido
    order_type = order.get('order_type', 'table')
    type_labels = {
        'table': 'MESA',
        'delivery': 'ENTREGA',
        'takeout': 'RETIRADA',
        'counter': 'BALCAO'
    }
    lines.append(f"TIPO: {type_labels.get(order_type, order_type.upper())}")
    
    # Garçom ou atendente
    waiter_name = order.get('waiter_name')
    created_by_name = order.get('created_by_name')
    if waiter_name:
        lines.append(f"GARCOM: {waiter_name}")
    elif created_by_name:
        lines.append(f"ATENDENTE: {created_by_name}")
    
    # Mesa (se aplicável)
    table_id = order.get('table_id')
    if table_id and order_type == 'table':
        lines.append(f"MESA ID: {table_id[:8]}...")
    
    # Cliente
    customer_name = order.get('customer_name')
    if customer_name:
        lines.append(f"CLIENTE: {customer_name}")
    
    # Endereço de entrega
    if order_type == 'delivery':
        delivery_address = order.get('delivery_address')
        delivery_phone = order.get('delivery_phone')
        if delivery_address:
            lines.append(f"ENDERECO: {delivery_address}")
        if delivery_phone:
            lines.append(f"TELEFONE: {delivery_phone}")
    
    lines.append("")
    lines.append("-" * w)
    lines.append("ITENS:".center(w))
    lines.append("-" * w)
    
    # Itens do pedido
    items = order.get('order_items', [])
    if not items:
        lines.append("(Sem itens)")
    else:
        for item in items:
            qty = item.get('quantity', 1)
            name = item.get('product_name', 'Item')
            price = float(item.get('product_price', 0))
            notes = item.get('notes', '')
            
            # Linha do item
            item_line = f"{qty}x {name}"
            price_str = f"R${price * qty:.2f}"
            
            # Ajusta para caber na largura
            if len(item_line) + len(price_str) + 1 <= w:
                spaces = w - len(item_line) - len(price_str)
                lines.append(f"{item_line}{' ' * spaces}{price_str}")
            else:
                lines.append(item_line)
                lines.append(price_str.rjust(w))
            
            # Observações do item
            if notes:
                obs_lines = [notes[i:i+w-4] for i in range(0, len(notes), w-4)]
                for obs_line in obs_lines:
                    lines.append(f"  > {obs_line}")
    
    lines.append("-" * w)
    
    # Taxa de entrega
    delivery_fee = float(order.get('delivery_fee', 0) or 0)
    if delivery_fee > 0:
        lines.append(f"Taxa Entrega: R${delivery_fee:.2f}".rjust(w))
    
    # Total
    total = float(order.get('total', 0) or 0)
    lines.append("")
    lines.append(("TOTAL: R$ %.2f" % total).rjust(w))
    lines.append("")
    
    # Observações gerais
    notes = order.get('notes')
    if notes:
        lines.append("-" * w)
        lines.append("OBSERVACOES:")
        obs_lines = [notes[i:i+w] for i in range(0, len(notes), w)]
        for obs_line in obs_lines:
            lines.append(obs_line)
    
    lines.append("=" * w)
    lines.append("")
    lines.append("")
    lines.append("")  # Espaço para corte
    
    return "\n".join(lines)


# ============ IMPRESSÃO ============
def print_raw(text: str) -> bool:
    """Envia texto para a impressora do Windows."""
    if not win32print:
        print(">>> SIMULACAO (win32print não instalado) <<<")
        print("-" * 40)
        print(text)
        print("-" * 40)
        return True
    
    if not PRINTER_NAME:
        print("[ERRO] Nenhuma impressora configurada ou detectada!")
        return False
    
    try:
        hprinter = win32print.OpenPrinter(PRINTER_NAME)
        try:
            job = win32print.StartDocPrinter(hprinter, 1, ("Pedido", None, "RAW"))
            try:
                win32print.StartPagePrinter(hprinter)
                # cp850 é o padrão para acentos em impressoras térmicas brasileiras
                win32print.WritePrinter(hprinter, text.encode('cp850', errors='replace'))
                win32print.EndPagePrinter(hprinter)
            finally:
                win32print.EndDocPrinter(hprinter)
        finally:
            win32print.ClosePrinter(hprinter)
        return True
    except Exception as e:
        print(f"[ERRO IMPRESSORA] {e}")
        return False


# ============ LOOP PRINCIPAL ============
def main():
    """Loop principal do serviço de impressão."""
    print("=" * 50)
    print(" SISTEMA DE IMPRESSAO DE PEDIDOS v2.0")
    print("=" * 50)
    print(f" Restaurante: {RESTAURANT_ID[:20]}..." if len(RESTAURANT_ID) > 20 else f" Restaurante: {RESTAURANT_ID}")
    print(f" Impressora:  {PRINTER_NAME or 'SIMULACAO'}")
    print(f" Intervalo:   {POLL_INTERVAL}s")
    print("=" * 50)
    print(" Aguardando pedidos... (Ctrl+C para sair)")
    print("")
    
    consecutive_errors = 0
    max_errors = 10
    
    while True:
        try:
            orders = get_pending_orders()
            
            if orders:
                print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Encontrados {len(orders)} pedidos pendentes")
                
                for order in orders:
                    order_id = order.get('id', 'N/A')
                    customer = order.get('customer_name', 'Cliente')
                    
                    print(f"  > Imprimindo pedido {order_id[:8]}... ({customer})")
                    
                    texto = format_receipt(order)
                    
                    if print_raw(texto):
                        if mark_order_printed(order_id):
                            log_print_event(order, 'print', 'success')
                            print(f"    [OK] Impresso e marcado com sucesso")
                        else:
                            log_print_event(order, 'print', 'success', 'Falha ao atualizar status no banco')
                            print(f"    [AVISO] Impresso, mas falhou ao marcar no banco")
                    else:
                        log_print_event(order, 'print', 'failed', 'Falha na impressão')
                        print(f"    [ERRO] Falha na impressão")
                
                consecutive_errors = 0
            else:
                # Mostra ponto a cada verificação para indicar que está rodando
                print(".", end="", flush=True)
                consecutive_errors = 0
            
            time.sleep(POLL_INTERVAL)
            
        except KeyboardInterrupt:
            print("\n\n[INFO] Encerrando serviço...")
            break
        except Exception as e:
            consecutive_errors += 1
            print(f"\n[ERRO] Erro no loop principal: {e}")
            
            if consecutive_errors >= max_errors:
                print(f"[FATAL] Muitos erros consecutivos ({max_errors}). Encerrando...")
                break
            
            time.sleep(POLL_INTERVAL * 2)  # Espera mais em caso de erro
    
    print("\nServico encerrado.")
    input("Pressione Enter para fechar...")


if __name__ == "__main__":
    main()
