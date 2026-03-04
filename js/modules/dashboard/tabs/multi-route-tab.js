/**
 * Вкладка дашборда: МУЛЬТИ-МАРШРУТ 🗺️
 * Версия 0.5.0 — вкладки по каждому маршруту с полной аналитикой
 */

const DashboardTabsMultiRoute = {
    /**
     * Активная подвкладка (для детального просмотра маршрутов)
     */
    activeRouteTab: 'overview',

    render() {
        const hasRoutes = typeof MultiRouteModule !== 'undefined' &&
                         MultiRouteModule.routes &&
                         MultiRouteModule.routes.length > 0;

        const hasBases = typeof MultiRouteModule !== 'undefined' &&
                        MultiRouteModule.takeoffPoints &&
                        MultiRouteModule.takeoffPoints.length > 0;

        if (!hasRoutes && !hasBases) {
            return this.renderPlaceholder();
        }

        const assignment = MultiRouteModule.getAssignment();

        return this.renderContent(assignment);
    },

    renderPlaceholder() {
        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-map" style="color: #48bb78;"></i>
                    Мульти-маршрутный полёт
                </div>
                <div style="padding: 40px; text-align: center; color: #718096;">
                    <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px; margin-bottom: 20px;">Загрузите маршруты и установите точки взлёта</p>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; max-width: 500px; margin: 0 auto;">
                        <button class="action-btn" onclick="MultiRouteUI.showAddTakeoffModal()"
                                style="padding: 12px; font-size: 13px;">
                            <i class="fas fa-plus"></i> Добавить точку взлёта
                        </button>
                        <button class="action-btn" onclick="MultiRouteUI.handleKmlUpload()"
                                style="padding: 12px; font-size: 13px;">
                            <i class="fas fa-upload"></i> Загрузить KML
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderContent(assignment) {
        const summary = MultiRouteModule.getSummary();
        const bases = MultiRouteModule.takeoffPoints || [];
        const routes = MultiRouteModule.routes || [];

        // Генерируем вкладки для каждого маршрута
        const routeTabs = routes.map((route, index) => {
            const status = route.status === 'allowed' ? '✅' : (route.status === 'skipped' ? '⏭️' : '⚠️');
            return `
                <button class="dashboard-subtab ${this.activeRouteTab === 'route-' + index ? 'active' : ''}"
                        onclick="DashboardTabsMultiRoute.switchRouteTab('route-${index}')">
                    ${status} ${route.name}
                </button>
            `;
        }).join('');

        return `
            <!-- Статистика -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-chart-pie" style="color: #667eea;"></i>
                    Общая статистика
                </div>
                <div class="dashboard-energy-cards">
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">🚁</div>
                        <div class="dashboard-energy-card-value">${bases.length}</div>
                        <div class="dashboard-energy-card-label">Базы</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">🗺️</div>
                        <div class="dashboard-energy-card-value">${routes.length}</div>
                        <div class="dashboard-energy-card-label">Маршруты</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">📏</div>
                        <div class="dashboard-energy-card-value">${summary?.axisDistance || 0} км</div>
                        <div class="dashboard-energy-card-label">Ось маршрута</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">🛤️</div>
                        <div class="dashboard-energy-card-value">${summary?.totalDistance || 0} км</div>
                        <div class="dashboard-energy-card-label">Полная (×2.5)</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">⚡</div>
                        <div class="dashboard-energy-card-value">${summary?.totalEnergy || 0} Вт·ч</div>
                        <div class="dashboard-energy-card-label">Энергия</div>
                    </div>
                </div>
            </div>

            <!-- Вкладки навигации -->
            <div class="dashboard-subtabs" style="margin: 20px 0; display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                <button class="dashboard-subtab ${this.activeRouteTab === 'overview' ? 'active' : ''}"
                        onclick="DashboardTabsMultiRoute.switchRouteTab('overview')">
                    <i class="fas fa-th-large"></i> Обзор всех
                </button>
                ${routeTabs}
            </div>

            <!-- Контент вкладок -->
            ${this.activeRouteTab === 'overview' ? 
                this.renderOverview(assignment, bases, routes) : 
                this.renderRouteDetail(assignment, routes)
            }

            <!-- Кнопки управления -->
            <div style="display: flex; gap: 12px; margin-top: 20px;">
                <button class="action-btn" onclick="MultiRouteModule.optimizeAssignment(WeatherModule.cachedData, WizardModule.stepData.date)"
                        style="flex: 1; padding: 16px; font-size: 14px;">
                    <i class="fas fa-sync"></i> Пересчитать
                </button>
                <button class="action-btn" onclick="this.exportToPDF()"
                        style="width: 56px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%);">
                    <i class="fas fa-file-pdf"></i>
                </button>
            </div>
        `;
    },

    /**
     * Переключение подвкладки
     */
    switchRouteTab(tabId) {
        this.activeRouteTab = tabId;
        const container = document.getElementById('dashboardBody');
        if (container) {
            container.innerHTML = this.render();
            this.afterRender();
        }
    },

    /**
     * Вкладка "Обзор всех маршрутов" — по точкам взлёта
     */
    renderOverview(assignment, bases, routes) {
        if (!assignment || assignment.length === 0) {
            return '<div style="padding: 20px; text-align: center; color: #718096;">Нет данных оптимизации. Нажмите "Пересчитать".</div>';
        }

        return assignment.map((baseAssignment, baseIndex) => this.renderBaseCard(baseAssignment, baseIndex)).join('');
    },

    /**
     * Карточка базы с маршрутами
     */
    renderBaseCard(baseAssignment, baseIndex) {
        const base = baseAssignment.base;
        const routes = baseAssignment.routes || [];
        const allowedRoutes = baseAssignment.allowedRoutes || [];
        const weatherWindow = base.weatherWindow || {};

        const statusColors = {
            good: { bg: '#c6f6d5', border: '#38a169', text: '#22543d', icon: '🟢', label: 'Благоприятно' },
            caution: { bg: '#feebc8', border: '#d69e2e', text: '#744210', icon: '🟡', label: 'Ожидание' },
            poor: { bg: '#fed7d7', border: '#e53e3e', text: '#742a2a', icon: '🔴', label: 'Неблагоприятно' },
            unknown: { bg: '#e2e8f0', border: '#a0aec0', text: '#4a5568', icon: '⚪', label: 'Нет данных' }
        };

        const status = statusColors[weatherWindow.status] || statusColors.unknown;

        return `
            <div class="dashboard-card" style="margin-bottom: 20px;">
                <div class="dashboard-card-title">
                    <i class="fas fa-helicopter" style="color: #ed8936;"></i>
                    ${base.name} ${baseIndex === 0 ? '(основная)' : '(резервная)'}
                </div>

                <!-- Информация о базе -->
                <div style="padding: 12px; background: #f7fafc; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-size: 11px; color: #718096;">
                        📍 ${base.lat.toFixed(4)}, ${base.lon.toFixed(4)} │
                        📡 ${base.antenna || 60} км │
                        🔋 ${base.battery?.capacity || 39000} мА·ч · ${base.battery?.voltage || 25.4} В
                    </div>
                </div>

                <!-- Метеоусловия на базе -->
                <div style="padding: 14px; background: ${status.bg}; border: 2px solid ${status.border}; border-radius: 10px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="font-weight: 600; color: ${status.text}; font-size: 13px;">
                            <i class="fas fa-cloud-sun"></i> Метеоусловия на базе
                        </div>
                        <span style="padding: 4px 10px; background: rgba(255,255,255,0.6); border-radius: 4px; font-size: 10px; color: ${status.text};">
                            ${status.icon} ${status.label}
                        </span>
                    </div>
                    ${weatherWindow.duration && weatherWindow.status !== 'unknown' ? `
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 11px; color: ${status.text};">
                            <div>⏰ Окно: ${weatherWindow.start} – ${weatherWindow.end} (${weatherWindow.duration} мин)</div>
                            <div>💨 Ветер: ${weatherWindow.avgWind || 0} м/с</div>
                            <div>🌧️ Осадки: ${weatherWindow.precip || 0} мм/ч</div>
                        </div>
                    ` : '<div style="font-size: 11px; color: ' + status.text + ';">Нет данных о погоде</div>'}
                </div>

                <!-- Маршруты -->
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; color: #2d3748; margin-bottom: 10px; font-size: 13px;">
                        <i class="fas fa-route"></i> Маршруты от базы (${routes.length})
                    </div>
                    ${routes.length > 0 ? 
                        routes.map((route, routeIndex) => this.renderRouteItem(route, routeIndex, baseAssignment)).join('') :
                        '<div style="padding: 20px; text-align: center; color: #718096; font-size: 13px;">Нет назначенных маршрутов</div>'
                    }
                </div>

                <!-- Итого по базе -->
                <div style="padding: 12px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #2d3748;">
                        <div>
                            <strong>📈 Итого:</strong>
                            ${baseAssignment.allowedRoutes.length} из ${baseAssignment.routes.length} выполнено
                            ${baseAssignment.partialRoutes?.length > 0 ? ` (частично: ${baseAssignment.partialRoutes.length})` : ''}
                        </div>
                        <div>
                            ⚡ ${Math.round(baseAssignment.totalEnergy || 0)} Вт·ч │
                            🔋 ${Math.round(baseAssignment.energyReserve || 0)} Вт·ч остаток
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Карточка маршрута
     */
    renderRouteItem(route, routeIndex, baseAssignment) {
        const flightPlan = route.flightPlan;
        const windSummary = flightPlan?.windSummary || {};
        const availability = route.availability;

        // Статус маршрута
        const statusConfig = {
            allowed: { icon: '✅', color: '#38a169', bg: '#c6f6d5', label: 'Выполняется' },
            skipped: { icon: '⏭️', color: '#a0aec0', bg: '#e2e8f0', label: 'Пропущен' },
            unavailable: { icon: '❌', color: '#e53e3e', bg: '#fed7d7', label: 'Недоступен' }
        };

        const status = statusConfig[route.status] || statusConfig.skipped;

        // Причина пропуска
        const skipReasons = {
            out_of_range: 'Вне радиуса антенны',
            insufficient_energy: 'Недостаточно энергии',
            flight_plan_error: 'Ошибка расчёта'
        };

        return `
            <div style="padding: 14px; background: ${status.bg}; border-left: 4px solid ${status.color}; border-radius: 8px; margin-bottom: 12px;">
                <!-- Заголовок -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="font-weight: 600; color: #2d3748; font-size: 13px;">
                        ${status.icon} ${route.name}
                        <span style="font-size: 10px; color: #718096; margin-left: 8px;">(${status.label})</span>
                    </div>
                    ${availability ? `
                        <div style="font-size: 10px; color: #718096;">
                            📡 ${availability.inRangePercent}% в радиусе (${availability.segmentsInRange.length}/${availability.totalSegments} сегм.)
                        </div>
                    ` : ''}
                </div>

                <!-- Параметры маршрута -->
                ${flightPlan ? `
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px; font-size: 11px;">
                        <div>🛤️ ${flightPlan.total?.distance || 0} км</div>
                        <div>⏱️ ${flightPlan.total?.time || 0} мин</div>
                        <div>⚡ ${route.energyConsumed || flightPlan.total?.energy || 0} Вт·ч</div>
                    </div>

                    <!-- Ветер по сегментам -->
                    <div style="padding: 10px; background: rgba(255,255,255,0.5); border-radius: 6px; margin-bottom: 8px;">
                        <div style="font-size: 11px; font-weight: 600; color: #2d3748; margin-bottom: 6px;">
                            <i class="fas fa-wind"></i> Ветер: ${windSummary.icon || '🟡'} ${windSummary.condition || 'Смешанный'}
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 10px;">
                            <div style="color: #38a169;">🟢 Попутный: ${windSummary.tailwind || 0}</div>
                            <div style="color: #d69e2e;">🟡 Боковой: ${windSummary.calm || 0}</div>
                            <div style="color: #e53e3e;">🔴 Встречный: ${windSummary.headwind || 0}</div>
                        </div>
                    </div>

                    <!-- Энергия -->
                    ${route.status === 'allowed' ? `
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 11px;">
                            <div>⚡ Базовый: ${flightPlan.total?.baseEnergy || 0} Вт·ч</div>
                            <div>💨 Влияние: ${flightPlan.total?.windEffect >= 0 ? '+' : ''}${flightPlan.total?.windEffect || 0} Вт·ч</div>
                            <div>🔋 Остаток: ${route.energyReserve || 0} Вт·ч (${route.reservePercent || 0}%)</div>
                        </div>
                    ` : ''}
                ` : ''}

                <!-- Причина пропуска -->
                ${route.status === 'skipped' || route.status === 'unavailable' ? `
                    <div style="padding: 10px; background: rgba(229, 62, 62, 0.1); border: 1px solid #e53e3e; border-radius: 6px; margin-top: 8px;">
                        <div style="font-size: 11px; color: #c53030;">
                            <strong>🔴 Причина:</strong> ${skipReasons[route.skipReason] || route.skipReason || 'Неизвестно'}
                        </div>
                        ${route.energyDeficit ? `
                            <div style="font-size: 11px; color: #c53030; margin-top: 4px;">
                                Нужно: ${route.energyNeeded || 0} Вт·ч │ Есть: ${route.energyAvailable || 0} Вт·ч │ 
                                <strong>Дефицит: ${route.energyDeficit} Вт·ч</strong>
                            </div>
                        ` : ''}
                        ${route.maxDistance ? `
                            <div style="font-size: 11px; color: #c53030; margin-top: 4px;">
                                Макс. расстояние: ${route.maxDistance} км (радиус: ${baseAssignment.base.antenna || 60} км)
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <!-- Частичное выполнение -->
                ${route.status === 'allowed' && availability?.status === 'partial' ? `
                    <div style="padding: 10px; background: rgba(237, 137, 54, 0.1); border-left: 3px solid #ed8936; border-radius: 6px; margin-top: 8px;">
                        <div style="font-size: 11px; color: #744210;">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>Частичное выполнение:</strong> Проанализировано ${flightPlan?.segmentsCount || 0} из ${availability.totalSegments} сегментов.
                            Остальные сегменты вне радиуса антенны.
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Детальный просмотр маршрута — полная аналитика от ВСЕХ баз (ОБНОВЛЁННАЯ v0.6.0)
     */
    renderRouteDetail(assignment, routes) {
        const routeIndex = parseInt(this.activeRouteTab.replace('route-', ''));
        const route = routes[routeIndex];

        if (!route) {
            return '<div style="padding: 20px; text-align: center; color: #718096;">Маршрут не найден</div>';
        }

        // Получаем полную аналитику для этого маршрута от ВСЕХ баз
        const routeAnalytics = typeof MultiRouteModule !== 'undefined' ?
            MultiRouteModule.getRouteAnalytics(route.id) : null;

        console.log('🔍 renderRouteDetail:', {
            routeId: route.id,
            routeName: route.name,
            routeIndex: routeIndex,
            hasAnalytics: !!routeAnalytics,
            analyticsByBase: routeAnalytics ? Object.keys(routeAnalytics.analyticsByBase) : [],
            hasComparison: !!routeAnalytics
        });

        // Находим базу для этого маршрута (для обратной совместимости)
        let baseAssignment = null;
        let routeInAssignment = null;

        if (assignment) {
            for (const ba of assignment) {
                const found = ba.routes.find(r => r.id === route.id);
                if (found) {
                    baseAssignment = ba;
                    routeInAssignment = found;
                    break;
                }
            }
        }

        // Сравнение баз для этого маршрута
        const comparison = typeof MultiRouteModule !== 'undefined' ?
            MultiRouteModule.compareBasesForRoute(route.id) : null;

        console.log('🔍 Comparison:', comparison);

        const status = route.status === 'allowed' ? '✅ Выполняется' : (route.status === 'skipped' ? '⏭️ Пропущен' : '⚠️ Ограничения');
        const statusColor = route.status === 'allowed' ? '#38a169' : (route.status === 'skipped' ? '#a0aec0' : '#ed8936');

        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title" style="border-left: 4px solid ${statusColor}; padding-left: 12px;">
                    <i class="fas fa-route" style="color: #667eea;"></i>
                    ${route.name} — Детальный анализ от всех баз
                </div>

                <!-- Статус -->
                <div style="padding: 14px; background: ${statusColor}20; border: 2px solid ${statusColor}; border-radius: 10px; margin-bottom: 20px;">
                    <div style="font-size: 14px; font-weight: 600; color: ${statusColor};">
                        ${status}
                    </div>
                </div>

                <!-- Сравнение баз для этого маршрута (НОВОЕ) -->
                ${this.renderBaseComparison(route, routeAnalytics, comparison)}

                <!-- Сводка -->
                <div style="padding: 14px; background: #f7fafc; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 12px;">
                        <div>🛤️ ${route.totalDistance || 0} км</div>
                        <div>📍 ${route.segments?.length || 0} сегментов</div>
                        <div>🚁 Баз: ${routeAnalytics ? Object.keys(routeAnalytics.analyticsByBase).length : 0}</div>
                        <div>📡 ${routeInAssignment?.availability?.inRangePercent || 0}% в радиусе</div>
                    </div>
                </div>

                <!-- Метеоанализ по сегментам (для первой доступной базы) -->
                ${this.renderSegmentsMeteoAnalysis(route, routeInAssignment, routeAnalytics)}

                <!-- Таблица сегментов -->
                ${this.renderSegmentsTable(route, routeInAssignment, routeAnalytics)}

                <!-- График ветра -->
                ${this.renderWindChart(route, routeInAssignment)}

                <!-- Визуализация трассы -->
                ${this.renderRouteVisualization(route, routeInAssignment)}

                <!-- Энергия от всех баз (НОВОЕ) -->
                ${this.renderEnergyFromAllBases(route, routeAnalytics, comparison)}
            </div>
        `;
    },

    /**
     * Сравнение баз для маршрута (НОВОЕ)
     */
    renderBaseComparison(route, routeAnalytics, comparison) {
        if (!comparison || !comparison.comparison || comparison.comparison.length === 0) {
            return '';
        }

        const baseCards = comparison.comparison.map(baseData => {
            const statusColors = {
                allowed: { bg: '#c6f6d5', border: '#38a169', text: '#22543d', icon: '✅', label: 'Выполняется' },
                skipped: { bg: '#fed7d7', border: '#e53e3e', text: '#742a2a', icon: '❌', label: 'Пропущен' },
                unavailable: { bg: '#feebc8', border: '#d69e2e', text: '#744210', icon: '⚠️', label: 'Недоступен' }
            };
            const status = statusColors[baseData.status] || statusColors.skipped;
            const isBest = comparison.bestBase && baseData.base.id === comparison.bestBase.base.id;

            return `
                <div style="padding: 14px; background: ${status.bg}; border: 2px solid ${status.border}; border-radius: 10px; ${isBest ? 'box-shadow: 0 0 0 3px rgba(56, 161, 105, 0.3);' : ''}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="font-weight: 600; color: ${status.text}; font-size: 13px;">
                            ${status.icon} ${baseData.base.name} ${isBest ? '🏆 Лучшая' : ''}
                        </div>
                        <span style="padding: 4px 8px; background: rgba(255,255,255,0.6); border-radius: 4px; font-size: 10px; color: ${status.text};">
                            ${status.label}
                        </span>
                    </div>
                    ${baseData.status === 'allowed' ? `
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 11px; color: ${status.text};">
                            <div>⚡ ${baseData.totalEnergy} Вт·ч</div>
                            <div>🔋 ${baseData.reservePercent}% резерв</div>
                            <div>📡 ${baseData.availability?.inRangePercent || 0}% антенна</div>
                        </div>
                    ` : `
                        <div style="font-size: 11px; color: ${status.text};">
                            <strong>Причина:</strong> ${baseData.skipReason || '—'}
                        </div>
                    `}
                </div>
            `;
        }).join('');

        return `
            <div style="margin-bottom: 20px;">
                <div style="font-weight: 600; color: #2d3748; margin-bottom: 12px; font-size: 13px;">
                    <i class="fas fa-balance-scale"></i> Сравнение баз для этого маршрута
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">
                    ${baseCards}
                </div>
                ${comparison.message ? `
                    <div style="margin-top: 12px; padding: 10px; background: rgba(102, 126, 234, 0.1); border-radius: 8px; font-size: 11px; color: #667eea;">
                        <i class="fas fa-info-circle"></i> ${comparison.message}
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Энергия от всех баз (НОВОЕ)
     */
    renderEnergyFromAllBases(route, routeAnalytics, comparison) {
        if (!routeAnalytics || !comparison) return '';

        const allowedBases = comparison.allowedBases || [];
        
        if (allowedBases.length === 0) {
            return `
                <div style="padding: 20px; text-align: center; color: #718096; background: #f7fafc; border-radius: 8px;">
                    <i class="fas fa-info-circle" style="font-size: 32px; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>Нет доступных баз для этого маршрута</p>
                </div>
            `;
        }

        const energyCards = allowedBases.map(baseData => {
            const isBest = comparison.bestBase && baseData.base.id === comparison.bestBase.base.id;
            
            return `
                <div style="padding: 14px; background: ${isBest ? 'linear-gradient(135deg, rgba(56, 161, 105, 0.1) 0%, rgba(38, 166, 154, 0.1) 100%)' : '#f7fafc'}; border: ${isBest ? '2px solid #38a169' : '1px solid #e2e8f0'}; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="font-weight: 600; color: #2d3748; font-size: 13px;">
                            ${isBest ? '🏆' : '🚁'} ${baseData.base.name}
                        </div>
                        ${isBest ? '<span style="padding: 4px 8px; background: #38a169; color: white; border-radius: 4px; font-size: 9px;">ЛУЧШАЯ</span>' : ''}
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 11px;">
                        <div>
                            <div style="color: #718096;">Энергия маршрута:</div>
                            <div style="font-weight: 600; color: #2d3748;">${baseData.energy} Вт·ч</div>
                        </div>
                        <div>
                            <div style="color: #718096;">Переход:</div>
                            <div style="font-weight: 600; color: #2d3748;">${baseData.transitionEnergy} Вт·ч</div>
                        </div>
                        <div>
                            <div style="color: #718096;">Всего:</div>
                            <div style="font-weight: 600; color: #e53e3e;">${baseData.totalEnergy} Вт·ч</div>
                        </div>
                        <div>
                            <div style="color: #718096;">Резерв:</div>
                            <div style="font-weight: 600; color: #38a169;">${baseData.reservePercent}% (${baseData.energyReserve} Вт·ч)</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div style="margin-top: 20px;">
                <div style="font-weight: 600; color: #2d3748; margin-bottom: 12px; font-size: 13px;">
                    <i class="fas fa-bolt"></i> Энергия от всех баз
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
                    ${energyCards}
                </div>
            </div>
        `;
    },

    /**
     * Метеоанализ по сегментам (ОБНОВЛЁННАЯ v0.6.0 — с поддержкой routeAnalytics)
     */
    renderSegmentsMeteoAnalysis(route, routeInAssignment, routeAnalytics) {
        const flightPlan = routeInAssignment?.flightPlan;
        const availability = routeInAssignment?.availability;
        const segmentWeatherData = route.segmentWeatherData || [];

        if (!flightPlan) return '';

        const windSummary = flightPlan.windSummary || {};
        const total = flightPlan.total || {};

        // Проверка на использование индивидуальных метеоданных
        const hasIndividualWeather = flightPlan.hasIndividualWeather || segmentWeatherData.length > 0;

        return `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="font-weight: 600; color: #2d3748; font-size: 13px;">
                        <i class="fas fa-cloud-sun"></i> Метеоанализ маршрута
                    </div>
                    ${hasIndividualWeather ? `
                        <span style="padding: 4px 10px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border: 1px solid #667eea; border-radius: 6px; font-size: 10px; color: #667eea; font-weight: 600;">
                            🌤️ Индивидуальные данные для каждого сегмента
                        </span>
                    ` : ''}
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                    <!-- Ветер -->
                    <div style="padding: 14px; background: #f7fafc; border-radius: 8px;">
                        <div style="font-size: 11px; color: #718096; margin-bottom: 6px;">💨 Ветер</div>
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">
                            ${windSummary.icon || '🟡'} ${windSummary.condition || 'Смешанный'}
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 8px; font-size: 10px;">
                            <div style="color: #38a169;">🟢 ${windSummary.tailwind || 0}</div>
                            <div style="color: #d69e2e;">🟡 ${windSummary.calm || 0}</div>
                            <div style="color: #e53e3e;">🔴 ${windSummary.headwind || 0}</div>
                        </div>
                        ${hasIndividualWeather ? `
                            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #718096;">
                                <i class="fas fa-check-circle"></i> Данные для ${segmentWeatherData.length} сегментов
                            </div>
                        ` : ''}
                    </div>

                    <!-- Энергия -->
                    <div style="padding: 14px; background: #f7fafc; border-radius: 8px;">
                        <div style="font-size: 11px; color: #718096; margin-bottom: 6px;">⚡ Энергия</div>
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">
                            ${total.energy || 0} Вт·ч
                        </div>
                        <div style="font-size: 10px; color: #718096; margin-top: 4px;">
                            Базовый: ${total.baseEnergy || 0} Вт·ч │ Влияние ветра: ${total.windEffect >= 0 ? '+' : ''}${total.windEffect || 0} Вт·ч (${total.windEffectPercent || 0}%)
                        </div>
                        ${routeInAssignment?.transitionEnergy ? `
                            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #667eea;">
                                <i class="fas fa-exchange-alt"></i> Переход: +${routeInAssignment.transitionEnergy} Вт·ч
                            </div>
                        ` : ''}
                    </div>

                    <!-- Время -->
                    <div style="padding: 14px; background: #f7fafc; border-radius: 8px;">
                        <div style="font-size: 11px; color: #718096; margin-bottom: 6px;">⏱️ Время полёта</div>
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">
                            ${total.time || 0} мин
                        </div>
                        <div style="font-size: 10px; color: #718096; margin-top: 4px;">
                            Сегментов: ${flightPlan.segmentsCount || 0} из ${route.segments?.length || 0}
                        </div>
                    </div>

                    <!-- Доступность -->
                    <div style="padding: 14px; background: #f7fafc; border-radius: 8px;">
                        <div style="font-size: 11px; color: #718096; margin-bottom: 6px;">📡 Доступность</div>
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">
                            ${availability?.inRangePercent || 0}%
                        </div>
                        <div style="font-size: 10px; color: #718096; margin-top: 4px;">
                            ${availability?.segmentsInRange?.length || 0} из ${availability?.totalSegments || 0} сегм. в радиусе
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Таблица сегментов (ОБНОВЛЁННАЯ v0.6.0 — с поддержкой routeAnalytics)
     */
    renderSegmentsTable(route, routeInAssignment, routeAnalytics) {
        const segments = route.segments || [];
        const windSegments = routeInAssignment?.flightPlan?.windSummary?.segments || [];
        const segmentWeatherData = route.segmentWeatherData || [];
        const hasIndividualWeather = segmentWeatherData.length > 0;

        if (segments.length === 0) {
            return '';
        }

        const rows = segments.slice(0, 50).map((segment, index) => {
            // Получаем данные из windSegments (старый формат)
            const windData = windSegments.find(ws => ws.segmentId === segment.id);
            
            // Получаем индивидуальные метеоданные (новый формат)
            const segmentWeather = hasIndividualWeather ? segmentWeatherData.find(sw => sw.segmentId === segment.id) : null;
            const individualWind = segmentWeather?.weather?.hourly ? this.getAverageWindFromHourly(segmentWeather.weather.hourly) : null;
            
            // Используем индивидуальные данные если доступны
            const windSpeed = individualWind ? individualWind.speed : (windData?.windSpeed || 0);
            const windDir = individualWind ? individualWind.direction : (windData?.windDirection || 0);
            const windStatus = individualWind ? (windSpeed > 8 ? '🔴' : (windSpeed > 5 ? '🟡' : '🟢')) : 
                               (windData?.windEffect === 'tailwind' ? '🟢' : (windData?.windEffect === 'headwind' ? '🔴' : '🟡'));
            
            const energy = windData?.energy || Math.round((segment.distance || 5) * 8);
            const time = windData?.time || Math.round((segment.distance || 5) / 69 * 60);

            return `
                <tr style="font-size: 11px;">
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${segment.id}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${segment.lat.toFixed(4)}, ${segment.lon.toFixed(4)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
                        ${windStatus} ${windSpeed} м/с ${this.getWindDirection(windDir)}
                        ${hasIndividualWeather ? '<i class="fas fa-check-circle" style="color: #38a169; margin-left: 4px;" title="Индивидуальные данные"></i>' : ''}
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${segment.distance || segment.distanceTotal ? `${segment.distance} / ${segment.distanceTotal || Math.round(segment.distance * 2.5 * 10) / 10}` : '—'} км</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${energy} Вт·ч</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${time} мин</td>
                </tr>
            `;
        }).join('');

        return `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="font-weight: 600; color: #2d3748; font-size: 13px;">
                        <i class="fas fa-table"></i> Таблица сегментов (показано ${Math.min(50, segments.length)} из ${segments.length})
                    </div>
                    ${hasIndividualWeather ? `
                        <span style="padding: 4px 8px; background: rgba(56, 161, 105, 0.1); border: 1px solid rgba(56, 161, 105, 0.3); border-radius: 4px; font-size: 9px; color: #276749;">
                            🌤️ Инд. метеоданные
                        </span>
                    ` : ''}
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                        <thead>
                            <tr style="background: #f7fafc; font-weight: 600;">
                                <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0;">№</th>
                                <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0;">Координаты</th>
                                <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0;">Ветер</th>
                                <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0;">Дистанция</th>
                                <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0;">Энергия</th>
                                <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0;">Время</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    /**
     * Получение среднего ветра из почасовых данных
     */
    getAverageWindFromHourly(hourly) {
        if (!hourly || hourly.length === 0) return null;
        const hours = hourly.slice(0, 6);
        const avgSpeed = hours.reduce((sum, h) => sum + (h.wind10m || 0), 0) / hours.length;
        const avgDir = hours.reduce((sum, h) => sum + (h.windDirection10m || 0), 0) / hours.length;
        return {
            speed: Math.round(avgSpeed * 10) / 10,
            direction: Math.round(avgDir)
        };
    },

    /**
     * Направление ветра (текстом)
     */
    getWindDirection(degrees) {
        if (!degrees) return '';
        const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    },

    /**
     * График ветра по сегментам
     */
    renderWindChart(route, routeInAssignment) {
        const windSegments = routeInAssignment?.flightPlan?.windSummary?.segments || [];

        if (windSegments.length === 0) {
            return '';
        }

        const chartId = 'windChart-' + route.id;

        setTimeout(() => {
            const ctx = document.getElementById(chartId);
            if (ctx && typeof Plotly !== 'undefined') {
                const segmentIds = windSegments.map(s => 'С' + s.segmentId);
                const windSpeeds = windSegments.map(s => s.windSpeed);
                const windEffects = windSegments.map(s => s.windEffect === 'headwind' ? 1 : (s.windEffect === 'tailwind' ? -1 : 0));
                const colors = windEffects.map(e => e === 1 ? '#e53e3e' : (e === -1 ? '#38a169' : '#d69e2e'));

                Plotly.newPlot(chartId, [{
                    x: segmentIds,
                    y: windSpeeds,
                    type: 'bar',
                    marker: { color: colors },
                    name: 'Ветер'
                }], {
                    title: '💨 Ветер по сегментам',
                    height: 300,
                    margin: { t: 40, b: 60, l: 40, r: 20 },
                    yaxis: { title: 'м/с' }
                }, { responsive: true, displayModeBar: false });
            }
        }, 100);

        return `
            <div style="margin-bottom: 20px;">
                <div style="font-weight: 600; color: #2d3748; margin-bottom: 10px; font-size: 13px;">
                    <i class="fas fa-chart-bar"></i> Ветер по сегментам
                </div>
                <div id="${chartId}" style="width: 100%; height: 300px;"></div>
                <div style="display: flex; gap: 20px; justify-content: center; margin-top: 10px; font-size: 11px;">
                    <span style="color: #38a169;">🟢 Попутный</span>
                    <span style="color: #d69e2e;">🟡 Боковой/Штиль</span>
                    <span style="color: #e53e3e;">🔴 Встречный</span>
                </div>
            </div>
        `;
    },

    /**
     * Визуализация трассы
     */
    renderRouteVisualization(route, routeInAssignment) {
        const windSegments = routeInAssignment?.flightPlan?.windSummary?.segments || [];
        const availability = routeInAssignment?.availability;

        if (windSegments.length === 0) {
            return '';
        }

        // Генерируем цветовую схему для сегментов
        const segmentColors = windSegments.map(s => {
            if (s.windEffect === 'tailwind') return '🟢';
            if (s.windEffect === 'headwind') return '🔴';
            return '🟡';
        });

        // Группируем по 5 сегментов для компактности
        const groupedColors = [];
        for (let i = 0; i < segmentColors.length; i += 5) {
            const group = segmentColors.slice(i, i + 5);
            const greenCount = group.filter(c => c === '🟢').length;
            const redCount = group.filter(c => c === '🔴').length;
            groupedColors.push(greenCount > redCount ? '🟢' : (redCount > greenCount ? '🔴' : '🟡'));
        }

        return `
            <div style="margin-bottom: 20px;">
                <div style="font-weight: 600; color: #2d3748; margin-bottom: 10px; font-size: 13px;">
                    <i class="fas fa-map-marked-alt"></i> Трасса маршрута с метео-раскраской
                </div>
                <div style="padding: 14px; background: #f7fafc; border-radius: 8px;">
                    <div style="font-size: 11px; margin-bottom: 10px; letter-spacing: 2px; font-family: monospace;">
                        ${groupedColors.join(' ')}
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: center; margin-top: 10px; font-size: 11px;">
                        <span>🟢 Попутный</span>
                        <span>🟡 Боковой</span>
                        <span>🔴 Встречный</span>
                    </div>
                    ${availability ? `
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #718096;">
                            📡 В радиусе антенны: ${availability.inRangePercent}% (${availability.segmentsInRange.length}/${availability.totalSegments} сегментов)
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Анализ энергии
     */
    renderEnergyAnalysis(route, routeInAssignment, baseAssignment) {
        const flightPlan = routeInAssignment?.flightPlan;
        const total = flightPlan?.total || {};

        if (!flightPlan || routeInAssignment?.status === 'skipped') {
            return '';
        }

        return `
            <div style="margin-bottom: 20px;">
                <div style="font-weight: 600; color: #2d3748; margin-bottom: 10px; font-size: 13px;">
                    <i class="fas fa-battery-three-quarters"></i> Анализ энергии
                </div>
                <div style="padding: 14px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-radius: 8px;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 12px;">
                        <div>
                            <div style="font-size: 10px; color: #718096;">Базовый расход</div>
                            <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${total.baseEnergy || 0} Вт·ч</div>
                        </div>
                        <div>
                            <div style="font-size: 10px; color: #718096;">Влияние ветра</div>
                            <div style="font-size: 18px; font-weight: 700; color: ${total.windEffect >= 0 ? '#e53e3e' : '#38a169'};">
                                ${total.windEffect >= 0 ? '+' : ''}${total.windEffect || 0} Вт·ч
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 10px; color: #718096;">Итого</div>
                            <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${total.energy || 0} Вт·ч</div>
                        </div>
                    </div>
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1); font-size: 11px; color: #718096;">
                        🔋 Остаток после маршрута: <strong style="color: #2d3748;">${routeInAssignment.energyReserve || 0} Вт·ч</strong> (${routeInAssignment.reservePercent || 0}%)
                    </div>
                </div>
            </div>
        `;
    },

    afterRender() {
        console.log('🗺️ Multi-Route Tab rendered, active tab:', this.activeRouteTab);

        // Отобразить все данные на карте
        if (typeof MultiRouteUI !== 'undefined') {
            setTimeout(() => MultiRouteUI.displayAllData(), 100);
        }
    }
};
