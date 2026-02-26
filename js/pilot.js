/**
 * MIRA - Пилот (pilot.js)
 * Функционал "Сидя на земле" - ввод фактических данных, коррекция прогноза
 */

const PilotModule = {
    pilotData: null,
    correctedAnalysis: null,
    selectPointMode: false,

    /**
     * Инициализация
     */
    init() {
        // Загружаем сохранённые данные пилота
        this.pilotData = Storage.getPilotData();
        Utils.log('Пилот модуль инициализирован');
    },

    /**
     * Открытие модального окна пилота
     */
    openModal() {
        const modal = document.getElementById('pilotChecklistModal');
        if (!modal) {
            Utils.error('Модальное окно пилота не найдено');
            return;
        }

        // Проверяем наличие метеоданных
        const hasWeatherData = this.hasWeatherData();
        if (!hasWeatherData) {
            showToast('Сначала получите метеоданные', 'error');
            return;
        }

        // Заполняем форму сохранёнными данными
        this.fillFormFromData();
        
        modal.classList.add('active');
        Utils.log('Модальное окно пилота открыто');
    },

    /**
     * Закрытие модального окна
     */
    closeModal() {
        const modal = document.getElementById('pilotChecklistModal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        if (this.selectPointMode) {
            this.disableSelectPointMode();
        }
        
        Utils.log('Модальное окно пилота закрыто');
    },

    /**
     * Проверка наличия метеоданных
     */
    hasWeatherData() {
        // Проверяем наличие данных в WizardModule или RouteModule
        if (typeof WizardModule !== 'undefined' && WizardModule.stepData?.segmentAnalysis?.length > 0) {
            return true;
        }
        if (typeof RouteModule !== 'undefined' && RouteModule.segmentAnalysis?.length > 0) {
            return true;
        }
        return false;
    },

    /**
     * Заполнение формы из сохранённых данных
     */
    fillFormFromData() {
        if (!this.pilotData) return;

        const fields = {
            pilotWindSpeed: this.pilotData.windSpeed,
            pilotWindDir: this.pilotData.windDir,
            pilotTemp: this.pilotData.temp,
            pilotHumidity: this.pilotData.humidity,
            pilotVisibility: this.pilotData.visibility,
            pilotCloudBase: this.pilotData.cloudBase,
            pilotFog: this.pilotData.fog,
            pilotPrecip: this.pilotData.precip
        };

        Object.entries(fields).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = value || false;
                } else {
                    el.value = value || '';
                }
            }
        });
    },

    /**
     * Сбор данных из формы
     */
    collectFormData() {
        return {
            windSpeed: this.parseFloat(document.getElementById('pilotWindSpeed')?.value),
            windDir: this.parseFloat(document.getElementById('pilotWindDir')?.value),
            temp: this.parseFloat(document.getElementById('pilotTemp')?.value),
            humidity: this.parseFloat(document.getElementById('pilotHumidity')?.value),
            visibility: this.parseFloat(document.getElementById('pilotVisibility')?.value),
            cloudBase: this.parseFloat(document.getElementById('pilotCloudBase')?.value),
            fog: document.getElementById('pilotFog')?.checked || false,
            precip: document.getElementById('pilotPrecip')?.checked || false,
            coords: {
                lat: this.parseFloat(document.getElementById('pilotLat')?.value),
                lon: this.parseFloat(document.getElementById('pilotLon')?.value)
            }
        };
    },

    /**
     * Применение коррекции
     */
    applyCorrection() {
        const pilotData = this.collectFormData();

        // Проверяем, есть ли хоть какие-то данные
        const hasData = pilotData.windSpeed || pilotData.temp || 
                       pilotData.visibility || pilotData.fog || 
                       pilotData.precip || pilotData.humidity;

        if (!hasData) {
            showToast('Введите хотя бы один параметр', 'error');
            return;
        }

        this.pilotData = pilotData;
        Storage.savePilotData(pilotData);

        // Получаем текущий анализ
        const currentAnalysis = this.getCurrentAnalysis();
        if (currentAnalysis) {
            this.correctedAnalysis = WeatherModule.applyPilotCorrection(currentAnalysis, pilotData);
            
            // Обновляем отображение
            this.displayComparison(currentAnalysis, this.correctedAnalysis, pilotData);
            this.displayDecision(pilotData, this.correctedAnalysis);
        }

        showToast('Коррекция применена', 'success');

        // Обновляем данные в WizardModule
        if (typeof WizardModule !== 'undefined') {
            WizardModule.stepData.pilotData = pilotData;
            WizardModule.stepData.correctedAnalysis = this.correctedAnalysis;
        }
    },

    /**
     * Получение текущего анализа
     */
    getCurrentAnalysis() {
        if (typeof WizardModule !== 'undefined' && WizardModule.stepData?.segmentAnalysis?.length > 0) {
            return WizardModule.stepData.segmentAnalysis[0].analyzed;
        }
        if (typeof RouteModule !== 'undefined' && RouteModule.segmentAnalysis?.length > 0) {
            return RouteModule.segmentAnalysis[0].analyzed;
        }
        return null;
    },

    /**
     * Отображение сравнения прогноз/факт
     */
    displayComparison(forecast, corrected, pilotData) {
        const container = document.getElementById('pilotComparisonBlock');
        const table = document.getElementById('pilotComparisonTable');
        
        if (!container || !table) return;

        const corrections = corrected.corrections || {};
        
        const rows = [
            {
                param: 'Ветер (м/с)',
                forecast: forecast.hourly[0]?.wind10m?.toFixed(1) || '—',
                fact: pilotData.windSpeed?.toFixed(1) || '—',
                delta: corrections.windBias ? 
                    `${corrections.windBias > 1 ? '+' : ''}${((corrections.windBias - 1) * 100).toFixed(0)}%` : '—'
            },
            {
                param: 'Температура (°C)',
                forecast: forecast.hourly[0]?.temp2m?.toFixed(1) || '—',
                fact: pilotData.temp?.toFixed(1) || '—',
                delta: corrections.tempOffset ? 
                    `${corrections.tempOffset > 0 ? '+' : ''}${corrections.tempOffset.toFixed(1)}°C` : '—'
            },
            {
                param: 'Влажность (%)',
                forecast: forecast.hourly[0]?.humidity?.toFixed(0) || '—',
                fact: pilotData.humidity?.toFixed(0) || '—',
                delta: corrections.humidityOffset ? 
                    `${corrections.humidityOffset > 0 ? '+' : ''}${corrections.humidityOffset.toFixed(0)}` : '—'
            },
            {
                param: 'Видимость (км)',
                forecast: forecast.hourly[0]?.visibility?.toFixed(1) || '—',
                fact: pilotData.visibility?.toFixed(1) || '—',
                delta: corrections.visibilityOverride ? '⚠️ Переопределено' : '—'
            },
            {
                param: 'Туман',
                forecast: (forecast.hourly[0]?.visibility || 5) < 1 ? 'Да' : 'Нет',
                fact: pilotData.fog ? 'Да' : 'Нет',
                delta: pilotData.fog && (forecast.hourly[0]?.visibility || 5) >= 1 ? '⚠️ Не спрогнозирован' : '—'
            },
            {
                param: 'Осадки',
                forecast: (forecast.hourly[0]?.precip || 0) > 0 ? 'Да' : 'Нет',
                fact: pilotData.precip ? 'Да' : 'Нет',
                delta: pilotData.precip && (forecast.hourly[0]?.precip || 0) === 0 ? '⚠️ Не спрогнозированы' : '—'
            }
        ];

        table.innerHTML = rows.map(row => `
            <tr>
                <td style="font-size: 12px;">${row.param}</td>
                <td style="font-size: 12px;">${row.forecast}</td>
                <td style="font-size: 12px; font-weight: 600;">${row.fact}</td>
                <td style="font-size: 12px; color: ${row.delta.includes('⚠️') ? '#dd6b20' : 'rgba(0,0,0,0.5)'}">
                    ${row.delta}
                </td>
            </tr>
        `).join('');

        container.style.display = 'block';
    },

    /**
     * Отображение решения
     */
    displayDecision(pilotData, correctedAnalysis) {
        const container = document.getElementById('pilotDecisionBlock');
        const statusEl = document.getElementById('pilotFinalStatus');
        const recEl = document.getElementById('pilotRecommendations');
        
        if (!container || !statusEl || !recEl) return;

        const recommendations = WeatherModule.generateRecommendations(correctedAnalysis, pilotData);
        const thresholds = Storage.getThresholds();

        // Определяем общий статус
        let overallRisk = 'low';
        let riskCount = 0;
        let maxAltitude = 550;

        // Проверка ветра
        if (pilotData.windSpeed && pilotData.windSpeed > thresholds.windGround) {
            overallRisk = 'high';
            riskCount++;
            maxAltitude = Math.max(250, maxAltitude - 200);
        }

        // Проверка видимости
        if (pilotData.fog || (pilotData.visibility && pilotData.visibility < 1)) {
            overallRisk = 'high';
            riskCount++;
            maxAltitude = 0;
        } else if (pilotData.visibility && pilotData.visibility < thresholds.visibility) {
            riskCount++;
            maxAltitude = Math.max(350, maxAltitude - 100);
        }

        // Проверка осадков
        if (pilotData.precip) {
            riskCount++;
        }

        // Проверка обледенения
        if (pilotData.temp !== null && pilotData.humidity !== null) {
            const icingRisk = pilotData.temp <= 5 && pilotData.temp >= -10 && pilotData.humidity > 80;
            if (icingRisk) {
                riskCount++;
                if (pilotData.temp <= 0 && pilotData.temp >= -5) {
                    overallRisk = 'high';
                    maxAltitude = Math.max(250, maxAltitude - 150);
                }
            }
        }

        // Установка статуса
        if (overallRisk === 'high' || riskCount >= 2) {
            statusEl.className = 'flight-status status-forbidden';
            statusEl.innerHTML = '<i class="fas fa-times-circle"></i><span>ПОЛЁТ ЗАПРЕЩЁН</span>';
        } else if (riskCount >= 1) {
            statusEl.className = 'flight-status status-restricted';
            statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>ПОЛЁТ С ОГРАНИЧЕНИЯМИ</span>';
        } else {
            statusEl.className = 'flight-status status-allowed';
            statusEl.innerHTML = '<i class="fas fa-check-circle"></i><span>ПОЛЁТ РАЗРЕШЁН</span>';
        }

        // Отображение рекомендаций
        recEl.innerHTML = recommendations.map(rec => `
            <div class="recommendation-item ${rec.type}">
                <i class="fas ${rec.icon}"></i>
                <span class="recommendation-text">${rec.text}</span>
            </div>
        `).join('');

        // Обновление максимальной высоты
        const altitudeEl = document.getElementById('pilotMaxAltitude');
        if (altitudeEl) {
            altitudeEl.textContent = maxAltitude + ' м';
        }

        container.style.display = 'block';
    },

    /**
     * Очистка данных пилота
     */
    clearData() {
        // Очищаем форму
        ['pilotWindSpeed', 'pilotWindDir', 'pilotTemp', 'pilotHumidity',
         'pilotVisibility', 'pilotCloudBase'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        const fogEl = document.getElementById('pilotFog');
        const precipEl = document.getElementById('pilotPrecip');
        if (fogEl) fogEl.checked = false;
        if (precipEl) precipEl.checked = false;

        // Очищаем данные
        this.pilotData = null;
        this.correctedAnalysis = null;
        Storage.clearPilotData();

        // Скрываем результаты
        const comparisonBlock = document.getElementById('pilotComparisonBlock');
        const decisionBlock = document.getElementById('pilotDecisionBlock');
        if (comparisonBlock) comparisonBlock.style.display = 'none';
        if (decisionBlock) decisionBlock.style.display = 'none';

        // Обновляем WizardModule
        if (typeof WizardModule !== 'undefined') {
            WizardModule.stepData.pilotData = null;
            WizardModule.stepData.correctedAnalysis = null;
        }

        showToast('Данные очищены', 'info');
    },

    /**
     * Режим выбора точки на карте
     */
    toggleSelectPointMode() {
        this.selectPointMode = !this.selectPointMode;
        const btn = document.getElementById('selectPointBtn');
        
        if (this.selectPointMode) {
            if (btn) {
                btn.style.background = 'rgba(102, 126, 234, 0.3)';
                btn.style.color = '#667eea';
                btn.innerHTML = '<i class="fas fa-check"></i> <span>Кликните по карте</span>';
            }
            
            if (typeof MapModule !== 'undefined') {
                MapModule.enableSelectPointMode((lat, lon) => {
                    this.onPointSelected(lat, lon);
                });
            }
            
            showToast('Режим выбора точки: кликните по карте', 'info');
        } else {
            if (btn) {
                btn.style.background = 'rgba(102, 126, 234, 0.15)';
                btn.style.color = '#667eea';
                btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> <span>На карте</span>';
            }
            
            if (typeof MapModule !== 'undefined') {
                MapModule.disableSelectPointMode();
            }
        }
    },

    /**
     * Обработка выбора точки
     */
    onPointSelected(lat, lon) {
        const latEl = document.getElementById('pilotLat');
        const lonEl = document.getElementById('pilotLon');
        if (latEl) latEl.value = lat.toFixed(6);
        if (lonEl) lonEl.value = lon.toFixed(6);

        this.toggleSelectPointMode();
        showToast('Координаты установлены', 'success');
    },

    /**
     * Заполнение координат из геолокации
     */
    fillCoordsFromLocation() {
        if (!navigator.geolocation) {
            showToast('Геолокация не поддерживается', 'error');
            return;
        }

        const btn = event.target.closest('button');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Определение...';
        btn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                const latEl = document.getElementById('pilotLat');
                const lonEl = document.getElementById('pilotLon');
                if (latEl) latEl.value = lat.toFixed(6);
                if (lonEl) lonEl.value = lon.toFixed(6);

                showToast('Координаты определены', 'success');
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            },
            (error) => {
                showToast('Ошибка определения координат', 'error');
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    },

    /**
     * Парсинг числа
     */
    parseFloat(value) {
        if (value === null || value === undefined || value === '') return null;
        const parsed = window.parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    },

    /**
     * Отключение режима выбора точки
     */
    disableSelectPointMode() {
        this.selectPointMode = false;
        if (typeof MapModule !== 'undefined') {
            MapModule.disableSelectPointMode();
        }
    },

    /**
     * Получение данных пилота
     */
    getData() {
        return this.pilotData;
    },

    /**
     * Получение скорректированного анализа
     */
    getCorrectedAnalysis() {
        return this.correctedAnalysis;
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PilotModule;
}
