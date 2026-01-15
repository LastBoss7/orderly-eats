# Como Compilar o App Impressora BareRest

## Pré-requisitos

1. **Node.js** (versão 18 ou superior)
   - Download: https://nodejs.org
   
2. **Git** (opcional, para baixar atualizações)
   - Download: https://git-scm.com

## Compilação Rápida (Windows)

1. Navegue até a pasta `electron-printer`
2. Dê duplo-clique em `build-installer.bat`
3. Aguarde a compilação (pode levar alguns minutos)
4. O instalador será gerado em `dist/`

## Compilação Manual

### Windows

```bash
cd electron-printer
npm install
npm run build:win
```

### macOS

```bash
cd electron-printer
npm install
npm run build:mac
```

### Linux

```bash
cd electron-printer
npm install
npm run build:linux
```

## Após a Compilação

O instalador será gerado na pasta `dist/`:

- **Windows**: `Impressora de Pedidos Setup X.X.X.exe`
- **macOS**: `Impressora de Pedidos-X.X.X.dmg`
- **Linux**: `Impressora de Pedidos-X.X.X.AppImage`

## Instalação

### Windows
1. Execute o instalador `.exe`
2. Siga as instruções na tela
3. O app será instalado e um atalho criado na área de trabalho

### macOS
1. Abra o arquivo `.dmg`
2. Arraste o app para a pasta Aplicativos

### Linux
1. Dê permissão de execução: `chmod +x *.AppImage`
2. Execute o AppImage

## Configuração Inicial

Após instalar, abra o app e configure:

1. **URL do Supabase**: Cole a URL do seu projeto
2. **Chave API**: Cole a chave anônima (anon key)
3. **ID do Restaurante**: Cole o ID do seu restaurante

Essas informações estão disponíveis na página **Impressoras** do sistema web.

## Problemas Comuns

### "npm não encontrado"
Instale o Node.js e reinicie o terminal.

### "electron-builder falhou"
Execute `npm cache clean --force` e tente novamente.

### "Erro de permissão"
No Linux/macOS, use `sudo npm install` ou configure as permissões do npm.
