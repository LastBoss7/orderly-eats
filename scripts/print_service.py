"""
Restaurant Print Service - Windows Desktop App
Monitors Supabase for new orders and prints to local thermal printer.

INSTALAÇÃO:
1. pip install requests python-escpos pywin32
2. Configure as variáveis abaixo
3. Execute: python print_service.py
4. Para criar .exe: pip install pyinstaller && pyinstaller --onefile --noconsole print_service.py

CONFIGURAÇÃO DA IMPRESSORA:
- Para impressoras USB: use a porta USB (ex: USB001)
- Para impressoras de rede: use o IP e porta
- Para impressoras Windows: use o nome compartilhado
"""

import requests
import time
import json
import sys
import os
from datetime import datetime
from typing import Optional

# ============ CONFIGURAÇÃO ============
SUPABASE_URL = "https://ueddnccouuevidwrcjaa.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZGRuY2NvdXVldmlkd3JjamFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjc1ODcsImV4cCI6MjA4Mzc0MzU4N30.tBeOzLyv4qcjb5wySPJWgCR7Fjzk0PEtLPxX9jp99ZI"

# IMPORTANTE: Substitua pelo ID do seu restaurante
RESTAURANT_ID = "SEU_RESTAURANT_ID_AQUI"

# Intervalo de verificação em segundos
POLL_INTERVAL = 5

# Nome da impressora no Windows (None para impressora padrão)
PRINTER_NAME: Optional[str] = None

# Largura do papel em caracteres (80mm = ~48 chars, 58mm = ~32 chars)
PAPER_WIDTH = 48
# ======================================


def get_pending_orders():
    """Busca pedidos pendentes de impressão."""
    url = f"{SUPABASE_URL}/functions/v1/print-orders"
    params = {
        "restaurant_id": RESTAURANT_ID,
        "action": "get"
    }
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data.get("orders", [])
    except requests.RequestException as e:
        print(f"[ERRO] Falha ao buscar pedidos: {e}")
        return []


def mark_orders_printed(order_ids: list):
    """Marca pedidos como impressos."""
    url = f"{SUPABASE_URL}/functions/v1/print-orders"
    params = {
        "restaurant_id": RESTAURANT_ID,
        "action": "mark-printed"
    }
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    body = {"order_ids": order_ids}
    
    try:
        response = requests.post(url, params=params, headers=headers, json=body, timeout=30)
        response.raise_for_status()
        return True
    except requests.RequestException as e:
        print(f"[ERRO] Falha ao marcar pedidos como impressos: {e}")
        return False


def format_receipt(order: dict) -> str:
    """Formata o pedido para impressão térmica."""
    w = PAPER_WIDTH
    lines = []
    
    # Cabeçalho
    lines.append("=" * w)
    lines.append(f"PEDIDO #{order['orderNumber']}".center(w))
    lines.append("=" * w)
    
    # Data/Hora
    created = datetime.fromisoformat(order['createdAt'].replace('Z', '+00:00'))
    lines.append(created.strftime("%d/%m/%Y %H:%M").center(w))
    lines.append("")
    
    # Tipo do pedido
    order_type = order.get('orderType', 'table')
    if order_type == 'delivery':
        lines.append("*** ENTREGA ***".center(w))
    elif order_type == 'counter':
        lines.append("*** BALCÃO ***".center(w))
    else:
        table_num = order.get('tableNumber')
        if table_num:
            lines.append(f"*** MESA {table_num} ***".center(w))
    lines.append("")
    
    # Cliente
    if order.get('customerName'):
        lines.append(f"Cliente: {order['customerName']}")
    if order.get('deliveryPhone'):
        lines.append(f"Tel: {order['deliveryPhone']}")
    if order.get('deliveryAddress'):
        lines.append(f"End: {order['deliveryAddress']}")
    lines.append("-" * w)
    
    # Itens
    lines.append("ITENS:")
    lines.append("-" * w)
    
    for item in order.get('items', []):
        qty = item['quantity']
        name = item['name'][:w-8]  # Truncar se muito longo
        price = item.get('price', 0)
        
        lines.append(f"{qty}x {name}")
        if item.get('notes'):
            lines.append(f"   -> {item['notes']}")
    
    lines.append("-" * w)
    
    # Observações gerais
    if order.get('notes'):
        lines.append("OBS: " + order['notes'])
        lines.append("-" * w)
    
    # Total
    total = order.get('total', 0) or 0
    delivery_fee = order.get('deliveryFee', 0) or 0
    
    if delivery_fee > 0:
        lines.append(f"Taxa entrega: R$ {delivery_fee:.2f}".rjust(w))
    lines.append(f"TOTAL: R$ {total:.2f}".rjust(w))
    
    lines.append("=" * w)
    lines.append("")
    lines.append("")
    lines.append("")  # Espaço para corte
    
    return "\n".join(lines)


