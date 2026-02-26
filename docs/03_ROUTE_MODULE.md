# RouteModule — Управление маршрутами

## 📋 Назначение

Модуль `RouteModule` отвечает за:
- Создание и управление маршрутами БВС
- Разбиение маршрута на сегменты
- Расчёт дистанции и времени полёта
- Импорт/экспорт KML
- Анализ метеорологических условий по сегментам

**Файл:** `js/route.js`

---

## 🗺️ Структура маршрута

### Объект маршрута

```javascript
{
    id: "uuid",                    // Уникальный идентификатор
    name: "Маршрут 26.02",         // Название
    points: [                      // Массив точек
        { lat: 55.7558, lon: 37.6173 },
        { lat: 55.7600, lon: 37.6200 },
        ...
    ],
    createdAt: "2026-02-26T10:00", // Дата создания
    updatedAt: "2026-02-26T10:00", // Дата обновления
    distance: 52.9,                // Дистанция, км
    flightTime: 32,                // Время полёта, мин
    type: "manual|kml"             // Тип создания
}
```

### Типы маршрутов

| Тип | Описание |
|-----|----------|
| `manual` | Создан вручную через UI (координаты или карта) |
| `kml` | Импортирован из KML-файла |

---

## ➕ Создание маршрута

### createRoute(points, name)

**Назначение:** Создание нового маршрута из массива точек

**Параметры:**
- `points` (array) — массив точек [{ lat, lon }, ...]
- `name` (string, optional) — название маршрута

**Возвращает:** object | null — объект маршрута или null

**Алгоритм:**
```javascript
createRoute(points, name = null) {
    // 1. Проверка минимального количества точек
    if (points.length < 2) {
        Utils.error('Недостаточно точек для маршрута');
        return null;
    }

    // 2. Создание объекта маршрута
    const route = {
        id: Utils.generateId(),
        name: name || `Маршрут ${new Date().toLocaleDateString('ru-RU')}`,
        points: points,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        distance: this.calculateRouteDistance(points),
        flightTime: this.estimateFlightTime(points),
        type: 'manual'
    };

    // 3. Сохранение как текущего маршрута
    this.currentRoute = route;
    
    // 4. Логирование
    Utils.log(`Маршрут создан: ${route.name}, ${route.distance.toFixed(1)} км`);
    
    return route;
}
```

**Пример использования:**
```javascript
const route = RouteModule.createRoute(
    [
        { lat: 55.7558, lon: 37.6173 },  // Москва
        { lat: 55.7600, lon: 37.6200 },  // Точка 2
        { lat: 55.7650, lon: 37.6250 }   // Точка 3
    ],
    "Тестовый маршрут"
);

console.log(`Дистанция: ${route.distance} км`);
console.log(`Время полёта: ${route.flightTime} мин`);
```

---

## 📏 Расчёт дистанции

### calculateRouteDistance(points)

**Назначение:** Расчёт общей дистанции маршрута

**Параметры:**
- `points` (array) — массив точек

**Возвращает:** number — дистанция в км

**Алгоритм (сумма расстояний между точками):**
```javascript
calculateRouteDistance(points) {
    let total = 0;
    
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        
        // Расчёт расстояния между двумя точками (Haversine)
        total += Utils.calculateDistance(
            prev.lat, prev.lon,
            curr.lat, curr.lon
        );
    }
    
    return total;
}
```

**Формула Haversine:**

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1−a))
d = R × c
```

где:
- `R = 6371 км` — радиус Земли
- `Δlat = lat2 - lat1`
- `Δlon = lon2 - lon1`

**Пример расчёта:**

```
Точка A: 55.7558°N, 37.6173°E
Точка B: 55.7600°N, 37.6200°E

Δlat = 55.7600 - 55.7558 = 0.0042° = 0.0000733 рад
Δlon = 37.6200 - 37.6173 = 0.0027° = 0.0000471 рад

a = sin²(0.0000366) + cos(0.973) × cos(0.973) × sin²(0.0000236)
a ≈ 1.34×10⁻⁹ + 0.563 × 0.563 × 5.57×10⁻¹⁰
a ≈ 1.34×10⁻⁹ + 1.77×10⁻¹⁰ = 1.52×10⁻⁹

c = 2 × atan2(√1.52×10⁻⁹, √(1-1.52×10⁻⁹))
c ≈ 2 × 0.000039 = 0.000078 рад

