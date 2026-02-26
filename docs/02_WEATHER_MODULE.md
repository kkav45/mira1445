# WeatherModule — Метеоданные и анализ

## 📋 Назначение

Модуль `WeatherModule` отвечает за:
- Получение прогнозов погоды от Open-Meteo API
- Анализ метеопараметров
- Расчёт рисков для полётов БВС
- Генерацию рекомендаций
- Коррекцию прогноза по фактическим данным

**Файл:** `js/weather.js`

---

## 🔌 API Open-Meteo

### Базовый URL

```
https://api.open-meteo.com/v1/forecast
```

### Параметры запроса

#### Hourly параметры

| Параметр | Описание | Ед. изм. |
|----------|----------|----------|
| `temperature_2m` | Температура на высоте 2м | °C |
| `relative_humidity_2m` | Относительная влажность на 2м | % |
| `dew_point_2m` | Точка росы на 2м | °C |
| `apparent_temperature` | Ощущаемая температура | °C |
| `precipitation_probability` | Вероятность осадков | % |
| `precipitation` | Количество осадков | мм/ч |
| `rain` | Дождь | мм/ч |
| `showers` | Ливни | мм/ч |
| `snowfall` | Снегопад | см/ч |
| `weather_code` | Код погоды (WMO) | — |
| `cloud_cover` | Общая облачность | % |
| `cloud_cover_low` | Нижняя облачность | % |
| `cloud_cover_mid` | Средняя облачность | % |
| `cloud_cover_high` | Верхняя облачность | % |
| `pressure_msl` | Давление на уровне моря | гПа |
| `surface_pressure` | Давление на поверхности | гПа |
| `wind_speed_10m` | Ветер на 10м | м/с |
| `wind_direction_10m` | Направление ветра на 10м | ° |
| `wind_gusts_10m` | Порывы ветра на 10м | м/с |
| `visibility` | Видимость | м |
| `evapotranspiration` | Эвапотранспирация | мм/ч |

#### Daily параметры

| Параметр | Описание |
|----------|----------|
| `weather_code` | Код погоды дня |
| `temperature_2m_max` | Макс. температура |
| `temperature_2m_min` | Мин. температура |
| `apparent_temperature_max` | Ощущаемая макс. |
| `apparent_temperature_min` | Ощущаемая мин. |
| `precipitation_sum` | Сумма осадков |
| `precipitation_hours` | Часов с осадками |
| `wind_speed_10m_max` | Макс. ветер |
| `wind_gusts_10m_max` | Макс. порывы |
| `wind_direction_10m_dominant` | Доминирующее направление |
| `sunrise` | Восход солнца |
| `sunset` | Закат солнца |

#### Current Weather

```javascript
current_weather: true
```

Возвращает текущие условия:
- `temperature` — текущая температура
- `windspeed` — текущий ветер
- `winddirection` — направление
- `weather_code` — код погоды
- `time` — время измерения

---

## 📡 Функции получения данных

### getForecast(lat, lon, date)

**Назначение:** Получение прогноза для точки

**Параметры:**
- `lat` (number) — широта
- `lon` (number) — долгота
- `date` (string, optional) — дата в формате YYYY-MM-DD

**Возвращает:** Promise<object> — данные прогноза

**Пример:**
```javascript
const forecast = await WeatherModule.getForecast(55.7558, 37.6173, '2026-02-26');
```

**Кэширование:**
- Ключ кэша: `forecast_${lat.toFixed(2)}_${lon.toFixed(2)}_${date || 'today'}`
- Срок: 30 минут

**URL запроса:**
```
https://api.open-meteo.com/v1/forecast?
  latitude=55.7558&
  longitude=37.6173&
  hourly=temperature_2m,relative_humidity_2m,...&
  daily=weather_code,temperature_2m_max,...&
  current_weather=true&
  timezone=auto&
  forecast_days=7
```

---

### getForecastForSegments(segments, date)

