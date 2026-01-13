"""
Sistema de Impressão de Pedidos - v3.0 GUI
Aplicativo desktop para impressão automática de pedidos.

Similar ao Anota AI - Interface gráfica amigável.

INSTALAÇÃO:
1. pip install requests pywin32
2. Configure o arquivo config.ini
3. Execute: python print_service_gui.py

CRIAR EXECUTÁVEL:
pip install pyinstaller
pyinstaller --onefile --noconsole --name "ImpressoraPedidos" --icon=printer.ico print_service_gui.py
"""

import requests
import time
import sys
import os
import threading
import configparser
from datetime import datetime
from typing import List, Dict

# GUI imports
try:
    import tkinter as tk
    from tkinter import ttk, messagebox
except ImportError:
    print("Tkinter não disponível. Execute: pip install tk")
    sys.exit(1)

# Windows print imports
try:
    import win32print
except ImportError:
    win32print = None


class PrintServiceApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Impressora de Pedidos")
        self.root.geometry("450x550")
        self.root.resizable(False, False)
        
        # State
        self.running = False
        self.connected = False
        self.print_thread = None
        self.orders_printed = 0
        self.last_check = None
        
        # Load config
        self.config = self.load_config()
        if not self.config:
            return
        
        # Setup UI
        self.setup_ui()
        
        # Start checking
        self.start_service()
    
    def load_config(self):
        """Carrega configurações do arquivo config.ini"""
        config = configparser.ConfigParser()
        
        if getattr(sys, 'frozen', False):
            base_path = os.path.dirname(sys.executable)
        else:
            base_path = os.path.dirname(os.path.abspath(__file__))
        
        config_path = os.path.join(base_path, 'config.ini')
        
        if not os.path.exists(config_path):
            messagebox.showerror(
                "Erro de Configuração",
                f"Arquivo 'config.ini' não encontrado!\n\n"
                f"Esperado em:\n{config_path}\n\n"
                f"Crie o arquivo com as configurações necessárias."
            )
            self.root.destroy()
            return None
        
        config.read(config_path, encoding='utf-8')
        return config
    
    def setup_ui(self):
        """Configura a interface gráfica"""
        # Cores
        self.primary_color = "#2196F3"
        self.success_color = "#4CAF50"
        self.error_color = "#f44336"
        self.bg_color = "#ffffff"
        self.text_color = "#333333"
        
        # Container principal
        self.root.configure(bg=self.bg_color)
        
        # Frame do cabeçalho (azul)
        header_frame = tk.Frame(self.root, bg=self.primary_color, height=250)
        header_frame.pack(fill=tk.X)
        header_frame.pack_propagate(False)
        
        # Logo/Título
        title_label = tk.Label(
            header_frame,
            text="🖨️",
            font=("Segoe UI Emoji", 48),
            bg=self.primary_color,
            fg="white"
        )
        title_label.pack(pady=(30, 10))
        
        app_name = tk.Label(
            header_frame,
            text="Impressora de\nPedidos",
            font=("Segoe UI", 24, "bold"),
            bg=self.primary_color,
            fg="white"
        )
        app_name.pack()
        
        # Frame de status
        status_frame = tk.Frame(self.root, bg=self.bg_color)
        status_frame.pack(fill=tk.X, padx=20, pady=20)
        
        # Indicador de conexão
        self.status_indicator = tk.Canvas(
            status_frame, 
            width=20, 
            height=20, 
            bg=self.bg_color, 
            highlightthickness=0
        )
        self.status_indicator.pack(side=tk.LEFT, padx=(0, 10))
        self.status_circle = self.status_indicator.create_oval(2, 2, 18, 18, fill="#ccc")
        
        self.status_label = tk.Label(
            status_frame,
            text="Conectando...",
            font=("Segoe UI", 12),
            bg=self.bg_color,
            fg=self.text_color
        )
        self.status_label.pack(side=tk.LEFT)
        
        # Separador
        ttk.Separator(self.root, orient='horizontal').pack(fill=tk.X, padx=20)
        
        # Info Frame
        info_frame = tk.Frame(self.root, bg=self.bg_color)
        info_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Impressora
        printer_frame = tk.Frame(info_frame, bg=self.bg_color)
        printer_frame.pack(fill=tk.X, pady=5)
        
        tk.Label(
            printer_frame,
            text="Impressora:",
            font=("Segoe UI", 10, "bold"),
            bg=self.bg_color,
            fg=self.text_color
        ).pack(side=tk.LEFT)
        
        printer_name = self.get_printer_name()
        self.printer_label = tk.Label(
            printer_frame,
            text=printer_name or "Nenhuma",
            font=("Segoe UI", 10),
            bg=self.bg_color,
            fg=self.text_color
        )
        self.printer_label.pack(side=tk.LEFT, padx=(10, 0))
        
        # Restaurante
        rest_frame = tk.Frame(info_frame, bg=self.bg_color)
        rest_frame.pack(fill=tk.X, pady=5)
        
        tk.Label(
            rest_frame,
            text="Restaurante ID:",
            font=("Segoe UI", 10, "bold"),
            bg=self.bg_color,
            fg=self.text_color
        ).pack(side=tk.LEFT)
        
        rest_id = self.config.get('RESTAURANTE', 'ID', fallback='')[:20]
        self.rest_label = tk.Label(
            rest_frame,
            text=f"{rest_id}..." if len(self.config.get('RESTAURANTE', 'ID', fallback='')) > 20 else rest_id,
            font=("Segoe UI", 10),
            bg=self.bg_color,
            fg=self.text_color
        )
        self.rest_label.pack(side=tk.LEFT, padx=(10, 0))
        
        # Pedidos impressos
        printed_frame = tk.Frame(info_frame, bg=self.bg_color)
        printed_frame.pack(fill=tk.X, pady=5)
        
        tk.Label(
            printed_frame,
            text="Pedidos impressos:",
            font=("Segoe UI", 10, "bold"),
            bg=self.bg_color,
            fg=self.text_color
        ).pack(side=tk.LEFT)
        
        self.printed_label = tk.Label(
            printed_frame,
            text="0",
            font=("Segoe UI", 10),
            bg=self.bg_color,
            fg=self.text_color
        )
        self.printed_label.pack(side=tk.LEFT, padx=(10, 0))
        
        # Última verificação
        check_frame = tk.Frame(info_frame, bg=self.bg_color)
        check_frame.pack(fill=tk.X, pady=5)
        
        tk.Label(
            check_frame,
            text="Última verificação:",
            font=("Segoe UI", 10, "bold"),
            bg=self.bg_color,
            fg=self.text_color
        ).pack(side=tk.LEFT)
        
        self.check_label = tk.Label(
            check_frame,
            text="--:--:--",
            font=("Segoe UI", 10),
            bg=self.bg_color,
            fg=self.text_color
        )
        self.check_label.pack(side=tk.LEFT, padx=(10, 0))
        
        # Log area
        log_frame = tk.Frame(info_frame, bg=self.bg_color)
        log_frame.pack(fill=tk.BOTH, expand=True, pady=(20, 0))
        
        tk.Label(
            log_frame,
            text="Log de atividades:",
            font=("Segoe UI", 10, "bold"),
            bg=self.bg_color,
            fg=self.text_color
        ).pack(anchor=tk.W)
        
        self.log_text = tk.Text(
            log_frame,
            height=6,
            font=("Consolas", 9),
            bg="#f5f5f5",
            fg=self.text_color,
            state=tk.DISABLED,
            wrap=tk.WORD
        )
        self.log_text.pack(fill=tk.BOTH, expand=True, pady=(5, 0))
        
        # Barra de status inferior
        bottom_frame = tk.Frame(self.root, bg="#f0f0f0", height=40)
        bottom_frame.pack(fill=tk.X, side=tk.BOTTOM)
        bottom_frame.pack_propagate(False)
        
        self.bottom_status = tk.Label(
            bottom_frame,
            text="🖨️ Serviço de Impressão: Iniciando...",
            font=("Segoe UI", 10),
            bg="#f0f0f0",
            fg=self.text_color
        )
        self.bottom_status.pack(side=tk.LEFT, padx=10, pady=10)
        
        # Menu
        self.setup_menu()
    
    def setup_menu(self):
        """Configura o menu"""
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)
        
        # Menu Opções
        options_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Opções", menu=options_menu)
        options_menu.add_command(label="Testar Impressão", command=self.test_print)
        options_menu.add_separator()
        options_menu.add_command(label="Abrir config.ini", command=self.open_config)
        options_menu.add_separator()
        options_menu.add_command(label="Sair", command=self.on_closing)
        
        # Menu Ajuda
        help_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Ajuda", menu=help_menu)
        help_menu.add_command(label="Sobre", command=self.show_about)
    
    def get_printer_name(self):
        """Obtém nome da impressora configurada"""
        printer = self.config.get('RESTAURANTE', 'IMPRESSORA', fallback='').strip()
        if not printer and win32print:
            try:
                printer = win32print.GetDefaultPrinter()
            except Exception:
                pass
        return printer or "Padrão do Sistema"
    
    def add_log(self, message):
        """Adiciona mensagem ao log"""
        self.log_text.configure(state=tk.NORMAL)
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
        self.log_text.configure(state=tk.DISABLED)
    
    def update_status(self, connected, message=""):
        """Atualiza indicador de status"""
        if connected:
            self.status_indicator.itemconfig(self.status_circle, fill=self.success_color)
            self.status_label.config(text="Conectado - Aguardando pedidos")
            self.bottom_status.config(text="🖨️ Serviço de Impressão: Local")
        else:
            self.status_indicator.itemconfig(self.status_circle, fill=self.error_color)
            self.status_label.config(text=message or "Desconectado")
            self.bottom_status.config(text="⚠️ Serviço de Impressão: Offline")
        self.connected = connected
    
    def start_service(self):
        """Inicia o serviço de verificação de pedidos"""
        self.running = True
        self.print_thread = threading.Thread(target=self.print_loop, daemon=True)
        self.print_thread.start()
        self.add_log("Serviço iniciado")
    
    def print_loop(self):
        """Loop principal de verificação e impressão"""
        poll_interval = self.config.getint('SISTEMA', 'INTERVALO', fallback=5)
        
        while self.running:
            try:
                orders = self.get_pending_orders()
                
                self.last_check = datetime.now()
                self.root.after(0, lambda: self.check_label.config(
                    text=self.last_check.strftime("%H:%M:%S")
                ))
                
                if orders is None:
                    self.root.after(0, lambda: self.update_status(False, "Erro de conexão"))
                elif orders:
                    self.root.after(0, lambda: self.update_status(True))
                    for order in orders:
                        self.print_order(order)
                else:
                    self.root.after(0, lambda: self.update_status(True))
                
                time.sleep(poll_interval)
                
            except Exception as e:
                self.root.after(0, lambda: self.add_log(f"Erro: {str(e)}"))
                time.sleep(poll_interval * 2)
    
    def get_pending_orders(self) -> List[Dict]:
        """Busca pedidos pendentes"""
        supabase_url = self.config.get('GERAL', 'SUPABASE_URL').strip()
        supabase_key = self.config.get('GERAL', 'SUPABASE_KEY').strip()
        restaurant_id = self.config.get('RESTAURANTE', 'ID').strip()
        
        endpoint = f"{supabase_url}/rest/v1/orders"
        
        params = {
            "select": "*,order_items(*)",
            "restaurant_id": f"eq.{restaurant_id}",
            "print_status": "eq.pending",
            "order": "created_at.asc"
        }
        
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.get(endpoint, params=params, headers=headers, timeout=15)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout:
            return None
        except requests.exceptions.ConnectionError:
            return None
        except Exception:
            return None
    
    def print_order(self, order: Dict):
        """Imprime um pedido"""
        order_id = order.get('id', 'N/A')
        customer = order.get('customer_name', 'Cliente')
        
        self.root.after(0, lambda: self.add_log(f"Imprimindo pedido #{order_id[:8]}..."))
        
        texto = self.format_receipt(order)
        
        if self.print_raw(texto):
            if self.mark_order_printed(order_id):
                self.orders_printed += 1
                self.root.after(0, lambda: self.printed_label.config(text=str(self.orders_printed)))
                self.root.after(0, lambda: self.add_log(f"✓ Pedido #{order_id[:8]} impresso"))
            else:
                self.root.after(0, lambda: self.add_log(f"⚠ Impresso, erro ao marcar"))
        else:
            self.root.after(0, lambda: self.add_log(f"✗ Erro ao imprimir #{order_id[:8]}"))
    
    def format_receipt(self, order: Dict) -> str:
        """Formata o recibo para impressão"""
        w = self.config.getint('SISTEMA', 'LARGURA_PAPEL', fallback=48)
        lines = []
        
        lines.append("=" * w)
        lines.append("NOVO PEDIDO".center(w))
        lines.append("=" * w)
        
        dt = order.get('created_at', '')
        if dt:
            try:
                parsed_dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
                lines.append(parsed_dt.strftime("%d/%m/%Y %H:%M").center(w))
            except Exception:
                pass
        
        lines.append("")
        
        order_type = order.get('order_type', 'table')
        type_labels = {
            'table': 'MESA',
            'delivery': 'ENTREGA',
            'takeout': 'RETIRADA',
            'counter': 'BALCAO'
        }
        lines.append(f"TIPO: {type_labels.get(order_type, order_type.upper())}")
        
        customer_name = order.get('customer_name')
        if customer_name:
            lines.append(f"CLIENTE: {customer_name}")
        
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
        
        items = order.get('order_items', [])
        if not items:
            lines.append("(Sem itens)")
        else:
            for item in items:
                qty = item.get('quantity', 1)
                name = item.get('product_name', 'Item')
                price = float(item.get('product_price', 0))
                notes = item.get('notes', '')
                
                item_line = f"{qty}x {name}"
                price_str = f"R${price * qty:.2f}"
                
                if len(item_line) + len(price_str) + 1 <= w:
                    spaces = w - len(item_line) - len(price_str)
                    lines.append(f"{item_line}{' ' * spaces}{price_str}")
                else:
                    lines.append(item_line)
                    lines.append(price_str.rjust(w))
                
                if notes:
                    obs_lines = [notes[i:i+w-4] for i in range(0, len(notes), w-4)]
                    for obs_line in obs_lines:
                        lines.append(f"  > {obs_line}")
        
        lines.append("-" * w)
        
        total = float(order.get('total', 0) or 0)
        lines.append("")
        lines.append(("TOTAL: R$ %.2f" % total).rjust(w))
        lines.append("")
        
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
        lines.append("")
        
        return "\n".join(lines)
    
    def print_raw(self, text: str) -> bool:
        """Envia texto para a impressora"""
        if not win32print:
            self.root.after(0, lambda: self.add_log("(Simulação - win32print não disponível)"))
            return True
        
        printer_name = self.config.get('RESTAURANTE', 'IMPRESSORA', fallback='').strip()
        if not printer_name:
            try:
                printer_name = win32print.GetDefaultPrinter()
            except Exception:
                return False
        
        if not printer_name:
            return False
        
        try:
            hprinter = win32print.OpenPrinter(printer_name)
            try:
                job = win32print.StartDocPrinter(hprinter, 1, ("Pedido", None, "RAW"))
                try:
                    win32print.StartPagePrinter(hprinter)
                    win32print.WritePrinter(hprinter, text.encode('cp850', errors='replace'))
                    win32print.EndPagePrinter(hprinter)
                finally:
                    win32print.EndDocPrinter(hprinter)
            finally:
                win32print.ClosePrinter(hprinter)
            return True
        except Exception as e:
            self.root.after(0, lambda: self.add_log(f"Erro impressora: {str(e)}"))
            return False
    
    def mark_order_printed(self, order_id: str) -> bool:
        """Marca pedido como impresso"""
        supabase_url = self.config.get('GERAL', 'SUPABASE_URL').strip()
        supabase_key = self.config.get('GERAL', 'SUPABASE_KEY').strip()
        
        endpoint = f"{supabase_url}/rest/v1/orders"
        
        params = {"id": f"eq.{order_id}"}
        
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
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
        except Exception:
            return False
    
    def test_print(self):
        """Imprime uma página de teste"""
        texto = """
================================================
           TESTE DE IMPRESSAO
================================================

Se voce esta lendo esta mensagem,
a impressora esta funcionando corretamente!

Data: {}

================================================
""".format(datetime.now().strftime("%d/%m/%Y %H:%M:%S"))
        
        if self.print_raw(texto):
            self.add_log("Teste de impressão enviado")
            messagebox.showinfo("Teste", "Página de teste enviada para a impressora!")
        else:
            messagebox.showerror("Erro", "Não foi possível imprimir a página de teste.")
    
    def open_config(self):
        """Abre o arquivo de configuração"""
        if getattr(sys, 'frozen', False):
            base_path = os.path.dirname(sys.executable)
        else:
            base_path = os.path.dirname(os.path.abspath(__file__))
        
        config_path = os.path.join(base_path, 'config.ini')
        os.startfile(config_path)
    
    def show_about(self):
        """Mostra informações sobre o aplicativo"""
        messagebox.showinfo(
            "Sobre",
            "Impressora de Pedidos v3.0\n\n"
            "Aplicativo para impressão automática de pedidos.\n\n"
            "Conecta-se ao sistema de gestão e imprime\n"
            "automaticamente os pedidos recebidos.\n\n"
            "© 2024"
        )
    
    def on_closing(self):
        """Fecha o aplicativo"""
        self.running = False
        self.root.destroy()


def main():
    root = tk.Tk()
    app = PrintServiceApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()


if __name__ == "__main__":
    main()
