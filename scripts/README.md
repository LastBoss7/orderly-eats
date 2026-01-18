# Guia de Migração para Supabase Próprio

Este guia explica como migrar o sistema Gamako para um Supabase self-hosted ou projeto próprio.

---

## 📋 Pré-requisitos

1. **Node.js** instalado (v18+)
2. **Supabase CLI** instalado
3. **Novo projeto Supabase** criado em [supabase.com](https://supabase.com)

---

## 🔧 Passo 1: Instalar Supabase CLI

```bash
# Via npm
npm install -g supabase

# OU via Homebrew (macOS/Linux)
brew install supabase/tap/supabase
```

Verificar instalação:
```bash
supabase --version
```

---

## 🔑 Passo 2: Login no Supabase

```bash
supabase login
```

Isso abrirá o navegador para autenticação.

---

## 🔗 Passo 3: Linkar ao Projeto

Navegue até a pasta do projeto e execute:

```bash
cd seu-projeto
supabase link --project-ref SEU_PROJECT_REF
```

> **Onde encontrar o PROJECT_REF?**
> - Acesse: `supabase.com/dashboard/project/SEU_PROJETO/settings/general`
> - Copie o "Reference ID" (ex: `abcdefghijklmnop`)

---

## 📊 Passo 4: Executar Migrations (Estrutura do Banco)

Execute o script SQL completo no SQL Editor do Supabase:

1. Acesse: `supabase.com/dashboard/project/SEU_PROJETO/sql`
2. Cole o conteúdo do arquivo `scripts/MIGRATION_COMPLETA_SUPABASE.sql`
3. Clique em "Run"

---

## 🔐 Passo 5: Configurar Secrets

No dashboard do Supabase, configure os secrets:

1. Acesse: `supabase.com/dashboard/project/SEU_PROJETO/settings/functions`
2. Role até "Secrets" e adicione:

| Secret Name | Descrição |
|-------------|-----------|
| `RESEND_API_KEY` | Chave da API Resend para envio de emails |
| `FOCUS_NFE_TOKEN` | Token da Focus NFe para emissão de NFC-e |

---

## 🚀 Passo 6: Deploy das Edge Functions

### Opção A: Deploy de todas as funções de uma vez

```bash
supabase functions deploy
```

### Opção B: Deploy individual de cada função

```bash
# Impressoras
supabase functions deploy printer-sync
supabase functions deploy printer-orders
supabase functions deploy printer-config
supabase functions deploy print-orders

# Autenticação de Garçons
supabase functions deploy waiter-auth
supabase functions deploy waiter-data
supabase functions deploy waiter-invite

# Email
supabase functions deploy send-verification-email
supabase functions deploy verify-email-token

# NFC-e (Nota Fiscal)
supabase functions deploy nfce-emit
supabase functions deploy nfce-cancel
supabase functions deploy nfce-status
supabase functions deploy validate-cnpj

# Menu (Importação com IA)
supabase functions deploy extract-menu
```

---

## ✅ Passo 7: Verificar Deploy

Listar funções deployadas:
```bash
supabase functions list
```

Testar uma função:
```bash
curl -X GET \
  "https://SEU_PROJECT_REF.supabase.co/functions/v1/printer-orders?restaurant_id=XXX&action=get" \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "apikey: SUA_ANON_KEY"
```

---

## 🖨️ Passo 8: Configurar o Electron

Após o deploy, configure o app Electron com as novas credenciais:

### Via Interface do App
1. Abra o Gamako Print Service
2. Vá em Configurações
3. Atualize:
   - **URL do Supabase**: `https://SEU_PROJECT_REF.supabase.co`
   - **Chave Anon**: `sua_nova_anon_key`

### Via Código (recompilação)
Edite `electron-printer/src/main.js` linhas 57-58:
```javascript
supabaseUrl: 'https://SEU_PROJECT_REF.supabase.co',
supabaseKey: 'SUA_NOVA_ANON_KEY',
```

Depois recompile:
```bash
cd electron-printer
npm install
npm run build
```

---

## 🌐 Passo 9: Atualizar Frontend

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_NOVA_ANON_KEY
```

---

## 🔍 Troubleshooting

### Erro: "Function not found"
```bash
# Verificar se a função existe
supabase functions list

# Re-deploy
supabase functions deploy nome-da-funcao
```

### Erro: "JWT expired" ou "Invalid JWT"
- Verifique se está usando a chave `anon` correta
- Confirme que o usuário está autenticado

### Erro: "Missing secret"
```bash
# Listar secrets configurados
supabase secrets list

# Adicionar secret faltante
supabase secrets set NOME_DO_SECRET=valor
```

### Logs das Edge Functions
```bash
# Ver logs em tempo real
supabase functions logs nome-da-funcao --tail
```

---

## 📁 Estrutura das Edge Functions

```
supabase/
└── functions/
    ├── extract-menu/          # Importação de cardápio via IA
    ├── nfce-cancel/           # Cancelamento de NFC-e
    ├── nfce-emit/             # Emissão de NFC-e
    ├── nfce-status/           # Status da NFC-e
    ├── print-orders/          # Impressão de pedidos
    ├── printer-config/        # Configuração de impressoras
    ├── printer-orders/        # Busca pedidos para impressão
    ├── printer-sync/          # Sincroniza impressoras disponíveis
    ├── send-verification-email/ # Envio de email de verificação
    ├── validate-cnpj/         # Validação de CNPJ
    ├── verify-email-token/    # Verificação de token de email
    ├── waiter-auth/           # Autenticação de garçons
    ├── waiter-data/           # Dados do garçom
    └── waiter-invite/         # Convite para garçons
```

---

## 🎉 Checklist Final

- [ ] Migrations executadas (`MIGRATION_COMPLETA_SUPABASE.sql`)
- [ ] Secrets configurados (RESEND_API_KEY, FOCUS_NFE_TOKEN)
- [ ] Edge Functions deployadas
- [ ] Electron configurado com novas credenciais
- [ ] Frontend configurado com novas credenciais
- [ ] Teste de impressão realizado

---

# Sistema de Impressão de Pedidos (Legado Python)

> ⚠️ **NOTA**: O sistema Python abaixo foi substituído pelo app Electron em `electron-printer/`

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

## Solução de Problemas

**"config.ini não encontrado"**
- Baixe o config.ini no sistema web > Impressora

**"Windows SmartScreen bloqueou"**
- Clique em "Mais informações" > "Executar assim mesmo"

**"Nenhuma impressora detectada"**
- Configure o nome da impressora no config.ini
- Verifique se a impressora está instalada no Windows
