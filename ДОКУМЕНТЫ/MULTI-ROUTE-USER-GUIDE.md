# 🗺️ MULTI-ROUTE MODULE — РУКОВОДСТВО ПОЛЬЗОВАТЕЛЯ

**Версия:** 0.3.0  
**Дата:** 1 марта 2026 г.  
**Статус:** ✅ Базовая реализация

---

## 📋 НАЗНАЧЕНИЕ

Модуль `MultiRouteModule` предназначен для планирования полётов с несколькими маршрутами из нескольких точек взлёта (баз).

**Основные возможности:**
- ✅ Работа с несколькими точками взлёта
- ✅ Загрузка и управление маршрутами
- ✅ Автоматическая оптимизация порядка полёта
- ✅ Учёт погодных условий для каждой базы
- ✅ Проверка антенны (60 км)
- ✅ Расчёт энергии для всех маршрутов
- ✅ Визуализация на карте

---

## 🚀 БЫСТРЫЙ СТАРТ

### Шаг 1: Инициализация модуля

```javascript
// Инициализация при загрузке страницы
MultiRouteModule.init();
```

### Шаг 2: Добавление точек взлёта

```javascript
// Добавить основную базу
MultiRouteModule.addTakeoffPoint({
    lat: 55.7558,
    lon: 37.6173,
    name: 'База А (основная)',
    priority: 1,
    voltage: 25.4,
    capacity: 39000,
    antenna: 60
});

// Добавить резервную базу
MultiRouteModule.addTakeoffPoint({
    lat: 55.8558,
    lon: 37.7173,
    name: 'База Б (резервная)',
    priority: 2
});
```

### Шаг 3: Загрузка маршрутов

```javascript
// Добавить маршрут из сегментов
MultiRouteModule.addRoute({
    id: 'route-1',
    name: 'Маршрут 1',
    segments: [
        { id: 1, lat: 55.75, lon: 37.61, distance: 5 },
        { id: 2, lat: 55.76, lon: 37.62, distance: 5 },
        { id: 3, lat: 55.77, lon: 37.63, distance: 5 },
        // ...
    ],
    totalDistance: 50
});
```

### Шаг 4: Оптимизация

```javascript
// Запустить оптимизацию с учётом погоды
const weatherData = WeatherModule.cachedData;
const assignment = MultiRouteModule.optimizeAssignment(weatherData);

console.log('Распределение:', assignment);
```

### Шаг 5: Визуализация на карте

```javascript
// Инициализация карты
MultiRouteMapModule.init(map);

// Отобразить точки взлёта
MultiRouteMapModule.displayAllTakeoffPoints(MultiRouteModule.takeoffPoints);

// Отобразить маршруты
MultiRouteMapModule.displayAllRoutes(MultiRouteModule.routes);

// Отобразить зону антенны
const base = MultiRouteModule.takeoffPoints[0];
MultiRouteMapModule.displayAntennaZone(base, base.antenna);
```

---

## 📊 СТРУКТУРА ДАННЫХ

### Точка взлёта (База)

```javascript
{
    id: 'base-1234567890',
    name: 'База А',
    lat: 55.7558,
    lon: 37.6173,
    priority: 1,              // 1 = основная, 2 = резервная, ...
    battery: {
        voltage: 25.4,        // Напряжение на взлёте (В)
        capacity: 39000,      // Ёмкость (мА·ч)
        minVoltage: 19.8      // Мин. напряжение на посадке (В)
    },
    antenna: 60,              // Дальность антенны (км)
    weatherWindow: {
        start: '10:00',
        end: '12:00',
        duration: 120,        // минут
        avgWind: 5,           // м/с
        precip: 0,            // мм/ч
        status: 'good'        // 'good' | 'poor' | 'unknown'
    }
}
```

### Маршрут

