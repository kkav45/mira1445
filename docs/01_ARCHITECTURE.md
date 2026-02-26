# MIRA 0.1.5.0 — Архитектура проекта

## 📋 Общая информация

**Наименование:** MIRA — Метеоаналитический помощник для БВС  
**Версия:** 0.1.5.0  
**Тип приложения:** Single Page Application (SPA)  
**Платформа:** Веб-браузер (десктоп/мобильная версия)  
**API:** Open-Meteo API (без ключа)

---

## 🏗️ Архитектура приложения

### Модульная структура

```
MIRA/
├── index.html              # Точка входа, UI-разметка
├── css/
│   ├── common.css          # Общие стили
│   ├── mobile.css          # Мобильная адаптация
│   └── desktop.css         # Десктопная адаптация
└── js/
    ├── app.js              # Ядро приложения, инициализация
    ├── weather.js          # Метеоданные, анализ, риски
    ├── route.js            # Управление маршрутами
    ├── wizard.js           # Пошаговый мастер анализа
    ├── pilot.js            # Коррекция по фактическим данным
    ├── charts.js           # Визуализация (Plotly.js)
    ├── map.js              # Карта (OpenLayers)
    ├── pdf-export-2page.js # Экспорт отчётов (PDF)
    ├── storage.js          # Локальное хранилище
    ├── utils.js            # Утилиты
    └── pilot-observations.js # Наблюдения пилота
```

---

## 📦 Основные модули

### 1. AppModule (app.js)

**Назначение:** Ядро приложения, координация работы всех модулей

**Основные функции:**
- `init(options)` — инициализация приложения
- `initModules()` — инициализация всех подмодулей
- `initMap()` — инициализация карты
- `initUI()` — настройка UI под платформу
- `loadSavedData()` — загрузка сохранённых данных
- `bindEvents()` — привязка глобальных событий
- `onStepChange(step)` — обработка смены шага мастера

**Жизненный цикл:**
```
1. Проверка инициализации
2. Определение платформы (desktop/mobile)
3. Инициализация модулей (Wizard, Pilot, Map)
4. Загрузка данных из localStorage
5. Привязка обработчиков событий
6. Готово к работе
```

---

### 2. WeatherModule (weather.js)

**Назначение:** Получение, анализ и обработка метеоданных

**Основные функции:**
- `getForecast(lat, lon, date)` — получение прогноза от Open-Meteo
- `getForecastForSegments(segments, date)` — прогноз для сегментов маршрута
- `analyzeForecast(forecast)` — анализ прогноза (риски, параметры)
- `calculateRiskScore(hour, thresholds)` — расчёт риска для часа
- `calculateIcingRisk(temp, humidity)` — риск обледенения
- `calculateTurbulenceRisk(windSpeed, windGust)` — риск турбулентности
- `findFlightWindows(hourly, thresholds)` — поиск благоприятных окон
- `generateRecommendations(analyzedData, pilotData)` — рекомендации
- `applyPilotCorrection(analyzedData, pilotData)` — коррекция по данным пилота
- `interpolateForAltitude(data, altitude)` — интерполяция для высот

**API параметры:**
```javascript
{
    hourly: [
        'temperature_2m', 'relative_humidity_2m', 'dew_point_2m',
        'precipitation', 'rain', 'showers', 'snowfall',
        'cloud_cover', 'pressure_msl', 'wind_speed_10m',
        'wind_direction_10m', 'wind_gusts_10m', 'visibility',
        'weather_code'
    ],
    daily: [...],
    current_weather: true,
    timezone: 'auto',
    forecast_days: 7
}
```

**Алгоритм анализа:**
```
1. Получение данных от Open-Meteo
2. Кэширование (30 минут)
3. Построение почасового массива
4. Расчёт рисков для каждого часа
5. Определение уровня риска (low/medium/high)
6. Генерация сводки и рекомендаций
```

---

### 3. RouteModule (route.js)

**Назначение:** Создание, управление и анализ маршрутов

**Основные функции:**
- `createRoute(points, name)` — создание маршрута из точек
- `calculateRouteDistance(points)` — расчёт дистанции
- `estimateFlightTime(points, speedKmh)` — оценка времени полёта
- `createSegments(route)` — разбиение на сегменты (по 10 км)
- `analyzeSegments(date)` — анализ всех сегментов
- `calculateSegmentRiskScore(analyzed)` — риск сегмента
- `importKML(file)` — импорт из KML
- `exportToKML(route)` — экспорт в KML
- `getRouteSummary()` — сводка по маршруту

