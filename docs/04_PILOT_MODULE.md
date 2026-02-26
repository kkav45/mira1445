# PilotModule — Коррекция по фактическим данным

## 📋 Назначение

Модуль `PilotModule` отвечает за:
- Ввод фактических метеоданных пилотом («Сидя на земле»)
- Коррекцию прогноза Open-Meteo по фактическим данным
- Сравнение прогноза и факта
- Формирование рекомендаций с учётом коррекции
- Определение максимально допустимой высоты полёта

**Файл:** `js/pilot.js`

---

## 🎯 Концепция «Сидя на земле»

### Проблема

Прогнозы Open-Meteo имеют погрешности:
- Температура: ±1-2°C
- Ветер: ±1-2 м/с
- Осадки: ±20-30%
- Видимость: ±10-15%

### Решение

Пилот вводит фактические данные с датчиков → система рассчитывает коэффициенты коррекции → применяет ко всему прогнозу с затуханием.

### Принцип работы

```
┌─────────────────────────────────────────────────────────┐
│            КОРРЕКЦИЯ ПРОГНОЗА ПО ФАКТУ                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Прогноз Open-Meteo          Факт с датчика             │
│  ┌──────────────────┐       ┌──────────────────┐       │
│  │ Ветер:   8 м/с   │       │ Ветер:  11 м/с   │       │
│  │ Темп.:  +5°C     │       │ Темп.:  +3°C     │       │
│  │ Влажн.: 70%      │       │ Влажн.: 85%      │       │
│  └──────────────────┘       └──────────────────┘       │
│           ↓                          ↓                  │
│  ┌──────────────────────────────────────────────┐      │
│  │      РАСЧЁТ КОЭФФИЦИЕНТОВ КОРРЕКЦИИ          │      │
│  │                                               │      │
│  │  windBias    = 11 / 8 = 1.375  (+37.5%)      │      │
│  │  tempOffset  = 3 - 5 = -2°C                  │      │
│  │  humidityOff = 85 - 70 = +15%                │      │
│  └──────────────────────────────────────────────┘      │
│                          ↓                              │
│  ┌──────────────────────────────────────────────┐      │
│  │      ПРИМЕНЕНИЕ С ЗАТУХАНИЕМ (weight)        │      │
│  │                                               │      │
│  │  weight = e^(-i / 24)                        │      │
│  │                                               │      │
│  │  i=0ч:  weight=1.000 → 100% коррекции        │      │
│  │  i=6ч:  weight=0.779 → 78% коррекции         │      │
│  │  i=24ч: weight=0.368 → 37% коррекции         │      │
│  └──────────────────────────────────────────────┘      │
│                          ↓                              │
│  ┌──────────────────────────────────────────────┐      │
│  │         СКОРРЕКТИРОВАННЫЙ ПРОГНОЗ            │      │
│  │                                               │      │
│  │  Через 6 часов:                              │      │
│  │  Ветер:  10 м/с → 12.9 м/с                   │      │
│  │  Темп.:  +2°C  → +0.4°C                      │      │
│  │  Влажн.: 75%   → 86.6%                       │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Ввод данных пилота

### Параметры ввода

| Параметр | Ед. изм. | Диапазон | Шаг | Обязательный |
|----------|----------|----------|-----|--------------|
| Ветер (speed) | м/с | 0-50 | 0.1 | Нет* |
| Направление (dir) | ° | 0-360 | 1 | Нет |
| Температура | °C | -40...+50 | 0.1 | Нет* |
| Влажность | % | 0-100 | 1 | Нет* |
| Видимость | км | 0.1-10 | 0.1 | Нет |
| Облака (база) | м | 0-5000 | 50 | Нет |
| Туман | булево | да/нет | — | Нет |
| Осадки | булево | да/нет | — | Нет |

* — хотя бы один из параметров должен быть заполнен

### Форма ввода

```html
<div class="pilot-form">
    <!-- Координаты точки замера -->
    <div>
        <label>Широта</label>
        <input type="text" id="pilotLat" placeholder="55.7558">
    </div>
    <div>
        <label>Долгота</label>
        <input type="text" id="pilotLon" placeholder="37.6173">
    </div>
    
    <!-- Метеопараметры -->
    <div>
        <label>Ветер (м/с)</label>
        <input type="number" id="pilotWindSpeed" placeholder="0.0">
    </div>
    <div>
        <label>Направление (°)</label>
        <input type="number" id="pilotWindDir" placeholder="0-360">
    </div>
    <div>
        <label>Температура (°C)</label>
        <input type="number" id="pilotTemp" placeholder="+0.0">
    </div>
    <div>
        <label>Влажность (%)</label>
        <input type="number" id="pilotHumidity" placeholder="0">
    </div>
    <div>
        <label>Видимость (км)</label>
        <input type="number" id="pilotVisibility" placeholder=">5">
    </div>
    <div>
        <label>Облака (м)</label>
        <input type="number" id="pilotCloudBase" placeholder="0">
    </div>
    
    <!-- Флаги -->
    <label>
        <input type="checkbox" id="pilotFog"> Туман
    </label>
    <label>
        <input type="checkbox" id="pilotPrecip"> Осадки
    </label>
