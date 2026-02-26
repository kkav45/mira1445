/**
 * MIRA - Утилиты (utils.js)
 * Общие вспомогательные функции
 */

const Utils = {
    /**
     * Форматирование координат
     */
    formatCoords(lat, lon, precision = 4) {
        const latDir = lat >= 0 ? 'N' : 'S';
        const lonDir = lon >= 0 ? 'E' : 'W';
        return `${Math.abs(lat).toFixed(precision)}° ${latDir}, ${Math.abs(lon).toFixed(precision)}° ${lonDir}`;
    },

    /**
     * Форматирование даты
     */
    formatDate(date, options = {}) {
        const defaultOptions = { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleString('ru-RU', { ...defaultOptions, ...options });
    },

    /**
     * Получить завтрашнюю дату с началом суток
     */
    getTomorrowDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    },

    /**
     * Получить дату в формате для input datetime-local
     */
    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    },

    /**
     * Расчёт расстояния между двумя точками (формула гаверсинусов)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Радиус Земли в км
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    /**
     * Перевод градусов в радианы
     */
    toRad(degrees) {
        return degrees * Math.PI / 180;
    },

    /**
     * Перевод радиан в градусы
     */
    toDeg(radians) {
        return radians * 180 / Math.PI;
    },

    /**
     * Расчёт направления (азимута) между двумя точками
     */
    calculateBearing(lat1, lon1, lat2, lon2) {
        const y = Math.sin(this.toRad(lon2 - lon1)) * Math.cos(this.toRad(lat2));
        const x = Math.cos(this.toRad(lat1)) * Math.sin(this.toRad(lat2)) -
                  Math.sin(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.cos(this.toRad(lon2 - lon1));
        const bearing = this.toDeg(Math.atan2(y, x));
        return (bearing + 360) % 360;
    },

    /**
     * Получение промежуточной точки на линии
     */
    getIntermediatePoint(lat1, lon1, lat2, lon2, fraction) {
        const φ1 = this.toRad(lat1);
        const φ2 = this.toRad(lat2);
        const λ1 = this.toRad(lon1);
        const λ2 = this.toRad(lon2);

        const A = Math.sin((1 - fraction) * this.angularDistance(φ1, λ1, φ2, λ2));
        const B = Math.sin(fraction * this.angularDistance(φ1, λ1, φ2, λ2));
        const C = Math.sin(this.angularDistance(φ1, λ1, φ2, λ2));

        const x = (A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)) / C;
        const y = (A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)) / C;
        const z = (A * Math.sin(φ1) + B * Math.sin(φ2)) / C;

        const φ3 = Math.atan2(z, Math.sqrt(x * x + y * y));
        const λ3 = Math.atan2(y, x);

        return {
            lat: this.toDeg(φ3),
            lon: this.toDeg(λ3)
        };
    },

    /**
     * Угловое расстояние между двумя точками
     */
    angularDistance(φ1, λ1, φ2, λ2) {
        return Math.acos(Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1));
    },

    /**
     * Разбиение массива на сегменты
     */
    splitIntoSegments(array, segmentSize) {
        const segments = [];
        for (let i = 0; i < array.length; i += segmentSize) {
            segments.push(array.slice(i, i + segmentSize));
        }
        return segments;
    },

    /**
     * Генерация уникального ID
     */
    generateId() {
        return 'mira_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Debounce функция
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle функция
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Проверка поддержки геолокации
     */
    isGeolocationSupported() {
        return navigator.geolocation !== undefined;
    },

    /**
     * Получение текущей геопозиции
     */
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!this.isGeolocationSupported()) {
                reject(new Error('Геолокация не поддерживается'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => resolve({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    accuracy: position.coords.accuracy
                }),
                error => reject(error),
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    },

    /**
     * Конвертация направления ветра в буквенное обозначение
     */
    windDirectionToCardinal(degrees) {
        const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    },

    /**
     * Оценка риска по значению
     */
    evaluateRisk(value, thresholds) {
        if (value >= thresholds.critical) return 'high';
        if (value >= thresholds.warning) return 'medium';
        return 'low';
    },

    /**
     * Форматирование числа с единицей измерения
     */
    formatValue(value, unit, decimals = 1) {
        if (value === null || value === undefined) return '—';
        return `${Number(value).toFixed(decimals)} ${unit}`;
    },

    /**
     * Логирование с префиксом
     */
    log(message, data = null) {
        const prefix = '[MIRA]';
        const time = new Date().toLocaleTimeString();
        if (data !== null) {
            console.log(`${prefix} ${time} - ${message}:`, data);
        } else {
            console.log(`${prefix} ${time} - ${message}`);
        }
    },

    /**
     * Предупреждение в консоль
     */
    warn(message, data = null) {
        const prefix = '[MIRA WARN]';
        const time = new Date().toLocaleTimeString();
        if (data !== null) {
            console.warn(`${prefix} ${time} - ${message}:`, data);
        } else {
            console.warn(`${prefix} ${time} - ${message}`);
        }
    },

    /**
     * Ошибка в консоль
     */
    error(message, data = null) {
        const prefix = '[MIRA ERROR]';
        const time = new Date().toLocaleTimeString();
        if (data !== null) {
            console.error(`${prefix} ${time} - ${message}:`, data);
        } else {
            console.error(`${prefix} ${time} - ${message}`);
        }
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