**Структура маршрута:**
```javascript
{
    id: "uuid",
    name: "Маршрут 26.02",
    points: [{lat, lon}, ...],
    createdAt: "ISO date",
    updatedAt: "ISO date",
    distance: 52.9,        // км
    flightTime: 32,        // мин
    type: "manual|kml"
}
```

**Сегментация:**
```
Точка A ─────┬─────┬─────┬─────┬─────┬─────┬─────┐ Точка B
             │Сег 1│Сег 2│Сег 3│Сег 4│Сег 5│Сег 6│
             │10км │10км │10км │10км │10км │2.9км│
```

---

### 4. WizardModule (wizard.js)

**Назначение:** Пошаговый мастер анализа маршрута

**Шаги мастера:**
```
Шаг 1: Маршрут
├── Выбор даты и времени
├── Выбор сохранённого маршрута
├── Загрузка KML
└── Создание маршрута по координатам

Шаг 2: Анализ
├── Вкладка "Рекомендации" — анализ по сегментам
├── Вкладка "Графики" — временные ряды, роза ветров
├── Вкладка "Детали" — таблица по часам
└── Вкладка "Окна" — благоприятные окна

Шаг 3: Пилот
├── Ввод фактических данных
├── Применение коррекции
└── Сравнение прогноз/факт

Шаг 4: Отчёт
└── Экспорт PDF
```

**Состояние мастера:**
```javascript
stepData: {
    date: "2026-02-26",
    time: "10:00",
    route: {...},
    segments: [...],
    segmentAnalysis: [...],
    pilotData: {...},
    correctedAnalysis: {...}
}
```

---

### 5. PilotModule (pilot.js)

**Назначение:** Коррекция прогноза по фактическим данным пилота

**Основные функции:**
- `openModal()` — открытие модального окна
- `collectFormData()` — сбор данных из формы
- `applyCorrection()` — применение коррекции
- `displayComparison(forecast, corrected, pilot)` — сравнение
- `displayDecision(pilotData, corrected)` — решение о полёте

**Вводимые данные:**
| Параметр | Ед. изм. | Диапазон |
|----------|----------|----------|
| Ветер | м/с | 0-50 |
| Направление | ° | 0-360 |
| Температура | °C | -40...+50 |
| Влажность | % | 0-100 |
| Видимость | км | 0.1-10 |
| Облака (нижняя граница) | м | 0-5000 |
| Туман | булево | да/нет |
| Осадки | булево | да/нет |

**Алгоритм коррекции:**
```
1. Ввод данных пилота (фактические замеры)
2. Расчёт коэффициентов:
   - windBias = факт_ветер / прогноз_ветер
   - tempOffset = факт_температура - прогноз_температура
3. Применение ко всем часам прогноза с затуханием:
   - weight = e^(-i / 24)
   - скорр_ветер = прогноз * (1 + (windBias - 1) * weight)
4. Пересчёт рисков и рекомендаций
5. Определение максимально допустимой высоты
```

---

### 6. ChartsModule (charts.js)

**Назначение:** Визуализация метеоданных (Plotly.js)

**Типы графиков:**

| График | Описание | Данные |
|--------|----------|--------|
| Time Series | Временной ряд | Температура, ветер, осадки |
| Vertical Wind Profile | Профиль ветра по высотам | 10, 100, 250, 350, 450, 550 м |
| Temperature Profile | Профиль температуры | Те же высоты |
| Wind Rose | Роза ветров | 8 направлений |
| Turbulence | Индекс турбулентности | % по часам |
| Ceiling | Высота нижней границы облаков | м по часам |
| Flight Windows Calendar | Тепловая карта окон | 24ч × 7 дней |

**Конфигурация Plotly:**
```javascript
{
    responsive: true,
    displayModeBar: false,
    scrollZoom: false,
    displaylogo: false,
    hovermode: 'x unified'
}
```

---

### 7. PdfExportModule (pdf-export-2page.js)

**Назначение:** Генерация PDF-отчётов (pdfmake)

**Структура отчёта:**

**Страница 1:**
- Заголовок (MIRA, дата, маршрут)
- Сводка маршрута (дистанция, время, сегменты, риск)
- Рекомендации (критические, предупреждения, успех)
- Сравнение прогноз/факт (если есть коррекция)
- Временные окна (таблица)

**Страница 2:**
- Детализация по сегментам:
  - Сегмент 1: 4 высоты (250, 350, 450, 550 м)
  - Параметры: ветер, температура, давление, влажность
  - Факторы риска для сегмента

**Стили:**
```javascript
{
    mainTitle: { fontSize: 22, bold: true, color: '#2d3748' },
    subtitle: { fontSize: 11, color: '#718096', margin: [0, 8, 0, 0] },
    label: { fontSize: 10, color: '#718096', margin: [0, 4, 0, 0] },
    value: { fontSize: 20, bold: true, color: '#2d3748' }
}
```

