/**
 * MIRA - Интегральная Оценка (Scoring System)
 * Версия: 1.1
 * Дата: 4 марта 2026 г.
 * 
 * Модуль расчёта интегральной оценки рисков полёта БВС (0-10 баллов)
 * Унифицировано с weather.js для корреляции с отчётом
 */

const ScoringModule = {
    /**
     * Коэффициенты типа БВС
     */
    TypeCoefficients: {
        fixedwing: 1.0,      // Самолётный тип (стабильнее)
        multicopter: 1.15,   // Мультиротор (менее стабилен)
        helicopter: 1.08     // Вертолёт (среднее)
    },

    /**
     * Коэффициенты категории БВС (по массе)
     */
    CategoryCoefficients: {
        MICRO: 0.8,   // < 0.25 кг
        LIGHT: 1.0,   // < 7 кг
        MEDIUM: 1.2,  // < 25 кг
        HEAVY: 1.4    // < 150 кг
    },

    /**
     * Коэффициенты профиля миссии
     */
    MissionCoefficients: {
        visual: 1.0,       // Визуальное наблюдение
        cargo: 1.1,        // Доставка груза
        emergency: 1.3,    // Экстренная миссия
        agriculture: 0.9,  // Агро мониторинг
        mapping: 1.0,      // Картография
        surveillance: 1.0  // Наблюдение
    },

    /**
     * Главная функция расчёта интегральной оценки
     * @param {Object} weather - Данные погоды (hour, thresholds) ИЛИ (hourly, thresholds)
     * @param {Object} config - Конфигурация (uavType, category, thresholds)
     * @param {String} mission - Профиль миссии
     * @returns {Object} Результат расчёта
     */
    calculateIntegralScore(weather, config, mission = 'visual') {
        const { hour, hourly, thresholds } = weather;
        const { uavType = 'multicopter', category = 'LIGHT' } = config || {};

        // 🆕 Если есть почасовые данные, используем худшие значения
        const targetHour = hourly && hourly.length > 0 ? this.getWorstHour(hourly) : hour;
        if (!targetHour) return this.getEmptyScore();

        // Шаг 1: Расчёт базовых баллов (0-3 для каждого фактора)
        const windScore = this.calculateWindRisk(targetHour.wind10m, thresholds.windGround);
        const precipScore = this.calculatePrecipRisk(targetHour.precip, thresholds.precip, targetHour.snow, targetHour.rain, targetHour.weatherCode);
        const visibilityScore = this.calculateVisibilityRisk(targetHour.visibility, thresholds.visibility, targetHour.cloudCover, targetHour.cloudCoverLow);
        const tempScore = this.calculateTempRisk(targetHour.temp2m, thresholds.tempMin, thresholds.tempMax);
        const icingScore = this.calculateIcingRisk(targetHour.temp2m, targetHour.humidity, targetHour.precip);
        const turbulenceScore = this.calculateTurbulenceRisk(targetHour.wind10m, targetHour.windGust);

        // 🆕 Дополнительные факторы
        const cloudScore = this.calculateCloudRisk(targetHour.cloudCover, targetHour.cloudCoverLow, targetHour.cloudCeiling);
        const pressureScore = this.calculatePressureRisk(targetHour.pressure);

        // Шаг 2: Взвешенная сумма (основные 6 факторов + 2 дополнительных)
        const baseScore = (
            windScore * 0.25 +
            precipScore * 0.20 +
            visibilityScore * 0.15 +
            tempScore * 0.15 +
            icingScore * 0.15 +
            turbulenceScore * 0.10
        );

        // 🆕 Коррекция от дополнительных факторов (максимум +0.5 балла)
        const additionalScore = (cloudScore * 0.03 + pressureScore * 0.02);

        // Шаг 3: Коэффициенты
        const typeCoeff = this.getTypeCoefficient(uavType);
        const categoryCoeff = this.getCategoryCoefficient(category);
        const missionCoeff = this.getMissionCoefficient(mission);

        // Шаг 4: Итоговая оценка
        const integralScore = (baseScore + additionalScore) * typeCoeff * categoryCoeff * missionCoeff;

        // Ограничение: 0-10
        const finalScore = Math.min(10, Math.max(0, integralScore));

        // Определение уровня риска
        const riskLevel = this.getRiskLevel(finalScore);
        const riskColor = this.getRiskColor(riskLevel);
        const riskStatus = this.getRiskStatus(riskLevel);

        return {
            total: Math.round(finalScore * 10) / 10,
            level: riskLevel,
            color: riskColor,
            status: riskStatus,
            breakdown: {
                wind: Math.round(windScore * 10) / 10,
                precip: Math.round(precipScore * 10) / 10,
                visibility: Math.round(visibilityScore * 10) / 10,
                temp: Math.round(tempScore * 10) / 10,
                icing: Math.round(icingScore * 10) / 10,
                turbulence: Math.round(turbulenceScore * 10) / 10,
                cloud: Math.round(cloudScore * 10) / 10,       // 🆕
                pressure: Math.round(pressureScore * 10) / 10  // 🆕
            },
            coefficients: {
                type: typeCoeff,
                category: categoryCoeff,
                mission: missionCoeff
            },
            additional: {
                cloud: cloudScore,
                pressure: pressureScore
            }
        };
    },

    /**
     * 🆕 Получить худший час по уровню риска
     */
    getWorstHour(hourly) {
        if (!hourly || hourly.length === 0) return null;
        
        // Находим час с максимальным riskScore или icingRisk
        let worstHour = hourly[0];
        let maxRisk = 0;
        
        for (const hour of hourly) {
            // Приоритет: обледенение > видимость > ветер > осадки
            let hourRisk = 0;
            if (hour.icingRisk === 'high') hourRisk += 10;
            if (hour.icingRisk === 'medium') hourRisk += 5;
            if (hour.visibility < 1) hourRisk += 8;
            if (hour.wind10m > 10) hourRisk += 5;
            if (hour.precip > 2) hourRisk += 3;
            
            if (hourRisk > maxRisk) {
                maxRisk = hourRisk;
                worstHour = hour;
            }
        }
        
        return worstHour;
    },

    /**
     * 🆕 Вернуть пустой скоринг
     */
    getEmptyScore() {
        return {
            total: 0,
            level: 'low',
            color: '#38a169',
            status: { text: 'Нет данных', icon: '❓', class: 'score-status-allowed' },
            breakdown: { wind: 0, precip: 0, visibility: 0, temp: 0, icing: 0, turbulence: 0, cloud: 0, pressure: 0 },
            coefficients: { type: 1, category: 1, mission: 1 },
            additional: { cloud: 0, pressure: 0 }
        };
    },

    /**
     * Расчёт риска ветра (0-3 балла)
     */
    calculateWindRisk(windSpeed, maxWind) {
        if (!maxWind || maxWind === 0) maxWind = 10;
        const ratio = windSpeed / maxWind;

        if (ratio > 1.2) return 3.0;      // >120% порога
        if (ratio > 1.0) return 2.5;      // >100% порога
        if (ratio > 0.8) return 1.5;      // >80% порога
        if (ratio > 0.6) return 0.5;      // >60% порога
        return 0;
    },

    /**
     * Расчёт риска осадков (0-3 балла)
     * Унифицировано с weather.js
     */
    calculatePrecipRisk(precip, maxPrecip, snow = 0, rain = 0, weatherCode = 0) {
        // Нельзя вообще осадков
        if (maxPrecip === 0 && precip > 0) return 3.0;
        
        // 🆕 Учёт типа осадков — снег опаснее
        let effectivePrecip = precip;
        if (snow > 0) {
            effectivePrecip = precip * 1.3;  // Снег увеличивает риск
        }
        
        // 🆕 WeatherCode — экстремальные явления
        const extremeCodes = [95, 96, 97];  // Гроза, град
        if (extremeCodes.includes(weatherCode)) return 3.0;
        
        if (effectivePrecip > 2) return 3.0;
        if (effectivePrecip > 0.5) return 2.0;
        if (effectivePrecip > 0.1) return 1.0;
        return 0;
    },

    /**
     * Расчёт риска видимости (0-3 балла)
     * Унифицировано с weather.js + облачность
     */
    calculateVisibilityRisk(visibility, minVisibility, cloudCover = 0, cloudCoverLow = 0) {
        if (!minVisibility || minVisibility === 0) minVisibility = 2;
        const ratio = visibility / minVisibility;

        // 🆕 Облачность влияет на видимость
        let cloudPenalty = 0;
        if (cloudCoverLow > 80) cloudPenalty = 0.5;  // Нижняя облачность >80%
        else if (cloudCover > 90) cloudPenalty = 0.3;  // Общая облачность >90%

        if (ratio < 0.5) return Math.min(3.0, 3.0 + cloudPenalty);      // <50% порога
        if (ratio < 1.0) return Math.min(3.0, 2.0 + cloudPenalty);      // <100% порога
        if (ratio < 1.5) return Math.min(3.0, 1.0 + cloudPenalty);      // <150% порога
        return cloudPenalty > 0 ? cloudPenalty : 0;
    },

    /**
     * Расчёт температурного риска (0-3 балла)
     */
    calculateTempRisk(temp, tempMin, tempMax) {
        if (temp < tempMin || temp > tempMax) return 3.0;  // Вне диапазона
        if (temp < tempMin + 5 || temp > tempMax - 5) return 1.5;  // ±5°C от границ
        return 0;
    },

    /**
     * Расчёт риска обледенения (0-3 балла)
     */
    calculateIcingRisk(temp, humidity, precip) {
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
    },

    /**
     * Расчёт риска турбулентности (0-2.5 балла)
     */
    calculateTurbulenceRisk(windSpeed, windGust) {
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
    },

    /**
     * 🆕 Расчёт риска облачности (0-5 баллов)
     * Влияет на видимость и риск обледенения
     */
    calculateCloudRisk(cloudCover, cloudCoverLow, cloudCeiling = null) {
        let score = 0;

        // Нижняя облачность более опасна
        if (cloudCoverLow > 90) score += 1.5;
        else if (cloudCoverLow > 70) score += 1.0;
        else if (cloudCoverLow > 50) score += 0.5;

        // Общая облачность
        if (cloudCover > 95) score += 0.5;
        else if (cloudCover > 80) score += 0.3;

        // 🆕 Прямой расчёт риска по НГО (нижняя граница облаков)
        if (cloudCeiling !== null && cloudCeiling !== undefined) {
            if (cloudCeiling < 250) {
                score += 3.0; // 🚫 Критично
            } else if (cloudCeiling < 400) {
                score += 2.0; // ⚠️ Высокий
            } else if (cloudCeiling < 600) {
                score += 1.0; // ⚠️ Средний
            }
            // > 600м — безопасно, баллы не добавляем
        }

        return Math.min(5.0, score); // Максимум 5 баллов (2 от облачности + 3 от НГО)
    },

    /**
     * 🆕 Расчёт риска давления (0-1.5 балла)
     * Быстрые изменения давления — признак нестабильности
     */
    calculatePressureRisk(pressure) {
        // Нормальное давление: 750-770 мм рт.ст.
        const normalMin = 750;
        const normalMax = 770;
        const criticalMin = 730;
        const criticalMax = 790;
        
        if (!pressure) return 0;
        
        if (pressure < criticalMin || pressure > criticalMax) return 1.5;
        if (pressure < normalMin || pressure > normalMax) return 0.8;
        
        return 0;
    },

    /**
     * Получить коэффициент типа БВС
     */
    getTypeCoefficient(uavType) {
        return this.TypeCoefficients[uavType] || 1.0;
    },

    /**
     * Получить коэффициент категории БВС
     */
    getCategoryCoefficient(category) {
        return this.CategoryCoefficients[category] || 1.0;
    },

    /**
     * Получить коэффициент миссии
     */
    getMissionCoefficient(mission) {
        return this.MissionCoefficients[mission] || 1.0;
    },

    /**
     * Получить уровень риска по скорингу
     */
    getRiskLevel(score) {
        if (score <= 2.5) return 'low';
        if (score <= 5.5) return 'medium';
        return 'high';
    },

    /**
     * Получить цвет для уровня риска
     */
    getRiskColor(level) {
        const colors = {
            low: '#38a169',      // 🟢 Зелёный
            medium: '#ed8936',   // 🟠 Оранжевый
            high: '#e53e3e'      // 🔴 Красный
        };
        return colors[level] || colors.low;
    },

    /**
     * Получить статус полёта
     */
    getRiskStatus(level) {
        const statuses = {
            low: { text: 'Полёт разрешён', icon: '✅', class: 'score-status-allowed' },
            medium: { text: 'С ограничениями', icon: '⚠️', class: 'score-status-warning' },
            high: { text: 'Не рекомендуется', icon: '🚫', class: 'score-status-denied' }
        };
        return statuses[level] || statuses.low;
    },

    /**
     * Расчёт временного ряда скоринга
     */
    calculateTimeSeriesScore(forecast, config, mission = 'visual') {
        if (!forecast || !forecast.hourly) return [];

        const thresholds = Storage.getThresholds();

        return forecast.hourly.map((hour, index) => {
            const score = this.calculateIntegralScore(
                { hour, thresholds },
                config,
                mission
            );
            return {
                time: hour.time,
                score: score.total,
                level: score.level,
                isFlightWindow: score.level === 'low'
            };
        });
    },

    /**
     * Поиск благоприятных окон для полёта
     */
    findFlightWindows(hourlyScores, minDuration = 2) {
        const windows = [];
        let currentWindow = null;

        for (let i = 0; i < hourlyScores.length; i++) {
            const hour = hourlyScores[i];
            const isGood = hour.isFlightWindow || hour.score < 2.5;

            if (isGood) {
                if (!currentWindow) {
                    currentWindow = {
                        start: hour.time,
                        end: hour.time,
                        hours: [hour],
                        avgScore: hour.score
                    };
                } else {
                    currentWindow.end = hour.time;
                    currentWindow.hours.push(hour);
                    currentWindow.avgScore = currentWindow.hours.reduce((sum, h) => sum + h.score, 0) / currentWindow.hours.length;
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

        return windows.sort((a, b) => a.avgScore - b.avgScore);
    },

    /**
     * Генерация рекомендаций по скорингу (ОБНОВЛЕНО)
     * Учитывает почасовые данные как в weather.js
     */
    generateRecommendations(score, breakdown, weather, hourlyData = null) {
        const recommendations = [];
        const warnings = []; // Предупреждения по факторам
        const thresholds = weather.thresholds || Storage.getThresholds();

        // === АНАЛИЗ ПО ЧАСАМ (если есть hourlyData) ===
        let hasCriticalIssues = false;
        let maxFactorScore = 0; // Максимальный балл фактора

        if (hourlyData && hourlyData.length > 0) {
            // Обледенение по часам
            const icingHours = hourlyData.filter(h => h.icingRisk === 'high');
            if (icingHours.length > 0) {
                hasCriticalIssues = true;
                maxFactorScore = Math.max(maxFactorScore, 3.0);
                const times = icingHours.slice(0, 3).map(h => {
                    const time = new Date(h.time);
                    return `${time.getHours()}:00`;
                }).join(', ');
                warnings.push({
                    type: 'danger',
                    text: `Обледенение: ${times} (3.0 балла)`,
                    icon: 'fa-snowflake'
                });
            }

            // Видимость по часам
            const lowVisHours = hourlyData.filter(h => h.visibility < thresholds.visibility);
            if (lowVisHours.length > 0) {
                maxFactorScore = Math.max(maxFactorScore, 3.0);
                const times = lowVisHours.slice(0, 3).map(h => {
                    const time = new Date(h.time);
                    return `${time.getHours()}:00`;
                }).join(', ');
                warnings.push({
                    type: 'warning',
                    text: `Видимость: ${times} (3.0 балла)`,
                    icon: 'fa-eye'
                });
            }

            // Осадки (сумма)
            const totalPrecip = hourlyData.reduce((sum, h) => sum + (h.precip || 0), 0);
            if (totalPrecip > 0) {
                const precipScore = totalPrecip > 2 ? 3.0 : totalPrecip > 0.5 ? 2.0 : 1.0;
                maxFactorScore = Math.max(maxFactorScore, precipScore);
                warnings.push({
                    type: 'warning',
                    text: `Осадки: ${totalPrecip.toFixed(1)} мм/ч (${precipScore} балла)`,
                    icon: 'fa-cloud-rain'
                });
            }

            // Ветер
            const avgWind = hourlyData.reduce((sum, h) => sum + (h.wind10m || 0), 0) / hourlyData.length;
            if (avgWind > thresholds.windGround) {
                hasCriticalIssues = true;
                maxFactorScore = Math.max(maxFactorScore, 3.0);
                warnings.push({
                    type: 'warning',
                    text: `Ветер: ${avgWind.toFixed(1)} м/с (3.0 балла)`,
                    icon: 'fa-wind'
                });
            } else if (avgWind > thresholds.windGround * 0.8) {
                maxFactorScore = Math.max(maxFactorScore, 2.5);
                warnings.push({
                    type: 'info',
                    text: `Ветер: ${avgWind.toFixed(1)} м/с (2.5 балла)`,
                    icon: 'fa-wind'
                });
            }
        }

        // === ОБЩИЙ СТАТУС (на основе score) ===
        const baseStatus = {
            low: { text: 'Полёт разрешён', icon: '✅', class: 'score-status-allowed' },
            medium: { text: 'С ограничениями', icon: '⚠️', class: 'score-status-warning' },
            high: { text: 'Не рекомендуется', icon: '🚫', class: 'score-status-denied' }
        };

        // === ИТОГОВЫЙ СТАТУС (с учётом пиковых факторов) ===
        let finalStatus;
        if (score.total <= 2.5 && maxFactorScore <= 2.5) {
            // Низкий общий риск и нет пиковых факторов
            finalStatus = baseStatus.low;
            recommendations.push({
                type: 'success',
                text: `✅ Полёт разрешён. Условия благоприятные.`,
                icon: 'fa-check-circle'
            });
        } else if (score.total <= 5.5 || maxFactorScore > 2.5) {
            // Средний риск ИЛИ есть пиковые факторы
            finalStatus = baseStatus.medium;
            recommendations.push({
                type: 'warning',
                text: `⚠️ Полёт с ограничениями. Мониторьте условия.`,
                icon: 'fa-exclamation-triangle'
            });
        } else {
            // Высокий риск
            finalStatus = baseStatus.high;
            recommendations.push({
                type: 'danger',
                text: `🚫 Полёт не рекомендуется. Высокий риск.`,
                icon: 'fa-ban'
            });
        }

        // Добавляем предупреждения
        recommendations.push(...warnings);

        if (!hourlyData) {
            // === СТАРЫЕ ПРОВЕРКИ ПО ПЕРВОМУ ЧАСУ (fallback) ===
            if (breakdown.wind > 2) {
                recommendations.push({
                    type: 'warning',
                    text: `💨 Ветер превышает безопасный порог (${weather.hour?.wind10m || '—'} м/с)`,
                    icon: 'fa-wind'
                });
            }

            if (breakdown.precip > 1.5) {
                recommendations.push({
                    type: 'warning',
                    text: `🌧️ Осадки могут повлиять на полёт (${weather.hour?.precip || '—'} мм/ч)`,
                    icon: 'fa-cloud-rain'
                });
            }

            if (breakdown.visibility > 1.5) {
                recommendations.push({
                    type: 'warning',
                    text: `👁️ Видимость ниже рекомендуемой (${weather.hour?.visibility || '—'} км)`,
                    icon: 'fa-eye'
                });
            }

            if (breakdown.icing > 1.5) {
                recommendations.push({
                    type: 'danger',
                    text: `❄️ Высокий риск обледенения. Будьте осторожны.`,
                    icon: 'fa-snowflake'
                });
            }

            if (breakdown.turbulence > 1.5) {
                recommendations.push({
                    type: 'warning',
                    text: `🌪️ Возможна турбулентность. Контролируйте стабильность.`,
                    icon: 'fa-wind'
                });
            }
        }

        return recommendations;
    },

    /**
     * Расчёт среднего скоринга по сегментам
     */
    calculateSegmentScores(segments, segmentAnalysis, config, mission = 'visual') {
        if (!segments || !segmentAnalysis || segments.length === 0) return [];

        return segmentAnalysis.map((analysis, index) => {
            const segment = segments[index];
            const hourlyScores = analysis.hourly?.slice(0, 6).map(hour => {
                const score = this.calculateIntegralScore(
                    { hour, thresholds: Storage.getThresholds() },
                    config,
                    mission
                );
                return score;
            }) || [];

            const avgScore = hourlyScores.length > 0
                ? hourlyScores.reduce((sum, s) => sum + s.total, 0) / hourlyScores.length
                : 0;

            const riskLevel = this.getRiskLevel(avgScore);

            return {
                segmentIndex: index,
                segmentName: `Сегмент ${index + 1}`,
                distance: segment?.distance || 0,
                avgScore: Math.round(avgScore * 10) / 10,
                riskLevel: riskLevel,
                color: this.getRiskColor(riskLevel),
                status: this.getRiskStatus(riskLevel),
                hourlyScores: hourlyScores
            };
        });
    }
};

// Инициализация при загрузке
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('✅ ScoringModule инициализирован');
        });
    } else {
        console.log('✅ ScoringModule инициализирован');
    }
}
