# StorageModule — Хранение данных

## 📋 Назначение

Модуль `StorageModule` управляет локальным хранением данных в localStorage браузера.

**Файл:** `js/storage.js`

---

## 🗄️ Ключи хранилища

```javascript
KEYS: {
    ROUTES: 'mira_routes',        // Сохранённые маршруты
    SETTINGS: 'mira_thresholds',  // Пороги рисков
    PILOT_DATA: 'mira_pilot_data',// Данные пилота
    LAST_ANALYSIS: 'mira_last_analysis',
    CACHE: 'mira_cache'           // Кэш метео
}
```

---

## 📊 Структуры данных

### Маршруты

```javascript
{
    id: "uuid",
    name: "Маршрут 26.02",
    points: [{lat, lon}, ...],
    distance: 52.9,
    flightTime: 32,
    createdAt: "ISO date",
    updatedAt: "ISO date"
}
```

### Пороги (thresholds)

```javascript
{
    windGround: 10,        // м/с
    windAlt: 15,           // м/с
    visibility: 2,         // км
    precip: 1.4,           // мм/ч
    tempMin: -10,          // °C
    tempMax: 35,           // °C
    cloudCeiling: 300,     // м
    humidityIcing: 80      // %
}
```

### Данные пилота

```javascript
{
    windSpeed: 11,
    windDir: 260,
    temp: 3,
    humidity: 85,
    visibility: 5,
    cloudBase: 400,
    fog: true,
    precip: true,
    coords: {lat, lon},
    savedAt: "ISO date"
}
```

---

## 🔧 Основные функции

### Работа с маршрутами

| Функция | Описание |
|---------|----------|
| `saveRoute(route)` | Сохранить маршрут |
| `getSavedRoutes()` | Получить все маршруты |
| `getRouteById(id)` | Получить маршрут по ID |
| `deleteRoute(id)` | Удалить маршрут |
| `clearAllRoutes()` | Очистить все маршруты |

### Работа с настройками

| Функция | Описание |
|---------|----------|
| `saveThresholds(thresholds)` | Сохранить пороги |
| `getThresholds()` | Получить пороги (или default) |

### Работа с данными пилота

| Функция | Описание |
|---------|----------|
| `savePilotData(data)` | Сохранить данные пилота |
| `getPilotData()` | Получить данные пилота |
| `clearPilotData()` | Очистить данные |

### Кэширование

| Функция | Описание |
|---------|----------|
| `saveToCache(key, data, minutes)` | Сохранить в кэш |
| `getFromCache(key)` | Получить из кэша |
| `clearAllCache()` | Очистить весь кэш |
| `clearExpiredCache()` | Очистить устаревший кэш |

---

## ⏱️ Кэширование

### Срок хранения

| Данные | Срок |
|--------|------|
| Метеопрогноз | 30 минут |
| Маршруты | Бессрочно |
| Данные пилота | Бессрочно |
| Настройки | Бессрочно |

### Формат кэша

```javascript
{
    key: "forecast_55.75_37.61_today",
    data: {...},
    timestamp: 1234567890,
    expires: 1234569690  // +30 минут
}
```

---

## 📝 Changelog

### Версия 0.1.5.0

- ✅ Добавлено хранение данных пилота
- ✅ Улучшено кэширование метеоданных

---

**Версия документации:** 1.0  
**Дата:** 26 февраля 2026 г.  
**Модуль:** StorageModule (js/storage.js)
