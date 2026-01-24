# Como Compilar o App Impressora Gamako

## Pré-requisitos

1. **Node.js** (versão 18 ou superior)
   - Download: https://nodejs.org
   
2. **Git** (opcional, para baixar atualizações)
   - Download: https://git-scm.com

## Compilação Rápida

### Windows
1. Navegue até a pasta `electron-printer`
2. Dê duplo-clique em `build-installer.bat`
3. Aguarde a compilação (pode levar alguns minutos)
4. O instalador será gerado em `dist/`

### macOS / Linux
1. Abra o Terminal
2. Navegue até a pasta `electron-printer`
3. Execute: `./build-installer.sh`
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

**Nota macOS**: Você pode precisar de certificados de desenvolvedor Apple para distribuir o app fora da App Store. Para testes locais, o app funcionará normalmente.

### Linux

```bash
cd electron-printer
npm install
npm run build:linux
```

## Após a Compilação

O instalador será gerado na pasta `dist/`:

- **Windows**: `Gamako Impressora Setup X.X.X.exe`
- **macOS**: `Gamako Impressora-X.X.X.dmg` ou `.app`
- **Linux**: `Gamako Impressora-X.X.X.AppImage`

## Instalação

### Windows
1. Execute o instalador `.exe`
2. Siga as instruções na tela
3. O app será instalado e um atalho criado na área de trabalho

### macOS
1. Abra o arquivo `.dmg`
2. Arraste o app para a pasta Aplicativos
3. Na primeira execução, pode ser necessário:
   - Clicar com botão direito > Abrir
   - Ou ir em Preferências do Sistema > Segurança e clicar "Abrir Mesmo Assim"

### Linux
1. Dê permissão de execução: `chmod +x *.AppImage`
2. Execute o AppImage

## Configuração Inicial

Após instalar, abra o app e configure:

1. **URL do Supabase**: Cole a URL do seu projeto
2. **Chave API**: Cole a chave anônima (anon key)
3. **ID do Restaurante**: Cole o ID do seu restaurante
4. **Impressora**: Selecione sua impressora térmica

Essas informações estão disponíveis na página **Impressoras** do sistema web.

## Configurar Impressora no Sistema

### Windows
- A impressora deve estar instalada via Painel de Controle > Dispositivos e Impressoras

### macOS
1. Vá em **Preferências do Sistema > Impressoras e Scanners**
2. Clique no "+" para adicionar
3. Impressoras USB são detectadas automaticamente
4. Para impressoras de rede, use o IP

### Linux
1. Certifique-se que CUPS está instalado: `sudo apt install cups`
2. Acesse `http://localhost:631` para gerenciar impressoras
3. Ou use: `sudo lpadmin -p NOME -E -v socket://IP:9100`

## Problemas Comuns

### "npm não encontrado"
Instale o Node.js e reinicie o terminal.

### "electron-builder falhou"
Execute `npm cache clean --force` e tente novamente.

### "Erro de permissão" (Linux/macOS)
Use `sudo npm install` ou configure as permissões do npm:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
```

### macOS: "Aplicativo não pode ser aberto"
1. Vá em Preferências do Sistema > Segurança e Privacidade
2. Clique em "Abrir Mesmo Assim"

### Linux: "AppImage não executa"
```bash
chmod +x Gamako-Impressora*.AppImage
./Gamako-Impressora*.AppImage --no-sandbox
```

### "Impressora não encontrada"
- Verifique se a impressora está instalada no sistema
- macOS: Preferências do Sistema > Impressoras
- Linux: Execute `lpstat -p` para listar impressoras