```javascript
{
    id: 'route-1234567890',
    name: 'Маршрут 1',
    segments: [
        { id: 1, lat: 55.75, lon: 37.61, distance: 5 },
        { id: 2, lat: 55.76, lon: 37.62, distance: 5 },
        // ...
    ],
    totalDistance: 50,        // км
    status: 'full',           // 'full' | 'partial' | 'skipped'
    entryPoint: {
        segmentId: 3,
        lat: 55.77,
        lon: 37.63,
        distance: 2.5         // км от базы
    },
    flightPlan: {
        leftSide: {
            direction: 'С3 → С1',
            distance: 10,     // км
            energy: 85        // Вт·ч
        },
        rightSide: {
            direction: 'С3 → С10',
            distance: 25,     // км
            energy: 210       // Вт·ч
        },
        total: {
            distance: 35,     // км
            energy: 295,      // Вт·ч
            time: 42          // мин
        }
    },
    assignedBase: 'base-1234567890'
}
```

### Распределение (Assignment)

```javascript
[
    {
        base: { ... },        // Объект базы
        routes: [ ... ],      // Массив маршрутов
        totalDistance: 100,   // км
        totalEnergy: 760      // Вт·ч
    },
    // ...
]
```

---

## 🔧 API МОДУЛЯ

### MultiRouteModule

| Метод | Описание | Параметры | Возвращает |
|-------|----------|-----------|------------|
| `init()` | Инициализация модуля | — | void |
| `addTakeoffPoint(point)` | Добавить точку взлёта | `point: {lat, lon, name, ...}` | `takeoffPoint` |
| `removeTakeoffPoint(id)` | Удалить точку взлёта | `id: string` | void |
| `addRoute(route)` | Добавить маршрут | `route: {id, name, segments, ...}` | `route` |
| `removeRoute(id)` | Удалить маршрут | `id: string` | void |
| `findNearestEntryPoint(route, point)` | Найти ближайшую точку входа | `route, point` | `entryPoint` |
| `calculateFlightPlan(route, entry, point)` | Расчёт плана полёта | `route, entryPoint, takeoffPoint` | `flightPlan` |
| `checkAntennaRange(route, point, max)` | Проверка антенны | `route, point, maxRange` | `boolean` |
| `checkEnergyBudget(route, battery, plan)` | Проверка энергии | `route, battery, flightPlan` | `boolean` |
| `optimizeAssignment(weather)` | Оптимизация распределения | `weatherData` | `assignment` |
| `getAssignment()` | Получить распределение | — | `assignment` |
| `getSummary()` | Получить статистику | — | `summary` |

### MultiRouteMapModule

| Метод | Описание | Параметры | Возвращает |
|-------|----------|-----------|------------|
| `init(map)` | Инициализация | `map: ol.Map` | void |
| `displayTakeoffPoint(point)` | Отобразить точку взлёта | `point` | void |
| `displayAllTakeoffPoints(points)` | Отобразить все точки | `points[]` | void |
| `displayRoute(route)` | Отобразить маршрут | `route` | void |
| `displayAllRoutes(routes)` | Отобразить все маршруты | `routes[]` | void |
| `displayTransition(from, to, label)` | Отобразить переход | `from, to, label` | void |
| `displayAntennaZone(point, range)` | Отобразить зону антенны | `point, range` | void |
| `clear()` | Очистить все слои | — | void |
| `fitToTakeoffPoints()` | Приблизить к точкам | — | void |
| `fitToRoutes()` | Приблизить к маршрутам | — | void |

### RouteOptimizer

| Метод | Описание | Параметры | Возвращает |
|-------|----------|-----------|------------|
| `optimizeForBase(routes, point)` | Оптимизация для базы | `routes[], point` | `optimized[]` |
| `findNearestRoute(point, routes)` | Найти ближайший маршрут | `point, routes[]` | `nearest` |
| `calculateTransitions(routes, point)` | Расчёт переходов | `routes[], point` | `transitions[]` |
| `getTransitionSummary(transitions)` | Статистика переходов | `transitions[]` | `summary` |

---

## 🗺️ ВИЗУАЛИЗАЦИЯ

### Условные обозначения

