# Расчёт рисков и пороговые значения

## 📋 Назначение

Документ описывает математические модели расчёта рисков, пороговые значения и критерии принятия решений в MIRA.

---

## 🎯 Пороговые значения по умолчанию

### Основные пороги

| Параметр | Порог | Ед. изм. | Описание |
|----------|-------|----------|----------|
| `windGround` | 10 | м/с | Ветер на земле (10м) |
| `windAlt` | 15 | м/с | Ветер на высоте (500м) |
| `visibility` | 2 | км | Минимальная видимость |
| `precip` | 1.4 | мм/ч | Максимальные осадки |
| `tempMin` | -10 | °C | Минимальная температура |
| `tempMax` | 35 | °C | Максимальная температура |
| `cloudCeiling` | 300 | м | Нижняя граница облаков |
| `humidityIcing` | 80 | % | Влажность для обледенения |

---

## 📊 Расчёт общего риска (Risk Score)

### Алгоритм

```javascript
function calculateRiskScore(hour, thresholds) {
    let score = 0;

    // 1. Ветер (макс. +2 балла)
    if (hour.wind10m > thresholds.windGround) {
        score += 2;  // Ветер превышает порог
    } else if (hour.wind10m > thresholds.windGround * 0.8) {
        score += 1;  // Ветер > 80% порога
    }

    // 2. Видимость (макс. +2 балла)
    if (hour.visibility < thresholds.visibility) {
        score += 2;  // Видимость ниже порога
    } else if (hour.visibility < thresholds.visibility * 1.5) {
        score += 1;  // Видимость < 150% порога
    }

    // 3. Осадки (макс. +2 балла)
    if (hour.precip > thresholds.precip) {
        score += 2;  // Осадки выше порога
    } else if (hour.precip > 0.5) {
        score += 1;  // Осадки > 0.5 мм/ч
    }

    // 4. Обледенение (макс. +2 балла)
    if (hour.icingRisk === 'high') {
        score += 2;
    } else if (hour.icingRisk === 'medium') {
        score += 1;
    }

    return score;  // 0-8 баллов
}
```

### Шкала рисков

| Score | Уровень | Цвет | Статус полёта |
|-------|---------|------|---------------|
| 0-1 | Low | 🟢 #38a169 | Разрешён |
| 2-4 | Medium | 🟠 #ed8936 | С ограничениями |
| 5+ | High | 🔴 #e53e3e | Запрещён |

---

## 🌨️ Расчёт риска обледенения

### Алгоритм

```javascript
function calculateIcingRisk(temp, humidity) {
    const thresholds = Storage.getThresholds();
    
    // Условия для обледенения:
    // - Температура от +5 до -10°C
    // - Влажность выше 80%
    if (temp <= 5 && temp >= -10 && humidity > thresholds.humidityIcing) {
        // Высокий риск: от 0 до -5°C (наиболее опасный диапазон)
        if (temp <= 0 && temp >= -5) {
            return 'high';
        }
        // Средний риск: остальной диапазон
        return 'medium';
    }
    
    return 'low';
}
```

### Диаграмма риска обледенения

```
Температура (°C)    Влажность (%)    Риск
───────────────────────────────────────────
+5 ... -10          > 80%            Medium
 0 ... -5           > 80%            High
+6 ... +∞           любая            Low
-11 ... -∞          любая            Low
любая               ≤ 80%            Low
```

### Физическое обоснование

Обледенение БВС происходит при:
1. **Температура от +5 до -10°C** — диапазон существования переохлаждённой влаги
2. **Влажность > 80%** — достаточное содержание влаги в воздухе
3. **Наиболее опасный диапазон 0...-5°C** — максимальная вероятность обледенения

---

## 🌪️ Расчёт риска турбулентности

### Алгоритм

