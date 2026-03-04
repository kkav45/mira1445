/**
 * MIRA - Хранилище данных (storage.js)
 * Работа с localStorage и кэширование маршрутов
 */

const Storage = {
    KEYS: {
        ROUTES: 'mira_routes',
        SETTINGS: 'mira_thresholds',
        PILOT_DATA: 'mira_pilot_data',
        LAST_ANALYSIS: 'mira_last_analysis',
        CACHE: 'mira_cache'
    },

    /**
     * Сохранение маршрута в кэш
     */
    saveRoute(route) {
        try {
            const routes = this.getSavedRoutes();
            
            // Проверяем, существует ли уже такой маршрут
            const existingIndex = routes.findIndex(r => r.id === route.id);
            
            if (existingIndex >= 0) {
                routes[existingIndex] = { ...route, updatedAt: new Date().toISOString() };
            } else {
                routes.push({
                    ...route,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            
            localStorage.setItem(this.KEYS.ROUTES, JSON.stringify(routes));
            Utils.log(`Маршрут "${route.name}" сохранён`);
            return true;
        } catch (error) {
            Utils.error('Ошибка сохранения маршрута', error);
            return false;
        }
    },

    /**
     * Получение всех сохранённых маршрутов
     */
    getSavedRoutes() {
        try {
            const routes = localStorage.getItem(this.KEYS.ROUTES);
            return routes ? JSON.parse(routes) : [];
        } catch (error) {
            Utils.error('Ошибка получения маршрутов', error);
            return [];
        }
    },

    /**
     * Получение маршрута по ID
     */
    getRouteById(id) {
        try {
            const routes = this.getSavedRoutes();
            return routes.find(r => r.id === id) || null;
        } catch (error) {
            Utils.error('Ошибка получения маршрута', error);
            return null;
        }
    },

    /**
     * Удаление маршрута
     */
    deleteRoute(id) {
        try {
            const routes = this.getSavedRoutes();
            const filteredRoutes = routes.filter(r => r.id !== id);
            localStorage.setItem(this.KEYS.ROUTES, JSON.stringify(filteredRoutes));
            Utils.log(`Маршрут "${id}" удалён`);
            return true;
        } catch (error) {
            Utils.error('Ошибка удаления маршрута', error);
            return false;
        }
    },

    /**
     * Очистка всех маршрутов
     */
    clearAllRoutes() {
        try {
            localStorage.removeItem(this.KEYS.ROUTES);
            Utils.log('Все маршруты удалены');
            return true;
        } catch (error) {
            Utils.error('Ошибка очистки маршрутов', error);
            return false;
        }
    },

    /**
     * Сохранение настроек порогов
     */
    saveThresholds(thresholds) {
        try {
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(thresholds));
            Utils.log('Настройки порогов сохранены');
            return true;
        } catch (error) {
            Utils.error('Ошибка сохранения настроек', error);
            return false;
        }
    },

    /**
     * Получение настроек порогов
     */
    getThresholds() {
        try {
            const saved = localStorage.getItem(this.KEYS.SETTINGS);
            if (saved) {
                return JSON.parse(saved);
            }
            
            // Значения по умолчанию
            return {
                windGround: 10,        // м/с
                windAlt: 15,           // м/с
                visibility: 2,         // км
                precip: 1.4,           // мм/ч
                tempMin: -40,          // °C
                tempMax: 40,           // °C
                cloudCeiling: 250,     // м
                humidityIcing: 85      // %
            };
        } catch (error) {
            Utils.error('Ошибка получения настроек', error);
            return null;
        }
    },

    /**
     * Сохранение данных пилота
     */
    savePilotData(pilotData) {
        try {
            localStorage.setItem(this.KEYS.PILOT_DATA, JSON.stringify({
                ...pilotData,
                savedAt: new Date().toISOString()
            }));
            Utils.log('Данные пилота сохранены');
            return true;
        } catch (error) {
            Utils.error('Ошибка сохранения данных пилота', error);
            return false;
        }
    },

    /**
     * Получение данных пилота
     */
    getPilotData() {
        try {
            const saved = localStorage.getItem(this.KEYS.PILOT_DATA);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            Utils.error('Ошибка получения данных пилота', error);
            return null;
        }
    },

    /**
     * Очистка данных пилота
     */
    clearPilotData() {
        try {
            localStorage.removeItem(this.KEYS.PILOT_DATA);
            Utils.log('Данные пилота очищены');
            return true;
        } catch (error) {
            Utils.error('Ошибка очистки данных пилота', error);
            return false;
        }
    },

    /**
     * Сохранение последнего анализа
     */
    saveLastAnalysis(analysisData) {
        try {
            localStorage.setItem(this.KEYS.LAST_ANALYSIS, JSON.stringify({
                ...analysisData,
                savedAt: new Date().toISOString()
            }));
            Utils.log('Последний анализ сохранён');
            return true;
        } catch (error) {
            Utils.error('Ошибка сохранения анализа', error);
            return false;
        }
    },

    /**
     * Получение последнего анализа
     */
    getLastAnalysis() {
        try {
            const saved = localStorage.getItem(this.KEYS.LAST_ANALYSIS);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            Utils.error('Ошибка получения анализа', error);
            return null;
        }
    },

    /**
     * Сохранение в кэш (общее)
     */
    saveToCache(key, data, ttlMinutes = 60) {
        try {
            const cacheData = {
                data: data,
                expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
            };
            localStorage.setItem(`${this.KEYS.CACHE}_${key}`, JSON.stringify(cacheData));
            Utils.log(`Данные "${key}" закэшированы`);
            return true;
        } catch (error) {
            Utils.error('Ошибка кэширования', error);
            return false;
        }
    },

    /**
     * Получение из кэша
     */
    getFromCache(key) {
        try {
            const cached = localStorage.getItem(`${this.KEYS.CACHE}_${key}`);
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            
            // Проверяем, не истёк ли срок действия
            if (Date.now() > cacheData.expiresAt) {
                localStorage.removeItem(`${this.KEYS.CACHE}_${key}`);
                Utils.log(`Кэш "${key}" истёк`);
                return null;
            }
            
            return cacheData.data;
        } catch (error) {
            Utils.error('Ошибка получения из кэша', error);
            return null;
        }
    },

    /**
     * Очистка устаревшего кэша
     */
    clearExpiredCache() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.KEYS.CACHE)) {
                    const cached = localStorage.getItem(key);
                    if (cached) {
                        const cacheData = JSON.parse(cached);
                        if (Date.now() > cacheData.expiresAt) {
                            localStorage.removeItem(key);
                        }
                    }
                }
            });
            Utils.log('Устаревший кэш очищен');
        } catch (error) {
            Utils.error('Ошибка очистки кэша', error);
        }
    },

    /**
     * Полная очистка кэша
     */
    clearAllCache() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.KEYS.CACHE)) {
                    localStorage.removeItem(key);
                }
            });
            Utils.log('Весь кэш очищен');
            return true;
        } catch (error) {
            Utils.error('Ошибка очистки кэша', error);
            return false;
        }
    },

    /**
     * Получение статистики хранилища
     */
    getStorageStats() {
        try {
            let totalSize = 0;
            const stats = {
                routes: 0,
                cache: 0,
                settings: 0,
                total: 0
            };
            
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                const value = localStorage.getItem(key);
                const size = (key.length + value.length) * 2; // Примерный размер в байтах
                totalSize += size;
                
                if (key === this.KEYS.ROUTES) {
                    stats.routes = size;
                } else if (key === this.KEYS.SETTINGS) {
                    stats.settings = size;
                } else if (key.startsWith(this.KEYS.CACHE)) {
                    stats.cache += size;
                }
            });
            
            stats.total = totalSize;
            return stats;
        } catch (error) {
            Utils.error('Ошибка получения статистики', error);
            return null;
        }
    },

    /**
     * Экспорт всех данных
     */
    exportAllData() {
        try {
            const data = {};
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('mira_')) {
                    data[key] = localStorage.getItem(key);
                }
            });
            return JSON.stringify(data, null, 2);
        } catch (error) {
            Utils.error('Ошибка экспорта данных', error);
            return null;
        }
    },

    /**
     * Импорт данных
     */
    importAllData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            Object.keys(data).forEach(key => {
                if (key.startsWith('mira_')) {
                    localStorage.setItem(key, data[key]);
                }
            });
            Utils.log('Данные импортированы');
            return true;
        } catch (error) {
            Utils.error('Ошибка импорта данных', error);
            return false;
        }
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
