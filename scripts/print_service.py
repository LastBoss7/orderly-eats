"""
Serviço de Impressão Local para Restaurante
============================================

INSTALAÇÃO SIMPLES (2 passos):
1. Instale Python: https://www.python.org/downloads/
2. Execute no CMD:
   pip install requests pywin32
   python print_service.py

Para criar .exe (opcional):
   pip install pyinstaller
   pyinstaller --onefile print_service.py
"""

import requests
import time
import sys
from datetime import datetime

# ╔══════════════════════════════════════════════════════════════╗
# ║  CONFIGURAÇÃO - ALTERE APENAS O RESTAURANT_ID ABAIXO         ║
# ╚══════════════════════════════════════════════════════════════╝
SUPABASE_URL = "https://ueddnccouuevidwrcjaa.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZGRuY2NvdXVldmlkd3JjamFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjc1ODcsImV4cCI6MjA4Mzc0MzU4N30.tBeOzLyv4qcjb5wySPJWgCR7Fjzk0PEtLPxX9jp99ZI"

# 👇 COLE AQUI O ID DO SEU RESTAURANTE (encontre no sistema)
RESTAURANT_ID = "SEU_RESTAURANT_ID_AQUI"

POLL_INTERVAL = 5  # Segundos entre verificações


def get_default_printer():
    """Detecta a impressora padrão do Windows automaticamente"""
    try:
        import win32print
        return win32print.GetDefaultPrinter()
    except Exception:
        return None


def list_all_printers():
    """Lista todas as impressoras instaladas no Windows"""
    try:
        import win32print
        printers = []
        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        for printer in win32print.EnumPrinters(flags):
            printers.append(printer[2])
        return printers
    except Exception:
        return []


def get_pending_orders():
    """Busca pedidos pendentes de impressão"""
    try:
        response = requests.get(
            f"{SUPABASE_URL}/functions/v1/print-orders",
            params={"action": "get", "restaurant_id": RESTAURANT_ID},
            headers={"apikey": SUPABASE_ANON_KEY},
            timeout=15
        )
        if response.status_code == 200:
            return response.json().get("orders", [])
        return []
    except Exception as e:
        print(f"   ⚠ Erro conexão: {e}")
        return []


def mark_orders_printed(order_ids):
    """Marca pedidos como impressos no servidor"""
    try:
        response = requests.post(
            f"{SUPABASE_URL}/functions/v1/print-orders",
            params={"action": "mark-printed"},
            json={"order_ids": order_ids},
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            timeout=15
        )
        return response.status_code == 200
    except Exception:
        return False


def format_receipt(order):
    """Formata o pedido para impressão térmica (80mm = 48 chars)"""
    w = 48
    lines = []
    
    lines.append("=" * w)
    lines.append("*** PEDIDO COZINHA ***".center(w))
    lines.append("=" * w)
    
    # Número do pedido
    order_num = f"#{order.get('orderNumber', order.get('id', '')[:8].upper())}"
    order_type = order.get('orderType', 'mesa').upper()
    
    type_labels = {
        'DELIVERY': '🛵 ENTREGA',
        'COUNTER': '🏪 BALCÃO', 
        'TABLE': '🍽 MESA',
        'MESA': '🍽 MESA'
    }
    type_text = type_labels.get(order_type, order_type)
    
    lines.append(f"{order_num}  |  {type_text}".center(w))
    lines.append("-" * w)
    
    # Cliente
    if order.get('customerName'):
        lines.append(f"Cliente: {order['customerName']}")
    if order.get('deliveryPhone'):
        lines.append(f"Tel: {order['deliveryPhone']}")
    if order.get('deliveryAddress'):
        addr = order['deliveryAddress']
        # Quebra endereço longo
        while len(addr) > w - 5:
            lines.append(f"End: {addr[:w-5]}")
            addr = "     " + addr[w-5:]
        lines.append(f"End: {addr}")
    
    # Mesa
    if order.get('tableNumber'):
        lines.append(f"Mesa: {order['tableNumber']}")
    
    lines.append("")
    lines.append("ITENS:")
    lines.append("-" * w)
    
    # Itens do pedido
    items = order.get('items', order.get('order_items', []))
    for item in items:
        qty = item.get('quantity', 1)
        name = item.get('name', item.get('product_name', 'Item'))
        
        # Truncar nome se muito longo
        if len(name) > w - 5:
            name = name[:w-8] + "..."
        
        lines.append(f" {qty}x {name}")
        
        # Observações do item
        notes = item.get('notes')
        if notes:
            lines.append(f"    → {notes}")
    
    lines.append("-" * w)
    
    # Observações gerais
    if order.get('notes'):
        lines.append(f"OBS: {order['notes']}")
        lines.append("-" * w)
    
    # Total
    total = order.get('total', 0) or 0
    delivery_fee = order.get('deliveryFee', order.get('delivery_fee', 0)) or 0
    
    if delivery_fee > 0:
        lines.append(f"Taxa entrega: R$ {delivery_fee:.2f}".rjust(w))
    if total > 0:
        lines.append(f"TOTAL: R$ {total:.2f}".rjust(w))
    
    lines.append("=" * w)
    
    # Horário
    now = datetime.now().strftime("%H:%M - %d/%m/%Y")
    lines.append(now.center(w))
    
    # Espaço para corte
    lines.append("")
    lines.append("")
    lines.append("")
    
    return "\n".join(lines)


