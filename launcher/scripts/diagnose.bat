@echo off
setlocal EnableDelayedExpansion

echo ========================================================
echo   RoboCrypto Launcher - Ferramenta de Diagnostico
echo ========================================================
echo.

set "LOGFILE=%~dp0..\logs\diagnostics_%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%.txt"
set "LOGFILE=%LOGFILE: =0%"

if not exist "%~dp0..\logs" mkdir "%~dp0..\logs"

echo [INFO] Iniciando diagnostico em %date% %time% > "%LOGFILE%"
echo [INFO] Sistema Operacional: %OS% >> "%LOGFILE%"

echo 1. Verificando Node.js...

:: 1.1 Check Portable
set "PORTABLE_NODE=%~dp0..\tools\node\node-v20.10.0-win-x64\node.exe"
if exist "%PORTABLE_NODE%" (
    echo    [OK] Node.js Portatil encontrado.
    echo [OK] Node.js Portatil: Encontrado >> "%LOGFILE%"
    set "NODE_CMD="%PORTABLE_NODE%""
) else (
    echo    [INFO] Node.js Portatil nao encontrado.
    echo [INFO] Node.js Portatil: Nao encontrado >> "%LOGFILE%"
    
    :: 1.2 Check System
    node --version > nul 2>&1
    if !errorlevel! equ 0 (
        for /f "delims=" %%v in ('node --version') do set NODE_VER=%%v
        echo    [OK] Node.js Sistema encontrado: !NODE_VER!
        echo [OK] Node.js Sistema: !NODE_VER! >> "%LOGFILE%"
        set NODE_CMD=node
    ) else (
        echo    [ERRO] Node.js nao encontrado (Nem portatil, nem no PATH).
        echo [ERRO] Node.js: Nao encontrado >> "%LOGFILE%"
    )
)

echo.
echo 2. Verificando NPM...
if defined NODE_CMD (
    :: If using portable node, npm is usually alongside or we check standard path
    :: For portable, we might need to look for npm-cli.js or similar if not in path
    :: But let's just check if we can run "npm -v" using the found node context
    
    :: Simplification: Just try running npm
    npm --version > nul 2>&1
    if !errorlevel! equ 0 (
        for /f "delims=" %%v in ('npm --version') do set NPM_VER=%%v
        echo    [OK] NPM encontrado: !NPM_VER!
        echo [OK] NPM: !NPM_VER! >> "%LOGFILE%"
    ) else (
        echo    [AVISO] NPM global nao encontrado. (Normal se usando Node portatil)
        echo [AVISO] NPM Global: Nao encontrado >> "%LOGFILE%"
    )
) else (
    echo    [ERRO] Nao e possivel verificar NPM sem Node.js.
)

echo.
echo 3. Verificando Conexao com Internet...
ping -n 1 8.8.8.8 > nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] Conexao ativa.
    echo [OK] Internet: Conectado >> "%LOGFILE%"
) else (
    echo    [AVISO] Sem conexao com a internet. Recursos online podem falhar.
    echo [AVISO] Internet: Desconectado >> "%LOGFILE%"
)

echo.
echo 4. Verificando Permissoes de Escrita...
echo teste > "%~dp0test_write.tmp"
if exist "%~dp0test_write.tmp" (
    echo    [OK] Permissao de escrita confirmada.
    echo [OK] Escrita: Permitido >> "%LOGFILE%"
    del "%~dp0test_write.tmp"
) else (
    echo    [ERRO] Falha ao escrever no diretorio. Execute como Administrador.
    echo [ERRO] Escrita: Negado >> "%LOGFILE%"
)

echo.
echo 5. Verificando Portas (9999)...
netstat -an | find "9999" > nul 2>&1
if %errorlevel% equ 0 (
    echo    [AVISO] A porta 9999 ja esta em uso. O Launcher pode falhar ao iniciar o dashboard.
    echo [AVISO] Porta 9999: Em uso >> "%LOGFILE%"
) else (
    echo    [OK] Porta 9999 livre.
    echo [OK] Porta 9999: Livre >> "%LOGFILE%"
)

echo.
echo ========================================================
echo   Diagnostico Concluido.
echo   Relatorio salvo em: %LOGFILE%
echo ========================================================
pause
