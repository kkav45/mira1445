/**
 * MIRA - Route Takeoff Points
 * Управление точками взлёта для маршрутов
 * Версия: 1.0.0
 */

const RouteTakeoffPoints = {
    /**
     * Хранилище точек взлёта: { [routeId]: { lat, lon, name } }
     */
    takeoffPoints: {},

    /**
     * Активный режим выбора
     */
    selectingForRoute: null,

    /**
     * Инициализация
     */
    init() {
        this.loadFromStorage();
        this.bindMapClickHandler();
        console.log('✅ RouteTakeoffPoints инициализирован');
    },

    /**
     * Загрузка из хранилища
     */
    loadFromStorage() {
        const saved = localStorage.getItem('mira_route_takeoff_points');
        if (saved) {
            try {
                this.takeoffPoints = JSON.parse(saved);
                console.log('📦 Загружено точек взлёта:', Object.keys(this.takeoffPoints).length);
            } catch (e) {
                console.error('Ошибка загрузки точек взлёта:', e);
                this.takeoffPoints = {};
            }
        }
    },

    /**
     * Сохранение в хранилище
     */
    saveToStorage() {
        localStorage.setItem('mira_route_takeoff_points', JSON.stringify(this.takeoffPoints));
    },

    /**
     * Привязка обработчика клика по карте
     */
    bindMapClickHandler() {
        if (typeof MapModule === 'undefined' || !MapModule.map) {
            console.warn('⚠️ MapModule не инициализирован, повторная попытка...');
            setTimeout(() => this.bindMapClickHandler(), 100);
            return;
        }

        const map = MapModule.map;

        map.on('click', (event) => {
            if (!this.selectingForRoute) return;

            const coordinates = event.coordinate;
            const lonLat = ol.proj.toLonLat(coordinates);

            this.setTakeoffPoint(
                this.selectingForRoute,
                { lat: lonLat[1], lon: lonLat[0] }
            );
        });

        console.log('🗺️ Обработчик клика по карте привязан');
    },

    /**
     * Начало выбора точки для маршрута
     */
    startSelection(routeId) {
        console.log('🎯 Начало выбора точки для маршрута:', routeId);

        this.selectingForRoute = routeId;

        // Визуальная индикация
        this.showSelectionIndicator();

        // Уведомление пользователя
        showToast('🗺️ Кликните по карте для выбора точки взлёта', 'info');
    },

    /**
     * Завершение выбора
     */
    stopSelection() {
        console.log('❌ Завершение выбора точки');
        this.selectingForRoute = null;
        this.hideSelectionIndicator();
    },

    /**
     * Показ индикатора выбора
     */
    showSelectionIndicator() {
        const mapContainer = document.querySelector('.ol-viewport');
        if (mapContainer) {
            mapContainer.style.cursor = 'crosshair';
        }
    },

    /**
     * Скрытие индикатора выбора
     */
    hideSelectionIndicator() {
        const mapContainer = document.querySelector('.ol-viewport');
        if (mapContainer) {
            mapContainer.style.cursor = 'auto';
        }
    },

    /**
     * Установка точки взлёта для маршрута
     */
    setTakeoffPoint(routeId, coordinates) {
        const route = RouteModule.savedRoutes?.find(r => r.id === routeId) || RouteModule.currentRoute;
        const routeName = route?.name || 'Маршрут';

        this.takeoffPoints[routeId] = {
            lat: coordinates.lat,
            lon: coordinates.lon,
            name: `Точка взлёта для ${routeName}`,
            setAt: new Date().toISOString()
        };

        this.saveToStorage();
        this.stopSelection();

        // Отображаем на карте
        this.displayRouteTakeoffPoint(routeId);

        showToast(`✅ Точка взлёта установлена для "${routeName}"`, 'success');

        // Обновление UI
        this.updateRouteTakeoffButton(routeId);
    },

    /**
     * Удаление точки взлёта
     */
    removeTakeoffPoint(routeId) {
        const route = RouteModule.savedRoutes?.find(r => r.id === routeId) || RouteModule.currentRoute;
        const routeName = route?.name || 'Маршрут';

        delete this.takeoffPoints[routeId];
        this.saveToStorage();

        // Очистка на карте
        this.clearTakeoffPoint(routeId);

        showToast(`🗑️ Точка взлёта удалена для "${routeName}"`, 'info');

        // Обновление UI
        this.updateRouteTakeoffButton(routeId);
    },

    /**
     * Получение точки взлёта для маршрута
     */
    getTakeoffPoint(routeId) {
        return this.takeoffPoints[routeId] || null;
    },

    /**
     * Отображение точки взлёта на карте
     */
    displayTakeoffPoint(routeId) {
        const point = this.takeoffPoints[routeId];
        if (!point || typeof MapModule === 'undefined') return;

        // Удаляем старый маркер если есть
        this.clearTakeoffPoint(routeId);

        // Создаём новый маркер через MapModule
        MapModule.addMarker(point.lat, point.lon, {
            title: `Точка взлёта: ${routeId}`,
            icon: '🚁'
        });
        
        // Сохраняем ID маркера
        if (!this.markerIds) this.markerIds = {};
        this.markerIds[routeId] = routeId;

        // Центрируем на точке
        MapModule.centerOnPoint(point.lat, point.lon, 14);
    },

    /**
     * Очистка маркера точки взлёта
     */
    clearTakeoffPoint(routeId) {
        if (!this.markerIds || !this.markerIds[routeId]) return;
        
        // Находим и удаляем маркер из markersSource
        if (MapModule.map && MapModule.markersSource) {
            const features = MapModule.markersSource.getFeatures();
            for (let i = features.length - 1; i >= 0; i--) {
                const feature = features[i];
                const title = feature.get('title');
                if (title && title.includes('Точка взлёта')) {
                    MapModule.markersSource.removeFeature(feature);
                }
            }
        }
        
        delete this.markerIds[routeId];
    },

    /**
     * Отображение всех точек взлёта
     */
    displayAllTakeoffPoints() {
        Object.keys(this.takeoffPoints).forEach(routeId => {
            this.displayTakeoffPoint(routeId);
        });
    },

    /**
     * Очистка всех маркеров
     */
    clearAllMarkers() {
        this.markerIds = {};
        MapModule.clearMarkers();
    },

    /**
     * Обновление кнопки точки взлёта в UI
     */
    updateRouteTakeoffButton(routeId) {
        const container = document.querySelector(`[data-route-takeoff-btn="${routeId}"]`);
        if (!container) return;

        const point = this.getTakeoffPoint(routeId);
        
        if (point) {
            container.innerHTML = `
                <button class="action-btn" onclick="RouteTakeoffPoints.removeTakeoffPoint('${routeId}')" 
                        style="padding: 6px 12px; font-size: 11px; background: linear-gradient(135deg, #fc8181 0%, #f56565 100%);">
                    <i class="fas fa-trash"></i> Удалить точку
                </button>
                <div style="font-size: 9px; color: rgba(0,0,0,0.5); margin-top: 4px;">
                    📍 ${point.lat.toFixed(4)}, ${point.lon.toFixed(4)}
                </div>
            `;
        } else {
            container.innerHTML = `
                <button class="action-btn" onclick="RouteTakeoffPoints.startSelection('${routeId}')" 
                        style="padding: 6px 12px; font-size: 11px;">
                    <i class="fas fa-map-marker-alt"></i> Выбрать точку взлёта
                </button>
            `;
        }
    },

    /**
     * Обновление всех кнопок точек взлёта
     */
    updateAllTakeoffButtons() {
        if (RouteModule.savedRoutes) {
            RouteModule.savedRoutes.forEach(route => {
                this.updateRouteTakeoffButton(route.id);
            });
        }
    },

    /**
     * Отображение точки взлёта для загруженного маршрута
     */
    displayRouteTakeoffPoint(routeId) {
        const point = this.getTakeoffPoint(routeId);
        if (!point) return;
        
        // Сначала очищаем старые маркеры точек взлёта
        this.clearTakeoffPoint(routeId);
        
        // Добавляем маркер с иконкой самолёта
        MapModule.addMarker(point.lat, point.lon, {
            title: `✈️ Точка взлёта`
        });
        
        if (!this.markerIds) this.markerIds = {};
        this.markerIds[routeId] = routeId;
    }
};

// Инициализация при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => RouteTakeoffPoints.init());
} else {
    RouteTakeoffPoints.init();
}
