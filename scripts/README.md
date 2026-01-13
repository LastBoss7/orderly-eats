# Sistema de Impressão de Pedidos

Serviço Windows para impressão automática de pedidos em impressoras térmicas.

## Compilar Executável

### Opção 1: Script Automático (Windows)
```bash
cd scripts
build.bat
```

### Opção 2: Manual
```bash
cd scripts
pip install -r requirements.txt
pyinstaller --onefile --name "ImpressoraPedidos" --console print_service.py
```

O executável será criado em `dist/ImpressoraPedidos.exe`

## Criar Pacote de Distribuição

Após compilar, crie um ZIP contendo:
1. `dist/ImpressoraPedidos.exe`
2. `LEIA-ME.txt`

⚠️ **NÃO inclua o config.ini** - os clientes baixam ele pelo sistema web.

Faça upload do ZIP no sistema web: **Menu Impressora > Upload do Executável**

## Desenvolvimento Local

```bash
cd scripts
pip install -r requirements.txt
python print_service.py
```

## Configuração

O arquivo `config.ini` é baixado automaticamente pelo cliente no sistema web.

```ini
[GERAL]
SUPABASE_URL = https://sua-url.supabase.co
SUPABASE_KEY = sua_anon_key

[RESTAURANTE]
ID = uuid-do-restaurante
IMPRESSORA = 

[SISTEMA]
INTERVALO = 5
LARGURA_PAPEL = 48
```

| Parâmetro | Descrição |
|-----------|-----------|
| `SUPABASE_URL` | URL do projeto (não alterar) |
| `SUPABASE_KEY` | Chave de acesso (anon key) |
| `ID` | UUID do restaurante no banco |
| `IMPRESSORA` | Nome da impressora (em branco = padrão) |
| `INTERVALO` | Segundos entre verificações |
| `LARGURA_PAPEL` | 48 para 80mm, 32 para 58mm |

## Funcionamento

1. O programa consulta o banco a cada X segundos
2. Busca pedidos com `print_status = 'pending'`
3. Formata e envia para a impressora térmica
4. Atualiza o status para `printed`
5. Registra log de impressão na tabela `print_logs`

## Solução de Problemas

**"config.ini não encontrado"**
- Baixe o config.ini no sistema web > Impressora

**"Windows SmartScreen bloqueou"**
- Clique em "Mais informações" > "Executar assim mesmo"

**"Nenhuma impressora detectada"**
- Configure o nome da impressora no config.ini
- Verifique se a impressora está instalada no Windows
