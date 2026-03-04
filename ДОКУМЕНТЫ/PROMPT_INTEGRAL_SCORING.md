# 🎯 ПРОМПТ: Реализация Интегральной Оценки (Scoring System)

**Для:** Метеорологическая скоринг-система для БВС  
**Версия промпта:** 1.0  
**Дата:** 3 марта 2026 г.

---

## 📋 ЗАДАЧА

Реализовать модуль **Интегральной Оценки** для метеорологического скоринга полётов БВС (беспилотных воздушных судов).

---

## 🎯 ЦЕЛЬ

Создать единую числовую систему оценки рисков (0-10 баллов), которая объединяет все метеорологические факторы в один понятный показатель для принятия решения о полёте.

---

## 📊 ТРЕБОВАНИЯ К СИСТЕМЕ

### 1. Шкала оценок

```
┌─────────────────────────────────────────────────────┐
│  0 ─────────────────────────────────────────── 10   │
│  │                    │                    │        │
│  🟢 НИЗКИЙ           🟠 СРЕДНИЙ           🔴 ВЫСОКИЙ│
│  (0-2.5)             (2.5-5.5)            (5.5-10)  │
│                                                         │
│  ✅ ПОЛЁТ          ⚠️ С ОГРАНИЧЕНИЯМИ   🚫 ЗАПРЕЩЁН  │
│  РАЗРЕШЁН                              │
└─────────────────────────────────────────────────────┘
```

| Диапазон | Уровень | Цвет | Статус |
|----------|---------|------|--------|
| 0 — 2.5 | Низкий риск | 🟢 #38a169 | ✅ Полёт разрешён |
| 2.5 — 5.5 | Средний риск | 🟠 #ed8936 | ⚠️ С ограничениями |
| 5.5 — 10 | Высокий риск | 🔴 #e53e3e | 🚫 Не рекомендуется |

---

### 2. Факторы риска (6 параметров)

| Фактор | Вес | Макс. балл | Критерии |
|--------|-----|------------|----------|
| **💨 Ветер** | 25% | 3.0 | >120% макс. = 3, >100% = 2.5, >80% = 1.5, >60% = 0.5 |
| **🌧️ Осадки** | 20% | 3.0 | >2 мм/ч = 3, >0.5 = 2, >0.1 = 1 |
| **👁️ Видимость** | 15% | 3.0 | <50% мин. = 3, <100% = 2, <150% = 1 |
| **🌡️ Температура** | 15% | 3.0 | Вне диапазона = 3, ±5°C от границ = 1.5 |
| **❄️ Обледенение** | 15% | 3.0 | High = 3, Medium = 1.5, Low = 0 |
| **🌪️ Турбулентность** | 10% | 2.5 | High = 2.5, Medium = 1, Low = 0 |

---

### 3. Формула расчёта

```javascript
// Шаг 1: Расчёт базовых баллов (0-3 для каждого фактора)
WindScore = calculateWindRisk(currentWind, maxWind)
PrecipScore = calculatePrecipRisk(currentPrecip, maxPrecip)
VisibilityScore = calculateVisibilityRisk(currentVis, minVis)
TempScore = calculateTempRisk(currentTemp, tempMin, tempMax)
IcingScore = calculateIcingRisk(temp, humidity, precip)
TurbulenceScore = calculateTurbulenceRisk(windSpeed, windGust)

// Шаг 2: Взвешенная сумма
BaseScore = (
    WindScore × 0.25 +
    PrecipScore × 0.20 +
    VisibilityScore × 0.15 +
    TempScore × 0.15 +
    IcingScore × 0.15 +
    TurbulenceScore × 0.10
)

// Шаг 3: Коэффициенты
TypeCoeff = getTypeCoefficient(uavType)      // 1.0 | 1.15 | 1.08
CategoryCoeff = getCategoryCoefficient(cat)  // 0.8 | 1.0 | 1.2 | 1.4
MissionCoeff = getMissionCoeff(mission)      // 1.0 | 1.1 | 1.3 | 0.9

// Шаг 4: Итоговая оценка
IntegralScore = BaseScore × TypeCoeff × CategoryCoeff × MissionCoeff

// Ограничение: 0-10
FinalScore = Math.min(10, Math.max(0, IntegralScore))
```

---

### 4. Коэффициенты

#### Тип БВС
```javascript
const TypeCoefficients = {
    fixedwing: 1.0,      // Самолётный тип (стабильнее)
    multicopter: 1.15,   // Мультиротор (менее стабилен)
    helicopter: 1.08     // Вертолёт (среднее)
};
```