**На карте:**
- 🚁 **Оранжевый круг** — Точка взлёта (база)
- 🟢 **Зелёная линия** — Маршрут (полный)
- 🟡 **Оранжевая линия** — Маршрут (частичный)
- 🔴 **Красная линия** — Маршрут (пропущен)
- 🔵 **Синий пунктир** — Переход между маршрутами
- ⭕ **Синий круг** — Зона антенны (60 км)

**Сегменты маршрута:**
- 🟢 **Зелёная точка** — Пролететь
- 🟡 **Оранжевая точка** — Частично
- 🔴 **Красная точка** — Пропустить

---

## 📊 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Пример 1: Одна база, несколько маршрутов

```javascript
// Инициализация
MultiRouteModule.init();

// Добавить базу
MultiRouteModule.addTakeoffPoint({
    lat: 55.7558,
    lon: 37.6173,
    name: 'Основная база'
});

// Добавить 3 маршрута
MultiRouteModule.addRoute({
    id: 'route-1',
    name: 'Маршрут 1',
    segments: [...],
    totalDistance: 50
});

MultiRouteModule.addRoute({
    id: 'route-2',
    name: 'Маршрут 2',
    segments: [...],
    totalDistance: 50
});

// Оптимизировать
const assignment = MultiRouteModule.optimizeAssignment(weatherData);

// Результат:
// База: Основная база
// ├── Маршрут 1 (50 км) ✅
// └── Маршрут 2 (50 км) ✅
```

### Пример 2: Несколько баз, распределение

```javascript
// Добавить 3 базы
MultiRouteModule.addTakeoffPoint({
    lat: 55.75,
    lon: 37.61,
    name: 'База А',
    priority: 1
});

MultiRouteModule.addTakeoffPoint({
    lat: 55.85,
    lon: 37.71,
    name: 'База Б',
    priority: 2
});

MultiRouteModule.addTakeoffPoint({
    lat: 55.65,
    lon: 37.51,
    name: 'База В',
    priority: 3
});

// Добавить 5 маршрутов
for (let i = 1; i <= 5; i++) {
    MultiRouteModule.addRoute({
        id: 'route-' + i,
        name: 'Маршрут ' + i,
        segments: [...],
        totalDistance: 50
    });
}

// Оптимизировать
const assignment = MultiRouteModule.optimizeAssignment(weatherData);

// Результат:
// База А: Маршруты 1, 2 (100 км)
// База Б: Маршрут 3 + часть 4 (80 км)
// База В: Маршрут 5 (50 км)
```

### Пример 3: Визуализация на карте

```javascript
// Инициализация карты
const map = new ol.Map({...});
MultiRouteMapModule.init(map);

// Отобразить базы
MultiRouteMapModule.displayAllTakeoffPoints([
    { lat: 55.75, lon: 37.61, name: 'База А' },
    { lat: 55.85, lon: 37.71, name: 'База Б' }
]);

// Отобразить маршруты
MultiRouteMapModule.displayAllRoutes(MultiRouteModule.routes);

// Отобразить зоны антенн
MultiRouteModule.takeoffPoints.forEach(base => {
    MultiRouteMapModule.displayAntennaZone(base, base.antenna);
});

// Приблизить к маршрутам
MultiRouteMapModule.fitToRoutes();
```

---

## ⚠️ ОГРАНИЧЕНИЯ

1. **Антенна:** Все точки маршрута должны быть ≤ 60 км от точки взлёта
2. **Батарея:** 39000 мА·ч, 25.4В → 19.8В (22% разряд ≈ 220 Вт·ч доступно)
3. **Погода:** Ветер < 10 м/с, осадки < 0.5 мм/ч, видимость > 2 км
4. **Время полёта:** Окно погоды определяет максимальное время

---

## 🔗 СВЯЗАННЫЕ МОДУЛИ

- `WeatherModule` — получение и анализ метеоданных
- `RouteModule` — управление одиночными маршрутами
- `EnergyModule` — расчёт энергопотребления
- `MultiRouteMapModule` — визуализация на карте

---

**Статус:** ✅ Базовая реализация завершена  
**Следующий шаг:** Интеграция с UI дашборда