**Назначение:** Получение прогноза для всех сегментов маршрута

**Параметры:**
- `segments` (array) — массив сегментов маршрута
- `date` (string, optional) — дата

**Возвращает:** Promise<array> — массив результатов

**Структура результата:**
```javascript
[
    {
        segmentIndex: 0,
        coordinates: { lat: 55.75, lon: 37.62 },
        forecast: { ... },
        analyzed: { ... }
    },
    ...
]
```

**Алгоритм:**
```
1. Для каждого сегмента:
   а. Получить центральную точку
   б. Запросить прогноз
   в. Проанализировать
   г. Добавить задержку 100 мс
2. Вернуть массив результатов
```

---

### getSegmentCenter(segment)

**Назначение:** Получение центральной точки сегмента

**Параметры:**
- `segment` (array) — массив точек сегмента

**Возвращает:** object — { lat, lon }

**Логика:**
```javascript
if (segment.length === 0) return { lat: 0, lon: 0 };
if (segment.length === 1) return segment[0];

const midIndex = Math.floor(segment.length / 2);
return segment[midIndex];
```

---

## 🔬 Анализ прогноза

### analyzeForecast(forecast)

**Назначение:** Полный анализ прогноза погоды

**Параметры:**
- `forecast` (object) — данные от API

**Возвращает:** object — проанализированные данные

**Структура результата:**
```javascript
{
    hourly: [
        {
            time: "2026-02-26T10:00",
            temp2m: 5.2,
            humidity: 78,
            dewPoint: 2.1,
            wind10m: 6.5,
            windDir: 245,
            windGust: 9.2,
            precip: 0.0,
            rain: 0.0,
            snow: 0.0,
            cloudCover: 45,
            cloudCoverLow: 20,
            pressure: 1013.25,
            visibility: 8.5,
            weatherCode: 2,
            riskScore: 1,
            risk: "low",
            icingRisk: "low",
            turbulenceRisk: "medium"
        },
        ...
    ],
    daily: { ... },
    current: { ... },
    summary: {
        validHoursCount: 18,
        flightWindows: [...],
        avgTemp: "5.3",
        avgWind: "6.8",
        maxWind: "12.5",
        totalPrecip: "2.4",
        overallRisk: "low"
    }
}
```

**Алгоритм:**
```
1. Извлечь hourly данные
2. Для каждого часа:
   а. Нормализовать параметры
   б. Рассчитать riskScore
   в. Определить risk (low/medium/high)
   г. Рассчитать icingRisk
   д. Рассчитать turbulenceRisk
3. Сгенерировать summary
4. Вернуть структуру
```

---

## ⚠️ Расчёт рисков

### calculateRiskScore(hour, thresholds)

**Назначение:** Расчёт общего балла риска

**Параметры:**
- `hour` (object) — данные за час
- `thresholds` (object) — пороги рисков

**Возвращает:** number — score (0-8)

**Алгоритм расчёта:**

```javascript
calculateRiskScore(hour, thresholds) {
    let score = 0;

    // 1. Ветер (макс. +2)
    if (hour.wind10m > thresholds.windGround) {
        score += 2;  // Ветер превышает порог
    } else if (hour.wind10m > thresholds.windGround * 0.8) {
        score += 1;  // Ветер > 80% порога
    }

    // 2. Видимость (макс. +2)
    if (hour.visibility < thresholds.visibility) {
        score += 2;  // Видимость ниже порога
    } else if (hour.visibility < thresholds.visibility * 1.5) {
        score += 1;  // Видимость < 150% порога
    }

    // 3. Осадки (макс. +2)
    if (hour.precip > thresholds.precip) {
        score += 2;  // Осадки выше порога
    } else if (hour.precip > 0.5) {
        score += 1;  // Осадки > 0.5 мм/ч
    }

    // 4. Обледенение (макс. +2)
    if (hour.icingRisk === 'high') {
        score += 2;
    } else if (hour.icingRisk === 'medium') {
        score += 1;
    }

    return score;
}
```