d = 6371 × 0.000078 = 0.497 км ≈ 500 м
```

---

## ⏱️ Оценка времени полёта

### estimateFlightTime(points, speedKmh)

**Назначение:** Оценка времени полёта по маршруту

**Параметры:**
- `points` (array) — массив точек
- `speedKmh` (number, optional) — скорость, км/ч (по умолчанию 50)

**Возвращает:** number — время в минутах

**Формула:**
```
time_minutes = (distance_km / speed_kmh) × 60
```

**Алгоритм:**
```javascript
estimateFlightTime(points, speedKmh = 50) {
    const distance = this.calculateRouteDistance(points);
    return Math.round(distance / speedKmh * 60);
}
```

**Примеры для разных скоростей:**

| Дистанция | Скорость | Время |
|-----------|----------|-------|
| 10 км | 50 км/ч | 12 мин |
| 10 км | 70 км/ч | 9 мин |
| 50 км | 50 км/ч | 60 мин |
| 50 км | 70 км/ч | 43 мин |
| 100 км | 50 км/ч | 120 мин |

---

## ✂️ Разбиение на сегменты

### createSegments(route)

**Назначение:** Разбиение маршрута на сегменты заданной длины

**Параметры:**
- `route` (object, optional) — маршрут (по умолчанию currentRoute)

**Возвращает:** array — массив сегментов

**Структура сегмента:**
```javascript
{
    points: [{ lat, lon }, ...],  // Точки сегмента
    center: { lat, lon },         // Центральная точка
    distance: 10.5                // Длина сегмента, км
}
```

**Алгоритм:**
```javascript
createSegments(route = this.currentRoute) {
    if (!route || !route.points) return [];

    this.segments = [];
    const points = route.points;
    let currentSegment = [points[0]];
    let currentDistance = 0;

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const dist = Utils.calculateDistance(
            prev.lat, prev.lon,
            curr.lat, curr.lon
        );

        // Если добавление точки превысит длину сегмента
        if (currentDistance + dist >= this.segmentLengthKm) {
            // 1. Завершаем текущий сегмент
            this.segments.push({
                points: [...currentSegment],
                center: this.getSegmentCenter(currentSegment),
                distance: currentDistance
            });

            // 2. Начинаем новый сегмент
            currentSegment = [curr];
            currentDistance = 0;
        } else {
            // Добавляем точку к текущему сегменту
            currentSegment.push(curr);
            currentDistance += dist;
        }
    }

    // Добавляем последний сегмент
    if (currentSegment.length > 0) {
        this.segments.push({
            points: [...currentSegment],
            center: this.getSegmentCenter(currentSegment),
            distance: currentDistance
        });
    }

    Utils.log(`Создано ${this.segments.length} сегментов`);
    return this.segments;
}
```

**Визуализация разбиения:**

```
Маршрут: A ─────────────────────────────────────────────── B
         │                                                │
         0 км                                           52.9 км

Сегменты (длина = 10 км):
         │────────│────────│────────│────────│────────│────│
         Сег 1    Сег 2    Сег 3    Сег 4    Сег 5    Сег 6
         10 км    10 км    10 км    10 км    10 км    2.9 км
         
Центры сегментов:
         ●        ●        ●        ●        ●        ●
         5 км     15 км    25 км    35 км    45 км    51.5 км
```

**Настройка длины сегмента:**
```javascript
// По умолчанию
RouteModule.segmentLengthKm = 10;  // 10 км