#### Категория БВС (по массе)
```javascript
const CategoryCoefficients = {
    MICRO: 0.8,   // < 0.25 кг  (лёгкие, менее инертны)
    LIGHT: 1.0,   // < 7 кг     (стандарт)
    MEDIUM: 1.2,  // < 25 кг    (тяжелее, инертнее)
    HEAVY: 1.4    // < 150 кг   (очень тяжёлые)
};
```

#### Профиль миссии
```javascript
const MissionCoefficients = {
    visual: 1.0,       // Визуальное наблюдение (безопасность)
    cargo: 1.1,        // Доставка груза (эффективность)
    emergency: 1.3,    // Экстренная миссия (риск оправдан)
    agriculture: 0.9,  // Агро мониторинг (точность)
    mapping: 1.0,      // Картография (стандарт)
    surveillance: 1.0  // Наблюдение (стандарт)
};
```

---

### 5. Алгоритмы расчёта рисков

#### 5.1 Ветер
```javascript
function calculateWindRisk(windSpeed, maxWind) {
    const ratio = windSpeed / maxWind;
    
    if (ratio > 1.2) return 3.0;      // >120% порога
    if (ratio > 1.0) return 2.5;      // >100% порога
    if (ratio > 0.8) return 1.5;      // >80% порога
    if (ratio > 0.6) return 0.5;      // >60% порога
    return 0;
}
```

#### 5.2 Осадки
```javascript
function calculatePrecipRisk(precip, maxPrecip) {
    if (maxPrecip === 0 && precip > 0) return 3.0;  // Нельзя вообще
    if (precip > 2) return 3.0;
    if (precip > 0.5) return 2.0;
    if (precip > 0.1) return 1.0;
    return 0;
}
```

#### 5.3 Видимость
```javascript
function calculateVisibilityRisk(visibility, minVisibility) {
    const ratio = visibility / minVisibility;
    
    if (ratio < 0.5) return 3.0;      // <50% порога
    if (ratio < 1.0) return 2.0;      // <100% порога
    if (ratio < 1.5) return 1.0;      // <150% порога
    return 0;
}
```

#### 5.4 Температура
```javascript
function calculateTempRisk(temp, tempMin, tempMax) {
    if (temp < tempMin || temp > tempMax) return 3.0;  // Вне диапазона
    if (temp < tempMin + 5 || temp > tempMax - 5) return 1.5;  // ±5°C от границ
    return 0;
}
```

#### 5.5 Обледенение
```javascript
function calculateIcingRisk(temp, humidity, precip) {
    // Условия для обледенения
    if (temp <= 5 && temp >= -10 && humidity > 80) {
        // Высокий риск: от 0 до -5°C (наиболее опасный диапазон)
        if (temp <= 0 && temp >= -5) {
            return 3.0;  // High
        }
        return 1.5;  // Medium
    }
    
    // Дополнительный фактор: осадки при отрицательной температуре
    if (temp < 0 && precip > 0) {
        return 2.0;
    }
    
    return 0;  // Low
}
```

#### 5.6 Турбулентность
```javascript
function calculateTurbulenceRisk(windSpeed, windGust) {
    const gustFactor = windSpeed > 0 ? windGust / windSpeed : 1;
    
    // Высокая турбулентность
    if (gustFactor > 1.5 || windSpeed > 15) {
        return 2.5;
    }
    
    // Средняя турбулентность
    if (gustFactor > 1.2 || windSpeed > 10) {
        return 1.0;
    }
    
    return 0;  // Низкая
}
```

---

## 🖥️ ТРЕБОВАНИЯ К UI

### 1. Визуализация оценки

```
┌─────────────────────────────────────┐
│ 📊 Интегральная Оценка             │
├─────────────────────────────────────┤
│        ╭─────────────╮              │
│        │    2.3      │  ← Score    │
│        │   из 10     │              │
│        ╰─────────────╯              │
│     ✅ ПОЛЁТ РАЗРЕШЁН               │
├─────────────────────────────────────┤
│ 💨 Ветер        ████████░░░░  0.8  │
│ 🌧️ Осадки       ██░░░░░░░░░░  0.5  │
│ 👁️ Видимость    ████░░░░░░░░  0.9  │
│ 🌡️ Темп.        ███░░░░░░░░░  0.7  │
│ ❄️ Обледенение   ██░░░░░░░░░░  0.4  │
│ 🌪️ Турбулент.   ████░░░░░░░░  0.8  │
└─────────────────────────────────────┘
```

### 2. Цветовая схема

```css
:root {
    --score-low: #38a169;      /* 🟢 Зелёный */
    --score-medium: #ed8936;   /* 🟠 Оранжевый */
    --score-high: #e53e3e;     /* 🔴 Красный */
    
    --score-low-bg: rgba(56, 161, 105, 0.1);
    --score-medium-bg: rgba(237, 137, 54, 0.1);
    --score-high-bg: rgba(229, 62, 62, 0.1);
}
```

