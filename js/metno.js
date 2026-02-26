/**
 * MIRA - MetNoModule (api.met.no)
 * Норвежский метеорологический институт - Locationforecast 2.0
 * 
 * Версия: 1.0
 * Дата: 26 февраля 2026 г.
 * 
 * Требования API:
 * - User-Agent header обязателен
 * - Кэширование рекомендуется
 * - Attribution: MET Norway
 */

const MetNoModule = {
    /**
     * API Endpoint
     * Documentation: https://api.met.no/doc/Locationforecast
     */
    API_BASE: 'https://api.met.no/weatherapi/locationforecast/2.0',

    /**
     * Идентификация приложения
     * Требуется по условиям использования API
     */
    APP_IDENTITY: {
        appName: 'MIRA',
        appVersion: '0.1.5.0',
        email: 'kkav45@ya.ru',
        userAgent: 'MIRA/0.1.5.0 (kkav45@ya.ru)'
    },

    /**
     * Кэш данных
     * Формат: { [cacheKey]: { data, timestamp, expires } }
     */
    cachedData: {},

    /**
     * Время жизни кэша (минуты)
     * MET No обновляется каждый час
     */
    CACHE_TTL: 120, // 2 часа

    /**
     * Получить прогноз погоды
     * @param {number} lat - Широта
     * @param {number} lon - Долгота
     * @param {number} altitude - Высота над уровнем моря (опционально)
     * @returns {Promise<Object>} Прогноз в формате MIRA
     */
    async getForecast(lat, lon, altitude = 0) {
        const cacheKey = `metno_${lat.toFixed(4)}_${lon.toFixed(4)}`;

        // Проверка кэша
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            Utils.log('MET No: данные из кэша');
            return cached;
        }

        // Формирование URL
        const url = `${this.API_BASE}/compact?lat=${lat}&lon=${lon}&msl=${altitude}`;

        try {
            Utils.log(`MET No: запрос ${lat.toFixed(4)}, ${lon.toFixed(4)}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': this.APP_IDENTITY.userAgent
                }
            });

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('MET No API: 403 Forbidden. Проверьте User-Agent header.');
                }
                throw new Error(`MET No API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Парсинг в формат MIRA
            const parsed = this.parseForecast(data, lat, lon);

            // Сохранение в кэш
            this.saveToCache(cacheKey, parsed);

            return parsed;

        } catch (error) {
            Utils.error('MET No: ошибка получения прогноза', error);
            throw error;
        }
    },

    /**
     * Расчёт рисков для данных MET No
     * @param {Object} hour - Часовые данные
     * @returns {Object} Расчёт рисков
     */
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
    },

    /**
     * Анализ прогноза MET No
     * @param {Object} forecast - Прогноз в формате MIRA
     * @returns {Object} Проанализированные данные
     */
    analyzeForecast(forecast) {
        if (!forecast || !forecast.hourly) return null;

        const hourly = forecast.hourly;
        const analyzed = [];

        for (let i = 0; i < hourly.length; i++) {
            const hour = hourly[i];
            const risk = this.calculateRisk(hour);

            analyzed.push({
                ...hour,
                riskScore: risk.score,
                risk: risk.level,
                icingRisk: WeatherModule ? WeatherModule.calculateIcingRisk(hour.temp2m, hour.humidity) : 'low',
                turbulenceRisk: WeatherModule ? WeatherModule.calculateTurbulenceRisk(hour.wind10m, hour.windGust || hour.wind10m * 1.3) : 'low'
            });
        }

        // Сводка
        const avgRiskScore = analyzed.reduce((sum, h) => sum + h.riskScore, 0) / analyzed.length;
        const maxWind = Math.max(...analyzed.map(h => h.wind10m));
        const avgTemp = analyzed.reduce((sum, h) => sum + h.temp2m, 0) / analyzed.length;

        return {
            hourly: analyzed,
            daily: forecast.daily,
            source: 'metno',
            summary: {
                avgRiskScore: avgRiskScore,
                overallRisk: avgRiskScore >= 5 ? 'high' : avgRiskScore >= 2 ? 'medium' : 'low',
                maxWind: maxWind,
                avgTemp: avgTemp,
                flightWindows: this.findFlightWindows(analyzed)
            },
            generatedAt: forecast.generatedAt
        };
    },

    /**
     * Поиск благоприятных окон для полёта
     * @param {Array} hourly - Почасовые данные
     * @param {number} minDuration - Минимальная длительность (часы)
     * @returns {Array} Окна для полёта
     */
    findFlightWindows(hourly, minDuration = 2) {
        const windows = [];
        let currentWindow = null;

        for (let i = 0; i < hourly.length; i++) {
            const hour = hourly[i];
            const isGood = hour.riskScore < 3;

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

        // Последнее окно
        if (currentWindow && currentWindow.hours.length >= minDuration) {
            windows.push(currentWindow);
        }

        return windows.slice(0, 3); // Максимум 3 окна
    },

    /**
     * Парсинг прогноза MET No в формат MIRA
     * @param {Object} data - Данные API MET No
     * @param {number} lat - Широта
     * @param {number} lon - Долгота
     * @returns {Object} Прогноз в формате MIRA
     */
    parseForecast(data, lat, lon) {
        const timeseries = data.properties?.timeseries || [];

        if (timeseries.length === 0) {
            throw new Error('MET No: нет данных в прогнозе');
        }

        // Почасовые данные
        const hourly = timeseries.map(ts => {
            const instant = ts.data.instant?.details || {};
            const next1h = ts.data.next_1_hours?.details || {};
            const next6h = ts.data.next_6_hours?.details || {};

            return {
                time: ts.time,
                temp2m: instant.air_temperature || 0,
                humidity: instant.relative_humidity_2m || 0,
                dewPoint: instant.dew_point_temperature || 0,
                wind10m: instant.wind_speed || 0,
                windDir: instant.wind_from_direction || 0,
                windGust: instant.wind_speed_of_max_gust || instant.wind_speed * 1.3,
                pressure: instant.air_pressure_at_sea_level || 1013,
                cloudCover: instant.cloud_area_fraction || 0,
                cloudCoverLow: instant.cloud_area_fraction_low || 0,
                precip: next1h.precipitation_amount || 0,
                precip6h: next6h.precipitation_amount || 0,
                weatherCode: this.mapWeatherCode(ts.data.next_1_hours?.summary?.symbol_code),
                visibility: 10 // MET No не предоставляет видимость, используем значение по умолчанию
            };
        });

        // Группировка по дням для daily
        const daily = this.groupByDay(hourly);

        return {
            hourly: hourly,
            daily: daily,
            source: 'metno',
            location: { lat, lon },
            generatedAt: data.properties?.meta?.updated_at || new Date().toISOString(),
            units: {
                temperature: '°C',
                windSpeed: 'm/s',
                pressure: 'hPa',
                precipitation: 'mm',
                cloudCover: '%'
            }
        };
    },

    /**
     * Группировка почасовых данных по дням
     * @param {Array} hourly - Почасовые данные
     * @returns {Object} Данные по дням
     */
    groupByDay(hourly) {
        const days = {};

        hourly.forEach(h => {
            const date = new Date(h.time).toISOString().split('T')[0];
            if (!days[date]) {
                days[date] = {
                    time: date,
                    temperatures: [],
                    wind: [],
                    precip: 0
                };
            }
            days[date].temperatures.push(h.temp2m);
            days[date].wind.push(h.wind10m);
            days[date].precip += h.precip;
        });

        return Object.values(days).map(d => ({
            time: d.time,
            temperature_max: Math.max(...d.temperatures),
            temperature_min: Math.min(...d.temperatures),
            wind_speed_max: Math.max(...d.wind),
            precipitation_sum: d.precip
        }));
    },

    /**
     * Маппинг кодов погоды MET No → WMO коды (как в Open-Meteo)
     * @param {string} symbolCode - Код погоды MET No
     * @returns {number} WMO код
     */
    mapWeatherCode(symbolCode) {
        const mapping = {
            // Ясно
            'clear_sky_day': 0,
            'clear_sky_night': 0,

            // Малооблачно
            'fair_day': 1,
            'fair_night': 1,

            // Переменная облачность
            'partly_cloudy_day': 2,
            'partly_cloudy_night': 2,

            // Облачно
            'cloudy': 3,

            // Осадки
            'rain': 61,
            'heavy_rain': 63,
            'rain_showers': 80,
            'heavy_rain_showers': 82,

            // Снег
            'snow': 71,
            'heavy_snow': 73,
            'snow_showers': 85,
            'heavy_snow_showers': 87,

            // Гроза
            'thunder': 95,
            'heavy_thunder': 96,
            'thunder_showers': 91,
            'heavy_thunder_showers': 93,

            // Туман
            'fog': 45,

            // По умолчанию
            '': 0
        };

        return mapping[symbolCode] || 0;
    },

    /**
     * Получить данные из кэша
     * @param {string} key - Ключ кэша
     * @returns {Object|null} Данные или null
     */
    getFromCache(key) {
        const cached = this.cachedData[key];
        if (!cached) return null;

        const now = Date.now();
        if (now > cached.expires) {
            delete this.cachedData[key];
            return null;
        }

        return cached.data;
    },

    /**
     * Сохранить данные в кэш
     * @param {string} key - Ключ кэша
     * @param {Object} data - Данные
     */
    saveToCache(key, data) {
        this.cachedData[key] = {
            data: data,
            timestamp: Date.now(),
            expires: Date.now() + (this.CACHE_TTL * 60 * 1000)
        };

        Utils.log(`MET No: данные закэшированы на ${this.CACHE_TTL} мин`);
    },

    /**
     * Очистить кэш
     */
    clearCache() {
        this.cachedData = {};
        Utils.log('MET No: кэш очищен');
    },

    /**
     * Сравнение с Open-Meteo
     * @param {Object} openMeteoData - Данные Open-Meteo
     * @param {Object} metNoData - Данные MET No
     * @param {Object} pilotData - Данные пилота (опционально)
     * @returns {Object} Сравнительный анализ
     */
    compareWithOpenMeteo(openMeteoData, metNoData, pilotData = null) {
        if (!openMeteoData || !metNoData) return null;

        // Берём первый час для сравнения
        const omHour = openMeteoData.hourly?.[0] || openMeteoData.properties?.timeseries?.[0];
        const metHour = metNoData.hourly?.[0];

        if (!omHour || !metHour) return null;

        // Расчёт расхождений
        const windDiff = Math.abs(omHour.wind10m - metHour.wind10m);
        const tempDiff = Math.abs(omHour.temp2m - metHour.temp2m);
        const humidityDiff = Math.abs(omHour.humidity - metHour.humidity);

        const discrepancy = {
            wind: {
                openMeteo: omHour.wind10m,
                metNo: metHour.wind10m,
                diff: windDiff,
                percent: ((windDiff / Math.max(omHour.wind10m, metHour.wind10m)) * 100).toFixed(1)
            },
            temp: {
                openMeteo: omHour.temp2m,
                metNo: metHour.temp2m,
                diff: tempDiff
            },
            humidity: {
                openMeteo: omHour.humidity,
                metNo: metHour.humidity,
                diff: humidityDiff
            },
            total: (windDiff + tempDiff + humidityDiff / 10) / 3
        };

        // Интерпретация расхождения
        let level = 'low';
        if (discrepancy.total > 3) level = 'high';
        else if (discrepancy.total > 1.5) level = 'medium';

        discrepancy.level = level;
        discrepancy.message = this.getDiscrepancyMessage(level, discrepancy);

        // Если есть данные пилота — сравнение с фактом
        if (pilotData) {
            discrepancy.pilot = {
                wind: pilotData.windSpeed,
                temp: pilotData.temp,
                humidity: pilotData.humidity
            };

            // Какой источник ближе к факту
            const omWindError = Math.abs(omHour.wind10m - pilotData.windSpeed);
            const metWindError = Math.abs(metHour.wind10m - pilotData.windSpeed);

            discrepancy.closer = omWindError < metWindError ? 'openMeteo' : 'metNo';
            discrepancy.recommendation = `Ближе к факту: ${discrepancy.closer === 'openMeteo' ? 'Open-Meteo' : 'MET No'}`;
        }

        return discrepancy;
    },

    /**
     * Сообщение о расхождении
     * @param {string} level - Уровень расхождения
     * @param {Object} discrepancy - Данные расхождения
     * @returns {string} Сообщение
     */
    getDiscrepancyMessage(level, discrepancy) {
        switch (level) {
            case 'high':
                return `⚠️ Высокое расхождение прогнозов! Ветер: ${discrepancy.wind.diff.toFixed(1)} м/с (${discrepancy.wind.percent}%)`;
            case 'medium':
                return `⚠️ Среднее расхождение прогнозов. Ветер: ${discrepancy.wind.diff.toFixed(1)} м/с`;
            case 'low':
                return '✅ Прогнозы согласованы';
            default:
                return '';
        }
    },

    /**
     * Получить сводную рекомендацию
     * @param {Object} comparison - Данные сравнения
     * @returns {Object} Рекомендация
     */
    getRecommendation(comparison) {
        if (!comparison) return null;

        const rec = {
            type: 'info',
            title: '',
            message: '',
            icon: 'fa-info-circle'
        };

        if (comparison.level === 'high') {
            rec.type = 'warning';
            rec.title = 'Высокое расхождение прогнозов';
            rec.message = `${comparison.message} ${comparison.recommendation || ''}`;
            rec.icon = 'fa-exclamation-triangle';
        } else if (comparison.pilot) {
            rec.type = 'success';
            rec.title = 'Сравнение с фактическими данными';
            rec.message = comparison.recommendation;
            rec.icon = 'fa-check-circle';
        } else {
            rec.type = 'info';
            rec.title = 'Прогнозы согласованы';
            rec.message = 'Open-Meteo и MET No показывают схожие значения';
            rec.icon = 'fa-check-double';
        }

        return rec;
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetNoModule;
}

console.log('✅ MetNoModule загружен (api.met.no)');
