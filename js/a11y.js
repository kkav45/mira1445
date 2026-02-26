/**
 * MIRA - Модуль доступности (a11y.js)
 * Улучшение доступности: ARIA, клавиатурная навигация, скринридеры
 */

export const A11yModule = {
    /**
     * Инициализация модуля доступности
     */
    init() {
        this.setupARIA();
        this.setupKeyboardNavigation();
        this.setupScreenReaderAnnouncements();
        this.setupFocusManagement();
        console.log('♿ A11y модуль инициализирован');
    },

    /**
     * Настройка ARIA-атрибутов
     */
    setupARIA() {
        // Карта
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.setAttribute('role', 'application');
            mapContainer.setAttribute('aria-label', 'Интерактивная карта погоды');
            mapContainer.setAttribute('tabindex', '0');
        }

        // Нижняя панель
        const mainPanel = document.getElementById('mainPanel');
        if (mainPanel) {
            mainPanel.setAttribute('role', 'complementary');
            mainPanel.setAttribute('aria-label', 'Панель метеоданных');
        }

        // Кнопка геолокации
        const geoBtn = document.querySelector('.geo-btn');
        if (geoBtn) {
            geoBtn.setAttribute('aria-label', 'Моё местоположение');
            geoBtn.setAttribute('title', 'Моё местоположение');
        }

        // Кнопки панели
        this.setupPanelButtonsARIA();

        // Вкладки
        this.setupTabsARIA();

        // Статус полёта
        this.setupFlightStatusARIA();

        // Таблицы
        this.setupTablesARIA();
    },

    /**
     * Настройка ARIA для кнопок панели
     */
    setupPanelButtonsARIA() {
        const buttons = document.querySelectorAll('.panel-btn');
        
        const buttonLabels = {
            'fa-route': 'Построить маршрут',
            'fa-bullseye': 'Зоны риска',
            'fa-file-pdf': 'Экспорт отчёта в PDF',
            'fa-cog': 'Настройки',
            'fa-times': 'Закрыть панель',
            'fa-chevron-down': 'Развернуть панель',
            'fa-chevron-up': 'Свернуть панель'
        };

        buttons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.setAttribute('aria-hidden', 'true');
                
                // Находим label для кнопки
                for (const [iconClass, label] of Object.entries(buttonLabels)) {
                    if (icon.classList.contains(iconClass)) {
                        btn.setAttribute('aria-label', label);
                        btn.setAttribute('title', label);
                        break;
                    }
                }
            }
        });
    },

    /**
     * Настройка ARIA для вкладок
     */
    setupTabsARIA() {
        const tabsContainer = document.getElementById('mainTabs');
        if (!tabsContainer) return;

        tabsContainer.setAttribute('role', 'tablist');
        tabsContainer.setAttribute('aria-label', 'Вкладки отчёта');

        const tabs = tabsContainer.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach((tab, index) => {
            const tabId = `tab-${index}`;
            const contentId = tab.id.replace('tab-', 'tab-');
            
            tab.setAttribute('role', 'tab');
            tab.setAttribute('id', tabId);
            tab.setAttribute('aria-controls', contentId);
            tab.setAttribute('aria-selected', tab.classList.contains('active'));
            tab.setAttribute('tabindex', tab.classList.contains('active') ? '0' : '-1');

            // Находим соответствующий контент
            const content = document.getElementById(contentId);
            if (content) {
                content.setAttribute('role', 'tabpanel');
                content.setAttribute('aria-labelledby', tabId);
                content.setAttribute('tabindex', '0');
            }
        });
    },

    /**
     * Настройка ARIA для статуса полёта
     */
    setupFlightStatusARIA() {
        const flightStatus = document.getElementById('flightStatus');
        if (!flightStatus) return;

        flightStatus.setAttribute('role', 'status');
        flightStatus.setAttribute('aria-live', 'polite');
        flightStatus.setAttribute('aria-atomic', 'true');

        // Обновляем label в зависимости от статуса
        this.updateFlightStatusLabel();
    },

    /**
     * Обновление label статуса полёта
     */
    updateFlightStatusLabel() {
        const flightStatus = document.getElementById('flightStatus');
        if (!flightStatus) return;

        const text = flightStatus.textContent.trim();
        let ariaLabel = 'Статус полёта: неизвестно';

        if (text.includes('РАЗРЕШЁН') || text.includes('ALLOWED')) {
            ariaLabel = 'Статус полёта: разрешён';
        } else if (text.includes('ОГРАНИЧЕН') || text.includes('RESTRICTED')) {
            ariaLabel = 'Статус полёта: ограничен';
        } else if (text.includes('ЗАПРЕЩЁН') || text.includes('FORBIDDEN')) {
            ariaLabel = 'Статус полёта: запрещён';
        }

        flightStatus.setAttribute('aria-label', ariaLabel);
    },

    /**
     * Настройка ARIA для таблиц
     */
    setupTablesARIA() {
        const tables = document.querySelectorAll('.data-table');
        
        tables.forEach((table, index) => {
            table.setAttribute('role', 'table');
            table.setAttribute('aria-label', `Таблица данных ${index + 1}`);

            // Заголовки
            const headers = table.querySelectorAll('th');
            headers.forEach(th => {
                th.setAttribute('scope', 'col');
                th.setAttribute('aria-sort', 'none');
            });
        });
    },

    /**
     * Настройка клавиатурной навигации
     */
    setupKeyboardNavigation() {
        // Глобальные горячие клавиши
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));

        // Навигация по вкладкам стрелками
        this.setupArrowNavigation();

        // Закрытие модальных окон по Escape
        this.setupModalClose();

        // Активация кнопок по Enter и Space
        this.setupButtonActivation();
    },

    /**
     * Обработка глобальных горячих клавиш
     */
    handleGlobalKeydown(e) {
        // Alt + 1-4: переключение вкладок
        if (e.altKey && /^[1-4]$/.test(e.key)) {
            e.preventDefault();
            const tabs = document.querySelectorAll('.tab');
            const index = parseInt(e.key) - 1;
            if (tabs[index]) {
                tabs[index].click();
                tabs[index].focus();
            }
        }

        // Escape: закрыть модальное окно или панель
        if (e.key === 'Escape') {
            const modal = document.querySelector('.modal.active');
            if (modal) {
                modal.classList.remove('active');
                // Возвращаем фокус на кнопку, открывшую модалку
                const lastFocused = document.activeElement;
                if (lastFocused) lastFocused.blur();
            }
        }

        // Ctrl + Enter: запустить анализ
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const analyzeBtn = document.getElementById('getWeatherBtn');
            if (analyzeBtn) {
                analyzeBtn.click();
            }
        }

        // Ctrl + P: печать/экспорт PDF
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            const exportBtn = document.querySelector('[onclick="exportReport()"]');
            if (exportBtn) {
                exportBtn.click();
            }
        }
    },

    /**
     * Навигация стрелками для вкладок
     */
    setupArrowNavigation() {
        const tabsContainer = document.getElementById('mainTabs');
        if (!tabsContainer) return;

        tabsContainer.addEventListener('keydown', (e) => {
            const tabs = Array.from(tabsContainer.querySelectorAll('.tab'));
            const current = document.activeElement;
            const currentIndex = tabs.indexOf(current);

            if (currentIndex === -1) return;

            let nextIndex;

            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    nextIndex = (currentIndex + 1) % tabs.length;
                    tabs[nextIndex].focus();
                    tabs[nextIndex].click();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                    tabs[nextIndex].focus();
                    tabs[nextIndex].click();
                    break;
                case 'Home':
                    e.preventDefault();
                    tabs[0].focus();
                    tabs[0].click();
                    break;
                case 'End':
                    e.preventDefault();
                    tabs[tabs.length - 1].focus();
                    tabs[tabs.length - 1].click();
                    break;
            }
        });
    },

    /**
     * Закрытие модальных окон по Escape
     */
    setupModalClose() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    modal.classList.remove('active');
                }
            });
        });
    },

    /**
     * Активация кнопок по Enter и Space
     */
    setupButtonActivation() {
        document.addEventListener('keydown', (e) => {
            const button = e.target.closest('button, [role="button"]');
            if (!button) return;

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                button.click();
            }
        });
    },

    /**
     * Настройка управления фокусом
     */
    setupFocusManagement() {
        // Ловушка фокуса для модальных окон
        this.setupFocusTrap();

        // Возврат фокуса после закрытия модального окна
        this.setupFocusReturn();

        // Видимый фокус для всех интерактивных элементов
        this.setupVisibleFocus();
    },

    /**
     * Ловушка фокуса для модальных окон
     */
    setupFocusTrap() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('keydown', (e) => {
                if (e.key !== 'Tab') return;

                const focusableElements = modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            });
        });
    },

    /**
     * Возврат фокуса после закрытия модального окна
     */
    setupFocusReturn() {
        let lastFocusedElement = null;

        document.querySelectorAll('.modal').forEach(modal => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        const isActive = modal.classList.contains('active');
                        
                        if (!isActive && lastFocusedElement) {
                            lastFocusedElement.focus();
                            lastFocusedElement = null;
                        }
                    }
                });
            });

            observer.observe(modal, { attributes: true });

            // Сохраняем последний сфокусированный элемент при открытии
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    lastFocusedElement = document.activeElement;
                }
            });
        });
    },

    /**
     * Видимый фокус для всех интерактивных элементов
     */
    setupVisibleFocus() {
        // Добавляем стили для видимого фокуса
        const style = document.createElement('style');
        style.textContent = `
            /* Видимый фокус для клавиатурной навигации */
            *:focus-visible {
                outline: 3px solid #667eea;
                outline-offset: 2px;
            }
            
            button:focus-visible,
            [role="button"]:focus-visible {
                outline: 3px solid #667eea;
                outline-offset: 2px;
                box-shadow: 0 0 0 5px rgba(102, 126, 234, 0.3);
            }
            
            input:focus-visible,
            select:focus-visible,
            textarea:focus-visible {
                outline: 3px solid #667eea;
                outline-offset: 0;
            }
            
            .tab:focus-visible {
                outline: 3px solid #667eea;
                outline-offset: -3px;
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Объявления для скринридеров
     */
    setupScreenReaderAnnouncements() {
        // Создаём live region для объявлений
        const liveRegion = document.createElement('div');
        liveRegion.id = 'a11y-announcer';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        `;
        document.body.appendChild(liveRegion);
    },

    /**
     * Объявление сообщения для скринридеров
     */
    announce(message) {
        const liveRegion = document.getElementById('a11y-announcer');
        if (liveRegion) {
            liveRegion.textContent = message;
            // Очищаем через 1 секунду
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    },

    /**
     * Обновление контента с объявлением
     */
    updateContent(containerId, newContent, announcement) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = newContent;
        
        if (announcement) {
            this.announce(announcement);
        }
    }
};

// Авто-инициализация при загрузке DOM
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        A11yModule.init();
    });
}
