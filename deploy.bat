@echo off
chcp 65001 >nul
echo ========================================
echo   MIRA - Ручная загрузка на GitHub
echo ========================================
echo.

REM Проверка наличия изменений
git status >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Это не Git репозиторий!
    echo Выполните: init-auto-upload.bat
    pause
    exit /b 1
)

REM Добавление всех изменений
echo [1/4] Добавление файлов...
git add .

REM Коммит
echo [2/4] Создание коммита...
git commit -m "Update: %date% %time%"

REM Пуш на GitHub
echo [3/4] Загрузка на GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   [УСПЕХ] Загрузка завершена!
    echo ========================================
    echo.
    echo Репозиторий: https://github.com/kkav45/mira0143
    echo GitHub Pages: https://kkav45.github.io/mira0143/
) else (
    echo.
    echo ========================================
    echo   [ОШИБКА] Не удалось загрузить файлы
    echo ========================================
    echo.
    echo Возможные причины:
    echo - Нет подключения к интернету
    echo - Не настроен SSH ключ
    echo - Репозиторий не существует
)

echo.
pause