// Изменение
RouteModule.setSegmentLength(15);  // 15 км
```

---

### getSegmentCenter(points)

**Назначение:** Получение центральной точки сегмента

**Параметры:**
- `points` (array) — точки сегмента

**Возвращает:** object — { lat, lon }

**Алгоритм:**
```javascript
getSegmentCenter(points) {
    if (points.length === 0) return { lat: 0, lon: 0 };
    if (points.length === 1) return points[0];

    // Берём среднюю точку
    const midIndex = Math.floor(points.length / 2);
    return points[midIndex];
}
```

---

## 🔬 Анализ сегментов

### analyzeSegments(date)

**Назначение:** Получение и анализ прогноза для каждого сегмента

**Параметры:**
- `date` (string, optional) — дата в формате YYYY-MM-DD

**Возвращает:** Promise<array> — массив результатов анализа

**Структура результата:**
```javascript
[
    {
        segmentIndex: 0,
        coordinates: { lat: 55.75, lon: 37.62 },
        distance: 10.2,
        forecast: { ... },           // Данные API
        analyzed: { ... },           // Проанализированные
        riskLevel: "low",            // Общий риск
        riskScore: 0.8               // Средний score
    },
    ...
]
```

**Алгоритм:**
```javascript
async analyzeSegments(date = null) {
    if (this.segments.length === 0) {
        Utils.error('Нет сегментов для анализа');
        return [];
    }

    this.segmentAnalysis = [];

    for (let i = 0; i < this.segments.length; i++) {
        const segment = this.segments[i];
        const center = segment.center;

        try {
            // 1. Получение прогноза для центра сегмента
            const forecast = await WeatherModule.getForecast(
                center.lat, 
                center.lon, 
                date
            );
            
            // 2. Анализ прогноза
            const analyzed = WeatherModule.analyzeForecast(forecast);

            // 3. Сохранение результатов
            this.segmentAnalysis.push({
                segmentIndex: i,
                coordinates: center,
                distance: segment.distance,
                forecast: forecast,
                analyzed: analyzed,
                riskLevel: analyzed.summary.overallRisk,
                riskScore: this.calculateSegmentRiskScore(analyzed)
            });
        } catch (error) {
            Utils.error(`Ошибка анализа сегмента ${i}`, error);
            this.segmentAnalysis.push({
                segmentIndex: i,
                coordinates: center,
                error: error.message
            });
        }

        // Задержка между запросами (100 мс)
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    Utils.log(`Проанализировано ${this.segmentAnalysis.length} сегментов`);
    return this.segmentAnalysis;
}
```

---

### calculateSegmentRiskScore(analyzed)

**Назначение:** Расчёт среднего риска сегмента

**Параметры:**
- `analyzed` (object) — проанализированные данные

**Возвращает:** number — score (0-3)

**Алгоритм:**
```javascript
calculateSegmentRiskScore(analyzed) {
    if (!analyzed || !analyzed.hourly) return 0;

    const highRiskCount = analyzed.hourly.filter(h => h.risk === 'high').length;
    const mediumRiskCount = analyzed.hourly.filter(h => h.risk === 'medium').length;
    const total = analyzed.hourly.length;

    const highRatio = highRiskCount / total;
    const mediumRatio = mediumRiskCount / total;

    // >30% часов с высоким риском → score = 3
    if (highRatio > 0.3) return 3;
    
    // >10% high или >50% medium → score = 2
    if (highRatio > 0.1 || mediumRatio > 0.5) return 2;
    
    // >20% medium → score = 1
    if (mediumRatio > 0.2) return 1;
    
    return 0;
}
```

**Шкала риска сегмента:**

| Score | Описание | Цвет |
|-------|----------|------|
| 0 | Нет рисков | 🟢 |
| 1 | Единичные риски | 🟢🟢 |
| 2 | Средний риск | 🟠 |
| 3 | Высокий риск | 🔴 |

---

### getSegmentData(index)

**Назначение:** Получение полных данных сегмента

**Параметры:**
- `index` (number) — индекс сегмента

**Возвращает:** object | null — данные сегмента

**Структура:**
```javascript
{
    points: [...],
    center: { lat, lon },
    distance: 10.2,
    analysis: { ... },
    index: 0
}
```

---

## 📊 Сводка по маршруту

### getRouteSummary()

**Назначение:** Получение общей сводки по маршруту

**Возвращает:** object | null — сводка

**Структура:**
```javascript
{
    totalSegments: 6,              // Количество сегментов
    totalDistance: "52.9",         // Общая дистанция, км
    avgRiskScore: "1.2",           // Средний риск
    riskLevels: {                  // Распределение по уровням
        low: 4,
        medium: 1,
        high: 1
    },
    overallRisk: "medium",         // Общий риск маршрута
    flightTime: 32                 // Время полёта, мин
}
```

**Алгоритм:**
```javascript
getRouteSummary() {
    if (this.segmentAnalysis.length === 0) return null;

    // 1. Общая дистанция
    const totalDistance = this.segments.reduce(
        (sum, s) => sum + s.distance, 
        0
    );
    
    // 2. Средний риск
    const avgRiskScore = this.segmentAnalysis.reduce(
        (sum, s) => sum + (s.riskScore || 0), 
        0
    ) / this.segmentAnalysis.length;

    // 3. Подсчёт по уровням
    const riskLevels = {
        low: this.segmentAnalysis.filter(s => s.riskLevel === 'low').length,
        medium: this.segmentAnalysis.filter(s => s.riskLevel === 'medium').length,
        high: this.segmentAnalysis.filter(s => s.riskLevel === 'high').length
    };

    // 4. Определение общего риска
    let overallRisk = 'low';
    if (riskLevels.high > this.segmentAnalysis.length * 0.3) {
        overallRisk = 'high';
    } else if (riskLevels.medium > this.segmentAnalysis.length * 0.5) {
        overallRisk = 'medium';
    }

    return {
        totalSegments: this.segments.length,
        totalDistance: totalDistance.toFixed(1),
        avgRiskScore: avgRiskScore.toFixed(1),
        riskLevels: riskLevels,
        overallRisk: overallRisk,
        flightTime: this.estimateFlightTime(this.currentRoute.points)
    };
}
```

**Пример сводки:**

```
┌─────────────────────────────────────────┐
│ СВОДКА МАРШРУТА                         │
├─────────────────────────────────────────┤
│ Сегментов:     6                        │
│ Дистанция:     52.9 км                  │
│ Время:         32 мин                   │
│ Средний риск:  1.2                      │
├─────────────────────────────────────────┤
│ Распределение:                          │
│ 🟢 Низкий:     4 сегмента (67%)         │
│ 🟠 Средний:    1 сегмент (17%)          │
│ 🔴 Высокий:    1 сегмент (17%)          │
├─────────────────────────────────────────┤
│ ОБЩИЙ РИСК: 🟠 СРЕДНИЙ                  │
└─────────────────────────────────────────┘
```

---

## 📁 Работа с KML

### importKML(file)

**Назначение:** Импорт маршрута из KML-файла

**Параметры:**
- `file` (File) — KML-файл

**Возвращает:** Promise<object> | null — маршрут

**Алгоритм:**
```javascript
async importKML(file) {
    try {
        // 1. Загрузка KML через MapModule
        const result = await MapModule.loadKML(file);

        // 2. Проверка наличия точек
        if (result.routePoints && result.routePoints.length >= 2) {
            // 3. Создание маршрута
            this.currentRoute = {
                id: Utils.generateId(),
                name: file.name.replace('.kml', ''),
                points: result.routePoints,
                createdAt: new Date().toISOString(),
                distance: this.calculateRouteDistance(result.routePoints),
                flightTime: this.estimateFlightTime(result.routePoints),
                type: 'kml'
            };

            // 4. Создание сегментов
            this.createSegments();
            
            return this.currentRoute;
        }

        return null;
    } catch (error) {
        Utils.error('Ошибка импорта KML', error);
        throw error;
    }
}
```

**Формат KML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Маршрут 1</name>
    <Placemark>
      <name>Маршрут 1</name>
      <LineString>
        <coordinates>
          37.6173,55.7558,0
          37.6200,55.7600,0
          37.6250,55.7650,0
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>
```

**Требования:**
- Минимум 2 точки
- Координаты в формате: `lon,lat,altitude`
- Поддержка LineString

---

### exportToKML(route)

**Назначение:** Экспорт маршрута в KML-файл

**Параметры:**
- `route` (object, optional) — маршрут (по умолчанию currentRoute)

**Алгоритм:**
```javascript
exportToKML(route = this.currentRoute) {
    if (!route || !route.points) return null;

    // 1. Генерация KML-содержимого
    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${route.name}</name>
    <Placemark>
      <name>${route.name}</name>
      <LineString>
        <coordinates>
          ${route.points.map(p => `${p.lon},${p.lat},0`).join('\n          ')}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

    // 2. Создание Blob
    const blob = new Blob([kmlContent], { type: 'application/kml+xml' });
    const url = URL.createObjectURL(blob);

    // 3. Скачивание файла
    const a = document.createElement('a');
    a.href = url;
    a.download = `${route.name}.kml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Utils.log('Маршрут экспортирован в KML');
}
```

**Пример скачанного файла:**
```
Маршрут 26.02.kml
```

---

## 💾 Сохранение и загрузка

### saveRoute(route)

**Назначение:** Сохранение маршрута в localStorage

**Параметры:**
- `route` (object, optional) — маршрут

**Возвращает:** boolean — успех

**Алгоритм:**
```javascript
saveRoute(route = this.currentRoute) {
    if (!route) return false;
    return Storage.saveRoute(route);
}
```

---

### getSavedRoutes()

**Назначение:** Получение списка сохранённых маршрутов

**Возвращает:** array — массив маршрутов

**Алгоритм:**
```javascript
getSavedRoutes() {
    return Storage.getSavedRoutes();
}
```

**Структура:**
```javascript
[
    {
        id: "abc123",
        name: "Маршрут 26.02",
        distance: 52.9,
        points: [...],
        createdAt: "...",
        updatedAt: "..."
    },
    ...
]
```

---

### loadRoute(id)

**Назначение:** Загрузка маршрута по ID

**Параметры:**
- `id` (string) — ID маршрута

**Возвращает:** object | null — маршрут

**Алгоритм:**
```javascript
loadRoute(id) {
    const route = Storage.getRouteById(id);
    if (route) {
        this.currentRoute = route;
        this.createSegments(route);
    }
    return route;
}
```

---

### deleteRoute(id)

**Назначение:** Удаление маршрута

**Параметры:**
- `id` (string) — ID маршрута

**Возвращает:** boolean — успех

---

### clear()

**Назначение:** Очистка текущего маршрута

**Алгоритм:**
```javascript
clear() {
    this.currentRoute = null;
    this.segments = [];
    this.segmentAnalysis = [];
    MapModule.clearRoute();
    Utils.log('Маршрут очищен');
}
```

---

## ⚙️ Настройки

### segmentLengthKm

**Назначение:** Длина сегмента по умолчанию

**Значение:** `10` (км)

**Изменение:**
```javascript
RouteModule.setSegmentLength(15);  // 15 км
```

---

## 📊 Примеры использования

### Пример 1: Создание простого маршрута

```javascript
// Создание маршрута из 2 точек
const route = RouteModule.createRoute(
    [
        { lat: 55.7558, lon: 37.6173 },
        { lat: 55.7600, lon: 37.6200 }
    ],
    "Тестовый"
);

