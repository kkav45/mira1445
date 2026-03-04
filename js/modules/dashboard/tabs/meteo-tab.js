/**
 * Вкладка дашборда: МЕТЕОПРОГНОЗ 🌤️ (ОБНОВЛЁННАЯ v0.6.0 — с поддержкой маршрутов)
 * Отображение метеоданных, графиков и рекомендаций для каждого маршрута
 */

const DashboardTabsMeteo = {
    /**
     * Активный маршрут (для выбора маршрута)
     */
    activeRoute: 'all',  // 'all' или ID маршрута

    /**
     * Рендер контента вкладки
     */
    render() {
        // Проверяем наличие данных из разных источников
        const hasCachedData = typeof WeatherModule !== 'undefined' &&
                              WeatherModule.cachedData &&
                              Object.keys(WeatherModule.cachedData).length > 0;

        const hasSegmentAnalysis = typeof RouteModule !== 'undefined' &&
                                   RouteModule.segmentAnalysis &&
                                   RouteModule.segmentAnalysis.length > 0;

        const hasData = hasCachedData || hasSegmentAnalysis;

        if (!hasData) {
            return this.renderPlaceholder();
        }

        return this.renderContent();
    },

    /**
     * Заглушка при отсутствии данных
     */
    renderPlaceholder() {
        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-cloud-sun" style="color: #667eea;"></i>
                    Метеопрогноз
                </div>
                <div style="padding: 40px; text-align: center; color: #718096;">
                    <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px;">Выполните анализ маршрута для получения метеоданных</p>
                </div>
            </div>
        `;
    },

    /**
     * Основной контент с данными (ОБНОВЛЁННЫЙ v0.6.0)
     */
    renderContent() {
        // Получаем все маршруты из RouteModule
        const routes = typeof RouteModule !== 'undefined' && RouteModule.savedRoutes
            ? RouteModule.savedRoutes
            : [];

        // Получаем данные анализа для активного маршрута
        let segmentAnalysis = [];
        let segments = [];
        
        if (this.activeRoute !== 'all' && RouteModule.routeAnalysisData?.[this.activeRoute]) {
            // Используем сохранённые данные для конкретного маршрута
            const routeData = RouteModule.routeAnalysisData[this.activeRoute];
            segmentAnalysis = routeData.segmentAnalysis || [];
            segments = routeData.segments || [];
        } else {
            // Используем текущие данные (для последнего проанализированного маршрута)
            segmentAnalysis = typeof RouteModule !== 'undefined' && RouteModule.segmentAnalysis
                ? RouteModule.segmentAnalysis
                : [];
            segments = typeof RouteModule !== 'undefined' && RouteModule.segments
                ? RouteModule.segments
                : [];
        }

        const weatherData = typeof WeatherModule !== 'undefined'
            ? WeatherModule.cachedData || WeatherModule.data
            : {};

        // Используем первый сегмент для общих данных
        const firstSegment = segmentAnalysis.length > 0 ? segmentAnalysis[0] : null;
        const analyzed = firstSegment?.analyzed || weatherData.analyzed || {};
        const summary = firstSegment?.analyzed?.summary || weatherData.summary || {};
        const solar = summary.solar || analyzed.solar || null;

        // Получаем hourly из разных источников
        let hourly = [];
        if (analyzed.hourly && Array.isArray(analyzed.hourly)) {
            hourly = analyzed.hourly;
        } else if (weatherData.hourly && Array.isArray(weatherData.hourly)) {
            hourly = weatherData.hourly;
        } else if (analyzed.timeseries && Array.isArray(analyzed.timeseries)) {
            hourly = analyzed.timeseries;
        }

        // Получаем рекомендации и окна из summary
        const recommendations = summary.recommendations || analyzed.recommendations || [];
        const flightWindows = summary.flightWindows || analyzed.flightWindows || [];

        // Генерируем вкладки для каждого маршрута
        const routeTabs = routes.length > 0 ? `
            <div class="dashboard-subtabs" style="margin: 20px 0; display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                <button class="dashboard-subtab ${this.activeRoute === 'all' ? 'active' : ''}"
                        onclick="DashboardTabsMeteo.setActiveRoute('all')">
                    📊 Все маршруты
                </button>
                ${routes.map((route) => {
                    const hasAnalysis = RouteModule.routeAnalysisData?.[route.id] ? '✅' : '⏳';
                    return `
                        <button class="dashboard-subtab ${this.activeRoute === route.id ? 'active' : ''}"
                                onclick="DashboardTabsMeteo.setActiveRoute('${route.id}')">
                            ${hasAnalysis} ${route.name}
                        </button>
                    `;
                }).join('')}
            </div>
        ` : '';

        return `
            ${routeTabs}

            <!-- Солнечные условия -->
            ${solar ? this.renderSolarInfo(solar) : ''}

            <!-- Рекомендации -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-clipboard-list" style="color: #667eea;"></i>
                    Рекомендации
                </div>
                <div id="dashboardMeteoRecommendations">
                    ${this.renderRecommendations(recommendations)}
                </div>
            </div>

            <!-- Графики -->
            <div class="dashboard-charts-grid">
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-chart-line"></i>
                        Временной ряд метеопараметров
                    </div>
                    <div id="dashboardTimeSeriesChart" style="height: 300px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-compass"></i>
                        Роза ветров
                    </div>
                    <div id="dashboardWindRoseChart" style="height: 300px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-cloud"></i>
                        Нижняя граница облачности
                    </div>
                    <div id="dashboardCloudCeilingChart" style="height: 300px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-arrow-up"></i>
                        Вертикальный профиль ветра
                    </div>
                    <div id="dashboardWindProfileChart" style="height: 300px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-wave-square"></i>
                        Индекс турбулентности
                    </div>
                    <div id="dashboardTurbulenceChart" style="height: 300px;"></div>
                </div>
            </div>

            <!-- Полётные окна -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-clock" style="color: #38a169;"></i>
                    Благоприятные окна для полёта (24ч)
                </div>
                <div id="dashboardFlightWindows">
                    ${this.renderFlightWindows(flightWindows)}
                </div>
            </div>

            <!-- Таблица почасовых данных -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-table"></i>
                    Почасовые данные
                </div>
                <div style="overflow-x: auto;">
                    ${this.renderHourlyTable(hourly)}
                </div>
            </div>
        `;
    },

    /**
     * Установка активного маршрута
     */
    setActiveRoute(routeId) {
        this.activeRoute = routeId;
        const container = document.getElementById('dashboardBody');
        if (container) {
            container.innerHTML = this.render();
            this.afterRender();
        }
    },

    /**
     * Рендер рекомендаций
     */
    renderRecommendations(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return `
                <div class="dashboard-recommendation info">
                    <i class="fas fa-info-circle dashboard-rec-icon"></i>
                    <span class="dashboard-rec-text">Нет рекомендаций. Условия благоприятные.</span>
                </div>
            `;
        }

        return recommendations.map(rec => {
            const typeClass = rec.type || 'info';
            const icon = rec.icon || this.getRecommendationIcon(rec.type);
            return `
                <div class="dashboard-recommendation ${typeClass}">
                    <i class="fas ${icon} dashboard-rec-icon"></i>
                    <span class="dashboard-rec-text">${rec.text || rec.message || ''}</span>
                </div>
            `;
        }).join('');
    },

    /**
     * Иконка для рекомендации
     */
    getRecommendationIcon(type) {
        const icons = {
            critical: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            success: 'fa-check-circle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    },

    /**
     * Рендер солнечной информации
     */
    renderSolarInfo(solar) {
        const sunriseTime = solar.sunrise || '—';
        const sunsetTime = solar.sunset || '—';
        const workStart = solar.workStartTime || '—';
        const workEnd = solar.workEndTime || '—';
        const dayLength = solar.dayLengthText || '—';

        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-sun" style="color: #f59e0b;"></i>
                    Солнечные условия
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                    <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%); padding: 15px; border-radius: 10px; text-align: center; border: 1px solid rgba(245, 158, 11, 0.2);">
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase; margin-bottom: 6px;">🌅 Рассвет</div>
                        <div style="font-size: 20px; font-weight: 700; color: #2d3748;">${sunriseTime}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, rgba(56, 161, 105, 0.1) 0%, rgba(56, 161, 105, 0.05) 100%); padding: 15px; border-radius: 10px; text-align: center; border: 1px solid rgba(56, 161, 105, 0.2);">
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase; margin-bottom: 6px;">⏰ Рабочее время</div>
                        <div style="font-size: 16px; font-weight: 700; color: #2d3748;">${workStart} – ${workEnd}</div>
                        <div style="font-size: 10px; color: #718096; margin-top: 4px;">${dayLength}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, rgba(237, 137, 54, 0.1) 0%, rgba(237, 137, 54, 0.05) 100%); padding: 15px; border-radius: 10px; text-align: center; border: 1px solid rgba(237, 137, 54, 0.2);">
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase; margin-bottom: 6px;">🌇 Закат</div>
                        <div style="font-size: 20px; font-weight: 700; color: #2d3748;">${sunsetTime}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%); padding: 15px; border-radius: 10px; text-align: center; border: 1px solid rgba(59, 130, 246, 0.2);">
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase; margin-bottom: 6px;">☀️ УФ-индекс</div>
                        <div style="font-size: 20px; font-weight: 700; color: #2d3748;">${solar.uvIndex || '—'}</div>
                        <div style="font-size: 10px; color: #718096; margin-top: 4px;">${solar.uvRisk === 'low' ? 'Низкий' : solar.uvRisk === 'medium' ? 'Средний' : 'Высокий'}</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Рендер полётных окон
     */
    renderFlightWindows(windows) {
        if (!windows || windows.length === 0) {
            return `
                <p style="color: #718096; font-size: 14px;">
                    <i class="fas fa-info-circle"></i>
                    Благоприятные окна не найдены
                </p>
            `;
        }

        return windows.map(w => {
            const riskClass = w.risk === 'low' ? 'allowed' : w.risk === 'medium' ? 'allowed' : 'forbidden';
            const riskLabel = w.risk === 'low' ? '🟢 Низкий' : w.risk === 'medium' ? '🟡 Средний' : '🔴 Высокий';

            return `
                <div class="dashboard-flight-window ${riskClass}">
                    <div class="dashboard-flight-window-time">${w.start || '--:--'}–${w.end || '--:--'}</div>
                    <div class="dashboard-flight-window-duration">${w.duration || 0} ч</div>
                    <div class="dashboard-flight-window-metrics">
                        <div class="dashboard-flight-window-metric">
                            <div class="dashboard-flight-window-metric-value">${w.wind || 0} м/с</div>
                            <div class="dashboard-flight-window-metric-label">Ветер</div>
                        </div>
                        <div class="dashboard-flight-window-metric">
                            <div class="dashboard-flight-window-metric-value">${w.temp > 0 ? '+' : ''}${w.temp || 0}°C</div>
                            <div class="dashboard-flight-window-metric-label">Темп.</div>
                        </div>
                        <div class="dashboard-flight-window-metric">
                            <div class="dashboard-flight-window-metric-value">${riskLabel}</div>
                            <div class="dashboard-flight-window-metric-label">Риск</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Рендер таблицы почасовых данных
     */
    renderHourlyTable(hourly) {
        if (!hourly || hourly.length === 0) {
            return '<p style="color: #718096;">Нет данных</p>';
        }

        const rows = hourly.slice(0, 24).map(h => {
            const riskClass = h.risk === 'low' ? 'low' : h.risk === 'medium' ? 'medium' : 'high';
            const riskLabel = h.risk === 'low' ? '🟢 Низкий' : h.risk === 'medium' ? '🟡 Средний' : '🔴 Высокий';
            const temp = h.temp2m || h.temp || 0;
            const wind = h.wind10m || h.wind || 0;
            const windDir = h.windDir || h.wind_direction_10m || 0;
            const precip = h.precip || h.precipitation || 0;
            const humidity = h.humidity || h.relative_humidity_2m || 0;
            const pressure = h.pressure || 0;

            return `
                <tr>
                    <td>${h.time || '--:--'}</td>
                    <td><span class="dashboard-status-badge ${riskClass}">${riskLabel}</span></td>
                    <td>${temp > 0 ? '+' : ''}${temp}°C</td>
                    <td>${wind} м/с</td>
                    <td>${windDir}°</td>
                    <td>${precip} мм/ч</td>
                    <td>${h.visibility || '>5'} км</td>
                    <td>${humidity}%</td>
                    <td>${pressure} мм рт. ст.</td>
                </tr>
            `;
        }).join('');

        return `
            <table class="dashboard-table">
                <thead>
                    <tr>
                        <th>Время</th>
                        <th>Статус</th>
                        <th>Темп.</th>
                        <th>Ветер</th>
                        <th>Напр.</th>
                        <th>Осадки</th>
                        <th>Видимость</th>
                        <th>Влажность</th>
                        <th>Давление</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    },

    /**
     * Построение графиков после рендера
     */
    afterRender() {
        const segmentAnalysis = typeof RouteModule !== 'undefined' && RouteModule.segmentAnalysis
            ? RouteModule.segmentAnalysis
            : [];

        const weatherData = typeof WeatherModule !== 'undefined'
            ? WeatherModule.cachedData || WeatherModule.data
            : {};

        const firstSegment = segmentAnalysis.length > 0 ? segmentAnalysis[0] : null;
        const analyzed = firstSegment?.analyzed || weatherData;

        if (!analyzed) {
            console.warn('⚠️ No analyzed data found');
            return;
        }

        setTimeout(() => {
            this.initCharts(analyzed);
        }, 100);
    },

    /**
     * Инициализация графиков Plotly
     */
    initCharts(data) {
        if (typeof Plotly === 'undefined') {
            console.warn('⚠️ Plotly не загружен');
            return;
        }

        const hourly = this.extractHourlyData(data);
        const times = hourly.map(h => h.time);

        this.initTimeSeriesChart(times, hourly);
        this.initWindRoseChart(hourly);
        this.initCloudCeilingChart(hourly);
        this.initWindProfileChart(data);
        this.initTurbulenceChart(times, hourly);
    },

    /**
     * Извлечение почасовых данных
     */
    extractHourlyData(data) {
        if (data.hourly && Array.isArray(data.hourly)) return data.hourly;
        if (data.analyzed && data.analyzed.hourly) return data.analyzed.hourly;

        if (data.timeseries && Array.isArray(data.timeseries)) {
            return data.timeseries.map((t, i) => ({
                time: t.time ? t.time.split('T')[1] : `${i}:00`,
                temp: t.temperature_2m || 0,
                wind: t.wind_speed_10m || 0,
                windDir: t.wind_direction_10m || 0,
                precip: t.precipitation || 0,
                humidity: t.relative_humidity_2m || 0,
                visibility: t.visibility || 5,
                risk: t.risk || 'low'
            }));
        }

        return [];
    },

    /**
     * Временной ряд
     */
    initTimeSeriesChart(times, hourly) {
        const trace1 = {
            x: times,
            y: hourly.map(h => h.temp2m || h.temp || 0),
            name: 'Температура, °C',
            line: { color: '#ef4444' },
            type: 'scatter'
        };

        const trace2 = {
            x: times,
            y: hourly.map(h => h.wind10m || h.wind || 0),
            name: 'Ветер, м/с',
            line: { color: '#3b82f6' },
            type: 'scatter',
            yaxis: 'y2'
        };

        const layout = {
            margin: { t: 20, b: 40, l: 50, r: 50 },
            height: 280,
            xaxis: { title: 'Время' },
            yaxis: { title: 'Температура, °C' },
            yaxis2: {
                title: 'Ветер, м/с',
                overlaying: 'y',
                side: 'right'
            },
            showlegend: true,
            legend: { x: 0, y: 1 }
        };

        Plotly.newPlot('dashboardTimeSeriesChart', [trace1, trace2], layout, { responsive: true, displayModeBar: false });
    },

    /**
     * Роза ветров
     */
    initWindRoseChart(hourly) {
        const directions = { 'С': 0, 'СВ': 0, 'В': 0, 'ЮВ': 0, 'Ю': 0, 'ЮЗ': 0, 'З': 0, 'СЗ': 0 };
        const counts = { 'С': 0, 'СВ': 0, 'В': 0, 'ЮВ': 0, 'Ю': 0, 'ЮЗ': 0, 'З': 0, 'СЗ': 0 };

        hourly.forEach(h => {
            const dir = h.windDir || h.wind_direction_10m || 0;
            const speed = h.wind10m || h.wind || 0;
            let sector = 'С';
            if (dir >= 337.5 || dir < 22.5) sector = 'С';
            else if (dir >= 22.5 && dir < 67.5) sector = 'СВ';
            else if (dir >= 67.5 && dir < 112.5) sector = 'В';
            else if (dir >= 112.5 && dir < 157.5) sector = 'ЮВ';
            else if (dir >= 157.5 && dir < 202.5) sector = 'Ю';
            else if (dir >= 202.5 && dir < 247.5) sector = 'ЮЗ';
            else if (dir >= 247.5 && dir < 292.5) sector = 'З';
            else if (dir >= 292.5 && dir < 337.5) sector = 'СЗ';

            directions[sector] += speed;
            counts[sector]++;
        });

        const avgSpeeds = Object.keys(directions).map(k => counts[k] > 0 ? directions[k] / counts[k] : 0);

        const trace = {
            type: 'barpolar',
            r: avgSpeeds,
            theta: [0, 45, 90, 135, 180, 225, 270, 315],
            marker: {
                color: '#3b82f6',
                line: { color: '#fff', width: 2 }
            }
        };

        const layout = {
            polar: {
                radialaxis: { visible: true },
                angularaxis: { direction: 'clockwise' }
            },
            margin: { t: 20, b: 20, l: 20, r: 20 },
            height: 280
        };

        Plotly.newPlot('dashboardWindRoseChart', [trace], layout, { responsive: true, displayModeBar: false });
    },

    /**
     * Нижняя граница облачности (горизонтальный график - постоянная высота)
     */
    initCloudCeilingChart(hourly) {
        const times = hourly.map((h, i) => {
            const time = h.time || `${i}:00`;
            return time.length > 5 ? time.substring(0, 5) : time;
        });

        // Расчёт единой нижней границы облачности для всего периода
        let cloudCeiling = null;
        for (const h of hourly) {
            // Правильные названия полей из weather.js
            const totalCloud = h.cloudCover || h.cloud_cover || 0;
            const lowCloud = h.cloudCoverLow || h.cloud_cover_low || 0;
            
            if (lowCloud > 50) {
                cloudCeiling = 400; // Низкие облака
                break;
            }
            if (totalCloud > 50) {
                cloudCeiling = 1500; // Средняя облачность
                break;
            }
        }

        // Если облачности нет или нет данных
        if (cloudCeiling === null) {
            cloudCeiling = 3500; // Ясно
        }

        console.log('☁️ Нижняя граница облачности:', cloudCeiling, 'м');

        // Горизонтальная линия
        const trace = {
            x: times,
            y: times.map(() => cloudCeiling),
            type: 'scatter',
            mode: 'lines',
            line: {
                color: cloudCeiling < 500 ? '#ef4444' : (cloudCeiling < 1000 ? '#f59e0b' : '#38a169'),
                width: 4
            },
            name: 'Нижняя граница: ' + cloudCeiling + ' м',
            hovertemplate: '%{x}<br>Высота: ' + cloudCeiling + ' м<extra></extra>'
        };

        // Красная линия минимума 250м
        const minCeilingLine = {
            x: times,
            y: times.map(() => 250),
            mode: 'lines',
            line: { color: '#ef4444', width: 2, dash: 'dot' },
            name: 'Мин. 250 м',
            hoverinfo: 'none'
        };

        // Оранжевая линия 500м
        const cautionCeilingLine = {
            x: times,
            y: times.map(() => 500),
            mode: 'lines',
            line: { color: '#f59e0b', width: 2, dash: 'dot' },
            name: 'Ожидание 500 м',
            hoverinfo: 'none'
        };

        const layout = {
            margin: { t: 10, b: 50, l: 60, r: 20 },
            height: 280,
            xaxis: {
                title: 'Время',
                tickangle: -45,
                tickfont: { size: 10 }
            },
            yaxis: {
                title: 'Высота, м',
                range: [0, 3500]
            },
            showlegend: true,
            legend: {
                orientation: 'h',
                y: 1.15,
                font: { size: 10 }
            },
            plot_bgcolor: 'rgba(0,0,0,0.02)',
            paper_bgcolor: 'rgba(0,0,0,0)'
        };

        Plotly.newPlot('dashboardCloudCeilingChart', [trace, minCeilingLine, cautionCeilingLine], layout, { responsive: true, displayModeBar: false });
    },

    /**
     * Вертикальный профиль ветра
     */
    initWindProfileChart(data) {
        const heights = [100, 200, 300, 400, 500];
        const windSpeeds = heights.map(h => {
            const key = `wind${h}m`;
            return (data.analyzed && data.analyzed[key]) || (data.current && data.current[key]) || 0;
        });

        if (windSpeeds.every(w => w === 0)) {
            for (let i = 0; i < heights.length; i++) {
                windSpeeds[i] = 5 + i * 2;
            }
        }

        const trace = {
            x: windSpeeds,
            y: heights,
            mode: 'lines+markers',
            line: { color: '#3b82f6', width: 3 },
            marker: { size: 8 }
        };

        const layout = {
            margin: { t: 20, b: 40, l: 50, r: 20 },
            height: 280,
            xaxis: { title: 'Ветер, м/с' },
            yaxis: { title: 'Высота, м', autorange: 'reversed' }
        };

        Plotly.newPlot('dashboardWindProfileChart', [trace], layout, { responsive: true, displayModeBar: false });
    },

    /**
     * Турбулентность
     */
    initTurbulenceChart(times, hourly) {
        const turbulence = hourly.map(h => {
            const wind = h.wind10m || h.wind || 0;
            return Math.min(100, wind * 10);
        });

        const trace = {
            x: times,
            y: turbulence,
            mode: 'lines+markers',
            line: { color: '#f59e0b', width: 3 },
            fill: 'tozeroy'
        };

        const layout = {
            margin: { t: 20, b: 40, l: 50, r: 20 },
            height: 280,
            xaxis: { title: 'Время' },
            yaxis: { title: 'Индекс' }
        };

        Plotly.newPlot('dashboardTurbulenceChart', [trace], layout, { responsive: true, displayModeBar: false });
    }
};