**Максимальный score:** 8 баллов

---

### getRiskLevel(score)

**Назначение:** Определение уровня риска по score

**Параметры:**
- `score` (number) — балл риска

**Возвращает:** string — "low", "medium", "high"

**Таблица уровней:**

| Score | Уровень | Цвет | Статус |
|-------|---------|------|--------|
| 0-1 | low | 🟢 #38a169 | Разрешён |
| 2-4 | medium | 🟠 #ed8936 | С ограничениями |
| 5+ | high | 🔴 #e53e3e | Запрещён |

---

### calculateIcingRisk(temp, humidity)

**Назначение:** Оценка риска обледенения

**Параметры:**
- `temp` (number) — температура, °C
- `humidity` (number) — влажность, %

**Возвращает:** string — "low", "medium", "high"

**Алгоритм:**
```javascript
calculateIcingRisk(temp, humidity) {
    const thresholds = Storage.getThresholds();
    
    // Условия для обледенения:
    // - Температура от +5 до -10°C
    // - Влажность выше порога (80%)
    if (temp <= 5 && temp >= -10 && humidity > thresholds.humidityIcing) {
        // Высокий риск: от 0 до -5°C
        if (temp <= 0 && temp >= -5) {
            return 'high';
        }
        // Средний риск: остальной диапазон
        return 'medium';
    }
    
    return 'low';
}
```

**Диаграмма риска обледенения:**

```
Температура (°C)
+5 ─┬──────────────────────┐
    │                      │
 0 ─┤    HIGH RISK         │
    │    (0...-5°C)        │
-5 ─┤                      │
    │                      │
-10 ─┴──────────────────────┘
    0%    50%    80%   100%
          Влажность (%)
    
    ┌────┬────────┬────┐
    │ LOW│ MEDIUM │HIGH│
    └────┴────────┴────┘
```

---

### calculateTurbulenceRisk(windSpeed, windGust)

**Назначение:** Оценка риска турбулентности

**Параметры:**
- `windSpeed` (number) — скорость ветра, м/с
- `windGust` (number) — порывы, м/с

**Возвращает:** string — "low", "medium", "high"

**Алгоритм:**
```javascript
calculateTurbulenceRisk(windSpeed, windGust) {
    // Коэффициент порывистости
    const gustFactor = windSpeed > 0 ? windGust / windSpeed : 1;
    
    // Высокая турбулентность:
    // - Порывы > 50% от среднего
    // - Или ветер > 15 м/с
    if (gustFactor > 1.5 || windSpeed > 15) {
        return 'high';
    }
    
    // Средняя турбулентность:
    // - Порывы > 20% от среднего
    // - Или ветер > 10 м/с
    if (gustFactor > 1.2 || windSpeed > 10) {
        return 'medium';
    }
    
    return 'low';
}
```

**Примеры:**

| Ветер | Порывы | Gust Factor | Риск |
|-------|--------|-------------|------|
| 5 м/с | 6 м/с | 1.2 | medium |
| 5 м/с | 8 м/с | 1.6 | high |
| 12 м/с | 14 м/с | 1.17 | medium |
| 16 м/с | 18 м/с | 1.125 | high |

---

## 🪟 Поиск полётных окон

### findFlightWindows(hourly, thresholds, minDuration)

**Назначение:** Поиск благоприятных периодов для полёта

**Параметры:**
- `hourly` (array) — почасовые данные
- `thresholds` (object) — пороги
- `minDuration` (number, optional) — мин. длительность (часы)

**Возвращает:** array — массив окон

**Структура окна:**
```javascript
{
    start: "2026-02-26T10:00",
    end: "2026-02-26T14:00",
    hours: [
        { time: "...", riskScore: 0, ... },
        ...
    ]
}
```

