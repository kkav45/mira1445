/**
 * MIRA - Обработка ошибок API (api-error-handler.js)
 * Централизованная обработка ошибок, повторные попытки, уведомления
 */

export const APIErrorHandler = {
    /**
     * Конфигурация
     */
    config: {
        maxRetries: 3,
        retryDelay: 1000, // 1 секунда
        timeout: 10000, // 10 секунд
        showDebugInfo: true
    },

    /**
     * Статистика ошибок
     */
    errorStats: {
        total: 0,
        byType: {},
        lastError: null
    },

    /**
     * Обработка fetch запроса с обработкой ошибок
     * @param {string} url - URL запроса
     * @param {object} options - Опции fetch
     * @param {object} context - Контекст для сообщения об ошибке
     * @returns {Promise<any>}
     */
    async fetch(url, options = {}, context = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const errorContext = {
            url,
            method: options.method || 'GET',
            timestamp: new Date().toISOString(),
            ...context
        };

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Проверка статуса ответа
            if (!response.ok) {
                throw new HTTPError(response.status, response.statusText, url);
            }

            // Парсинг JSON
            const data = await response.json();

            // Валидация данных
            if (this.isEmptyResponse(data)) {
                throw new APIError('Пустой ответ от сервера', errorContext);
            }

            return data;

        } catch (error) {
            clearTimeout(timeoutId);
            return this.handleError(error, errorContext, url, options);
        }
    },

    /**
     * Обработка ошибок
     */
    async handleError(error, context, url, options) {
        this.errorStats.total++;
        this.errorStats.lastError = { error, context };

        // Классификация ошибки
        const errorType = this.classifyError(error);
        this.errorStats.byType[errorType] = (this.errorStats.byType[errorType] || 0) + 1;

        // Логирование
        if (this.config.showDebugInfo) {
            console.error(`[API Error] ${errorType}:`, {
                error,
                context,
                stack: error.stack
            });
        }

        // Обработка по типу
        switch (errorType) {
            case 'NETWORK_ERROR':
                return this.handleNetworkError(error, context, url, options);
            
            case 'TIMEOUT_ERROR':
                return this.handleTimeoutError(error, context, url, options);
            
            case 'HTTP_ERROR':
                return this.handleHTTPError(error, context);
            
            case 'API_ERROR':
                return this.handleAPIError(error, context);
            
            case 'VALIDATION_ERROR':
                return this.handleValidationError(error, context);
            
            default:
                return this.handleUnknownError(error, context);
        }
    },

    /**
     * Классификация ошибки
     */
    classifyError(error) {
        if (error.name === 'AbortError') {
            return 'TIMEOUT_ERROR';
        }
        
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return 'NETWORK_ERROR';
        }
        
        if (error instanceof HTTPError) {
            return 'HTTP_ERROR';
        }
        
        if (error instanceof APIError) {
            return 'API_ERROR';
        }
        
        if (error instanceof ValidationError) {
            return 'VALIDATION_ERROR';
        }
        
        return 'UNKNOWN_ERROR';
    },

    /**
     * Обработка ошибки сети
     */
    async handleNetworkError(error, context, url, options, retryCount = 0) {
        const userMessage = '❌ Нет соединения с сервером. Проверьте интернет.';
        
        if (retryCount < this.config.maxRetries) {
            Utils.log(`Повтор попытки ${retryCount + 1}/${this.config.maxRetries}...`);
            
            await this.delay(this.config.retryDelay * Math.pow(2, retryCount));
            
            try {
                return await this.fetch(url, options, context);
            } catch (retryError) {
                return this.handleNetworkError(retryError, context, url, options, retryCount + 1);
            }
        }

        showToast(userMessage, 'error');
        throw error;
    },

    /**
     * Обработка таймаута
     */
    async handleTimeoutError(error, context, url, options, retryCount = 0) {
        const userMessage = '⏱️ Превышено время ожидания ответа. Повторите запрос.';
        
        if (retryCount < this.config.maxRetries) {
            Utils.log(`Повтор после таймаута ${retryCount + 1}/${this.config.maxRetries}...`);
            
            await this.delay(this.config.retryDelay * Math.pow(2, retryCount));
            
            try {
                return await this.fetch(url, { ...options, timeout: this.config.timeout * 1.5 }, context);
            } catch (retryError) {
                return this.handleTimeoutError(retryError, context, url, options, retryCount + 1);
            }
        }

        showToast(userMessage, 'error');
        throw error;
    },

    /**
     * Обработка HTTP ошибки
     */
    handleHTTPError(error, context) {
        const status = error.status;
        let userMessage = `❌ Ошибка сервера: ${status}`;

        switch (status) {
            case 400:
                userMessage = '❌ Неверный запрос. Проверьте параметры.';
                break;
            case 401:
                userMessage = '❌ Требуется авторизация.';
                break;
            case 403:
                userMessage = '❌ Доступ запрещён.';
                break;
            case 404:
                userMessage = '❌ Ресурс не найден.';
                break;
            case 429:
                userMessage = '❌ Слишком много запросов. Подождите немного.';
                break;
            case 500:
                userMessage = '❌ Внутренняя ошибка сервера.';
                break;
            case 502:
                userMessage = '❌ Сервер недоступен. Попробуйте позже.';
                break;
            case 503:
                userMessage = '❌ Сервис временно недоступен.';
                break;
        }

        showToast(userMessage, 'error');
        throw error;
    },

    /**
     * Обработка ошибки API
     */
    handleAPIError(error, context) {
        const userMessage = error.message || '❌ Ошибка при получении данных';
        showToast(userMessage, 'error');
        throw error;
    },

    /**
     * Обработка ошибки валидации
     */
    handleValidationError(error, context) {
        const userMessage = `❌ Ошибка данных: ${error.message}`;
        showToast(userMessage, 'error');
        throw error;
    },

    /**
     * Обработка неизвестной ошибки
     */
    handleUnknownError(error, context) {
        const userMessage = '❌ Произошла неизвестная ошибка';
        showToast(userMessage, 'error');
        
        if (this.config.showDebugInfo) {
            console.error('Unknown error:', error);
        }
        
        throw error;
    },

    /**
     * Проверка на пустой ответ
     */
    isEmptyResponse(data) {
        if (!data) return true;
        if (typeof data === 'object' && Object.keys(data).length === 0) return true;
        return false;
    },

    /**
     * Задержка перед повторной попыткой
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Получение статистики ошибок
     */
    getErrorStats() {
        return { ...this.errorStats };
    },

    /**
     * Сброс статистики
     */
    resetErrorStats() {
        this.errorStats = {
            total: 0,
            byType: {},
            lastError: null
        };
    },

    /**
     * Включение/отключение debug режима
     */
    setDebugMode(enabled) {
        this.config.showDebugInfo = enabled;
    }
};

/**
 * Класс HTTP ошибки
 */
export class HTTPError extends Error {
    constructor(status, statusText, url) {
        super(`HTTP ${status}: ${statusText}`);
        this.name = 'HTTPError';
        this.status = status;
        this.statusText = statusText;
        this.url = url;
    }
}

/**
 * Класс API ошибки
 */
export class APIError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'APIError';
        this.context = context;
    }
}

/**
 * Класс ошибки валидации
 */
export class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

/**
 * Утилиты для логирования
 */
const Utils = {
    log(message) {
        console.log(`[MIRA] ${message}`);
    },
    
    warn(message) {
        console.warn(`[MIRA] ${message}`);
    },
    
    error(message, error) {
        console.error(`[MIRA] ${message}`, error);
    }
};

/**
 * Глобальная функция showToast (если ещё не определена)
 */
if (typeof showToast === 'undefined') {
    window.showToast = function(message, type = 'info') {
        console.log(`[Toast] ${type}: ${message}`);
        
        // Создаём элемент уведомления
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.95);
            padding: 12px 24px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
}
