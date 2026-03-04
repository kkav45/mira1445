# 🚁 ОТЧЁТ О ВОЗМОЖНОСТИ ПЕРЕФОРМАТИРОВАНИЯ MIRA
## В МЕТЕОРОЛОГИЧЕСКУЮ СКОРИНГ-СИСТЕМУ ДЛЯ ПОЛЕТОВ БВС

**Дата:** 3 марта 2026 г.  
**Версия отчёта:** 1.0  
**Статус:** ✅ Анализ завершён

---

## 📋 РЕЗЮМЕ

Проект **MIRA v0.1.4.5** представляет собой готовую метеорологическую аналитическую систему для БВС с частично реализованной функциональностью скоринга. 

**Вывод:** ✅ **Переформатирование в полноценную скоринг-систему возможно и целесообразно.**

**Текущая готовность скоринг-функциональности:** ~75%

---

## 1. АНАЛИЗ ТЕКУЩЕЙ АРХИТЕКТУРЫ

### 1.1. Существующие компоненты

```
MIRA Desktop Application
├── ✅ Метеоданные (Open-Meteo API)
├── ✅ Система расчёта рисков (Risk Scoring)
├── ✅ Мульти-маршрутная поддержка
├── ✅ Энергетическое планирование
├── ✅ Дашборд с аналитикой
├── ✅ Экспорт отчётов (PDF)
├── ✅ Визуализация (карта, графики)
└── ⚠️  Скоринг для БВС (требует доработки)
```

### 1.2. Ключевые файлы проекта

| Файл | Назначение | Готовность |
|------|------------|------------|
| `desktop.html` | Основной UI | 100% |
| `js/metno.js` | MET No API, risk scoring | 90% |
| `js/modules/weather-analysis/` | Метеоанализ | 80% |
| `js/modules/multi-route/` | Мульти-маршруты | 85% |
| `js/modules/dashboard/` | Дашборд | 95% |
| `js/pdf-export.js` | PDF экспорт | 90% |
| `docs/09_RISK_CALCULATIONS.md` | Документация рисков | 100% |

---

## 2. СУЩЕСТВУЮЩАЯ СИСТЕМА СКОРИНГА

### 2.1. Текущая модель расчёта рисков

**Файл:** `js/metno.js` → `calculateRisk()`

```javascript
calculateRisk(hour) {
    let score = 0;

    // Ветер (вес 30%)
    if (hour.wind10m > 10) score += 3;
    else if (hour.wind10m > 7) score += 2;
    else if (hour.wind10m > 5) score += 1;

    // Осадки (вес 25%)
    if (hour.precip > 2) score += 3;
    else if (hour.precip > 0.5) score += 2;
    else if (hour.precip > 0.1) score += 1;

    // Температура/обледенение (вес 20%)
    if (hour.temp2m <= 0 && hour.humidity > 80) score += 2;
    else if (hour.temp2m <= 5 && hour.humidity > 80) score += 1;

    // Облачность (вес 15%)
    if (hour.cloudCover > 90) score += 1;
    else if (hour.cloudCover > 70) score += 0.5;

    // Давление (вес 10%)
    if (hour.pressure < 980 || hour.pressure > 1040) score += 1;

    return {
        score: score,
        level: score >= 5 ? 'high' : score >= 2 ? 'medium' : 'low'
    };
}
```

### 2.2. Уровни риска

| Score | Уровень | Цвет | Статус |
|-------|---------|------|--------|
| 0-1 | Low | 🟢 | Разрешён |
| 2-4 | Medium | 🟠 | С ограничениями |
| 5+ | High | 🔴 | Запрещён |

### 2.3. Дополнительные риски

**Файл:** `docs/09_RISK_CALCULATIONS.md`

