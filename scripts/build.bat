@echo off
echo ================================================
echo   Compilando ImpressoraPedidos com PyInstaller
echo ================================================
echo.

REM Verifica se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado!
    echo Instale o Python 3.8+ de https://python.org
    pause
    exit /b 1
)

REM Instala dependências
echo [1/3] Instalando dependencias...
pip install requests pywin32 pyinstaller --quiet

REM Compila o executável
echo [2/3] Compilando executavel...
python -m PyInstaller --onefile --name "ImpressoraPedidos" --console print_service.py

REM Move para pasta de distribuição
echo [3/3] Preparando distribuicao...
if not exist "dist\distribuicao" mkdir "dist\distribuicao"
copy "dist\ImpressoraPedidos.exe" "dist\distribuicao\" >nul
copy "config.ini.example" "dist\distribuicao\config.ini.example" >nul
copy "LEIA-ME.txt" "dist\distribuicao\" >nul

REM Cria o ZIP
echo.
echo [INFO] Criando arquivo ZIP...
cd dist\distribuicao
powershell Compress-Archive -Path * -DestinationPath ..\ImpressoraPedidos.zip -Force
cd ..\..

echo.
echo ================================================
echo   PRONTO! Arquivo criado em:
echo   dist\ImpressoraPedidos.zip
echo ================================================
echo.
pause