</div>
```

---

## 🔧 Функции модуля

### init()

**Назначение:** Инициализация модуля

**Алгоритм:**
```javascript
init() {
    // Загрузка сохранённых данных
    this.pilotData = Storage.getPilotData();
    Utils.log('Пилот модуль инициализирован');
}
```

---

### openModal()

**Назначение:** Открытие модального окна ввода данных

**Алгоритм:**
```javascript
openModal() {
    const modal = document.getElementById('pilotChecklistModal');
    if (!modal) {
        Utils.error('Модальное окно не найдено');
        return;
    }

    // Проверка наличия метеоданных
    const hasWeatherData = this.hasWeatherData();
    if (!hasWeatherData) {
        showToast('Сначала получите метеоданные', 'error');
        return;
    }

    // Заполнение формы сохранёнными данными
    this.fillFormFromData();

    modal.classList.add('active');
    Utils.log('Модальное окно открыто');
}
```

---

### hasWeatherData()

**Назначение:** Проверка наличия метеоданных для коррекции

**Возвращает:** boolean

**Алгоритм:**
```javascript
hasWeatherData() {
    // Проверка WizardModule
    if (typeof WizardModule !== 'undefined' && 
        WizardModule.stepData?.segmentAnalysis?.length > 0) {
        return true;
    }
    
    // Проверка RouteModule
    if (typeof RouteModule !== 'undefined' && 
        RouteModule.segmentAnalysis?.length > 0) {
        return true;
    }
    
    return false;
}
```

---

### fillFormFromData()

**Назначение:** Заполнение формы сохранёнными данными

**Алгоритм:**
```javascript
fillFormFromData() {
    if (!this.pilotData) return;

    const fields = {
        pilotWindSpeed: this.pilotData.windSpeed,
        pilotWindDir: this.pilotData.windDir,
        pilotTemp: this.pilotData.temp,
        pilotHumidity: this.pilotData.humidity,
        pilotVisibility: this.pilotData.visibility,
        pilotCloudBase: this.pilotData.cloudBase,
        pilotFog: this.pilotData.fog,
        pilotPrecip: this.pilotData.precip
    };

    Object.entries(fields).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            if (el.type === 'checkbox') {
                el.checked = value || false;
            } else {
                el.value = value || '';
            }
        }
    });
}
```

---

### collectFormData()

**Назначение:** Сбор данных из формы

**Возвращает:** object — данные пилота

**Алгоритм:**
```javascript
collectFormData() {
    return {
        windSpeed: this.parseFloat(
            document.getElementById('pilotWindSpeed')?.value
        ),
        windDir: this.parseFloat(
            document.getElementById('pilotWindDir')?.value
        ),
        temp: this.parseFloat(
            document.getElementById('pilotTemp')?.value
        ),
        humidity: this.parseFloat(
            document.getElementById('pilotHumidity')?.value
        ),
        visibility: this.parseFloat(
            document.getElementById('pilotVisibility')?.value
        ),
        cloudBase: this.parseFloat(
            document.getElementById('pilotCloudBase')?.value
        ),
        fog: document.getElementById('pilotFog')?.checked || false,
        precip: document.getElementById('pilotPrecip')?.checked || false,
        coords: {
            lat: this.parseFloat(
                document.getElementById('pilotLat')?.value
            ),
            lon: this.parseFloat(
                document.getElementById('pilotLon')?.value
            )
        }
    };
}
```

---

### applyCorrection()

**Назначение:** Применение коррекции прогноза

**Алгоритм:**
```javascript
applyCorrection() {
    // 1. Сбор данных из формы
    const pilotData = this.collectFormData();

    // 2. Проверка наличия данных
    const hasData = pilotData.windSpeed || pilotData.temp ||
                   pilotData.visibility || pilotData.fog ||
                   pilotData.precip || pilotData.humidity;

    if (!hasData) {
        showToast('Введите хотя бы один параметр', 'error');
        return;
    }

    // 3. Сохранение данных
    this.pilotData = pilotData;
    Storage.savePilotData(pilotData);

    // 4. Получение текущего анализа
    const currentAnalysis = this.getCurrentAnalysis();
    
    if (currentAnalysis) {
        // 5. Применение коррекции через WeatherModule
        this.correctedAnalysis = WeatherModule.applyPilotCorrection(
            currentAnalysis, 
            pilotData
        );

        // 6. Отображение сравнения
        this.displayComparison(
            currentAnalysis, 
            this.correctedAnalysis, 
            pilotData
        );
        
        // 7. Отображение решения
        this.displayDecision(pilotData, this.correctedAnalysis);
    }

    showToast('Коррекция применена', 'success');

    // 8. Обновление WizardModule
    if (typeof WizardModule !== 'undefined') {
        WizardModule.stepData.pilotData = pilotData;
        WizardModule.stepData.correctedAnalysis = this.correctedAnalysis;
    }
}
```

---

### getCurrentAnalysis()

**Назначение:** Получение текущего анализа для коррекции

**Возвращает:** object | null

**Алгоритм:**
```javascript
getCurrentAnalysis() {
    // Из WizardModule
    if (typeof WizardModule !== 'undefined' && 
        WizardModule.stepData?.segmentAnalysis?.length > 0) {
        return WizardModule.stepData.segmentAnalysis[0].analyzed;
    }
    
    // Из RouteModule
    if (typeof RouteModule !== 'undefined' && 
        RouteModule.segmentAnalysis?.length > 0) {
        return RouteModule.segmentAnalysis[0].analyzed;
    }
    
    return null;
}
```

---

### displayComparison(forecast, corrected, pilotData)

**Назначение:** Отображение сравнения прогноз/факт

**Параметры:**
- `forecast` (object) — исходный прогноз
- `corrected` (object) — скорректированный прогноз
- `pilotData` (object) — данные пилота

**Алгоритм:**
```javascript
displayComparison(forecast, corrected, pilotData) {
    const container = document.getElementById('pilotComparisonBlock');
    const table = document.getElementById('pilotComparisonTable');

    if (!container || !table) return;

    const corrections = corrected.corrections || {};

    // Формирование строк таблицы
    const rows = [
        {
            param: 'Ветер (м/с)',
            forecast: forecast.hourly[0]?.wind10m?.toFixed(1) || '—',
            fact: pilotData.windSpeed?.toFixed(1) || '—',
            delta: corrections.windBias ?
                `${corrections.windBias > 1 ? '+' : ''}${((corrections.windBias - 1) * 100).toFixed(0)}%` 
                : '—'
        },
        {
            param: 'Температура (°C)',
            forecast: forecast.hourly[0]?.temp2m?.toFixed(1) || '—',
            fact: pilotData.temp?.toFixed(1) || '—',
            delta: corrections.tempOffset ?
                `${corrections.tempOffset > 0 ? '+' : ''}${corrections.tempOffset.toFixed(1)}°C` 
                : '—'
        },
        {
            param: 'Влажность (%)',
            forecast: forecast.hourly[0]?.humidity?.toFixed(0) || '—',
            fact: pilotData.humidity?.toFixed(0) || '—',
            delta: corrections.humidityOffset ?
                `${corrections.humidityOffset > 0 ? '+' : ''}${corrections.humidityOffset.toFixed(0)}` 
                : '—'
        },
        {
            param: 'Видимость (км)',
            forecast: forecast.hourly[0]?.visibility?.toFixed(1) || '—',
            fact: pilotData.visibility?.toFixed(1) || '—',
            delta: corrections.visibilityOverride ? '⚠️ Переопределено' : '—'
        },
        {
            param: 'Туман',
            forecast: (forecast.hourly[0]?.visibility || 5) < 1 ? 'Да' : 'Нет',
            fact: pilotData.fog ? 'Да' : 'Нет',
            delta: pilotData.fog && (forecast.hourly[0]?.visibility || 5) >= 1 
                ? '⚠️ Не спрогнозирован' 
                : '—'
        },
        {
            param: 'Осадки',
            forecast: (forecast.hourly[0]?.precip || 0) > 0 ? 'Да' : 'Нет',
            fact: pilotData.precip ? 'Да' : 'Нет',
            delta: pilotData.precip && (forecast.hourly[0]?.precip || 0) === 0 
                ? '⚠️ Не спрогнозированы' 
                : '—'
        }
    ];

    // Отрисовка таблицы
    table.innerHTML = rows.map(row => `
        <tr>
            <td style="font-size: 12px;">${row.param}</td>
            <td style="font-size: 12px;">${row.forecast}</td>
            <td style="font-size: 12px; font-weight: 600;">${row.fact}</td>
            <td style="font-size: 12px; color: ${row.delta.includes('⚠️') ? '#dd6b20' : 'rgba(0,0,0,0.5)'}">
                ${row.delta}
            </td>
        </tr>
    `).join('');

    container.style.display = 'block';
}
```

**Пример таблицы:**

```
┌──────────────┬──────────┬──────────┬─────────────────┐
│ Параметр     │ Прогноз  │ Факт     │ Δ (дельта)      │
├──────────────┼──────────┼──────────┼─────────────────┤
│ Ветер (м/с)  │ 8.0      │ 11.0     │ +38%            │
│ Температура  │ +5.0°C   │ +3.0°C   │ -2.0°C          │
│ Влажность    │ 70%      │ 85%      │ +15%            │
│ Видимость    │ 8.5 км   │ 5.0 км   │ —               │
│ Туман        │ Нет      │ Да       │ ⚠️ Не спрогн.   │
│ Осадки       │ Нет      │ Да       │ ⚠️ Не спрогн.   │
└──────────────┴──────────┴──────────┴─────────────────┘
```

---

### displayDecision(pilotData, correctedAnalysis)

**Назначение:** Формирование решения о полёте

**Параметры:**
- `pilotData` (object) — данные пилота
- `correctedAnalysis` (object) — скорректированный анализ

**Алгоритм:**
```javascript
displayDecision(pilotData, correctedAnalysis) {
    const container = document.getElementById('pilotDecisionBlock');
    const statusEl = document.getElementById('pilotFinalStatus');
    const recEl = document.getElementById('pilotRecommendations');

    if (!container || !statusEl || !recEl) return;

    // 1. Генерация рекомендаций
    const recommendations = WeatherModule.generateRecommendations(
        correctedAnalysis, 
        pilotData
    );
    
    const thresholds = Storage.getThresholds();

    // 2. Определение общего статуса
    let overallRisk = 'low';
    let riskCount = 0;
    let maxAltitude = 550;  // Макс. высота по умолчанию

    // Проверка ветра
    if (pilotData.windSpeed && pilotData.windSpeed > thresholds.windGround) {
        overallRisk = 'high';
        riskCount++;
        maxAltitude = Math.max(250, maxAltitude - 200);
    }

    // Проверка видимости
    if (pilotData.fog || (pilotData.visibility && pilotData.visibility < 1)) {
        overallRisk = 'high';
        riskCount++;
        maxAltitude = 0;  // Полёт запрещён
    } else if (pilotData.visibility && pilotData.visibility < thresholds.visibility) {
        riskCount++;
        maxAltitude = Math.max(350, maxAltitude - 100);
    }

    // Проверка осадков
    if (pilotData.precip) {
        riskCount++;
    }

    // Проверка обледенения
    if (pilotData.temp !== null && pilotData.humidity !== null) {
        const icingRisk = pilotData.temp <= 5 && pilotData.temp >= -10 && 
                         pilotData.humidity > 80;
        if (icingRisk) {
            riskCount++;
            if (pilotData.temp <= 0 && pilotData.temp >= -5) {
                overallRisk = 'high';
                maxAltitude = Math.max(250, maxAltitude - 150);
            }
        }
    }

    // 3. Установка статуса
    if (overallRisk === 'high' || riskCount >= 2) {
        statusEl.className = 'flight-status status-forbidden';
        statusEl.innerHTML = '<i class="fas fa-times-circle"></i>
                              <span>ПОЛЁТ ЗАПРЕЩЁН</span>';
    } else if (riskCount >= 1) {
        statusEl.className = 'flight-status status-restricted';
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i>
                              <span>ПОЛЁТ С ОГРАНИЧЕНИЯМИ</span>';
    } else {
        statusEl.className = 'flight-status status-allowed';
        statusEl.innerHTML = '<i class="fas fa-check-circle"></i>
                              <span>ПОЛЁТ РАЗРЕШЁН</span>';
    }

    // 4. Отображение рекомендаций
    recEl.innerHTML = recommendations.map(rec => `
        <div class="recommendation-item ${rec.type}">
            <i class="fas ${rec.icon}"></i>
            <span class="recommendation-text">${rec.text}</span>
        </div>
    `).join('');

    // 5. Обновление максимальной высоты
    const altitudeEl = document.getElementById('pilotMaxAltitude');
    if (altitudeEl) {
        altitudeEl.textContent = maxAltitude + ' м';
    }

    container.style.display = 'block';
}
```

**Примеры решений:**

```
┌─────────────────────────────────────────────────────────┐
│ ПОЛЁТ РАЗРЕШЁН                                          │
│ ✅ Все параметры в норме                                │
│ Макс. высота: 550 м                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ПОЛЁТ С ОГРАНИЧЕНИЯМИ                                   │
│ ⚠️ Ветер превышает порог (12 м/с > 10 м/с)             │
│ Макс. высота: 350 м                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ПОЛЁТ ЗАПРЕЩЁН                                          │
│ ❌ Туман (видимость 0.5 км)                             │
│ ❌ Риск обледенения (темп. -2°C, влажн. 90%)           │
│ Макс. высота: 0 м                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🧮 Математика коррекции