**Алгоритм:**
```
1. Инициализировать: windows = [], currentWindow = null
2. Для каждого часа:
   а. Если riskScore < 2 (благоприятно):
      - Если нет текущего окна: создать
      - Иначе: добавить час к текущему
   б. Иначе (неблагоприятно):
      - Если окно ≥ minDuration: сохранить в windows
      - Очистить currentWindow
3. Проверить последнее окно
4. Вернуть windows
```

**Пример:**
```
Час:     08 09 10 11 12 13 14 15 16 17 18 19 20 21
Риск:    🟠 🟢 🟢 🟢 🟢 🟠 🔴 🔴 🟠 🟢 🟢 🟢 🟠 🟢
         │     └─── Окно 1 ───┘         └─Окно 2─┘
         
Окно 1: 10:00-14:00 (4 часа)
Окно 2: 18:00-21:00 (3 часа)
```

---

## 📊 Сводка данных

### generateSummary(hourly, thresholds)

**Назначение:** Генерация общей сводки

**Параметры:**
- `hourly` (array) — почасовые данные
- `thresholds` (object) — пороги

**Возвращает:** object — summary

**Структура:**
```javascript
{
    validHoursCount: 18,        // Часов с riskScore < 3
    flightWindows: [...],       // Найденные окна
    avgTemp: "5.3",            // Средняя температура
    avgWind: "6.8",            // Средний ветер
    maxWind: "12.5",           // Максимальный ветер
    totalPrecip: "2.4",        // Сумма осадков
    overallRisk: "low"         // Общий риск
}
```

### getOverallRisk(hourly)

**Назначение:** Определение общего риска по массиву часов

**Параметры:**
- `hourly` (array) — почасовые данные

**Возвращает:** string — "low", "medium", "high"

**Критерии:**
```javascript
const highRiskCount = hourly.filter(h => h.risk === 'high').length;
const mediumRiskCount = hourly.filter(h => h.risk === 'medium').length;

if (highRiskCount > hourly.length * 0.3) {
    return 'high';      // >30% часов с высоким риском
}
if (mediumRiskCount > hourly.length * 0.5) {
    return 'medium';    // >50% часов со средним риском
}
return 'low';
```

---

## 🎯 Генерация рекомендаций

### generateRecommendations(analyzedData, pilotData)

**Назначение:** Формирование рекомендаций для пилота

**Параметры:**
- `analyzedData` (object) — проанализированные данные
- `pilotData` (object, optional) — данные пилота

**Возвращает:** array — массив рекомендаций

**Структура рекомендации:**
```javascript
{
    type: "critical|warning|success|info",
    icon: "fa-wind",
    text: "<strong>Ветер 8 м/с</strong> превышает порог..."
}
```

**Типы рекомендаций:**

| Тип | Значок | Описание |
|-----|--------|----------|
| critical | ⚠️ | Критично, полёт не рекомендуется |
| warning | ⚡ | Предупреждение, будьте осторожны |
| success | ✅ | Благоприятные условия |
| info | ℹ️ | Дополнительная информация |

**Алгоритм генерации:**

```
1. Проверка ветра:
   - > порога → critical
   - > 80% порога → warning

2. Проверка осадков:
   - > 0 → warning

3. Проверка обледенения:
   - есть hours с high → critical

4. Проверка видимости:
   - есть hours с низкой → warning

5. Поиск полётных окон:
   - есть → success (лучшее окно)

6. Если есть коррекция пилота:
   - добавить info

7. Если нет рекомендаций:
   - добавить success (всё в норме)
```

**Пример вывода:**
```javascript
[
    {
        type: "warning",
        icon: "fa-wind",
        text: "<strong>Ветер 8.5 м/с</strong> близок к порогу. Мониторьте усиление."
    },
    {
        type: "success",
        icon: "fa-check-circle",
        text: "<strong>Благоприятное окно: 10:00–14:00</strong>. Лучшее время для полёта."
    },
    {
        type: "info",
        icon: "fa-flag",
        text: "<strong>Данные скорректированы</strong> по фактическим наблюдениям."
    }
]
```

