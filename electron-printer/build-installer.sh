#!/bin/bash

echo "========================================"
echo "  Compilador do App Impressora Gamako"
echo "========================================"
echo

# Verificar se Node.js esta instalado
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js nao encontrado!"
    echo "Por favor, instale o Node.js em https://nodejs.org"
    exit 1
fi

echo "[1/4] Verificando versao do Node.js..."
node --version

echo
echo "[2/4] Instalando dependencias..."
npm install
if [ $? -ne 0 ]; then
    echo "[ERRO] Falha ao instalar dependencias!"
    exit 1
fi

echo
echo "[3/4] Compilando aplicativo..."

# Detectar sistema operacional
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Detectado: macOS"
    npm run build:mac
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Detectado: Linux"
    npm run build:linux
else
    echo "Detectado: Windows (via Git Bash/WSL)"
    npm run build:win
fi

if [ $? -ne 0 ]; then
    echo "[ERRO] Falha ao compilar o aplicativo!"
    exit 1
fi

echo
echo "========================================"
echo "  Compilacao concluida com sucesso!"
echo "========================================"
echo
echo "O instalador foi gerado em:"
echo "  electron-printer/dist/"
echo

# Abrir pasta dist
if [[ "$OSTYPE" == "darwin"* ]]; then
    open dist
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open dist 2>/dev/null || echo "Abra a pasta dist manualmente"
fi