```javascript
// Риск обледенения
calculateIcingRisk(temp, humidity) {
    if (temp <= 5 && temp >= -10 && humidity > 80) {
        if (temp <= 0 && temp >= -5) return 'high';
        return 'medium';
    }
    return 'low';
}

// Риск турбулентности
calculateTurbulenceRisk(windSpeed, windGust) {
    const gustFactor = windSpeed > 0 ? windGust / windSpeed : 1;
    if (gustFactor > 1.5 || windSpeed > 15) return 'high';
    if (gustFactor > 1.2 || windSpeed > 10) return 'medium';
    return 'low';
}
```

---

## 3. НЕОБХОДИМЫЕ ДОРАБОТКИ ДЛЯ СКОРИНГ-СИСТЕМЫ

### 3.1. Приоритет 1 (Критично)

#### 3.1.1. Интегральный скоринг для БВС

**Требуется:** Создать универсальную формулу скоринга для разных типов БВС

```javascript
// НОВЫЙ МОДУЛЬ: js/scoring/uav-scoring.js

const UAVScoringModule = {
    // Типы БВС
    aircraftTypes: {
        FIXED_WING: 'fixed_wing',      // Самолётный тип
        MULTICOPTER: 'multicopter',    // Мультиротор
        HELICOPTER: 'helicopter'       // Вертолётный тип
    },

    // Категории БВС по массе
    categories: {
        MICRO: { maxWeight: 0.25, maxSpeed: 15, maxAlt: 50 },
        LIGHT: { maxWeight: 7, maxSpeed: 25, maxAlt: 120 },
        MEDIUM: { maxWeight: 25, maxSpeed: 40, maxAlt: 300 },
        HEAVY: { maxWeight: 150, maxSpeed: 60, maxAlt: 500 }
    },

    /**
     * Расчёт интегрального скоринга
     * @param {Object} weather - Метеоданные
     * @param {Object} uavConfig - Конфигурация БВС
     * @returns {Object} Score с рекомендациями
     */
    calculateIntegralScore(weather, uavConfig) {
        const baseScore = this.calculateBaseScore(weather);
        const typeCoefficient = this.getTypeCoefficient(uavConfig.type);
        const categoryCoefficient = this.getCategoryCoefficient(uavConfig.category);
        const missionCoefficient = this.getMissionCoefficient(uavConfig.mission);

        const finalScore = baseScore * typeCoefficient * categoryCoefficient * missionCoefficient;

        return {
            totalScore: Math.min(10, finalScore),
            level: this.getScoreLevel(finalScore),
            breakdown: {
                wind: baseScore.wind,
                precip: baseScore.precip,
                visibility: baseScore.visibility,
                temp: baseScore.temp,
                icing: baseScore.icing,
                turbulence: baseScore.turbulence
            },
            coefficients: {
                type: typeCoefficient,
                category: categoryCoefficient,
                mission: missionCoefficient
            },
            recommendations: this.generateRecommendations(finalScore, weather, uavConfig)
        };
    }
};
```

#### 3.1.2. Конфигуратор БВС

**Требуется:** UI для настройки параметров БВС

**Файл:** `js/scoring/uav-configurator.js`

```javascript
const UAVConfigurator = {
    defaultConfig: {
        type: 'multicopter',
        category: 'LIGHT',
        maxWind: 10,           // м/с
        maxPrecip: 0,          // мм/ч (0 = нельзя)
        minVisibility: 2,      // км
        tempRange: [-10, 35],  // °C
        maxIcingRisk: 'low',   // low/medium/high
        maxTurbulence: 'medium',
        minCloudCeiling: 100,  // м
        batteryType: 'lipo',
        antennaRange: 60       // км
    },

    /**
     * Сохранение конфигурации
     */
    saveConfig(config) {
        localStorage.setItem('uav_scoring_config', JSON.stringify(config));
    },

    /**
     * Загрузка конфигурации
     */
    loadConfig() {
        const saved = localStorage.getItem('uav_scoring_config');
        return saved ? JSON.parse(saved) : this.defaultConfig;
    }
};
```

#### 3.1.3. Визуализация скоринга

**Требуется:** Heatmap рисков на карте

**Файл:** `js/scoring/score-heatmap.js`