### Расчёт коэффициентов

```javascript
const corrections = {
    // Отношение фактического ветра к прогнозному
    windBias: pilotData.windSpeed / analyzedData.hourly[0].wind10m,
    
    // Разница фактической и прогнозной температуры
    tempOffset: pilotData.temp - analyzedData.hourly[0].temp2m,
    
    // Переопределение видимости (если туман)
    visibilityOverride: pilotData.fog ? 0.5 : null
};
```

### Пример расчёта

```
Дано:
  Прогноз Open-Meteo:  ветер 8 м/с, температура +5°C, видимость 8 км
  Факт пилота:         ветер 11 м/с, температура +3°C, туман (да)

Расчёт:
  windBias = 11 / 8 = 1.375  →  +37.5% к ветру
  tempOffset = 3 - 5 = -2°C  →  -2°C к температуре
  visibilityOverride = 0.5 км  →  переопределение видимости
```

---

### Экспоненциальное затухание

**Формула:**
```
weight = e^(-i / 24)
```

где `i` — номер часа от текущего момента (0, 1, 2, ...)

**Таблица затухания:**

| Время | i (час) | weight | Доля коррекции |
|-------|---------|--------|----------------|
| Сейчас | 0 | 1.000 | 100% |
| +1 ч | 1 | 0.959 | 96% |
| +2 ч | 2 | 0.920 | 92% |
| +3 ч | 3 | 0.882 | 88% |
| +6 ч | 6 | 0.779 | 78% |
| +9 ч | 9 | 0.687 | 69% |
| +12 ч | 12 | 0.606 | 61% |
| +18 ч | 18 | 0.472 | 47% |
| +24 ч | 24 | 0.368 | 37% |
| +30 ч | 30 | 0.286 | 29% |
| +36 ч | 36 | 0.223 | 22% |
| +42 ч | 42 | 0.173 | 17% |
| +48 ч | 48 | 0.135 | 14% |