def print_to_windows(text: str, printer_name: Optional[str] = None):
    """Imprime usando a API do Windows."""
    try:
        import win32print
        import win32ui
        from PIL import Image, ImageDraw, ImageFont
        
        # Usar impressora padrão se não especificada
        if printer_name is None:
            printer_name = win32print.GetDefaultPrinter()
        
        # Criar documento de impressão
        hprinter = win32print.OpenPrinter(printer_name)
        try:
            # Modo RAW para impressoras térmicas
            job = win32print.StartDocPrinter(hprinter, 1, ("Pedido", None, "RAW"))
            try:
                win32print.StartPagePrinter(hprinter)
                # Enviar texto em bytes
                win32print.WritePrinter(hprinter, text.encode('cp850'))
                win32print.EndPagePrinter(hprinter)
            finally:
                win32print.EndDocPrinter(hprinter)
        finally:
            win32print.ClosePrinter(hprinter)
        
        return True
    except ImportError:
        print("[AVISO] win32print não disponível. Imprimindo no console:")
        print(text)
        return True
    except Exception as e:
        print(f"[ERRO] Falha na impressão: {e}")
        return False


def print_to_console(text: str):
    """Fallback: imprime no console."""
    print("\n" + "=" * 50)
    print("SIMULAÇÃO DE IMPRESSÃO")
    print("=" * 50)
    print(text)
    return True


def main():
    """Loop principal do serviço."""
    print("=" * 50)
    print("SERVIÇO DE IMPRESSÃO - RESTAURANTE")
    print("=" * 50)
    print(f"Supabase URL: {SUPABASE_URL}")
    print(f"Restaurant ID: {RESTAURANT_ID}")
    print(f"Intervalo de verificação: {POLL_INTERVAL}s")
    print(f"Impressora: {PRINTER_NAME or 'Padrão do sistema'}")
    print("=" * 50)
    
    if RESTAURANT_ID == "SEU_RESTAURANT_ID_AQUI":
        print("\n[ERRO] Configure o RESTAURANT_ID antes de executar!")
        print("Encontre seu ID no painel do restaurante.")
        input("Pressione Enter para sair...")
        sys.exit(1)
    
    print("\nIniciando monitoramento de pedidos...")
    print("Pressione Ctrl+C para encerrar.\n")
    
    while True:
        try:
            orders = get_pending_orders()
            
            if orders:
                print(f"\n[{datetime.now().strftime('%H:%M:%S')}] {len(orders)} pedido(s) para imprimir")
                
                printed_ids = []
                
                for order in orders:
                    print(f"  -> Imprimindo pedido #{order['orderNumber']}...")
                    
                    receipt = format_receipt(order)
                    
                    # Tentar imprimir no Windows, senão console
                    try:
                        success = print_to_windows(receipt, PRINTER_NAME)
                    except:
                        success = print_to_console(receipt)
                    
                    if success:
                        printed_ids.append(order['id'])
                        print(f"     ✓ Pedido #{order['orderNumber']} impresso!")
                    else:
                        print(f"     ✗ Falha ao imprimir #{order['orderNumber']}")
                
                # Marcar como impressos
                if printed_ids:
                    if mark_orders_printed(printed_ids):
                        print(f"  -> {len(printed_ids)} pedido(s) marcados como impressos")
                    else:
                        print("  -> [AVISO] Não foi possível marcar pedidos como impressos")
            
            time.sleep(POLL_INTERVAL)
            
        except KeyboardInterrupt:
            print("\n\nEncerrando serviço...")
            break
        except Exception as e:
            print(f"[ERRO] {e}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