// Сохранение
RouteModule.saveRoute(route);

console.log(`Дистанция: ${route.distance} км`);
console.log(`Время: ${route.flightTime} мин`);
```

### Пример 2: Разбиение и анализ

```javascript
// Создание сегментов
RouteModule.createSegments();

console.log(`Создано сегментов: ${RouteModule.segments.length}`);

// Анализ
const analysis = await RouteModule.analyzeSegments('2026-02-26');

// Вывод результатов по каждому сегменту
analysis.forEach((seg, i) => {
    console.log(`Сегмент ${i + 1}:`);
    console.log(`  Дистанция: ${seg.distance} км`);
    console.log(`  Риск: ${seg.riskLevel}`);
    console.log(`  Score: ${seg.riskScore}`);
});
```

### Пример 3: Импорт KML

```javascript
// Обработчик загрузки файла
document.getElementById('kmlInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            const route = await RouteModule.importKML(file);
            if (route) {
                RouteModule.saveRoute(route);
                showToast(`Маршрут "${route.name}" загружен`, 'success');
            }
        } catch (error) {
            showToast('Ошибка: ' + error.message, 'error');
        }
    }
});
```

### Пример 4: Получение сводки

```javascript
const summary = RouteModule.getRouteSummary();

if (summary) {
    console.log(`Маршрут: ${summary.totalDistance} км`);
    console.log(`Время: ${summary.flightTime} мин`);
    console.log(`Сегментов: ${summary.totalSegments}`);
    console.log(`Риск: ${summary.overallRisk}`);
    console.log(`Низкий: ${summary.riskLevels.low}`);
    console.log(`Средний: ${summary.riskLevels.medium}`);
    console.log(`Высокий: ${summary.riskLevels.high}`);
}
```

---

## 🔄 Поток данных

### Полный цикл работы

```
1. Пользователь создаёт маршрут
   ↓