```javascript
function calculateTurbulenceRisk(windSpeed, windGust) {
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

### Шкала турбулентности

| Gust Factor | Ветер (м/с) | Риск |
|-------------|-------------|------|
| > 1.5 | любой | High |
| любой | > 15 | High |
| > 1.2 | любой | Medium |
| любой | > 10 | Medium |
| ≤ 1.2 | ≤ 10 | Low |

### Примеры расчёта

| Ветер | Порывы | Gust Factor | Риск |
|-------|--------|-------------|------|
| 5 м/с | 6 м/с | 1.20 | Medium |
| 5 м/с | 8 м/с | 1.60 | High |
| 12 м/с | 14 м/с | 1.17 | Medium |
| 16 м/с | 18 м/с | 1.13 | High |
| 8 м/с | 9 м/с | 1.13 | Low |

---

## 🪟 Поиск благоприятных окон

### Алгоритм

```javascript
function findFlightWindows(hourly, thresholds, minDuration = 2) {
    const windows = [];
    let currentWindow = null;

    for (let i = 0; i < hourly.length; i++) {
        const hour = hourly[i];
        const isGood = hour.riskScore < 2;  // Low risk

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

    return windows;
}
```

### Критерии благоприятного окна

| Параметр | Значение |
|----------|----------|
| Мин. длительность | 2 часа |
| Макс. riskScore | < 2 (Low) |
| Мин. видимость | ≥ 2 км |
| Макс. ветер | ≤ 10 м/с |

### Пример

```
Час:     08 09 10 11 12 13 14 15 16 17 18 19 20 21
Риск:    🟠 🟢 🟢 🟢 🟢 🟠 🔴 🔴 🟠 🟢 🟢 🟢 🟠 🟢
         │     └─── Окно 1 ───┘         └─Окно 2─┘
         
Окно 1: 10:00-14:00 (4 часа, riskScore < 2)
Окно 2: 18:00-21:00 (3 часа, riskScore < 2)
```

---

## 📊 Определение общего риска маршрута

### Для сегмента

```javascript
function calculateSegmentRiskScore(analyzed) {
    const highRiskCount = analyzed.hourly.filter(h => h.risk === 'high').length;
    const mediumRiskCount = analyzed.hourly.filter(h => h.risk === 'medium').length;
    const total = analyzed.hourly.length;

    const highRatio = highRiskCount / total;
    const mediumRatio = mediumRiskCount / total;

    if (highRatio > 0.3) return 3;      // >30% high risk
    if (highRatio > 0.1 || mediumRatio > 0.5) return 2;  // >10% high или >50% medium
    if (mediumRatio > 0.2) return 1;    // >20% medium
    return 0;                            // Low risk
}
```

### Для маршрута

```javascript
function getOverallRisk(segmentAnalysis) {
    const riskLevels = {
        low: segmentAnalysis.filter(s => s.riskLevel === 'low').length,
        medium: segmentAnalysis.filter(s => s.riskLevel === 'medium').length,
        high: segmentAnalysis.filter(s => s.riskLevel === 'high').length
    };

    if (riskLevels.high > segmentAnalysis.length * 0.3) {
        return 'high';      // >30% сегментов с высоким риском
    }
    if (riskLevels.medium > segmentAnalysis.length * 0.5) {
        return 'medium';    // >50% сегментов со средним риском
    }
    return 'low';
}
```

---

## 🚁 Статусы полёта (решения)

### Критерии

| Статус | Условия | Индикация |
|--------|---------|-----------|
| **ПОЛЁТ РАЗРЕШЁН** | Все параметры в норме | 🟢 |
| **ПОЛЁТ С ОГРАНИЧЕНИЯМИ** | 1 параметр за порогом | 🟠 |
| **ПОЛЁТ ЗАПРЕЩЁН** | ≥2 параметров за порогом | 🔴 |

### Алгоритм принятия решения

```javascript
function determineFlightStatus(pilotData, correctedAnalysis) {
    let overallRisk = 'low';
    let riskCount = 0;
    let maxAltitude = 550;

    // 1. Проверка ветра
    if (pilotData.windSpeed > thresholds.windGround) {
        overallRisk = 'high';
        riskCount++;
        maxAltitude = Math.max(250, maxAltitude - 200);
    }

    // 2. Проверка видимости
    if (pilotData.fog || (pilotData.visibility && pilotData.visibility < 1)) {
        overallRisk = 'high';
        riskCount++;
        maxAltitude = 0;  // Запрет полёта
    } else if (pilotData.visibility && pilotData.visibility < thresholds.visibility) {
        riskCount++;
        maxAltitude = Math.max(350, maxAltitude - 100);
    }

    // 3. Проверка осадков
    if (pilotData.precip) {
        riskCount++;
    }

    // 4. Проверка обледенения
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

    // 5. Определение статуса
    if (overallRisk === 'high' || riskCount >= 2) {
        return 'FORBIDDEN';
    } else if (riskCount >= 1) {
        return 'RESTRICTED';
    }
    return 'ALLOWED';
}
```

---

## 📈 Интерполяция для высот

### Температурный градиент

**Формула:**
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

---

### Профиль ветра

**Формула:**
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

---

### Барометрическая формула

**Формула:**
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

---

### Влажность

**Формула:**
```
RH(h) = max(0, RH₀ - h / 100)
```

**Пример:**
```
RH₀ = 80%
h = 500 м

RH(500) = max(0, 80 - 500/100) = max(0, 75) = 75%
```

---

## 📊 Сводная таблица расчётов для 5 высот

**Входные данные:**
- temp2m = +20°C
- wind10m = 10 м/с
- humidity = 80%
- pressure = 1013.25 гПа

**Результаты:**

| Высота | Темп. | Ветер | Давление | Влажность |
|--------|-------|-------|----------|-----------|
| 10 м | +19.9° | 10.0 м/с | 1012 гПа | 79.9% |
| 100 м | +19.4° | 10.3 м/с | 1002 гПа | 79% |
| 250 м | +18.4° | 10.8 м/с | 984 гПа | 77.5% |
| 350 м | +17.7° | 11.1 м/с | 972 гПа | 76.5% |
| 450 м | +17.1° | 11.4 м/с | 960 гПа | 75.5% |
| 550 м | +16.4° | 11.7 м/с | 949 гПа | 74.5% |

---

## 🔧 Коррекция прогноза по факту

### Формула затухания

```
weight = e^(-i / 24)
```

где `i` — номер часа от текущего момента

### Таблица затухания

| Время | i (час) | weight | Доля коррекции |
|-------|---------|--------|----------------|
| Сейчас | 0 | 1.000 | 100% |
| +1 ч | 1 | 0.959 | 96% |
| +3 ч | 3 | 0.882 | 88% |
| +6 ч | 6 | 0.779 | 78% |
| +12 ч | 12 | 0.606 | 61% |
| +24 ч | 24 | 0.368 | 37% |
| +36 ч | 36 | 0.223 | 22% |
| +48 ч | 48 | 0.135 | 14% |

### Формулы коррекции

```
Скорр_ветер(i) = Прогноз_ветер × (1 + (windBias - 1) × weight(i))
Скорр_темп(i)  = Прогноз_темп + (tempOffset × weight(i))
Скорр_видимость(i) = visibilityOverride (если задано)
```

---

## 📝 Changelog

### Версия 1.0

- ✅ Документированы все формулы расчёта рисков
- ✅ Добавлены пороговые значения
- ✅ Описаны алгоритмы принятия решений

---

**Версия документации:** 1.0  
**Дата:** 26 февраля 2026 г.  
**Категория:** Расчёты и пороги