### 3. Круговой индикатор

```css
.score-circle {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    background: conic-gradient(
        var(--score-color) var(--score-percent),
        rgba(0, 0, 0, 0.1) 0deg
    );
}
```

---

## 📈 ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ

### 1. Временной скоринг

```javascript
// Расчёт скоринга для каждого часа прогноза
function calculateTimeSeriesScore(forecast, config) {
    return forecast.hourly.map(hour => ({
        time: hour.time,
        score: calculateIntegralScore(hour, config),
        isFlightWindow: hour.score < 2.5
    }));
}
```

### 2. Поиск благоприятных окон

```javascript
function findFlightWindows(hourlyScores, minDuration = 2) {
    const windows = [];
    let currentWindow = null;
    
    for (let i = 0; i < hourlyScores.length; i++) {
        const hour = hourlyScores[i];
        const isGood = hour.score < 2.5;  // Low risk
        
        if (isGood) {
            if (!currentWindow) {
                currentWindow = {
                    start: hour.time,
                    end: hour.time,
                    hours: [hour]
                };
            } else {
                currentWindow.end = hour.time;
                currentWindow.hours.push(hour);
            }
        } else {
            if (currentWindow && currentWindow.hours.length >= minDuration) {
                windows.push(currentWindow);
            }
            currentWindow = null;
        }
    }
    
    // Добавляем последнее окно
    if (currentWindow && currentWindow.hours.length >= minDuration) {
        windows.push(currentWindow);
    }
    
    return windows.sort((a, b) => 
        a.avgScore - b.avgScore
    );
}
```

### 3. Генерация рекомендаций

```javascript
function generateRecommendations(score, breakdown, weather) {
    const recommendations = [];
    
    if (score.total <= 2.5) {
        recommendations.push({
            type: 'success',
            text: '✅ Полёт разрешён. Условия благоприятные.'
        });
    } else if (score.total <= 5.5) {
        recommendations.push({
            type: 'warning',
            text: '⚠️ Полёт возможен с ограничениями.'
        });
    } else {
        recommendations.push({
            type: 'danger',
            text: '🚫 Полёт не рекомендуется. Высокий риск.'
        });
    }
    
    // Специфические рекомендации по факторам
    if (breakdown.wind > 2) {
        recommendations.push({
            type: 'warning',
            text: `💨 Ветер превышает безопасный порог (${weather.wind} м/с)`
        });
    }
    
    if (breakdown.icing > 1.5) {
        recommendations.push({
            type: 'danger',
            text: '❄️ Высокий риск обледенения. Будьте осторожны.'
        });
    }
    
    return recommendations;
}
```

---

## 🔧 ИНТЕГРАЦИЯ

### 1. Точки интеграции

```javascript
// Главный модуль скоринга
const ScoringModule = {
    // Основная функция
    calculateIntegralScore(weather, config, mission),
    
    // Расчёт рисков
    calculateWindRisk(wind, maxWind),
    calculatePrecipRisk(precip, maxPrecip),
    calculateVisibilityRisk(vis, minVis),
    calculateTempRisk(temp, min, max),
    calculateIcingRisk(temp, humidity, precip),
    calculateTurbulenceRisk(wind, gust),
    
    // Коэффициенты
    getTypeCoefficient(type),
    getCategoryCoefficient(category),
    getMissionCoefficient(mission),
    
    // Уровни риска
    getRiskLevel(score),
    getRiskColor(score),
    getRiskStatus(score)
};
```

### 2. Конфигурация

```javascript
const ScoringConfig = {
    // Пороги по умолчанию
    defaultThresholds: {
        maxWind: 10,           // м/с
        maxPrecip: 0,          // мм/ч (0 = нельзя)
        minVisibility: 2,      // км
        tempMin: -10,          // °C
        tempMax: 35,           // °C
        maxIcingRisk: 'low',   // low/medium/high
        maxTurbulence: 'medium'
    },
    
    // Типы БВС
    uavTypes: ['multicopter', 'fixedwing', 'helicopter'],
    
    // Категории
    categories: ['MICRO', 'LIGHT', 'MEDIUM', 'HEAVY'],
    
    // Миссии
    missions: ['visual', 'cargo', 'emergency', 'agriculture', 'mapping', 'surveillance']
};
```

---

## 📊 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Пример 1: Базовый расчёт