---

## 🔧 Коррекция прогноза

### applyPilotCorrection(analyzedData, pilotData)

**Назначение:** Коррекция прогноза по фактическим данным пилота

**Параметры:**
- `analyzedData` (object) — проанализированный прогноз
- `pilotData` (object) — фактические данные

**Возвращает:** object — скорректированные данные

**Алгоритм:**

```javascript
applyPilotCorrection(analyzedData, pilotData) {
    // 1. Расчёт коэффициентов коррекции
    const corrections = {
        // Отношение фактического ветра к прогнозному
        windBias: pilotData.windSpeed / analyzedData.hourly[0].wind10m,
        
        // Разница фактической и прогнозной температуры
        tempOffset: pilotData.temp - analyzedData.hourly[0].temp2m,
        
        // Переопределение видимости (если туман)
        visibilityOverride: pilotData.fog ? 0.5 : null
    };
    
    // 2. Глубокое копирование данных
    const corrected = JSON.parse(JSON.stringify(analyzedData));
    
    // 3. Применение коррекции ко всем часам
    corrected.hourly = corrected.hourly.map((hour, i) => {
        // Вес уменьшается экспоненциально
        const weight = Math.exp(-i / 24);
        
        return {
            ...hour,
            // Коррекция ветра с затуханием
            wind10m: hour.wind10m * (1 + (corrections.windBias - 1) * weight),
            
            // Коррекция температуры с затуханием
            temp2m: hour.temp2m + (corrections.tempOffset * weight),
            
            // Переопределение видимости (без затухания)
            visibility: corrections.visibilityOverride !== null
                ? corrections.visibilityOverride
                : hour.visibility
        };
    });
    
    corrected.corrected = true;
    corrected.corrections = corrections;
    
    return corrected;
}
```

**Формула затухания:**
```
weight = e^(-i / 24)
```

**Таблица затухания:**

| Время | i | weight | Доля коррекции |
|-------|---|--------|----------------|
| Сейчас | 0 | 1.000 | 100% |
| +1 ч | 1 | 0.959 | 96% |
| +3 ч | 3 | 0.882 | 88% |
| +6 ч | 6 | 0.779 | 78% |
| +12 ч | 12 | 0.606 | 61% |
| +24 ч | 24 | 0.368 | 37% |
| +36 ч | 36 | 0.223 | 22% |
| +48 ч | 48 | 0.135 | 14% |

**Пример расчёта:**

```
Прогноз Open-Meteo:  ветер 8 м/с, температура +5°C
Факт пилота:         ветер 11 м/с, температура +3°C

coefficients:
  windBias = 11 / 8 = 1.375  (+37.5%)
  tempOffset = 3 - 5 = -2°C

Прогноз на 6 часов вперёд (weight = 0.779):
  Ветер:   10 м/с * (1 + (1.375 - 1) * 0.779) = 12.9 м/с
  Темп.:   +2°C + (-2 * 0.779) = +0.4°C
```

---

## 📈 Интерполяция для высот

### interpolateForAltitude(data, altitude)

**Назначение:** Расчёт параметров для заданной высоты

**Параметры:**
- `data` (object) — данные на уровне земли
- `altitude` (number) — высота, м

**Возвращает:** object — скорректированные данные

**Математические модели:**

#### 1. Температурный градиент

```
T(h) = T₀ + lapse_rate × h
```

где:
- `lapse_rate = -6.5°C/км = -0.0065°C/м`
- `h` — высота над уровнем земли

**Пример:**
```
T₀ = +20°C (на земле)
h = 500 м

T(500) = 20 + (-0.0065 × 500) = 20 - 3.25 = +16.75°C
```

#### 2. Профиль ветра

```
V(h) = V₀ × (1 + (h / 500) × 0.15)
```

где:
- `V₀` — ветер на 10м
- `h` — высота, м
- `0.15` — прирост 15% на 500м

