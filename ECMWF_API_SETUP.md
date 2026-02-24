# 🔑 Настройка ECMWF API для MIRA

**ECMWF** (European Centre for Medium-Range Weather Forecasts) — европейский центр среднесрочных прогнозов погоды. Предоставляет доступ к архивам метеоданных (TIGGE, ERA5).

---

## ⚠️ ВАЖНО: Безопасность API-ключа

**Никогда не публикуйте свой API-ключ!**

- ❌ Не коммитьте файл `.ecmwfapirc` в Git
- ❌ Не публикуйте ключи в коде или чате
- ✅ Используйте `.gitignore` (уже настроен)
- ✅ Храните ключ в файле конфигурации вне репозитория

---

## 📋 Шаг 1: Регистрация в ECMWF

1. Перейдите на https://www.ecmwf.int
2. Нажмите **Register** и создайте аккаунт
3. Подтвердите email

---

## 📋 Шаг 2: Получение API-ключа

1. Перейдите на https://api.ecmwf.int/v1/key/
2. Войдите под своим аккаунтом
3. Скопируйте ключ (выглядит как `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

> **Важно:** Ключ действителен 1 год. За месяц до истечения придёт уведомление.

---

## 📋 Шаг 3: Настройка конфигурации

### Вариант A: Файл `.ecmwfapirc` (рекомендуется)

1. Создайте файл в домашней директории:
   
   **Windows:** `C:\Users\ВашеИмя\.ecmwfapirc`
   
   **Linux/Mac:** `~/.ecmwfapirc`

2. Добавьте содержимое:

```json
{
    "url"   : "https://api.ecmwf.int/v1",
    "key"   : "ВАШ_КЛЮЧ_ЗДЕСЬ",
    "email" : "ваш@email.com"
}
```

### Вариант B: Переменные окружения

Создайте файл `.env` в корне проекта (на основе `.env.example`):

```bash
ECMWF_API_URL=https://api.ecmwf.int/v1
ECMWF_API_KEY=ВАШ_КЛЮЧ_ЗДЕСЬ
ECMWF_API_EMAIL=ваш@email.com
```

Или установите в системе:

**Windows (PowerShell):**
```powershell
$env:ECMWF_API_KEY="ВАШ_КЛЮЧ"
$env:ECMWF_API_EMAIL="ваш@email"
```

**Linux/Mac:**
```bash
export ECMWF_API_KEY="ВАШ_КЛЮЧ"
export ECMWF_API_EMAIL="ваш@email"
```

---

## 📋 Шаг 4: Установка библиотеки

```bash
pip install ecmwf-api-client
```

Или для конкретного проекта:

```bash
cd "d:\! Погода\MIRA 0.1.4.1"
python -m venv venv
venv\Scripts\activate
pip install ecmwf-api-client
```

---

## 📋 Шаг 5: Проверка работы

### Тестовый запуск:

```bash
python ecmwf_client.py --test
```

**Ожидаемый вывод:**
```
✓ Конфигурация из C:\Users\...\ecmwfapirc
✓ ECMWF сервер инициализирован

Конфигурация: {'url': 'https://api.ecmwf.int/v1', 'key': '...', 'email': '...'}

✓ Тест пройден!
```

### Загрузка данных TIGGE:

```bash
python ecmwf_client.py --date 2024-11-01 --output data.grib --dataset tigge
```

### Загрузка данных ERA5:

```bash
python ecmwf_client.py --date 2024-11-01 --output data.grib --dataset era5 --param 2m_temperature
```

---

## 📊 Доступные наборы данных

### TIGGE (ансамблевые прогнозы)
| Параметр | Код | Описание |
|----------|-----|----------|
| Температура | 167 | 2m temperature |
| Ветер | 165/166 | U/V компоненты |
| Осадки | 228 | Total precipitation |
| Давление | 151 | Mean sea level pressure |

### ERA5 (реанализ)
| Параметр | Описание |
|----------|----------|
| 2m_temperature | Температура на высоте 2м |
| total_precipitation | Суммарные осадки |
| 10m_u_component_of_wind | Ветер U на 10м |
| 10m_v_component_of_wind | Ветер V на 10м |

---

## 🔧 Использование в Python-коде

```python
from ecmwf_client import ECMWFClient

# Инициализация (конфигурация загружается автоматически)
client = ECMWFClient()

# Загрузка TIGGE
client.get_tigge_data(
    date='2024-11-01',
    output_file='temperature.grib',
    area='70/-130/30/-60',  # N/W/S/E
    param='167'
)

# Загрузка ERA5
client.get_era5_data(
    date='2024-11-01',
    output_file='era5.grib',
    param='2m_temperature'
)
```

---

## 🗂️ Структура файлов

```
MIRA 0.1.4.1/
├── ecmwf_client.py           # Python-клиент ECMWF
├── .ecmwfapirc.example       # Шаблон конфигурации
├── .ecmwfapirc               # ⚠️ КОНФИДЕНЦИАЛЬНО (в .gitignore)
├── .env.example              # Шаблон переменных окружения
├── .env                      # ⚠️ КОНФИДЕНЦИАЛЬНО (в .gitignore)
├── output.grib               # Загруженные данные
└── ECMWF_API_SETUP.md        # Эта инструкция
```

---

## ⚠️ Возможные ошибки

### "Authentication failed"
- Проверьте правильность ключа в `.ecmwfapirc`
- Убедитесь, что аккаунт активирован

### "User has no permission"
- Для TIGGE требуется принятие лицензии: https://apps.ecmwf.int/datasets/data/tigge/licence/
- Некоторые наборы данных требуют специального доступа

### "Connection timeout"
- Проверьте подключение к интернету
- ECMWF API может быть временно недоступен

---

## 📚 Дополнительные ресурсы

- **Документация ECMWF API**: https://confluence.ecmwf.int/display/WEBAPI
- **TIGGE данные**: https://apps.ecmwf.int/datasets/data/tigge
- **ERA5 данные**: https://confluence.ecmwf.int/display/CKB/ERA5
- **Параметры GRIB**: https://codes.ecmwf.int/grib/param-db/

---

## 🆘 Поддержка

Вопросы по интеграции ECMWF в MIRA создавайте в Issues репозитория.