```javascript
const ScoreHeatmapModule = {
    /**
     * Отображение тепловой карты рисков
     */
    renderHeatmap(map, scores) {
        // scores = [{lat, lon, score, radius}, ...]
        
        const features = scores.map(s => {
            const color = this.getScoreColor(s.score);
            return new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([s.lon, s.lat])),
                score: s.score,
                color: color
            });
        });

        const source = new ol.source.Vector({ features });
        
        const layer = new ol.layer.Heatmap({
            source: source,
            blur: 15,
            radius: 20,
            weight: 'score'
        });

        map.addLayer(layer);
        return layer;
    },

    getScoreColor(score) {
        if (score <= 2) return '#38a169';  // 🟢 Low
        if (score <= 5) return '#ed8936';  // 🟠 Medium
        return '#e53e3e';                   // 🔴 High
    }
};
```

---

### 3.2. Приоритет 2 (Важно)

#### 3.2.1. Профиль миссии

**Требуется:** Учёт типа миссии в скоринге

```javascript
const MissionProfiles = {
    VISUAL_OBSERVATION: {
        minVisibility: 3,
        maxWind: 8,
        maxIcingRisk: 'low',
        priority: 'safety'
    },
    CARGO_DELIVERY: {
        minVisibility: 2,
        maxWind: 12,
        maxIcingRisk: 'medium',
        priority: 'efficiency'
    },
    EMERGENCY_RESCUE: {
        minVisibility: 1,
        maxWind: 15,
        maxIcingRisk: 'high',
        priority: 'mission'
    },
    AGRICULTURE: {
        minVisibility: 2,
        maxWind: 6,
        maxIcingRisk: 'low',
        priority: 'precision'
    }
};
```

#### 3.2.2. Временной скоринг

**Требуется:** Прогноз рисков по времени

```javascript
const TimeSeriesScoring = {
    /**
     * Расчёт скоринга по временной шкале
     */
    calculateTimeSeries(weather, config) {
        const hourlyScores = weather.hourly.map(hour => ({
            time: hour.time,
            score: UAVScoringModule.calculateIntegralScore(hour, config),
            flightWindow: hour.riskScore < 2
        }));

        const windows = this.findOptimalWindows(hourlyScores);

        return {
            hourly: hourlyScores,
            optimalWindows: windows,
            bestTime: windows[0]?.start,
            worstTime: this.findWorstPeriod(hourlyScores)
        };
    }
};
```

#### 3.2.3. Сравнительный анализ баз

**Требуется:** Расширенная аналитика для мульти-маршрутов

**Файл:** `js/modules/multi-route/score-comparison.js`

```javascript
const BaseScoreComparison = {
    /**
     * Сравнение скоринга для разных баз
     */
    compareBases(bases, weatherData, uavConfig) {
        const comparison = bases.map(base => {
            const baseWeather = weatherData[base.id];
            const score = UAVScoringModule.calculateIntegralScore(baseWeather, uavConfig);
            
            return {
                base: base,
                score: score.totalScore,
                level: score.level,
                flightWindow: score.recommendations.flightWindow,
                riskFactors: score.breakdown
            };
        });

        // Сортировка по лучшему скорингу
        comparison.sort((a, b) => a.score - b.score);

        return {
            bestBase: comparison[0],
            ranking: comparison,
            recommendation: this.generateBaseRecommendation(comparison)
        };
    }
};
```

---

### 3.3. Приоритет 3 (Желательно)

#### 3.3.1. Машинное обучение

**Требуется:** Улучшение точности скоринга на основе истории

