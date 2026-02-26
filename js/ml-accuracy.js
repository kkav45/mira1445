/**
 * MIRA - ML Точность прогнозов (ml-accuracy.js)
 * Сбор данных, расчёт точности источников, адаптивная коррекция
 */

const MLAccuracyModule = {
    /**
     * История наблюдений
     * Формат: {source, parameter, forecast, actual, error, percentError, date, lat, lon}
     */
    history: [],

    /**
     * Кэш точности по источникам и параметрам
     */
    accuracyCache: {},

    /**
     * Инициализация
     */
    init() {
        this.load();
        console.log('🤖 ML Accuracy Module инициализирован');
    },

    /**
     * Добавить наблюдение
     */
    addObservation(source, parameter, forecast, actual, lat, lon) {
        const observation = {
            id: Date.now(),
            source: source,
            parameter: parameter || 'wind', // wind, temp, humidity
            forecast: forecast,
            actual: actual,
            error: Math.abs(forecast - actual),
            percentError: forecast !== 0 ? Math.abs((forecast - actual) / forecast * 100) : 0,
            date: new Date().toISOString(),
            lat: lat,
            lon: lon
        };

        this.history.push(observation);
        this.save();

        // Обновление кэша точности для этого источника и параметра
        this.updateAccuracyCache(source, parameter);

        console.log('📊 Наблюдение добавлено:', observation);
        return observation;
    },

    /**
     * Добавить пакет наблюдений
     */
    addBatchObservations(observations) {
        observations.forEach(obs => {
            this.history.push(obs);
        });
        this.save();
        console.log('📊 Добавлено наблюдений:', observations.length);
    },

    /**
     * Получить точность источника
     */
    getAccuracy(source, days = 30, lat = null, lon = null, parameter = null) {
        const recent = this.getRecentObservations(source, days, lat, lon, parameter);

        if (recent.length === 0) {
            return {
                source: source,
                parameter: parameter || 'all',
                accuracy: 0.5, // Нет данных = средняя точность
                avgError: null,
                count: 0,
                period: days
            };
        }

        // Средняя ошибка
        const avgError = recent.reduce((sum, obs) => sum + obs.error, 0) / recent.length;

        // Нормализованная точность (0-1) в зависимости от параметра
        let normalizedAccuracy;
        if (parameter === 'wind') {
            // Для ветра: ошибка 0 м/с = 100%, ошибка 5+ м/с = 0%
            normalizedAccuracy = Math.max(0, 1 - avgError / 5);
        } else if (parameter === 'temp') {
            // Для температуры: ошибка 0°C = 100%, ошибка 10+°C = 0%
            normalizedAccuracy = Math.max(0, 1 - avgError / 10);
        } else if (parameter === 'humidity') {
            // Для влажности: ошибка 0% = 100%, ошибка 30+% = 0%
            normalizedAccuracy = Math.max(0, 1 - avgError / 30);
        } else {
            // Для всех параметров: усреднённая
            normalizedAccuracy = Math.max(0, 1 - avgError / 5);
        }

        return {
            source: source,
            parameter: parameter || 'all',
            accuracy: normalizedAccuracy,
            avgError: avgError,
            count: recent.length,
            period: days,
            minError: Math.min(...recent.map(o => o.error)),
            maxError: Math.max(...recent.map(o => o.error))
        };
    },

    /**
     * Получить недавние наблюдения
     */
    getRecentObservations(source, days = 30, lat = null, lon = null, parameter = null) {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

        return this.history.filter(obs => {
            const matchSource = obs.source === source;
            const matchDate = new Date(obs.date).getTime() > cutoff;
            const matchLocation = !lat || !lon || 
                (Math.abs(obs.lat - lat) < 1 && Math.abs(obs.lon - lon) < 1);
            const matchParameter = !parameter || obs.parameter === parameter;

            return matchSource && matchDate && matchLocation && matchParameter;
        });
    },

    /**
     * Получить лучший источник для локации
     */
    getBestSource(lat, lon, days = 30) {
        const sources = ['open-meteo', 'met-no'];
        const accuracies = sources.map(source => this.getAccuracy(source, days, lat, lon));

        const best = accuracies.reduce((best, current) => 
            current.accuracy > best.accuracy ? current : best
        , {source: 'open-meteo', accuracy: 0});

        console.log('🏆 Лучший источник:', best);
        return best;
    },

    /**
     * Получить взвешенный прогноз
     */
    getWeightedForecast(forecasts, lat, lon) {
        if (!forecasts || forecasts.length === 0) return null;

        const weights = forecasts.map(f => {
            const accuracy = this.getAccuracy(f.source, 30, lat, lon);
            return accuracy.accuracy;
        });

        const totalWeight = weights.reduce((sum, w) => sum + w, 0);

        if (totalWeight === 0) return forecasts[0];

        // Взвешенное среднее
        const weightedValue = forecasts.reduce((sum, f, i) => sum + (f.value * weights[i]), 0) / totalWeight;

        return {
            value: weightedValue,
            sources: forecasts,
            weights: weights,
            confidence: Math.max(...weights)
        };
    },

    /**
     * Адаптивная коррекция прогноза
     */
    correctForecast(forecast, source, lat, lon) {
        const accuracy = this.getAccuracy(source, 30, lat, lon);

        if (accuracy.avgError === null) return forecast;

        // Коррекция на основе систематической ошибки
        const recent = this.getRecentObservations(source, 30, lat, lon);
        
        // Средняя систематическая ошибка (forecast - actual)
        const bias = recent.reduce((sum, obs) => sum + (obs.forecast - obs.actual), 0) / recent.length;

        // Коррекция
        const corrected = forecast - bias;

        console.log('🔧 Коррекция:', {
            original: forecast,
            bias: bias.toFixed(2),
            corrected: corrected.toFixed(2)
        });

        return corrected;
    },

    /**
     * Обновление кэша точности
     */
    updateAccuracyCache(source, parameter = null) {
        const key = parameter ? `${source}_${parameter}` : source;
        this.accuracyCache[key] = this.getAccuracy(source, 30, null, null, parameter);
    },

    /**
     * Получить кэш точности
     */
    getAccuracyCache() {
        return this.accuracyCache;
    },

    /**
     * Получить сводную точность по источнику (все параметры)
     */
    getOverallAccuracy(source, days = 30) {
        const wind = this.getAccuracy(source, days, null, null, 'wind');
        const temp = this.getAccuracy(source, days, null, null, 'temp');
        const humidity = this.getAccuracy(source, days, null, null, 'humidity');

        const total = wind.count + temp.count + humidity.count;
        if (total === 0) return null;

        const weightedAccuracy = (
            wind.accuracy * wind.count +
            temp.accuracy * temp.count +
            humidity.accuracy * humidity.count
        ) / total;

        return {
            source: source,
            accuracy: weightedAccuracy,
            count: total,
            byParameter: {wind, temp, humidity}
        };
    },

    /**
     * Сохранение в localStorage
     */
    save() {
        try {
            // Храним только последние 1000 наблюдений
            const recentHistory = this.history.slice(-1000);
            
            localStorage.setItem('mira_ml_history', JSON.stringify({
                history: recentHistory,
                savedAt: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Ошибка сохранения ML истории:', error);
        }
    },

    /**
     * Загрузка из localStorage
     */
    load() {
        try {
            const data = localStorage.getItem('mira_ml_history');
            if (data) {
                const parsed = JSON.parse(data);
                this.history = parsed.history || [];
                console.log('📥 Загружено наблюдений:', this.history.length);
            }
        } catch (error) {
            console.error('Ошибка загрузки ML истории:', error);
        }
    },

    /**
     * Очистка истории
     */
    clear() {
        this.history = [];
        this.accuracyCache = {};
        this.save();
        console.log('🗑️ ML история очищена');
    },

    /**
     * Экспорт статистики
     */
    getStats() {
        const sources = ['open-meteo', 'met-no'];
        const stats = {};

        sources.forEach(source => {
            const accuracy = this.getAccuracy(source, 30);
            const allTime = this.getAccuracy(source, 365);
            
            stats[source] = {
                recent: accuracy,
                allTime: allTime,
                total: this.history.filter(obs => obs.source === source).length
            };
        });

        return stats;
    }
};

// Инициализация при загрузке
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        MLAccuracyModule.init();
    });
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MLAccuracyModule;
}
