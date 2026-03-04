/**
 * Вкладка дашборда: В ПОЛЁТЕ ✈️
 * Наблюдения пилота во время полёта
 */

const DashboardTabsFlight = {
    render() {
        const observations = typeof PilotObservationsModule !== 'undefined'
            ? PilotObservationsModule.getFlightObservations()
            : [];

        return this.renderForm() + this.renderContent(observations);
    },

    /**
     * Форма добавления наблюдения
     */
    renderForm() {
        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-plus-circle" style="color: #3b82f6;"></i>
                    Добавить наблюдение (В полёте)
                </div>
                
                <!-- Координаты -->
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase; margin-bottom: 8px;">
                        <i class="fas fa-map-marker-alt"></i> Координаты
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                        <input type="text" id="flightLat" class="coord-input" placeholder="Широта"
                               style="width: 100%; padding: 8px; border: 1px solid rgba(0,0,0,0.15); border-radius: 6px; font-size: 13px; font-family: monospace;" />
                        <input type="text" id="flightLon" class="coord-input" placeholder="Долгота"
                               style="width: 100%; padding: 8px; border: 1px solid rgba(0,0,0,0.15); border-radius: 6px; font-size: 13px; font-family: monospace;" />
                    </div>
                    <button class="action-btn" onclick="DashboardTabsFlight.getCurrentLocation()"
                            style="width: 100%; background: linear-gradient(135deg, rgba(56, 161, 105, 0.8) 0%, rgba(38, 166, 154, 0.8) 100%);">
                        <i class="fas fa-location-crosshairs"></i> Моё местоположение
                    </button>
                </div>

                <!-- Время наблюдения -->
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase; margin-bottom: 8px;">
                        <i class="fas fa-clock"></i> Время наблюдения
                    </div>
                    <input type="datetime-local" id="flightTime"
                           style="width: 100%; padding: 8px; border: 1px solid rgba(0,0,0,0.15); border-radius: 6px; font-size: 13px;" />
                </div>

                <!-- Метеоданные -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
                    <div>
                        <label style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">
                            <i class="fas fa-wind"></i> Ветер (м/с)
                        </label>
                        <input type="number" id="flightWindSpeed" class="coord-input"
                               placeholder="0.0" step="0.1" min="0" max="50"
                               style="width: 100%; margin-top: 4px;" />
                    </div>
                    <div>
                        <label style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">
                            <i class="fas fa-compass"></i> Направление (°)
                        </label>
                        <input type="number" id="flightWindDir" class="coord-input"
                               placeholder="0–360" step="1" min="0" max="360"
                               style="width: 100%; margin-top: 4px;" />
                    </div>
                    <div>
                        <label style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">
                            <i class="fas fa-thermometer-half"></i> Температура (°C)
                        </label>
                        <input type="number" id="flightTemp" class="coord-input"
                               placeholder="+0.0" step="0.1" min="-40" max="50"
                               style="width: 100%; margin-top: 4px;" />
                    </div>
                    <div>
                        <label style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">
                            <i class="fas fa-tint"></i> Влажность (%)
                        </label>
                        <input type="number" id="flightHumidity" class="coord-input"
                               placeholder="0" step="1" min="0" max="100"
                               style="width: 100%; margin-top: 4px;" />
                    </div>
                    <div>
                        <label style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">
                            <i class="fas fa-eye"></i> Видимость (км)
                        </label>
                        <input type="number" id="flightVisibility" class="coord-input"
                               placeholder=">5" step="0.1" min="0.1" max="10"
                               style="width: 100%; margin-top: 4px;" />
                    </div>
                    <div>
                        <label style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">
                            <i class="fas fa-cloud"></i> Облака (м)
                        </label>
                        <input type="number" id="flightCloudBase" class="coord-input"
                               placeholder="0" step="50" min="0" max="5000"
                               style="width: 100%; margin-top: 4px;" />
                    </div>
                </div>

                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;">
                    <label style="display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(0,0,0,0.03); border-radius: 8px; cursor: pointer;">
                        <input type="checkbox" id="flightFog" style="width: 18px; height: 18px;" />
                        <span><i class="fas fa-smog"></i> Туман</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(0,0,0,0.03); border-radius: 8px; cursor: pointer;">
                        <input type="checkbox" id="flightPrecip" style="width: 18px; height: 18px;" />
                        <span><i class="fas fa-cloud-rain"></i> Осадки</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(0,0,0,0.03); border-radius: 8px; cursor: pointer;">
                        <input type="checkbox" id="flightSnow" style="width: 18px; height: 18px;" />
                        <span><i class="fas fa-snowflake"></i> Снег</span>
                    </label>
                </div>

                <div style="display: flex; gap: 12px;">
                    <button class="action-btn" onclick="DashboardTabsFlight.addObservation()" style="flex: 1;">
                        <i class="fas fa-plus-circle"></i> Добавить наблюдение
                    </button>
                    <button class="action-btn" onclick="DashboardTabsFlight.clearAll()"
                            style="width: 56px; background: linear-gradient(135deg, rgba(237, 137, 54, 0.8) 0%, rgba(237, 137, 54, 0.6) 100%);">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    },

    renderContent(observations) {
        // Если нет наблюдений — не показываем контент
        if (!observations || observations.length === 0) {
            return '';
        }

        const lastObservation = observations[observations.length - 1];
        const comparison = this.getForecastComparison(lastObservation);

        return `
            <!-- Статистика -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-chart-pie" style="color: #3b82f6;"></i>
                    Статистика полёта
                </div>
                <div class="dashboard-energy-cards">
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">📝</div>
                        <div class="dashboard-energy-card-value">${observations.length}</div>
                        <div class="dashboard-energy-card-label">Наблюдений</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">⏱️</div>
                        <div class="dashboard-energy-card-value">${this.getFlightDuration(observations)}</div>
                        <div class="dashboard-energy-card-label">Длительность</div>
                    </div>
                </div>
            </div>

            <!-- Сравнение прогноз/факт -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-balance-scale" style="color: #48bb78;"></i>
                    Сравнение прогноз/факт
                </div>
                ${this.renderComparisonTable(comparison)}
            </div>

            <!-- Рекомендации -->
            ${this.renderRecommendations(this.getRecommendations(comparison, lastObservation))}

            <!-- Хронология -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-timeline" style="color: #667eea;"></i>
                    Хронология наблюдений
                </div>
                ${this.renderTimeline(observations)}
            </div>

            <!-- График отклонений -->
            <div class="dashboard-charts-grid">
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-chart-line"></i>
                        Отклонения от прогноза
                    </div>
                    <div id="dashboardFlightDeviationChart" style="height: 300px;"></div>
                </div>
            </div>
        `;
    },

    /**
     * Получить рекомендации на основе сравнения прогноз/факт
     */
    getRecommendations(comparison, observation) {
        const recommendations = [];
        
        // Ветер
        if (comparison.windSpeed.forecast !== '—' && comparison.windSpeed.fact !== '—') {
            const windDelta = comparison.windSpeed.fact - comparison.windSpeed.forecast;
            const windPercent = Math.round((windDelta / comparison.windSpeed.forecast) * 100);
            
            if (windPercent > 20) {
                recommendations.push({
                    type: 'warning',
                    icon: '⚠️',
                    text: `Ветер сильнее прогноза на ${windPercent}% (${comparison.windSpeed.fact} м/с). Будьте готовы к усложнению пилотирования.`
                });
            } else if (windPercent < -20) {
                recommendations.push({
                    type: 'success',
                    icon: '✅',
                    text: `Ветер слабее прогноза на ${Math.abs(windPercent)}% (${comparison.windSpeed.fact} м/с). Условия благоприятнее прогноза.`
                });
            }
        }
        
        // Температура
        if (comparison.temp.forecast !== '—' && comparison.temp.fact !== '—') {
            const tempDelta = comparison.temp.fact - comparison.temp.forecast;
            
            if (Math.abs(tempDelta) > 5) {
                const warmer = tempDelta > 0;
                recommendations.push({
                    type: 'info',
                    icon: '🌡️',
                    text: `Температура ${warmer ? 'выше' : 'ниже'} прогноза на ${Math.abs(tempDelta)}°C. Возможны изменения в атмосферных условиях.`
                });
            }
            
            // Проверка на обледенение
            if (comparison.temp.fact <= 0 && comparison.temp.fact >= -10 && comparison.humidity.fact > 80) {
                recommendations.push({
                    type: 'danger',
                    icon: '❄️',
                    text: 'ВНИМАНИЕ: Риск обледенения! Температура около 0°C при высокой влажности.'
                });
            }
        }
        
        // Влажность
        if (comparison.humidity.forecast !== '—' && comparison.humidity.fact !== '—') {
            const humidityDelta = comparison.humidity.fact - comparison.humidity.forecast;
            
            if (humidityDelta > 20) {
                recommendations.push({
                    type: 'warning',
                    icon: '💧',
                    text: `Влажность выше прогноза на ${humidityDelta}%. Возможно ухудшение видимости, риск тумана.`
                });
            }
            
            if (comparison.humidity.fact > 90) {
                recommendations.push({
                    type: 'warning',
                    icon: '🌫️',
                    text: 'Очень высокая влажность (>90%). Высока вероятность образования тумана.'
                });
            }
        }
        
        // Видимость
        if (comparison.visibility.forecast !== '—' && comparison.visibility.fact !== '—') {
            if (comparison.visibility.fact < 1) {
                recommendations.push({
                    type: 'danger',
                    icon: '👁️',
                    text: `Видимость ${comparison.visibility.fact} км — ОПАСНО для полётов! Требуется немедленная посадка.`
                });
            } else if (comparison.visibility.fact < 3) {
                recommendations.push({
                    type: 'warning',
                    icon: '👁️',
                    text: `Видимость ${comparison.visibility.fact} км — ограничена. Будьте осторожны, избегайте дальних полётов.`
                });
            } else if (comparison.visibility.fact < comparison.visibility.forecast * 0.7) {
                recommendations.push({
                    type: 'warning',
                    icon: '👁️',
                    text: 'Видимость хуже прогноза. Возможны метеоизменения.'
                });
            }
        }
        
        // Туман (флаг)
        if (observation.fog) {
            recommendations.push({
                type: 'danger',
                icon: '🌫️',
                text: 'ПИЛОТ НАБЛЮДАЕТ ТУМАН! Полёты запрещены до улучшения условий.'
            });
        }
        
        // Осадки (флаг)
        if (observation.precip) {
            recommendations.push({
                type: 'warning',
                icon: '🌧️',
                text: 'Наблюдаются осадки. Учитывайте ухудшение условий при планировании полёта.'
            });
        }
        
        // Снег (флаг)
        if (observation.snow) {
            recommendations.push({
                type: 'danger',
                icon: '❄️',
                text: 'Наблюдается снег! Возможно обледенение при температуре около 0°C.'
            });
        }
        
        // Если рекомендаций нет
        if (recommendations.length === 0) {
            recommendations.push({
                type: 'success',
                icon: '✅',
                text: 'Фактические условия соответствуют прогнозу. Полёты возможны по плану.'
            });
        }
        
        return recommendations;
    },

    /**
     * Отрисовка рекомендаций
     */
    renderRecommendations(recommendations) {
        if (!recommendations || recommendations.length === 0) return '';
        
        const typeStyles = {
            success: 'background: rgba(56, 161, 105, 0.1); border-left: 3px solid #38a169;',
            info: 'background: rgba(66, 153, 225, 0.1); border-left: 3px solid #4299e1;',
            warning: 'background: rgba(237, 137, 54, 0.1); border-left: 3px solid #ed8936;',
            danger: 'background: rgba(229, 62, 62, 0.1); border-left: 3px solid #e53e3e;'
        };
        
        return `
            <div class="dashboard-card" style="margin-top: 16px;">
                <div class="dashboard-card-title">
                    <i class="fas fa-lightbulb" style="color: #f59e0b;"></i>
                    Рекомендации по фактическим данным
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${recommendations.map(rec => `
                        <div style="padding: 12px; border-radius: 8px; ${typeStyles[rec.type] || typeStyles.info}">
                            <div style="font-size: 13px; color: #2d3748;">
                                ${rec.icon} ${rec.text}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderTimeline(observations) {
        const items = observations.map(obs => `
            <div class="dashboard-flight-window allowed" style="padding: 12px;">
                <div class="dashboard-flight-window-time" style="font-size: 14px;">
                    ${this.formatTime(obs.timestamp)}
                </div>
                <div class="dashboard-flight-window-metrics">
                    <div class="dashboard-flight-window-metric">
                        <div class="dashboard-flight-window-metric-value">${obs.windSpeed || 0}</div>
                        <div class="dashboard-flight-window-metric-label">Ветер</div>
                    </div>
                    <div class="dashboard-flight-window-metric">
                        <div class="dashboard-flight-window-metric-value">${obs.temp > 0 ? '+' : ''}${obs.temp || 0}</div>
                        <div class="dashboard-flight-window-metric-label">Темп.</div>
                    </div>
                    <div class="dashboard-flight-window-metric">
                        <div class="dashboard-flight-window-metric-value">${obs.humidity || 0}%</div>
                        <div class="dashboard-flight-window-metric-label">Влажн.</div>
                    </div>
                </div>
            </div>
        `).join('');

        return items || '<p style="color: #718096;">Нет наблюдений</p>';
    },

    getFlightDuration(observations) {
        if (observations.length < 2) return '—';
        const first = new Date(observations[0].timestamp);
        const last = new Date(observations[observations.length - 1].timestamp);
        const diff = Math.round((last - first) / 60000);
        return `${diff} мин`;
    },

    formatTime(timestamp) {
        if (!timestamp) return '--:--';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    },

    /**
     * Добавить наблюдение
     */
    addObservation() {
        const lat = parseFloat(document.getElementById('flightLat')?.value);
        const lon = parseFloat(document.getElementById('flightLon')?.value);
        const time = document.getElementById('flightTime')?.value;
        const windSpeed = document.getElementById('flightWindSpeed')?.value;
        const windDir = document.getElementById('flightWindDir')?.value;
        const temp = document.getElementById('flightTemp')?.value;
        const humidity = document.getElementById('flightHumidity')?.value;
        const visibility = document.getElementById('flightVisibility')?.value;
        const cloudBase = document.getElementById('flightCloudBase')?.value;
        const fog = document.getElementById('flightFog')?.checked;
        const precip = document.getElementById('flightPrecip')?.checked;
        const snow = document.getElementById('flightSnow')?.checked;

        if (!lat || !lon) {
            showToast('Укажите координаты', 'error');
            return;
        }

        // Проверяем, что хотя бы одно метеоданное введено
        const hasAnyData = windSpeed || temp || humidity || visibility || fog || precip || snow;
        if (!hasAnyData) {
            showToast('Введите хотя бы один метеопараметр', 'error');
            return;
        }

        const observation = {
            type: 'flight',
            coords: { lat, lon },
            lat,
            lon,
            time: time || new Date().toISOString(),
            timestamp: time ? new Date(time).getTime() : Date.now(),
            windSpeed: windSpeed ? parseFloat(windSpeed) : null,
            windDir: windDir ? parseFloat(windDir) : null,
            temp: temp ? parseFloat(temp) : null,
            humidity: humidity ? parseFloat(humidity) : null,
            visibility: visibility ? parseFloat(visibility) : null,
            cloudBase: cloudBase ? parseFloat(cloudBase) : null,
            fog: fog || false,
            precip: precip || false,
            snow: snow || false
        };

        if (typeof PilotObservationsModule !== 'undefined') {
            PilotObservationsModule.add(observation);
            showToast('✅ Наблюдение добавлено', 'success');
            
            // Перерисовка вкладки
            const body = document.getElementById('dashboardBody');
            if (body) {
                body.innerHTML = DashboardTabsFlight.render();
                DashboardTabsFlight.afterRender();
            }
            
            // Применение коррекции если есть данные
            this.applyCorrectionIfReady();
        }
    },

    /**
     * Получить текущее местоположение
     */
    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const latInput = document.getElementById('flightLat');
                    const lonInput = document.getElementById('flightLon');
                    if (latInput && lonInput) {
                        latInput.value = position.coords.latitude.toFixed(4);
                        lonInput.value = position.coords.longitude.toFixed(4);
                    }
                },
                (error) => {
                    showToast('Ошибка получения местоположения: ' + error.message, 'error');
                }
            );
        } else {
            showToast('Геолокация не поддерживается браузером', 'error');
        }
    },

    /**
     * Очистить все наблюдения
     */
    clearAll() {
        if (confirm('Удалить все наблюдения в полёте?')) {
            // Удаляем только flight наблюдения
            if (typeof PilotObservationsModule !== 'undefined') {
                const all = PilotObservationsModule.getAll();
                const filtered = all.filter(obs => obs.type !== 'flight');
                PilotObservationsModule.stepData.pilotObservations = filtered;
                PilotObservationsModule.save();
                showToast('🗑️ Наблюдения в полёте удалены', 'success');
                
                // Перерисовка вкладки
                const body = document.getElementById('dashboardBody');
                if (body) {
                    body.innerHTML = DashboardTabsFlight.render();
                    DashboardTabsFlight.afterRender();
                }
            }
        }
    },

    /**
     * Применить коррекцию если готовы данные
     */
    applyCorrectionIfReady() {
        const observations = typeof PilotObservationsModule !== 'undefined'
            ? PilotObservationsModule.getAll()
            : [];

        if (observations.length === 0) return;

        const analyzedData = WizardModule.stepData.segmentAnalysis?.[0]?.analyzed;
        if (!analyzedData) return;

        if (typeof PilotObservationsModule !== 'undefined' && typeof PilotObservationsModule.applyCorrection === 'function') {
            const corrected = PilotObservationsModule.applyCorrection(analyzedData);
            WizardModule.stepData.correctedAnalysis = corrected;
            console.log('✅ Коррекция применена');
        }
    },

    afterRender() {
        // Установка текущего времени по умолчанию
        const timeInput = document.getElementById('flightTime');
        if (timeInput) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            timeInput.value = now.toISOString().slice(0, 16);
        }
        
        setTimeout(() => {
            this.initDeviationChart();
        }, 100);
    },

    initDeviationChart() {
        if (typeof Plotly === 'undefined') return;

        const observations = typeof PilotObservationsModule !== 'undefined'
            ? PilotObservationsModule.getFlightObservations()
            : [];

        if (observations.length === 0) return;

        const times = observations.map(o => this.formatTime(o.timestamp));
        const tempDeviation = observations.map(o => (o.temp || 0) - 20);
        const windDeviation = observations.map(o => (o.windSpeed || 0) - 5);

        const trace1 = {
            x: times,
            y: tempDeviation,
            name: 'Δ Темп.',
            line: { color: '#ef4444' },
            type: 'scatter'
        };

        const trace2 = {
            x: times,
            y: windDeviation,
            name: 'Δ Ветер',
            line: { color: '#3b82f6' },
            type: 'scatter'
        };

        const layout = {
            margin: { t: 20, b: 40, l: 50, r: 20 },
            height: 280,
            xaxis: { title: 'Время' },
            yaxis: { title: 'Отклонение' },
            showlegend: true
        };

        const chartId = 'dashboardFlightDeviationChart';
        const el = document.getElementById(chartId);
        if (el) {
            Plotly.newPlot(chartId, [trace1, trace2], layout, { responsive: true, displayModeBar: false });
        }
    },

    /**
     * Получить прогнозные данные для сравнения
     */
    getForecastComparison(observation) {
        let forecast = {};

        // Источник 1: WizardModule.stepData.segmentAnalysis[0].analyzed
        if (typeof WizardModule !== 'undefined' &&
            WizardModule.stepData?.segmentAnalysis?.[0]?.analyzed?.hourly?.[0]) {
            const hourly = WizardModule.stepData.segmentAnalysis[0].analyzed.hourly[0];
            forecast = {
                wind10m: hourly.wind10m,
                temp: hourly.temp2m,
                humidity: hourly.humidity,
                visibility: hourly.visibility
            };
        }

        // Источник 2: WeatherModule.cachedData
        if (Object.keys(forecast).length === 0 && typeof WeatherModule !== 'undefined') {
            const weatherData = WeatherModule.cachedData || {};
            if (weatherData.analyzed && weatherData.analyzed.hourly?.[0]) {
                const hourly = weatherData.analyzed.hourly[0];
                forecast = {
                    wind10m: hourly.wind10m,
                    temp: hourly.temp2m,
                    humidity: hourly.humidity,
                    visibility: hourly.visibility
                };
            }
        }

        return {
            windSpeed: { forecast: forecast.wind10m ?? '—', fact: observation.windSpeed ?? '—' },
            temp: { forecast: forecast.temp ?? '—', fact: observation.temp ?? '—' },
            humidity: { forecast: forecast.humidity ?? '—', fact: observation.humidity ?? '—' },
            visibility: { forecast: forecast.visibility ?? '—', fact: observation.visibility ?? '—' }
        };
    },

    /**
     * Отрисовка таблицы сравнения
     */
    renderComparisonTable(comparison) {
        const rows = Object.entries(comparison).map(([key, data]) => {
            const forecastVal = data.forecast === '—' ? 0 : data.forecast;
            const factVal = data.fact === '—' ? 0 : data.fact;

            const delta = factVal - forecastVal;
            const deltaPercent = forecastVal > 0 ? ((delta / forecastVal) * 100).toFixed(1) : (data.fact === '—' ? '—' : '0');
            const status = deltaPercent === '—' ? '' : (Math.abs(deltaPercent) < 10 ? '✅' : deltaPercent > 0 ? '⚠️ +' : '⚠️ ');

            return `
                <tr>
                    <td>${this.getParamName(key)}</td>
                    <td>${data.forecast}</td>
                    <td>${data.fact}</td>
                    <td>${status}${delta > 0 ? '+' : ''}${deltaPercent}${deltaPercent !== '—' ? '%' : ''}</td>
                </tr>
            `;
        }).join('');

        return `
            <table class="dashboard-table">
                <thead>
                    <tr>
                        <th>Параметр</th>
                        <th>Прогноз</th>
                        <th>Факт</th>
                        <th>Отклонение</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    },

    getParamName(key) {
        const names = {
            windSpeed: 'Ветер, м/с',
            temp: 'Температура, °C',
            humidity: 'Влажность, %',
            visibility: 'Видимость, км'
        };
        return names[key] || key;
    }
};