```javascript
const MLScoringModule = {
    /**
     * Обучение на исторических данных
     */
    trainFromHistory(flightLogs) {
        // flightLogs = [{weather, uavConfig, outcome}, ...]
        // outcome = 'success' | 'warning' | 'abort'
        
        const features = flightLogs.map(log => this.extractFeatures(log));
        const labels = flightLogs.map(log => log.outcome);

        // Простая логистическая регрессия
        const model = this.trainLogisticRegression(features, labels);
        
        localStorage.setItem('ml_scoring_model', JSON.stringify(model));
        return model;
    },

    /**
     * Предсказание успеха миссии
     */
    predictSuccess(weather, config) {
        const model = this.loadModel();
        const features = this.extractFeatures({weather, config});
        const probability = this.predict(model, features);
        
        return {
            successProbability: probability,
            riskLevel: probability > 0.8 ? 'low' : probability > 0.5 ? 'medium' : 'high'
        };
    }
};
```

#### 3.3.2. Интеграция с внешними API

**Требуется:** Дополнительные источники метео

```javascript
const ExternalWeatherSources = {
    sources: {
        OPEN_METEO: 'open_meteo',
        MET_NO: 'met_no',
        WEATHER_API: 'weather_api',
        AVIATION_WEATHER: 'aviation_weather'
    },

    /**
     * Агрегация данных из нескольких источников
     */
    async getAggregatedForecast(lat, lon) {
        const [openMeteo, metNo] = await Promise.all([
            OpenMeteoModule.getForecast(lat, lon),
            MetNoModule.getForecast(lat, lon)
        ]);

        return {
            wind: this.average([openMeteo.wind, metNo.wind]),
            precip: this.average([openMeteo.precip, metNo.precip]),
            visibility: this.best([openMeteo.visibility, metNo.visibility]),
            confidence: this.calculateConfidence(openMeteo, metNo)
        };
    }
};
```

#### 3.3.3. Мобильное приложение

**Требуется:** Адаптация для мобильных устройств

**Файл:** `css/mobile-scoring.css`

```css
/* Мобильная версия скоринга */
.scoring-card {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px;
}

.score-indicator {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
}

.score-indicator.low { background: #38a169; color: white; }
.score-indicator.medium { background: #ed8936; color: white; }
.score-indicator.high { background: #e53e3e; color: white; }
```

---

## 4. ПЛАН РЕАЛИЗАЦИИ

### Этап 1: Базовый скоринг (2-3 недели)

| Задача | Срок | Статус |
|--------|------|--------|
| 4.1.1. Модуль UAVScoringModule | 3 дня | ⏳ Pending |
| 4.1.2. Конфигуратор БВС (UI) | 3 дня | ⏳ Pending |
| 4.1.3. Интеграция с existing risk | 2 дня | ⏳ Pending |
| 4.1.4. Heatmap на карте | 4 дня | ⏳ Pending |
| 4.1.5. Тестирование | 3 дня | ⏳ Pending |

**Результат:** ✅ Базовая скоринг-система готова

---

### Этап 2: Расширенный скоринг (3-4 недели)

| Задача | Срок | Статус |
|--------|------|--------|
| 4.2.1. Профили миссий | 3 дня | ⏳ Pending |
| 4.2.2. Временной скоринг | 4 дня | ⏳ Pending |
| 4.2.3. Сравнение баз | 3 дня | ⏳ Pending |
| 4.2.4. PDF отчёт со скорингом | 3 дня | ⏳ Pending |
| 4.2.5. Тестирование | 4 дня | ⏳ Pending |

**Результат:** ✅ Полнофункциональная скоринг-система

---

### Этап 3: Продвинутые функции (4-6 недель)

| Задача | Срок | Статус |
|--------|------|--------|
| 4.3.1. ML модуль (базовый) | 7 дней | ⏳ Pending |
| 4.3.2. Внешние API | 5 дней | ⏳ Pending |
| 4.3.3. Мобильная версия | 7 дней | ⏳ Pending |
| 4.3.4. Документация | 3 дня | ⏳ Pending |
| 4.3.5. Финальное тестирование | 5 дней | ⏳ Pending |

**Результат:** ✅ Профессиональная скоринг-система

---

## 5. СТРУКТУРА НОВЫХ ФАЙЛОВ

