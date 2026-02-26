# ChartsModule — Визуализация данных

## 📋 Назначение

Модуль `ChartsModule` отвечает за визуализацию метеоданных с помощью библиотеки Plotly.js.

**Файл:** `js/charts.js`  
**Зависимость:** Plotly.js v2.27.0

---

## 📊 Типы графиков

### 1. Time Series Chart — Временной ряд

**Назначение:** Отображение изменения параметров во времени

**Данные:**
- Температура (°C) — левая ось Y
- Ветер (м/с) — правая ось Y
- Осадки (мм) — столбцы

**Конфигурация:**
```javascript
createTimeSeriesChart(containerId, data) {
    // data: { times, temperature, wind10m, precip }
}
```

---

### 2. Vertical Wind Profile — Профиль ветра

**Назначение:** Показ изменения ветра по высоте

**Высоты:** 10, 100, 250, 350, 450, 550 м

**Конфигурация:**
```javascript
createVerticalWindProfile(containerId, windData)
```

---

### 3. Temperature Profile — Профиль температуры

**Назначение:** Показ изменения температуры по высоте

**Конфигурация:**
```javascript
createTemperatureProfile(containerId, tempData)
```

---

### 4. Wind Rose — Роза ветров

**Назначение:** Отображение распределения ветра по направлениям

**Направления:** С, СВ, В, ЮВ, Ю, ЮЗ, З, СЗ

**Конфигурация:**
```javascript
createWindRose(containerId, windData)
```

---

### 5. Turbulence Chart — Турбулентность

**Назначение:** Отображение индекса турбулентности во времени

**Конфигурация:**
```javascript
createTurbulenceChart(containerId, data)
```

---

### 6. Ceiling Chart — Высота облаков

**Назначение:** Отображение высоты нижней границы облаков

**Конфигурация:**
```javascript
createCeilingChart(containerId, data)
```

---

### 7. Flight Windows Calendar — Тепловая карта окон

**Назначение:** Визуализация благоприятных окон для полёта

**Оси:**
- X: 24 часа
- Y: 7 дней недели

**Конфигурация:**
```javascript
createFlightWindowsCalendar(containerId, flightWindows)
```

---

## ⚙️ Конфигурация Plotly

### Layout по умолчанию

```javascript
defaultLayout: {
    autosize: true,
    margin: { t: 30, r: 20, l: 50, b: 40 },
    font: { family: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto' },
    showlegend: false,
    hovermode: 'x unified',
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)'
}
```

### Config по умолчанию

```javascript
defaultConfig: {
    responsive: true,
    displayModeBar: false,
    scrollZoom: false,
    displaylogo: false
}
```

---

## 📝 Примеры использования

```javascript
// Временной ряд
ChartsModule.createTimeSeriesChart('chartContainer', chartData);

// Роза ветров
ChartsModule.createWindRose('windRoseContainer', windData);

// Обновление при resize
ChartsModule.resizeAllCharts();

// Очистка
ChartsModule.clearChart('chartContainer');
```

---

**Версия документации:** 1.0  
**Дата:** 26 февраля 2026 г.  
**Модуль:** ChartsModule (js/charts.js)