---

### 8. StorageModule (storage.js)

**Назначение:** Локальное хранение данных (localStorage)

**Ключи хранилища:**
```javascript
KEYS: {
    ROUTES: 'mira_routes',        // Сохранённые маршруты
    SETTINGS: 'mira_thresholds',  // Пороги рисков
    PILOT_DATA: 'mira_pilot_data',// Данные пилота
    LAST_ANALYSIS: 'mira_last_analysis',
    CACHE: 'mira_cache'           // Кэш метео
}
```

**Пороги по умолчанию:**
```javascript
{
    windGround: 10,        // м/с (земля)
    windAlt: 15,           // м/с (высота)
    visibility: 2,         // км
    precip: 1.4,           // мм/ч
    tempMin: -10,          // °C
    tempMax: 35,           // °C
    cloudCeiling: 300,     // м
    humidityIcing: 80      // %
}
```

**Кэширование:**
- Метеоданные: 30 минут
- Маршруты: бессрочно
- Данные пилота: бессрочно

---

### 9. MapModule (map.js)

**Назначение:** Работа с картой (OpenLayers)

**Основные функции:**
- `init(mapId)` — инициализация карты
- `centerOnPoint(lat, lon, zoom)` — центрирование
- `addMarker(lat, lon, options)` — добавление маркера
- `setRoute(route)` — отображение маршрута
- `loadKML(file)` — загрузка KML
- `enableSelectPointMode(callback)` — режим выбора точки
- `fitToRoute()` — масштабирование по маршруту

**Слои карты:**
- OSM Standard
- Satellite (ESRI)
- Terrain
- Weather overlays (риск, ветер, осадки)

---

## 🔄 Поток данных

### Сценарий: Анализ маршрута

```
1. Пользователь создаёт/загружает маршрут
   ↓
2. RouteModule.createSegments() — разбиение на сегменты
   ↓
3. WeatherModule.getForecastForSegments() — запрос к API
   ↓
4. WeatherModule.analyzeForecast() — анализ рисков
   ↓
5. WizardModule.switchAnalysisTab() — отображение
   ↓
6. ChartsModule.createTimeSeriesChart() — графики
   ↓
7. Пользователь вводит данные пилота (Шаг 3)
   ↓
8. PilotModule.applyCorrection() — коррекция
   ↓
9. WeatherModule.generateRecommendations() — рекомендации
   ↓
10. PdfExportModule.generateReport() — экспорт PDF
```

---

## 📊 Уровни риска

### Расчёт общего риска (score)

```javascript
calculateRiskScore(hour, thresholds) {
    let score = 0;
    
    // Ветер > порога → +2, > 80% порога → +1
    if (hour.wind10m > thresholds.windGround) score += 2;
    else if (hour.wind10m > thresholds.windGround * 0.8) score += 1;
    
    // Видимость < порога → +2, < 150% → +1
    if (hour.visibility < thresholds.visibility) score += 2;
    else if (hour.visibility < thresholds.visibility * 1.5) score += 1;
    
    // Осадки > порога → +2, > 0.5 → +1
    if (hour.precip > thresholds.precip) score += 2;
    else if (hour.precip > 0.5) score += 1;
    
    // Обледенение high → +2, medium → +1
    if (hour.icingRisk === 'high') score += 2;
    else if (hour.icingRisk === 'medium') score += 1;
    
    return score;
}
```

### Уровни риска

| Score | Уровень | Статус | Цвет |
|-------|---------|--------|------|
| 0-1 | Low | Разрешён | 🟢 |
| 2-4 | Medium | С ограничениями | 🟠 |
| 5+ | High | Запрещён | 🔴 |

---

## 🧮 Математические модели

### 1. Расчёт расстояния (Haversine)

```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Радиус Земли, км
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
```

### 2. Интерполяция для высоты

```javascript
interpolateForAltitude(data, altitude) {
    // Температурный градиент: -6.5°C/км
    const tempLapse = -6.5 / 1000;
    const tempAdjustment = tempLapse * altitude;
    
    // Ветер: +15% на 500м
    const windFactor = 1 + (altitude / 500) * 0.15;
    
    // Давление: барометрическая формула
    const pressure = data.pressure * Math.exp(-altitude / 8500);
    
    return {
        temp: data.temp2m + tempAdjustment,
        wind: data.wind10m * windFactor,
        humidity: Math.max(0, data.humidity - altitude / 100),
        pressure: pressure
    };
}
```

### 3. Экспоненциальное затухание коррекции

```javascript
weight = Math.exp(-i / 24)
```