```
project/
├── js/
│   ├── scoring/                    # НОВЫЙ модуль скоринга
│   │   ├── uav-scoring.js          # Ядро скоринга
│   │   ├── uav-configurator.js     # Конфигуратор БВС
│   │   ├── score-heatmap.js        # Тепловая карта
│   │   ├── mission-profiles.js     # Профили миссий
│   │   ├── time-series-scoring.js  # Временной скоринг
│   │   └── ml-scoring.js           # ML предсказания
│   │
│   ├── modules/
│   │   └── multi-route/
│   │       └── score-comparison.js # Сравнение баз
│   │
│   └── ...
│
├── css/
│   └── scoring.css                 # Стили скоринга
│
├── docs/
│   └── SCORING_SYSTEM.md           # Документация скоринга
│
└── index.html                      # Обновлённый UI
```

---

## 6. ИНТЕГРАЦИЯ С СУЩЕСТВУЮЩИМИ МОДУЛЯМИ

### 6.1. WeatherModule

```javascript
// Существующий код
const analyzed = WeatherModule.analyzeForecast(forecast);

// Новая интеграция
const uavConfig = UAVConfigurator.loadConfig();
const score = UAVScoringModule.calculateIntegralScore(analyzed, uavConfig);

// Отображение
DashboardModule.displayScore(score);
```

### 6.2. MultiRouteModule

```javascript
// Существующий код
const assignment = MultiRouteModule.optimizeAssignment(weatherData);

// Новая интеграция
const uavConfig = UAVConfigurator.loadConfig();
const scoreComparison = BaseScoreComparison.compareBases(
    MultiRouteModule.takeoffPoints,
    weatherData,
    uavConfig
);

// Выбор лучшей базы по скорингу
const bestBase = scoreComparison.bestBase;
```

### 6.3. DashboardModule

```javascript
// Новая вкладка "Скоринг"
DashboardModule.addTab({
    id: 'scoring',
    title: '🎯 Скоринг',
    content: ScoringDashboardModule.render()
});
```

---

## 7. ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Пример 1: Быстрый скоринг

```javascript
// Загрузка конфигурации
const config = UAVConfigurator.loadConfig();

// Получение метео
const weather = await WeatherModule.getForecast(lat, lon);

// Расчёт скоринга
const score = UAVScoringModule.calculateIntegralScore(weather, config);

// Результат
console.log(`Скоринг: ${score.totalScore}/10`);
console.log(`Уровень: ${score.level}`);
console.log(`Рекомендация: ${score.recommendations.text}`);
```

### Пример 2: Выбор времени полёта

```javascript
const config = UAVConfigurator.loadConfig();
const weather = await WeatherModule.getForecast(lat, lon);

const timeSeries = TimeSeriesScoring.calculateTimeSeries(weather, config);

console.log(`Лучшее время: ${timeSeries.bestTime}`);
console.log(`Окна для полёта:`, timeSeries.optimalWindows);
```

### Пример 3: Сравнение баз

```javascript
const bases = MultiRouteModule.takeoffPoints;
const config = UAVConfigurator.loadConfig();
const weather = await MultiRouteModule.getWeatherForAllBases();

const comparison = BaseScoreComparison.compareBases(bases, weather, config);

console.log(`Лучшая база: ${comparison.bestBase.base.name}`);
console.log(`Рейтинг:`, comparison.ranking);
```

---

## 8. МЕТРИКИ ЭФФЕКТИВНОСТИ

### 8.1. Точность скоринга

| Метрика | Целевое значение |
|---------|------------------|
| Точность предсказания | >85% |
| Ложные срабатывания | <10% |
| Пропущенные риски | <5% |

### 8.2. Производительность

| Метрика | Целевое значение |
|---------|------------------|
| Время расчёта скоринга | <100 мс |
| Время загрузки heatmap | <500 мс |
| Время генерации отчёта | <2 с |

---

## 9. РИСКИ И ОГРАНИЧЕНИЯ

### 9.1. Технические риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Неточность метео | Средняя | Высокое | Агрегация источников |
| Ошибки API | Низкая | Среднее | Кэширование, fallback |
| Производительность | Низкая | Низкое | Оптимизация, lazy load |