```javascript
const weather = {
    wind: 5.2,
    windGust: 6.5,
    precip: 0,
    visibility: 10,
    temp: 15,
    humidity: 65
};

const config = {
    uavType: 'multicopter',
    category: 'LIGHT',
    maxWind: 10,
    maxPrecip: 0,
    minVisibility: 2,
    tempMin: -10,
    tempMax: 35
};

const mission = 'visual';

const score = ScoringModule.calculateIntegralScore(weather, config, mission);

console.log(score);
// {
//     total: 0.8,
//     level: 'low',
//     status: 'allowed',
//     breakdown: {
//         wind: 0.5,
//         precip: 0,
//         visibility: 0,
//         temp: 0,
//         icing: 0,
//         turbulence: 0.3
//     }
// }
```

### Пример 2: Временной ряд

```javascript
const forecast = await WeatherModule.getForecast(lat, lon);
const timeSeries = ScoringModule.calculateTimeSeriesScore(forecast, config);

// Построение графика
Plotly.newPlot('chart', [{
    x: timeSeries.map(h => h.time),
    y: timeSeries.map(h => h.score.total),
    type: 'scatter'
}]);
```

### Пример 3: Благоприятные окна

```javascript
const windows = ScoringModule.findFlightWindows(timeSeries, 2);

windows.forEach(w => {
    console.log(`Окно: ${w.start} - ${w.end}, Score: ${w.avgScore}`);
});
```

---

## ✅ ЧЕК-ЛИСТ РЕАЛИЗАЦИИ

### Ядро скоринга
- [ ] `calculateIntegralScore()` — главная функция
- [ ] `calculateWindRisk()` — риск ветра
- [ ] `calculatePrecipRisk()` — риск осадков
- [ ] `calculateVisibilityRisk()` — риск видимости
- [ ] `calculateTempRisk()` — температурный риск
- [ ] `calculateIcingRisk()` — риск обледенения
- [ ] `calculateTurbulenceRisk()` — риск турбулентности

### Коэффициенты
- [ ] `getTypeCoefficient()` — тип БВС
- [ ] `getCategoryCoefficient()` — категория
- [ ] `getMissionCoefficient()` — профиль миссии

### Уровни риска
- [ ] `getRiskLevel()` — низкий/средний/высокий
- [ ] `getRiskColor()` — цвет для уровня
- [ ] `getRiskStatus()` — статус полёта

### Дополнительные функции
- [ ] `calculateTimeSeriesScore()` — временной скоринг
- [ ] `findFlightWindows()` — поиск окон
- [ ] `generateRecommendations()` — рекомендации

### UI компоненты
- [ ] Круговой индикатор скоринга
- [ ] Прогресс-бары для 6 факторов
- [ ] Цветовая индикация (🟢🟠🔴)
- [ ] Текстовый статус (Разрешён/Запрещён)

---

## 📝 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Производительность
- Время расчёта: < 10 мс
- Кэширование: 5 минут для одинаковых входных данных
- Оптимизация: предварительный расчёт коэффициентов

### Точность
- Округление: 1 знак после запятой
- Диапазон: 0-10 (обязательная проверка)
- Погрешность: ±0.1 балла

### Тестирование
```javascript
// Юнит-тесты
describe('ScoringModule', () => {
    it('должен возвращать 0 при идеальных условиях', () => {
        const score = calculateIntegralScore(idealWeather, config, mission);
        expect(score.total).toBeLessThan(1.0);
    });
    
    it('должен возвращать >5.5 при опасных условиях', () => {
        const score = calculateIntegralScore(dangerousWeather, config, mission);
        expect(score.total).toBeGreaterThan(5.5);
    });
    
    it('должен учитывать тип БВС', () => {
        const multiScore = calculateIntegralScore(weather, {...config, type: 'multicopter'}, mission);
        const fixedScore = calculateIntegralScore(weather, {...config, type: 'fixedwing'}, mission);
        expect(multiScore.total).toBeGreaterThan(fixedScore.total);
    });
});
```

---

## 🎯 КРИТЕРИИ ПРИЁМКИ

1. ✅ Расчёт скоринга работает корректно для всех диапазонов
2. ✅ Цветовая индикация соответствует уровням риска
3. ✅ UI отображает все 6 факторов риска
4. ✅ Временной скоринг строит графики
5. ✅ Благоприятные окна находятся правильно
6. ✅ Рекомендации генерируются по контексту
7. ✅ Производительность < 10 мс на расчёт
8. ✅ Все юнит-тесты проходят

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ

- [Документация по формулам](./docs/SCORING_FORMULAS.md)
- [Примеры расчётов](./docs/SCORING_EXAMPLES.md)
- [UI компоненты](./docs/SCORING_UI.md)

---

**Версия промпта:** 1.0  
**Дата:** 3 марта 2026 г.  
**Статус:** ✅ Готов к использованию