def print_to_printer(text, printer_name):
    """Imprime usando a impressora padrão do Windows (RAW mode)"""
    try:
        import win32print
        
        hprinter = win32print.OpenPrinter(printer_name)
        try:
            job = win32print.StartDocPrinter(hprinter, 1, ("Pedido Cozinha", None, "RAW"))
            try:
                win32print.StartPagePrinter(hprinter)
                # Codificação CP850 funciona bem com impressoras térmicas
                win32print.WritePrinter(hprinter, text.encode('cp850', errors='replace'))
                win32print.EndPagePrinter(hprinter)
            finally:
                win32print.EndDocPrinter(hprinter)
        finally:
            win32print.ClosePrinter(hprinter)
        return True
    except Exception as e:
        print(f"   ❌ Erro impressão: {e}")
        return False


def show_header():
    """Exibe cabeçalho do programa"""
    print("\n")
    print("╔" + "═" * 48 + "╗")
    print("║" + " SERVIÇO DE IMPRESSÃO - RESTAURANTE ".center(48) + "║")
    print("╚" + "═" * 48 + "╝")


def main():
    show_header()
    
    # Verificar configuração
    if RESTAURANT_ID == "SEU_RESTAURANT_ID_AQUI":
        print("\n ⚠️  ATENÇÃO: Configure o RESTAURANT_ID no arquivo!")
        print("    Abra print_service.py e altere a linha:")
        print('    RESTAURANT_ID = "SEU_ID_AQUI"')
        print("\n    Encontre o ID no sistema do restaurante.")
        input("\n Pressione ENTER para sair...")
        return
    
    # Detectar impressora automaticamente
    printer = get_default_printer()
    
    if not printer:
        print("\n ❌ Nenhuma impressora padrão configurada no Windows!")
        print("\n    Impressoras encontradas:")
        printers = list_all_printers()
        if printers:
            for p in printers:
                print(f"    • {p}")
            print("\n    → Defina uma como padrão no Painel de Controle")
        else:
            print("    Nenhuma impressora instalada.")
        input("\n Pressione ENTER para sair...")
        return
    
    # Status
    print(f"\n ✅ Impressora: {printer}")
    print(f" 🏪 Restaurante: {RESTAURANT_ID[:8]}...")
    print(f" ⏱️  Intervalo: {POLL_INTERVAL}s")
    print("\n" + "─" * 50)
    print(" Aguardando pedidos... (Ctrl+C para parar)")
    print("─" * 50)
    
    orders_printed = 0
    
    while True:
        try:
            orders = get_pending_orders()
            
            if orders:
                print(f"\n 🔔 {len(orders)} novo(s) pedido(s)!")
                printed_ids = []
                
                for order in orders:
                    order_num = order.get('orderNumber', order.get('id', '')[:8])
                    print(f"    Imprimindo #{order_num}...", end=" ", flush=True)
                    
                    receipt = format_receipt(order)
                    
                    if print_to_printer(receipt, printer):
                        printed_ids.append(order['id'])
                        orders_printed += 1
                        print("✅")
                    else:
                        print("❌")
                
                if printed_ids:
                    if mark_orders_printed(printed_ids):
                        print(f"    → Marcados como impressos ({orders_printed} total)")
            
            # Indicador de que está rodando (a cada 60s)
            time.sleep(POLL_INTERVAL)
            
        except KeyboardInterrupt:
            print(f"\n\n ✋ Serviço encerrado. {orders_printed} pedidos impressos.")
            break
        except Exception as e:
            print(f"\n ⚠️  Erro: {e}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