### 9.2. Ограничения

1. **Open-Meteo API:** 7 дней прогноза
2. **Точность:** Зависит от качества метео
3. **ML:** Требует истории полётов

---

## 10. РЕКОМЕНДАЦИИ

### 10.1. Приоритетные действия

1. ✅ **Немедленно:** Начать с Этапа 1 (базовый скоринг)
2. ✅ **Краткосрочно:** Реализовать профили миссий
3. ✅ **Среднесрочно:** Добавить ML модуль

### 10.2. Архитектурные решения

1. **Модульность:** Сохранить текущую архитектуру
2. **Расширяемость:** Добавить плагины для типов БВС
3. **Совместимость:** Поддержать существующие функции

### 10.3. Документирование

1. Создать `SCORING_SYSTEM.md`
2. Добавить примеры использования
3. Документировать формулы расчёта

---

## 11. ЗАКЛЮЧЕНИЕ

### 11.1. Оценка готовности

| Компонент | Готовность | Комментарий |
|-----------|------------|-------------|
| Метеоданные | 100% | ✅ Полностью готово |
| Risk scoring | 75% | ✅ Базовая реализация есть |
| Мульти-маршруты | 85% | ✅ Почти готово |
| Дашборд | 95% | ✅ Готово |
| UAV конфигуратор | 0% | ⏳ Требуется разработка |
| Heatmap | 10% | ⏳ Требуется разработка |
| ML скоринг | 0% | ⏳ Требуется разработка |

**Общая готовность:** ~65%

### 11.2. Итоговая рекомендация

✅ **Рекомендуется переформатирование проекта в метеорологическую скоринг-систему для БВС.**

**Обоснование:**
1. Существующая архитектура готова на 65%
2. Модульная структура позволяет быструю интеграцию
3. Документация и формулы уже реализованы
4. Требуется 9-13 недель на полную реализацию

**Ожидаемый результат:**
- Полнофункциональная скоринг-система
- Поддержка различных типов БВС
- Интеграция с мульти-маршрутами
- Мобильная версия
- ML-предсказания

---

## ПРИЛОЖЕНИЕ A: ФОРМУЛЫ СКОРИНГА

### A.1. Базовый скоринг

```
Score = Σ(ParameterWeight × RiskLevel)
```

### A.2. Интегральный скоринг

```
IntegralScore = BaseScore × TypeCoeff × CategoryCoeff × MissionCoeff
```

### A.3. Коэффициенты

| Тип БВС | Коэффициент |
|---------|-------------|
| Fixed Wing | 1.0 |
| Multicopter | 1.2 |
| Helicopter | 1.1 |

| Категория | Коэффициент |
|-----------|-------------|
| Micro | 0.8 |
| Light | 1.0 |
| Medium | 1.2 |
| Heavy | 1.4 |

---

## ПРИЛОЖЕНИЕ B: ЧЕК-ЛИСТ РЕАЛИЗАЦИИ

### Этап 1

- [ ] Создать `js/scoring/uav-scoring.js`
- [ ] Создать `js/scoring/uav-configurator.js`
- [ ] Интегрировать с `WeatherModule`
- [ ] Создать `js/scoring/score-heatmap.js`
- [ ] Добавить UI конфигуратора
- [ ] Тестирование

### Этап 2

- [ ] Создать `js/scoring/mission-profiles.js`
- [ ] Создать `js/scoring/time-series-scoring.js`
- [ ] Создать `js/modules/multi-route/score-comparison.js`
- [ ] Обновить PDF экспорт
- [ ] Тестирование

### Этап 3

- [ ] Создать `js/scoring/ml-scoring.js`
- [ ] Добавить внешние API
- [ ] Мобильная адаптация
- [ ] Документация
- [ ] Финальное тестирование

---

**Документ подготовил:** AI Assistant  
**Дата:** 3 марта 2026 г.  
**Версия:** 1.0  
**Статус:** ✅ Готово к реализации
