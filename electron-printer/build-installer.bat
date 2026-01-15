@echo off
echo ========================================
echo   Compilador do App Impressora Gamako
echo ========================================
echo.

REM Verificar se Node.js esta instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale o Node.js em https://nodejs.org
    pause
    exit /b 1
)

echo [1/4] Verificando versao do Node.js...
node --version

echo.
echo [2/4] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias!
    pause
    exit /b 1
)

echo.
echo [3/4] Compilando aplicativo para Windows...
call npm run build:win
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao compilar o aplicativo!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Compilacao concluida com sucesso!
echo ========================================
echo.
echo O instalador foi gerado em:
echo   electron-printer\dist\
echo.
echo Procure pelo arquivo:
echo   "Impressora de Pedidos Setup X.X.X.exe"
echo.

REM Abrir pasta dist
explorer dist

pause