**Пример:**
```
V₀ = 10 м/с
h = 500 м

V(500) = 10 × (1 + (500 / 500) × 0.15) = 10 × 1.15 = 11.5 м/с
```

#### 3. Барометрическая формула

```
P(h) = P₀ × e^(-h / H)
```

где:
- `P₀` — давление на уровне моря
- `H = 8500 м` — высота однородной атмосферы

**Пример:**
```
P₀ = 1013.25 гПа
h = 500 м

P(500) = 1013.25 × e^(-500 / 8500) = 1013.25 × 0.943 = 955.5 гПа
```

#### 4. Влажность

```
RH(h) = max(0, RH₀ - h / 100)
```

**Пример:**
```
RH₀ = 80%
h = 500 м

RH(500) = max(0, 80 - 500/100) = max(0, 75) = 75%
```

**Полная функция:**
```javascript
interpolateForAltitude(data, altitude) {
    const tempLapse = -6.5 / 1000;  // °C/м
    const tempAdjustment = tempLapse * altitude;
    
    const windFactor = 1 + (altitude / 500) * 0.15;
    
    return {
        temp: (data.temp2m || 0) + tempAdjustment,
        wind: (data.wind10m || 0) * windFactor,
        windDir: data.windDir || 0,
        humidity: Math.max(0, (data.humidity || 50) - (altitude / 100)),
        pressure: data.pressure * Math.exp(-altitude / 8500)
    };
}
```

**Пример расчёта для 5 высот:**

```
Дано:
  temp2m = +20°C
  wind10m = 10 м/с
  humidity = 80%
  pressure = 1013.25 гПа

Высота  | Темп.  | Ветер   | Давление | Влажность
--------|--------|---------|----------|----------
10 м    | +19.9° | 10.0 м/с| 1012 гПа | 79.9%
100 м   | +19.4° | 10.3 м/с| 1002 гПа | 79%
250 м   | +18.4° | 10.8 м/с| 984 гПа  | 77.5%
350 м   | +17.7° | 11.1 м/с| 972 гПа  | 76.5%
450 м   | +17.1° | 11.4 м/с| 960 гПа  | 75.5%
550 м   | +16.4° | 11.7 м/с| 949 гПа  | 74.5%
```

---

## 📊 Подготовка данных для графиков

### prepareChartData(analyzedData)

**Назначение:** Преобразование данных для Plotly

**Параметры:**
- `analyzedData` (object) — проанализированные данные

**Возвращает:** object — данные для графиков

**Структура:**
```javascript
{
    times: ["10:00", "11:00", "12:00", ...],
    temperature: [5.2, 5.8, 6.1, ...],
    humidity: [78, 75, 72, ...],
    wind10m: [6.5, 7.2, 7.8, ...],
    windDir: [245, 250, 255, ...],
    precip: [0.0, 0.0, 0.2, ...],
    cloudCover: [45, 50, 55, ...],
    pressure: [1013.25, 1013.1, ...],
    visibility: [8.5, 8.2, 7.9, ...],
    riskScore: [1, 1, 2, ...]
}
```

---

## 🧹 Управление кэшем

### clearCache()

**Назначение:** Очистка кэша метеоданных

**Алгоритм:**
```javascript
clearCache() {
    Storage.clearAllCache();
    Utils.log('Кэш метео очищен');
}
```

---

## 📋 Пороговые значения

### Значения по умолчанию

```javascript
{
    windGround: 10,        // м/с — ветер на земле
    windAlt: 15,           // м/с — ветер на высоте
    visibility: 2,         // км — мин. видимость
    precip: 1.4,           // мм/ч — макс. осадки
    tempMin: -10,          // °C — мин. температура
    tempMax: 35,           // °C — макс. температура
    cloudCeiling: 300,     // м — нижняя граница облаков
    humidityIcing: 80      // % — влажность для обледенения
}
```

### Влияние на риск