**График затухания:**

```
Коррекция (%)
100 │●
    │ ╲
 80 │  ╲
    │   ╲
 60 │    ╲
    │     ╲
 40 │      ╲
    │       ╲
 20 │        ╲
    │         ╲
  0 └──────────┴───────→ Время (часы)
    0   12   24   36   48
```

---

### Применение коррекции

**Формулы:**

```
Скорр_ветер(i) = Прогноз_ветер × (1 + (windBias - 1) × weight(i))
Скорр_темп(i)  = Прогноз_темп + (tempOffset × weight(i))
Скорр_видимость(i) = visibilityOverride (если задано)
```

**Пример расчёта для разных временных точек:**

```
Дано:
  windBias = 1.375  →  +37.5%
  tempOffset = -2°C

Прогноз на 6 часов вперёд (weight = 0.779):
  Прогноз:  ветер 10 м/с, температура +2°C
  
  Скорр_ветер = 10 × (1 + (1.375 - 1) × 0.779)
              = 10 × (1 + 0.292)
              = 10 × 1.292
              = 12.92 м/с
  
  Скорр_темп = +2 + (-2 × 0.779)
             = +2 - 1.558
             = +0.44°C

Прогноз на 24 часа вперёд (weight = 0.368):
  Прогноз:  ветер 8 м/с, температура 0°C
  
  Скорр_ветер = 8 × (1 + (1.375 - 1) × 0.368)
              = 8 × (1 + 0.138)
              = 8 × 1.138
              = 9.1 м/с
  
  Скорр_темп = 0 + (-2 × 0.368)
             = -0.74°C
```

