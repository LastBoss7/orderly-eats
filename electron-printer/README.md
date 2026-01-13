# Impressora de Pedidos - Aplicativo Desktop

Aplicativo desktop para impressão automática de pedidos do sistema de restaurante.

## 🚀 Funcionalidades

- ✅ Conexão automática com o sistema
- ✅ Monitoramento de pedidos em tempo real
- ✅ Impressão automática em impressora térmica
- ✅ Suporte a USB e impressoras de rede
- ✅ Interface amigável com log de atividades
- ✅ Minimiza para bandeja do sistema
- ✅ Configurações persistentes

## 📋 Requisitos

- Windows 10/11, macOS ou Linux
- Node.js 18+ (apenas para desenvolvimento)
- Impressora térmica conectada

## 🔧 Instalação para Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm start
```

## 📦 Build para Produção

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

O instalador será gerado na pasta `dist/`.

## ⚙️ Configuração

1. Abra o aplicativo
2. Vá em "Configurações"
3. Preencha:
   - **URL do Backend**: URL do seu sistema
   - **Chave de API**: Chave de acesso
   - **ID do Restaurante**: Seu ID único
   - **Impressora**: Selecione sua impressora
4. Clique em "Salvar"

## 🖨️ Impressoras Suportadas

- Epson TM-T20, TM-T88
- Elgin i7, i9
- Bematech MP-4200
- Qualquer impressora térmica ESC/POS

## 📁 Estrutura do Projeto

```
electron-printer/
├── src/
│   ├── main.js          # Processo principal
│   ├── preload.js       # Bridge de segurança
│   ├── renderer/        # Interface do usuário
│   │   ├── index.html
│   │   └── renderer.js
│   └── services/
│       └── printer.js   # Serviço de impressão
├── assets/              # Ícones
└── package.json
```

## 🔐 Segurança

- As credenciais são armazenadas localmente de forma segura
- Comunicação via HTTPS
- Context Isolation habilitado
- Node Integration desabilitado

## 📝 Licença

Proprietário - Todos os direitos reservados.