| Параметр | Условие | Баллы |
|----------|---------|-------|
| Ветер | > порога | +2 |
| Ветер | > 80% порога | +1 |
| Видимость | < порога | +2 |
| Видимость | < 150% порога | +1 |
| Осадки | > порога | +2 |
| Осадки | > 0.5 мм/ч | +1 |
| Обледенение | high | +2 |
| Обледенение | medium | +1 |

---

## 🔍 Коды погоды WMO

### Weather Codes

| Код | Описание |
|-----|----------|
| 0 | Ясно |
| 1 | Преимущественно ясно |
| 2 | Переменная облачность |
| 3 | Пасмурно |
| 45, 48 | Туман |
| 51-55 | Морось |
| 61-65 | Дождь |
| 71-75 | Снег |
| 80-82 | Ливень |
| 95-99 | Гроза |

---

## 📊 Примеры использования

### Пример 1: Получение прогноза

```javascript
// Получение прогноза для Москвы
const forecast = await WeatherModule.getForecast(55.7558, 37.6173);

// Анализ
const analyzed = WeatherModule.analyzeForecast(forecast);

// Вывод результатов
console.log(`Средняя температура: ${analyzed.summary.avgTemp}°C`);
console.log(`Средний ветер: ${analyzed.summary.avgWind} м/с`);
console.log(`Общий риск: ${analyzed.summary.overallRisk}`);
```

### Пример 2: Поиск благоприятных окон

```javascript
const windows = analyzed.summary.flightWindows;

windows.forEach((window, i) => {
    const start = new Date(window.start).toLocaleTimeString();
    const end = new Date(window.end).toLocaleTimeString();
    const duration = window.hours.length;
    
    console.log(`Окно ${i + 1}: ${start} - ${end} (${duration} ч)`);
});
```

### Пример 3: Генерация рекомендаций

```javascript
const recommendations = WeatherModule.generateRecommendations(analyzed);

recommendations.forEach(rec => {
    const icon = rec.type === 'critical' ? '⚠️' : 
                 rec.type === 'warning' ? '⚡' : 
                 rec.type === 'success' ? '✅' : 'ℹ️';
    
    console.log(`${icon} ${rec.text}`);
});
```

### Пример 4: Коррекция по данным пилота

```javascript
const pilotData = {
    windSpeed: 11,
    temp: 3,
    fog: false
};

const corrected = WeatherModule.applyPilotCorrection(analyzed, pilotData);

// Пересчёт рекомендаций
const newRecommendations = WeatherModule.generateRecommendations(
    corrected, 
    pilotData
);
```

---

## ⚠️ Ограничения

### API ограничения

- **forecast_days:** максимум 7 дней
- **hourly:** 168 часов (7 × 24)
- **rate_limit:** 10 000 запросов/день (без ключа)

### Точность модели

- **Температурный градиент:** упрощённая модель (-6.5°C/км)
- **Профиль ветра:** логарифмическая аппроксимация
- **Давление:** барометрическая формула (изотермическая)
- **Влажность:** линейное уменьшение

### Погрешности

| Параметр | Погрешность |
|----------|-------------|
| Температура (2м) | ±1-2°C |
| Ветер (10м) | ±1-2 м/с |
| Осадки | ±20-30% |
| Видимость | ±10-15% |

---

## 📝 Changelog

### Версия 0.1.5.0

- ✅ Добавлена коррекция по данным пилота
- ✅ Экспоненциальное затухание коррекции
- ✅ Генерация рекомендаций с учётом фактических данных
- ✅ Расчёт максимальной допустимой высоты

### Версия 0.1.4.2

- ✅ Анализ по 4 высотам (250, 350, 450, 550 м)
- ✅ Вертикальный профиль рисков
- ✅ Пространственное распределение рисков

---

**Версия документации:** 1.0  
**Дата:** 26 февраля 2026 г.  
**Модуль:** WeatherModule (js/weather.js)
