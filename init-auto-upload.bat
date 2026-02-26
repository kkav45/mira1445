@echo off
chcp 65001 >nul
echo ========================================
echo   MIRA - Настройка автозагрузки
echo ========================================
echo.

REM Проверка Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git не установлен!
    echo Установите: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [1/4] Инициализация Git...
if not exist .git (
    git init
    echo Репозиторий создан
) else (
    echo Репозиторий уже существует
)
echo.

echo [2/4] Настройка пользователя...
git config user.name "kkav45"
git config user.email "kkav45@users.noreply.github.com"
echo Пользователь: kkav45
echo.

echo [3/4] Настройка удалённого репозитория...
git remote remove origin 2>nul
git remote add origin https://github.com/kkav45/mira0143.git
echo Репозиторий: https://github.com/kkav45/mira0143
echo.

echo [4/4] Сохранение учётных данных...
git config --global credential.helper store
echo Учётные данные будут сохранены
echo.

echo ========================================
echo   Настройка завершена!
echo ========================================
echo.
echo ТЕПЕРЬ:
echo 1. Запустите start-auto-deploy.bat
echo 2. При первом пуше введите логин/пароль GitHub
echo 3. Далее загрузка будет автоматической
echo.

REM Первая загрузка для сохранения учётных данных
echo [INFO] Первая загрузка для настройки...
echo.

git add .
git commit -m "Initial commit: MIRA v0.1.4.3"
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   [УСПЕХ] Настройка завершена!
    echo ========================================
    echo.
    echo Теперь запустите start-auto-deploy.bat
    echo для автоматической загрузки изменений
    echo.
) else (
    echo.
    echo ========================================
    echo   [INFO] Введите учётные данные GitHub
    echo ========================================
    echo.
    echo После ввода пароля запуск будет автоматическим
    echo.
)

pause
