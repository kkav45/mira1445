/**
 * Вкладка дашборда: ЭНЕРГОЭФФЕКТИВНОСТЬ 🔋 (ОБНОВЛЁННАЯ v0.6.0 — с поддержкой маршрутов)
 * Расчёт энергопотребления и баланса для каждого маршрута
 */

const DashboardTabsEnergy = {
    /**
     * Активный маршрут (для выбора маршрута)
     */
    activeRoute: 'all',  // 'all' или ID маршрута

    render() {
        // Получаем маршруты из RouteModule
        const routes = typeof RouteModule !== 'undefined' && RouteModule.savedRoutes
            ? RouteModule.savedRoutes
            : [];

        // Получаем данные для активного маршрута
        let segments = [];
        let segmentAnalysis = [];
        
        if (this.activeRoute !== 'all' && RouteModule.routeAnalysisData?.[this.activeRoute]) {
            // Используем сохранённые данные для конкретного маршрута
            const routeData = RouteModule.routeAnalysisData[this.activeRoute];
            segments = routeData.segments || [];
            segmentAnalysis = routeData.segmentAnalysis || [];
        } else {
            // Используем текущие данные (для последнего проанализированного маршрута)
            segments = typeof RouteModule !== 'undefined' && RouteModule.segments
                ? RouteModule.segments
                : [];
            segmentAnalysis = typeof RouteModule !== 'undefined' && RouteModule.segmentAnalysis
                ? RouteModule.segmentAnalysis
                : [];
        }

        // Проверяем наличие данных для расчёта энергии
        const hasRoute = segments.length > 0;
        const hasSegmentAnalysis = segmentAnalysis.length > 0;

        if (!hasRoute || !hasSegmentAnalysis) {
            return this.renderPlaceholder();
        }

        // Расчёт энергии
        const energyData = this.calculateEnergy(segments, segmentAnalysis);

        return this.renderContent(energyData, routes);
    },

    renderPlaceholder() {
        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-battery-three-quarters" style="color: #ed8936;"></i>
                    Энергоэффективность
                </div>
                <div style="padding: 40px; text-align: center; color: #718096;">
                    <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px;">Выполните анализ маршрута для расчёта энергии</p>
                </div>
            </div>
        `;
    },

    /**
     * Расчёт энергопотребления
     */
    calculateEnergy(segments, segmentAnalysis) {
        // Проверка данных
        if (!segments || segments.length === 0) {
            console.warn('⚠️ calculateEnergy: нет сегментов');
            return {
                totalDistance: 0,
                totalEnergy: 0,
                availableEnergy: 0,
                reserve: 0,
                maxDistance: 220,
                maxTime: 220,
                remainingDistance: 220,
                remainingTime: 220,
                segmentEnergies: []
            };
        }

        // Профиль БВС (обновлённый)
        const profile = {
            batteryCapacity: 39000,    // мА·ч (39 А·ч)
            batteryVoltage: 25.4,      // В (полный заряд 6S)
            cutoffVoltage: 16.8,       // В (остановка двигателя)
            reserveVoltage: 18.6,      // В (минимальный рабочий запас)
            cruiseSpeed: 69,           // км/ч
            basePower: 120,            // Вт
            dragCoefficient: 0.185,
            weight: 8500,              // г
            minReserve: 0.25,          // 25%
            maxDistance: 220,          // км (ограничение безопасности)
            maxTime: 220               // мин (ограничение безопасности)
        };

        // Расчёт доступной энергии
        // 18.6В — минимальный рабочий запас (уже включает резерв)
        // 16.8В — отсечка двигателя (физический предел, дальше не разрядится)
        const avgVoltage = (profile.batteryVoltage + profile.reserveVoltage) / 2; // 22.0 В
        const totalEnergyWh = avgVoltage * profile.batteryCapacity / 1000; // 858 Вт·ч
        const usableEnergy = totalEnergyWh; // 858 Вт·ч (100% доступной энергии между 25.4В и 18.6В)
        const reserveEnergy = 0; // Резерв уже учтён в 18.6В

        // Расчёт по сегментам
        // Учитываем ветер туда и обратно (разная путевая скорость)
        let totalAxisDistance = 0;
        let totalEnergy = 0;
        let totalTime = 0;
        let toEnergy = 0;
        let returnEnergy = 0;
        const segmentEnergies = [];

        segments.forEach((segment, i) => {
            const analysis = segmentAnalysis ? segmentAnalysis[i] : null;
            const hourly = analysis?.analyzed?.hourly || [];
            const firstHour = hourly[0] || {};

            const wind10m = firstHour.wind10m || firstHour.wind || 0;
            const windDir = firstHour.windDir || firstHour.wind_direction_10m || 0;
            
            // 📊 Логирование ветра для отладки
            if (i === 0) {
                console.log('🌬️ Ветер (сегмент 0):', {
                    wind10m: wind10m,
                    windDir: windDir,
                    routeAngle: this.getRouteAngle(segment)
                });
            }

            // Угол между ветром и маршрутом
            const routeAngle = this.getRouteAngle(segment);
            const windAngle = windDir - routeAngle;
            
            // ТУДА: встречный/попутный ветер
            const headwindTo = -wind10m * Math.cos(windAngle * Math.PI / 180);
            const groundSpeedTo = profile.cruiseSpeed + headwindTo * 3.6;
            
            // ОБРАТНО: ветер меняет направление на 180°
            const windAngleReturn = windDir - (routeAngle + 180);
            const headwindReturn = -wind10m * Math.cos(windAngleReturn * Math.PI / 180);
            const groundSpeedReturn = profile.cruiseSpeed + headwindReturn * 3.6;

            // Дистанция оси
            const axisDistance = segment.distance || 5;
            
            // Время туда и обратно (×2.5 для полной дистанции)
            const timeToHours = axisDistance / Math.max(30, groundSpeedTo);
            const timeReturnHours = axisDistance / Math.max(30, groundSpeedReturn);
            const timeHours = (timeToHours + timeReturnHours) * 1.25; // +25% манёвры
            const timeMinutes = timeHours * 60;

            // Мощность (упрощённо, среднее между туда и обратно)
            const powerTo = profile.basePower + 0.5 * Math.pow(Math.max(0, headwindTo * 3.6), 2);
            const powerReturn = profile.basePower + 0.5 * Math.pow(Math.max(0, headwindReturn * 3.6), 2);
            const avgPower = (powerTo + powerReturn) / 2;

            // Энергия на сегменте
            const energy = avgPower * timeHours;

            totalAxisDistance += axisDistance;
            totalEnergy += energy;
            totalTime += timeMinutes;

            if (i < segments.length / 2) {
                toEnergy += energy;
            } else {
                returnEnergy += energy;
            }

            segmentEnergies.push({
                segment: i + 1,
                axisDistance: axisDistance,
                totalDistance: axisDistance * 2.5,
                wind: wind10m,
                headwindTo: headwindTo,
                headwindReturn: headwindReturn,
                groundSpeedTo: groundSpeedTo,
                groundSpeedReturn: groundSpeedReturn,
                power: avgPower,
                energy: energy,
                time: timeMinutes
            });
        });

        // Расчёт оставшегося расстояния и времени
        const energyPerKm = totalAxisDistance > 0 ? totalEnergy / (totalAxisDistance * 2.5) : 3.0; // Вт·ч/км
        const energyPerMin = totalTime > 0 ? totalEnergy / totalTime : 2.5; // Вт·ч/мин

        // Оставшаяся энергия
        const remainingEnergy = usableEnergy - totalEnergy;

        // Максимальное расстояние и время (ограничения безопасности)
        const maxDistanceKm = profile.maxDistance;  // 220 км
        const maxTimeMin = profile.maxTime;         // 220 мин

        // Оставшееся расстояние и время (с учётом ограничений и энергии)
        const remainingDistance = Math.max(0, Math.min(
            maxDistanceKm - totalAxisDistance * 2.5,
            remainingEnergy > 0 ? remainingEnergy / energyPerKm : 0
        ));
        const remainingTime = Math.max(0, Math.min(
            maxTimeMin - totalTime,
            remainingEnergy > 0 ? remainingEnergy / energyPerMin : 0
        ));

        return {
            totalDistance: Math.round(totalAxisDistance * 2.5 * 10) / 10,
            totalEnergy: Math.round(totalEnergy),
            totalTime: Math.round(totalTime),
            toEnergy: Math.round(toEnergy),
            returnEnergy: Math.round(returnEnergy),
            availableEnergy: Math.round(usableEnergy),
            reserve: 0,  // Резерв уже учтён в 18.6В
            reservePercent: 0,  // Резерв уже учтён в 18.6В
            maxDistance: maxDistanceKm,
            maxTime: maxTimeMin,
            remainingDistance: Math.round(remainingDistance * 10) / 10,
            remainingTime: Math.round(remainingTime),
            energyPerKm: Math.round(energyPerKm * 10) / 10,
            profile: profile,
            segmentEnergies: segmentEnergies,
            // Флаг: хватает ли энергии
            energySufficient: totalEnergy <= usableEnergy
        };
    },

    getRouteAngle(segment) {
        // Упрощённо: предполагаем маршрут с запада на восток (90°)
        return 90;
    },

    renderContent(data, routes = []) {
        // Определяем статус по доступной энергии (резерв уже учтён)
        const statusClass = data.energySufficient ? 'allowed' : 'forbidden';
        const statusText = data.energySufficient ? 'ПОЛЁТ РАЗРЕШЁН' : 'ЭНЕРГИИ НЕДОСТАТОЧНО';
        const statusIcon = data.energySufficient ? 'fa-check-circle' : 'fa-exclamation-triangle';

        // Генерируем вкладки для каждого маршрута
        const routeTabs = routes.length > 0 ? `
            <div class="dashboard-subtabs" style="margin: 20px 0; display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                <button class="dashboard-subtab ${this.activeRoute === 'all' ? 'active' : ''}"
                        onclick="DashboardTabsEnergy.setActiveRoute('all')">
                    📊 Все маршруты
                </button>
                ${routes.map((route) => {
                    const hasAnalysis = RouteModule.routeAnalysisData?.[route.id] ? '✅' : '⏳';
                    return `
                        <button class="dashboard-subtab ${this.activeRoute === route.id ? 'active' : ''}"
                                onclick="DashboardTabsEnergy.setActiveRoute('${route.id}')">
                            ${hasAnalysis} ${route.name}
                        </button>
                    `;
                }).join('')}
            </div>
        ` : '';

        return `
            ${routeTabs}

            <!-- Статус -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-bolt" style="color: #ed8936;"></i>
                    Статус энергоэффективности
                </div>
                <div class="dashboard-energy-status ${statusClass}">
                    <i class="fas ${statusIcon}"></i>
                    <span>${statusText}</span>
                </div>

                <div class="dashboard-energy-cards">
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">🛤️</div>
                        <div class="dashboard-energy-card-value">${data.totalDistance} / ${data.maxDistance} км</div>
                        <div class="dashboard-energy-card-label">Дистанция (макс.)</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">⏱️</div>
                        <div class="dashboard-energy-card-value">${data.totalTime} / ${data.maxTime} мин</div>
                        <div class="dashboard-energy-card-label">Время (макс.)</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">⚡</div>
                        <div class="dashboard-energy-card-value">${data.totalEnergy} Вт·ч</div>
                        <div class="dashboard-energy-card-label">Энергия</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">🔋</div>
                        <div class="dashboard-energy-card-value">${Math.round(data.availableEnergy)} Вт·ч</div>
                        <div class="dashboard-energy-card-label">Доступно (25.4В → 18.6В)</div>
                    </div>
                </div>

                <!-- Оставшееся время и расстояние -->
                <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, rgba(56, 161, 105, 0.1) 0%, rgba(56, 161, 105, 0.05) 100%); border-radius: 12px; border: 2px solid rgba(56, 161, 105, 0.3);">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center;">
                        <div>
                            <div style="font-size: 10px; color: #718096; text-transform: uppercase; margin-bottom: 6px;">⏱️ Осталось времени</div>
                            <div style="font-size: 22px; font-weight: 700; color: ${data.energySufficient ? '#38a169' : '#e53e3e'};">${data.remainingTime} мин</div>
                            <div style="font-size: 9px; color: #718096; margin-top: 4px;">(ограничение ${data.maxTime} мин)</div>
                        </div>
                        <div>
                            <div style="font-size: 10px; color: #718096; text-transform: uppercase; margin-bottom: 6px;">🛤️ Осталось км</div>
                            <div style="font-size: 22px; font-weight: 700; color: ${data.energySufficient ? '#38a169' : '#e53e3e'};">${data.remainingDistance} км</div>
                            <div style="font-size: 9px; color: #718096; margin-top: 4px;">(ограничение ${data.maxDistance} км)</div>
                        </div>
                        <div>
                            <div style="font-size: 10px; color: #718096; text-transform: uppercase; margin-bottom: 6px;">⚡ Расход</div>
                            <div style="font-size: 22px; font-weight: 700; color: #38a169;">${data.energyPerKm} Вт·ч/км</div>
                            <div style="font-size: 9px; color: #718096; margin-top: 4px;">с учётом ветра</div>
                        </div>
                    </div>
                    ${!data.energySufficient ? `
                    <div style="margin-top: 12px; padding: 12px; background: rgba(229, 62, 62, 0.1); border-radius: 8px; border: 1px solid rgba(229, 62, 62, 0.3);">
                        <div style="font-size: 11px; color: #c53030; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-exclamation-triangle" style="color: #e53e3e;"></i>
                            <span><strong>ВНИМАНИЕ:</strong> Энергии недостаточно для полного маршрута! Требуется ${data.totalEnergy} Вт·ч, доступно ${Math.round(data.availableEnergy)} Вт·ч. Рекомендуется сократить маршрут.</span>
                        </div>
                    </div>
                    ` : `
                    <div style="margin-top: 12px; padding: 10px; background: rgba(56, 161, 105, 0.05); border-radius: 8px; border: 1px solid rgba(56, 161, 105, 0.2);">
                        <div style="font-size: 11px; color: #276749; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-shield-alt" style="color: #38a169;"></i>
                            <span>Резерв 18.6В уже учтён. Отсечка двигателя при 16.8В. Доступно <strong>${Math.round(data.availableEnergy)} Вт·ч</strong></span>
                        </div>
                    </div>
                    `}
                </div>
            </div>

            <!-- Туда / Обратно -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-exchange-alt" style="color: #667eea;"></i>
                    Баланс "Туда / Обратно"
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                    ${this.renderDirectionCard('Туда', {
                        energy: Math.round(data.toEnergy),
                        time: Math.round(data.totalTime / 2),
                        speed: 69
                    }, 'fa-arrow-right')}
                    ${this.renderDirectionCard('Обратно', {
                        energy: Math.round(data.returnEnergy),
                        time: Math.round(data.totalTime / 2),
                        speed: 69
                    }, 'fa-arrow-left')}
                </div>
            </div>

            <!-- Графики -->
            <div class="dashboard-charts-grid">
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-chart-pie"></i>
                        Баланс энергии
                    </div>
                    <div id="dashboardEnergyBalanceChart" style="height: 280px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-wind"></i>
                        Профиль ветра
                    </div>
                    <div id="dashboardEnergyWindChart" style="height: 280px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-tachometer-alt"></i>
                        Путевая скорость
                    </div>
                    <div id="dashboardEnergySpeedChart" style="height: 280px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-bolt"></i>
                        Мощность
                    </div>
                    <div id="dashboardEnergyPowerChart" style="height: 280px;"></div>
                </div>
            </div>

            <!-- Детализация по сегментам -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-list"></i>
                    Детализация по сегментам
                </div>
                ${this.renderSegmentEnergyTable(data.segmentEnergies)}
            </div>
        `;
    },

    renderDirectionCard(direction, data, icon) {
        return `
            <div style="background: #f7fafc; padding: 20px; border-radius: 12px; border: 2px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; font-size: 16px; font-weight: 700;">
                    <i class="fas ${icon}" style="color: ${direction === 'Туда' ? '#3b82f6' : '#ef4444'};"></i>
                    ${direction.toUpperCase()}
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div style="text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${data.energy} Вт·ч</div>
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase;">Энергия</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${data.time} мин</div>
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase;">Время</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${data.speed} км/ч</div>
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase;">Скорость</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderSegmentEnergyTable(segments) {
        if (!segments || segments.length === 0) {
            return '<div style="padding: 20px; text-align: center; color: #718096;">Нет данных по сегментам</div>';
        }

        const rows = segments.map(s => `
            <tr>
                <td><strong>С${s.segment}</strong></td>
                <td>${s.axisDistance} / ${s.totalDistance} км</td>
                <td>${s.wind} м/с</td>
                <td>${s.headwindTo > 0 ? '+' : ''}${Math.round(s.headwindTo * 10) / 10} м/с</td>
                <td>${Math.round(s.groundSpeedTo)} / ${Math.round(s.groundSpeedReturn)} км/ч</td>
                <td>${Math.round(s.power)} Вт</td>
                <td>${Math.round(s.energy)} Вт·ч</td>
                <td>${Math.round(s.time)} мин</td>
            </tr>
        `).join('');

        return `
            <table class="dashboard-table">
                <thead>
                    <tr>
                        <th>Сегмент</th>
                        <th>Дистанция (ось / полная)</th>
                        <th>Ветер</th>
                        <th>Ветер туда / обратно</th>
                        <th>Скорость туда / обратно</th>
                        <th>Мощность</th>
                        <th>Энергия</th>
                        <th>Время</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    },

    afterRender() {
        // Получаем данные для активного маршрута
        let segments = [];
        let segmentAnalysis = [];

        if (this.activeRoute !== 'all' && RouteModule.routeAnalysisData?.[this.activeRoute]) {
            // Используем сохранённые данные для конкретного маршрута
            const routeData = RouteModule.routeAnalysisData[this.activeRoute];
            segments = routeData.segments || [];
            segmentAnalysis = routeData.segmentAnalysis || [];
            console.log('📊 Energy: данные из routeAnalysisData:', routeData);
        } else {
            // Используем текущие данные
            segments = typeof RouteModule !== 'undefined' && RouteModule.segments
                ? RouteModule.segments
                : [];
            segmentAnalysis = typeof RouteModule !== 'undefined' && RouteModule.segmentAnalysis
                ? RouteModule.segmentAnalysis
                : [];
            console.log('📊 Energy: текущие данные, segments:', segments.length, 'segmentAnalysis:', segmentAnalysis.length);
        }

        if (!segments || segments.length === 0) {
            console.warn('⚠️ afterRender: нет сегментов');
            return;
        }

        if (!segmentAnalysis || segmentAnalysis.length === 0) {
            console.warn('⚠️ afterRender: нет segmentAnalysis, используем WizardModule.stepData');
            // Пытаемся получить из WizardModule
            if (typeof WizardModule !== 'undefined' && WizardModule.stepData?.segmentAnalysis) {
                segmentAnalysis = WizardModule.stepData.segmentAnalysis;
                console.log('📊 Energy: segmentAnalysis из WizardModule:', segmentAnalysis.length);
            }
        }

        const energyData = this.calculateEnergy(segments, segmentAnalysis);
        if (!energyData) return;

        console.log('📊 Energy: energyData рассчитана', energyData);

        setTimeout(() => {
            this.initCharts(energyData);
        }, 100);
    },

    initCharts(data) {
        if (typeof Plotly === 'undefined') return;

        this.initEnergyBalanceChart(data);
        this.initWindChart(data.segmentEnergies);
        this.initSpeedChart(data.segmentEnergies);
        this.initPowerChart(data.segmentEnergies);
    },

    initEnergyBalanceChart(data) {
        // Проверка данных
        if (!data || !data.availableEnergy) {
            console.warn('⚠️ initEnergyBalanceChart: нет данных');
            return;
        }

        const profile = data.profile || { minReserve: 0.25 };
        const reserve = data.reserve || 25;

        const trace = {
            values: [
                data.totalEnergy || 0,
                reserve * data.availableEnergy / 100,
                data.availableEnergy * profile.minReserve
            ],
            labels: ['Потрачено', 'Резерв', 'Мин. резерв'],
            type: 'pie',
            marker: {
                colors: ['#ef4444', '#38a169', '#ed8936']
            }
        };

        const layout = {
            margin: { t: 20, b: 20, l: 20, r: 20 },
            height: 260,
            showlegend: true
        };

        const el = document.getElementById('dashboardEnergyBalanceChart');
        if (el) {
            Plotly.newPlot('dashboardEnergyBalanceChart', [trace], layout, { responsive: true, displayModeBar: false });
        }
    },

    initWindChart(segments) {
        if (!segments || segments.length === 0) return;

        const trace = {
            x: segments.map(s => `С${s.segment}`),
            y: segments.map(s => s.wind),
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#3b82f6', width: 3 }
        };

        const layout = {
            margin: { t: 20, b: 40, l: 40, r: 20 },
            height: 260,
            xaxis: { title: 'Сегмент' },
            yaxis: { title: 'Ветер, м/с' }
        };

        const el = document.getElementById('dashboardEnergyWindChart');
        if (el) {
            Plotly.newPlot('dashboardEnergyWindChart', [trace], layout, { responsive: true, displayModeBar: false });
        }
    },

    initSpeedChart(segments) {
        if (!segments || segments.length === 0) return;

        const trace1 = {
            x: segments.map(s => `С${s.segment}`),
            y: segments.map(s => Math.round(s.groundSpeedTo)),
            name: 'Туда',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#3b82f6', width: 3 }
        };

        const trace2 = {
            x: segments.map(s => `С${s.segment}`),
            y: segments.map(s => Math.round(s.groundSpeedReturn)),
            name: 'Обратно',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#ef4444', width: 3 }
        };

        const layout = {
            margin: { t: 20, b: 40, l: 40, r: 20 },
            height: 260,
            xaxis: { title: 'Сегмент' },
            yaxis: { title: 'Скорость, км/ч' },
            showlegend: true
        };

        const el = document.getElementById('dashboardEnergySpeedChart');
        if (el) {
            Plotly.newPlot('dashboardEnergySpeedChart', [trace1, trace2], layout, { responsive: true, displayModeBar: false });
        }
    },

    initPowerChart(segments) {
        if (!segments || segments.length === 0) return;

        const trace = {
            x: segments.map(s => `С${s.segment}`),
            y: segments.map(s => Math.round(s.power)),
            type: 'bar',
            marker: {
                color: segments.map(s => s.headwindTo > 0 ? '#ef4444' : '#38a169')
            }
        };

        const layout = {
            margin: { t: 20, b: 40, l: 40, r: 20 },
            height: 260,
            xaxis: { title: 'Сегмент' },
            yaxis: { title: 'Мощность, Вт' }
        };

        const el = document.getElementById('dashboardEnergyPowerChart');
        if (el) {
            Plotly.newPlot('dashboardEnergyPowerChart', [trace], layout, { responsive: true, displayModeBar: false });
        }
    },

    /**
     * Установка активного маршрута (НОВОЕ)
     */
    setActiveRoute(routeId) {
        this.activeRoute = routeId;
        const container = document.getElementById('dashboardBody');
        if (container) {
            container.innerHTML = this.render();
            this.afterRender();
        }
    }
};