2. RouteModule.createRoute(points)
   ↓
3. RouteModule.saveRoute(route)
   ↓
4. RouteModule.createSegments()
   ↓
5. RouteModule.analyzeSegments(date)
   ↓
6. WeatherModule.getForecastForSegments()
   ↓
7. WeatherModule.analyzeForecast()
   ↓
8. RouteModule.getRouteSummary()
   ↓
9. Отображение результатов в UI
```

---

## ⚠️ Ограничения

### Минимальные требования

| Параметр | Значение |
|----------|----------|
| Мин. точек в маршруте | 2 |
| Мин. длина сегмента | 1 км |
| Макс. точек в маршруте | ~100 |
| Макс. сегментов | ~20 |

### Производительность

| Операция | Время |
|----------|-------|
| Создание маршрута | <10 мс |
| Разбиение на сегменты | <50 мс |
| Анализ 1 сегмента | ~200 мс |
| Анализ 6 сегментов | ~1.2 с |

### API ограничения

- Задержка между запросами: 100 мс
- Макс. запросов в минуту: ~600
- Кэширование: 30 минут

---

## 📝 Changelog

### Версия 0.1.5.0

- ✅ Улучшена сегментация маршрутов
- ✅ Добавлена поддержка KML импорта/экспорта
- ✅ Оптимизирован анализ сегментов

### Версия 0.1.4.2

- ✅ Добавлен расчёт риска сегмента
- ✅ Улучшена сводка по маршруту
- ✅ Добавлено сохранение в localStorage

---

**Версия документации:** 1.0  
**Дата:** 26 февраля 2026 г.  
**Модуль:** RouteModule (js/route.js)