---

## 🗺️ Геолокация

### Выбор точки на карте

**Функции:**

```javascript
// Включение режима выбора точки
toggleSelectPointMode() {
    this.selectPointMode = !this.selectPointMode;
    const btn = document.getElementById('selectPointBtn');

    if (this.selectPointMode) {
        // Изменение стиля кнопки
        btn.style.background = 'rgba(102, 126, 234, 0.3)';
        btn.style.color = '#667eea';
        btn.innerHTML = '<i class="fas fa-check"></i> 
                         <span>Кликните по карте</span>';

        // Включение режима выбора в MapModule
        MapModule.enableSelectPointMode((lat, lon) => {
            this.onPointSelected(lat, lon);
        });

        showToast('Режим выбора точки: кликните по карте', 'info');
    } else {
        // Выключение режима
        this.disableSelectPointMode();
    }
}

// Обработка выбора точки
onPointSelected(lat, lon) {
    const latEl = document.getElementById('pilotLat');
    const lonEl = document.getElementById('pilotLon');
    
    if (latEl) latEl.value = lat.toFixed(6);
    if (lonEl) lonEl.value = lon.toFixed(6);

    this.toggleSelectPointMode();
    showToast('Координаты установлены', 'success');
}
```

---

### Автозаполнение из геолокации

