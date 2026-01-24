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
- ✅ **Suporte a Windows, macOS e Linux**

## 📋 Requisitos

### Windows
- Windows 10 ou 11
- Impressora térmica instalada no Windows

### macOS
- macOS 10.13 (High Sierra) ou superior
- Impressora térmica configurada via CUPS (Sistema de Impressão)
- Para adicionar impressora: **Preferências do Sistema > Impressoras e Scanners**

### Linux
- Distribuição com suporte a CUPS
- Impressora térmica configurada via CUPS
- Comando `lp` disponível no sistema

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

# Ou use os scripts automatizados:
# Windows: build-installer.bat
# macOS/Linux: ./build-installer.sh
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

### Compatibilidade por Sistema

| Sistema | Método de Impressão |
|---------|---------------------|
| Windows | Windows Print Spooler (RAW) |
| macOS   | CUPS (lp/lpr) |
| Linux   | CUPS (lp/lpr) |

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

## 🍎 Notas para macOS

1. **Primeira Execução**: O macOS pode exibir um aviso de segurança. Vá em **Preferências do Sistema > Segurança e Privacidade** e clique em "Abrir Mesmo Assim".

2. **Configurar Impressora**: A impressora térmica deve estar configurada no sistema antes de usar o app:
   - Abra **Preferências do Sistema > Impressoras e Scanners**
   - Clique em "+" para adicionar a impressora
   - Para impressoras USB, conecte e o macOS deve detectar automaticamente
   - Para impressoras de rede, adicione via IP

3. **Permissões**: O app pode solicitar permissões para acessar a impressora na primeira vez.

## 🐧 Notas para Linux

1. **Verificar CUPS**: Certifique-se que o CUPS está instalado:
   ```bash
   sudo apt install cups  # Ubuntu/Debian
   sudo yum install cups  # CentOS/RHEL
   ```

2. **Listar Impressoras**: Para ver impressoras disponíveis:
   ```bash
   lpstat -p -d
   ```

3. **AppImage**: Para executar o AppImage:
   ```bash
   chmod +x Gamako-Impressora-*.AppImage
   ./Gamako-Impressora-*.AppImage
   ```

## 📝 Licença

Proprietário - Todos os direitos reservados.