| Время | i (час) | weight | Доля коррекции |
|-------|---------|--------|----------------|
| 0 ч | 0 | 1.000 | 100% |
| 6 ч | 6 | 0.779 | 78% |
| 12 ч | 12 | 0.606 | 61% |
| 24 ч | 24 | 0.368 | 37% |
| 48 ч | 48 | 0.135 | 14% |

---

## 🎯 Статусы полёта

| Статус | Условия | Индикация |
|--------|---------|-----------|
| **ПОЛЁТ РАЗРЕШЁН** | Все параметры в норме | 🟢 |
| **ПОЛЁТ С ОГРАНИЧЕНИЯМИ** | 1 параметр за порогом | 🟠 |
| **ПОЛЁТ ЗАПРЕЩЁН** | ≥2 параметров за порогом | 🔴 |

---

## 📁 Зависимости

### Внешние библиотеки

| Библиотека | Версия | Назначение |
|------------|--------|------------|
| OpenLayers | v9.2.4 | Карта |
| Plotly.js | v2.27.0 | Графики |
| Font Awesome | v6.5.1 | Иконки |
| pdfmake | v0.1.66 | PDF экспорт |

### API

| Сервис | URL | Назначение |
|--------|-----|------------|
| Open-Meteo | https://api.open-meteo.com/v1/forecast | Метеоданные |

---

## 🔐 Безопасность

- **Геолокация:** используется только для получения метео-данных
- **Данные пилота:** хранятся локально (localStorage)
- **API ключи:** не требуются (Open-Meteo бесплатный)
- **HTTPS:** рекомендуется для публикации

---

## 📈 Производительность

### Оптимизации

- **Кэширование:** 30 минут для метеоданных
- **Дебаунс:** 250 мс для resize событий
- **Ленивая загрузка:** графики инициализируются при переключении вкладок
- **Сегментация:** запросы к API с задержкой 100 мс

### Ограничения

- Максимум сегментов: ~10 (100 км маршрут)
- Максимум точек в маршруте: ~100
- Срок прогноза: 7 дней (Open-Meteo)

---

## 📝 Файловая структура отчётов

### PDF Export

```
Страница 1:
┌─────────────────────────────────────────┐
│ ЗАГОЛОВОК (MIRA, дата, маршрут)        │
├─────────────────────────────────────────┤
│ СВОДКА МАРШРУТА (4 карточки)           │
├─────────────────────────────────────────┤
│ РЕКОМЕНДАЦИИ (список)                  │
├─────────────────────────────────────────┤
│ СРАВНЕНИЕ ПРОГНОЗ/ФАКТ (таблица)       │
├─────────────────────────────────────────┤
│ ВРЕМЕННЫЕ ОКНА (таблица)               │
└─────────────────────────────────────────┘

Страница 2:
┌─────────────────────────────────────────┐
│ ДЕТАЛИЗАЦИЯ ПО СЕГМЕНТАМ               │
├─────────────────────────────────────────┤
│ Сегмент 1 (4 высоты × 4 параметра)     │
│ Сегмент 2 (...)                        │
│ ...                                    │
└─────────────────────────────────────────┘
```

---

## 🧩 Расширяемость

### Добавление нового параметра

1. **WeatherModule:** добавить в `getForecastParams()`
2. **StorageModule:** добавить порог в `getThresholds()`
3. **UI:** добавить карточку в `index.html`
4. **ChartsModule:** добавить график (если нужен)
5. **PdfExportModule:** добавить в отчёт

### Добавление нового типа риска

1. **WeatherModule:** функция `calculate[Name]Risk()`
2. **WeatherModule:** добавить в `calculateRiskScore()`
3. **StorageModule:** добавить порог
4. **UI:** добавить индикатор

---

## 📊 Диаграмма компонентов

```
┌─────────────────────────────────────────────────────┐
│                    App (Ядро)                       │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Weather  │  │  Route   │  │  Wizard  │         │
│  │ Module   │  │ Module   │  │ Module   │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       │             │             │                │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐         │
│  │  Charts  │  │   Map    │  │  Pilot   │         │
│  │ Module   │  │ Module   │  │ Module   │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       │             │             │                │
│  ┌────┴─────────────┴─────────────┴────┐           │
│  │         Storage Module              │           │
│  │         (localStorage)              │           │
│  └─────────────────────────────────────┘           │
└─────────────────────────────────────────────────────┘
         │                    │
    ┌────┴────┐          ┌────┴────┐
    │Open-Meteo│          │OpenLayers│
    │   API    │          │  Map     │
    └─────────┘          └──────────┘
```

---

**Версия документации:** 1.0  
**Дата:** 26 февраля 2026 г.  
**Автор:** QA Department