```javascript
fillCoordsFromLocation() {
    if (!navigator.geolocation) {
        showToast('Геолокация не поддерживается', 'error');
        return;
    }

    const btn = event.target.closest('button');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Определение...';
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        // Успех
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            const latEl = document.getElementById('pilotLat');
            const lonEl = document.getElementById('pilotLon');
            
            if (latEl) latEl.value = lat.toFixed(6);
            if (lonEl) lonEl.value = lon.toFixed(6);

            showToast('Координаты определены', 'success');
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        },
        // Ошибка
        (error) => {
            showToast('Ошибка определения координат', 'error');
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        },
        // Параметры
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}
```

---

## 📋 Сравнение прогноза и факта

### Таблица сравнения

**Структура:**

```
┌─────────────────────────────────────────────────────────┐
│           СРАВНЕНИЕ ПРОГНОЗА И ФАКТА                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Параметр      │ Прогноз │ Факт    │ Δ (дельта)         │
│ ──────────────┼─────────┼─────────┼─────────────────── │
│ Ветер (м/с)   │   8.0   │  11.0   │ +38%               │
│ Направление   │   245°  │  260°   │ —                  │
│ Температура   │  +5.0°C │  +3.0°C │ -2.0°C             │
│ Влажность     │   70%   │   85%   │ +15%               │
│ Видимость     │   8.5км │   5.0км │ —                  │
│ Облака (база) │   800м  │   400м  │ —                  │
│ Туман         │   Нет   │   Да    │ ⚠️ Не спрогноз.    │
│ Осадки        │   Нет   │   Да    │ ⚠️ Не спрогноз.    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Интерпретация дельты

| Обозначение | Значение |
|-------------|----------|
| `+38%` | Фактический ветер на 38% выше прогноза |
| `-2.0°C` | Фактическая температура на 2°C ниже |
| `+15%` | Фактическая влажность на 15% выше |
| `⚠️ Не спрогноз.` | Явление не было спрогнозировано |
| `—` | Без изменений или данных нет |

---

## 🎯 Рекомендации с учётом коррекции

### Типы рекомендаций

| Тип | Иконка | Описание |
|-----|--------|----------|
| `critical` | ⚠️ | Критично, полёт не рекомендуется |
| `warning` | ⚡ | Предупреждение, будьте осторожны |
| `success` | ✅ | Благоприятные условия |
| `info` | ℹ️ | Дополнительная информация |

### Примеры рекомендаций

**После коррекции:**

```javascript
[
    {
        type: "critical",
        icon: "fa-wind",
        text: "<strong>Ветер 12.9 м/с</strong> превышает порог 10 м/с. 
               Рекомендуется отложить полёт."
    },
    {
        type: "warning",
        icon: "fa-snowflake",
        text: "<strong>Риск обледенения</strong> при температуре +0.4°C 
               и влажности 86.6%. Будьте осторожны."
    },
    {
        type: "info",
        icon: "fa-flag",
        text: "<strong>Данные скорректированы</strong> по фактическим 
               наблюдениям пилота."
    }
]
```

---

## 📊 Определение максимальной высоты

### Алгоритм расчёта

```javascript
let maxAltitude = 550;  // Базовая высота

