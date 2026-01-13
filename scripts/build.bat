@echo off
echo ================================================
echo   Compilando ImpressoraPedidos com PyInstaller
echo ================================================
echo.

REM Verifica se Python está instalado usando py launcher
py --version >nul 2>&1
if errorlevel 1 (
    python --version >nul 2>&1
    if errorlevel 1 (
        echo [ERRO] Python nao encontrado!
        echo Instale o Python 3.8+ de https://python.org
        echo Marque a opcao "Add Python to PATH" durante a instalacao!
        pause
        exit /b 1
    )
    set PYCMD=python
) else (
    set PYCMD=py
)

REM Garante que pip está instalado
echo [1/5] Verificando pip...
%PYCMD% -m ensurepip --default-pip >nul 2>&1

REM Instala dependências
echo [2/5] Instalando dependencias...
%PYCMD% -m pip install requests pywin32 pyinstaller --quiet

REM Compila o executável COM INTERFACE GRÁFICA (sem console)
echo [3/5] Compilando executavel com interface grafica...
%PYCMD% -m PyInstaller --onefile --noconsole --name "ImpressoraPedidos" print_service_gui.py

REM Verifica se o executável foi criado
if not exist "dist\ImpressoraPedidos.exe" (
    echo.
    echo [ERRO] Falha na compilacao! O executavel nao foi criado.
    echo Verifique se o PyInstaller foi instalado corretamente.
    echo.
    echo Tente executar manualmente:
    echo   %PYCMD% -m pip install pyinstaller
    echo   %PYCMD% -m PyInstaller --onefile --noconsole --name "ImpressoraPedidos" print_service_gui.py
    echo.
    pause
    exit /b 1
)

REM Move para pasta de distribuição
echo [4/5] Preparando distribuicao...
if not exist "dist\distribuicao" mkdir "dist\distribuicao"
copy "dist\ImpressoraPedidos.exe" "dist\distribuicao\" >nul
copy "config.ini.example" "dist\distribuicao\" >nul
copy "LEIA-ME.txt" "dist\distribuicao\" >nul

REM Cria o ZIP
echo [5/5] Criando arquivo ZIP...
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
