# Sistema de Impressão de Pedidos

Serviço Windows para impressão automática de pedidos em impressoras térmicas.

## Instalação

### 1. Requisitos
- Windows 10 ou superior
- Python 3.8+ (apenas para desenvolvimento)
- Impressora térmica instalada no Windows

### 2. Configuração

1. Copie o arquivo `config.ini.example` para `config.ini`
2. Edite o `config.ini` com as informações do restaurante:

```ini
[GERAL]
SUPABASE_URL = https://ueddnccouuevidwrcjaa.supabase.co
SUPABASE_KEY = sua_chave_aqui

[RESTAURANTE]
ID = uuid_do_restaurante
IMPRESSORA = 

[SISTEMA]
INTERVALO = 5
LARGURA_PAPEL = 48
```

### 3. Executando

**Como script Python:**
```bash
pip install requests pywin32
python print_service.py
```

**Como executável (.exe):**
```bash
pip install pyinstaller requests pywin32
pyinstaller --onefile --name "ImpressoraPedidos" print_service.py
```

O executável estará em `dist/ImpressoraPedidos.exe`

## Configurações

| Parâmetro | Descrição |
|-----------|-----------|
| `SUPABASE_URL` | URL do projeto (não alterar) |
| `SUPABASE_KEY` | Chave de acesso (anon key) |
| `ID` | UUID do restaurante no banco |
| `IMPRESSORA` | Nome da impressora (em branco = padrão) |
| `INTERVALO` | Segundos entre verificações |
| `LARGURA_PAPEL` | 48 para 80mm, 32 para 58mm |

## Impressoras

Para ver o nome exato da impressora:
1. Painel de Controle > Dispositivos e Impressoras
2. Clique com botão direito na impressora
3. O nome exato está no título

Exemplo: `EPSON TM-T20X Receipt`

## Solução de Problemas

**"config.ini não encontrado"**
- Certifique-se que o arquivo config.ini está na mesma pasta do .exe

**"Sem conexão com a internet"**
- Verifique a conexão de rede
- Verifique se o firewall não está bloqueando

**"Nenhuma impressora detectada"**
- Configure o nome da impressora no config.ini
- Verifique se a impressora está instalada no Windows

## Entrega para Clientes

Para cada novo cliente:
1. Copie `ImpressoraPedidos.exe` + `config.ini`
2. Edite apenas o `ID` do restaurante no config.ini
3. Pronto!