// 1. Проверка ветра
if (pilotData.windSpeed > thresholds.windGround) {
    maxAltitude = Math.max(250, maxAltitude - 200);
}

// 2. Проверка видимости
if (pilotData.fog || (pilotData.visibility && pilotData.visibility < 1)) {
    maxAltitude = 0;  // Запрет полёта
} else if (pilotData.visibility && pilotData.visibility < thresholds.visibility) {
    maxAltitude = Math.max(350, maxAltitude - 100);
}

// 3. Проверка обледенения
if (icingRisk) {
    if (pilotData.temp <= 0 && pilotData.temp >= -5) {
        maxAltitude = Math.max(250, maxAltitude - 150);
    }
}
```

### Таблица ограничений

| Условие | Ограничение | Итоговая макс. высота |
|---------|-------------|----------------------|
| Ветер > 10 м/с | -200 м | 350 м |
| Видимость < 2 км | -100 м | 450 м |
| Туман (вид. < 1 км) | 0 м | 0 м (запрет) |
| Обледенение (высокий) | -150 м | 400 м |
| Ветер + Обледенение | -350 м | 200 м |

---

## 💾 Сохранение данных

### clearData()

**Назначение:** Очистка данных пилота

**Алгоритм:**
```javascript
clearData() {
    // 1. Очистка формы
    ['pilotWindSpeed', 'pilotWindDir', 'pilotTemp', 'pilotHumidity',
     'pilotVisibility', 'pilotCloudBase'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const fogEl = document.getElementById('pilotFog');
    const precipEl = document.getElementById('pilotPrecip');
    if (fogEl) fogEl.checked = false;
    if (precipEl) precipEl.checked = false;

    // 2. Очистка данных
    this.pilotData = null;
    this.correctedAnalysis = null;
    Storage.clearPilotData();

    // 3. Обновление WizardModule
    if (typeof WizardModule !== 'undefined') {
        WizardModule.stepData.pilotData = null;
        WizardModule.stepData.correctedAnalysis = null;
    }

    // 4. Скрытие результатов
    const comparisonBlock = document.getElementById('pilotComparisonBlock');
    const decisionBlock = document.getElementById('pilotDecisionBlock');
    if (comparisonBlock) comparisonBlock.style.display = 'none';
    if (decisionBlock) decisionBlock.style.display = 'none';

    showToast('Данные очищены', 'info');
}
```

---

## 📝 Примеры использования

### Пример 1: Ввод данных вручную

```javascript
// Открытие модального окна
PilotModule.openModal();

// Заполнение формы
document.getElementById('pilotWindSpeed').value = 11;
document.getElementById('pilotTemp').value = 3;
document.getElementById('pilotHumidity').value = 85;

// Применение коррекции
PilotModule.applyCorrection();

// Результат отображается в UI
```

### Пример 2: Автозаполнение из геолокации

```javascript
// Пользователь нажимает "Моё местоположение"
PilotModule.fillCoordsFromLocation();

// Геолокация определяет координаты
// Координаты заполняются автоматически
// Можно ввести метео-данные и применить коррекцию
```

### Пример 3: Выбор точки на карте

```javascript
// Пользователь нажимает "На карте"
PilotModule.toggleSelectPointMode();

// Карта переходит в режим выбора
// Пользователь кликает по карте
// Координаты заполняются

// Автоматическое заполнение метео из Open-Meteo
// (реализуется через отдельную функцию)
```

---

## ⚠️ Ограничения

### Минимальные требования

| Параметр | Значение |
|----------|----------|
| Мин. параметров для коррекции | 1 |
| Макс. горизонт коррекции | 48 часов |
| Эффективный горизонт | 12-24 часа |

### Погрешности

| Параметр | Погрешность коррекции |
|----------|----------------------|
| Ветер | ±5% (зависит от точности датчика) |
| Температура | ±0.5°C |
| Влажность | ±5% |
| Видимость | субъективно |

### Ограничения модели

1. **Одна точка замера** — коррекция применяется ко всем сегментам одинаково
2. **Экспоненциальное затухание** — через 24 часа только 37% коррекции
3. **3 параметра коррекции** — ветер, температура, видимость (туман)

---

## 📝 Changelog

### Версия 0.1.5.0

- ✅ Добавлена коррекция по фактическим данным
- ✅ Экспоненциальное затухание коррекции
- ✅ Сравнение прогноз/факт
- ✅ Определение максимальной высоты
- ✅ Рекомендации с учётом коррекции

---

**Версия документации:** 1.0  
**Дата:** 26 февраля 2026 г.  
**Модуль:** PilotModule (js/pilot.js)
