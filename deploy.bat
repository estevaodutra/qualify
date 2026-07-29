@echo off
chcp 65001 > null
set /p msg="Digite a mensagem do commit (ou pressione Enter para usar mensagem automática): "
if "%msg%"=="" (
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
    set msg="auto: atualização em %datetime:~6,2%/%datetime:~4,2%/%datetime:~0,4% às %datetime:~8,2%:%datetime:~10,2%"
)
echo Executando build de teste...
npm run build
if %errorlevel% neq 0 (
    echo [ERRO] O build falhou! Commit cancelado para evitar quebrar a produção.
    pause
    exit /b %errorlevel%
)
echo Adicionando alterações...
git add .
echo Commitando com a mensagem: %msg%
git commit -m %msg%
echo Enviando para o repositório remoto (git push)...
git push
echo Processo concluído com sucesso!
pause
