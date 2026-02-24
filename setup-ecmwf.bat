@echo off
chcp 65001 >nul
echo ========================================
echo  Установка ECMWF API для MIRA
echo ========================================
echo.

:: Проверка Python
echo [1/3] Проверка Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python не найден!
    echo.
    echo Установите Python: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo ✓ Python установлен

:: Установка зависимостей
echo.
echo [2/3] Установка зависимостей...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Ошибка установки зависимостей
    pause
    exit /b 1
)
echo ✓ Зависимости установлены

:: Копирование шаблона конфигурации
echo.
echo [3/3] Настройка конфигурации...
if not exist ".ecmwfapirc" (
    echo Скопируйте .ecmwfapirc.example в .ecmwfapirc
    echo и заполните ваш API-ключ
    echo.
    echo Файл для редактирования: %USERPROFILE%\.ecmwfapirc
) else (
    echo ✓ Конфигурация найдена
)

echo.
echo ========================================
echo  ✓ Установка завершена!
echo ========================================
echo.
echo Далее:
echo 1. Получите API-ключ: https://api.ecmwf.int/v1/key/
echo 2. Создайте файл %USERPROFILE%\.ecmwfapirc
echo 3. Запустите: python ecmwf_client.py --test
echo.
pause
