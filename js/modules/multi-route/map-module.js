/**
 * MIRA - Multi-Route Map Module
 * Визуализация точек взлёта и маршрутов на карте
 * Версия: 0.3.0
 */

const MultiRouteMapModule = {
    /**
     * Слой для точек взлёта
     */
    takeoffLayer: null,

    /**
     * Слой для маршрутов
     */
    routesLayer: null,

    /**
     * Слой для переходов между маршрутами
     */
    transitionsLayer: null,

    /**
     * Инициализация
     */
    init(map) {
        this.map = map;
        this.createTakeoffLayer();
        this.createRoutesLayer();
        this.createTransitionsLayer();
        console.log('✅ MultiRouteMapModule инициализирован');
    },

    /**
     * Создание слоя для точек взлёта
     */
    createTakeoffLayer() {
        const source = new ol.source.Vector();

        this.takeoffLayer = new ol.layer.Vector({
            source: source,
            style: (feature) => {
                const type = feature.get('type');
                const priority = feature.get('priority') || 1;

                if (type === 'takeoff') {
                    return new ol.style.Style({
                        image: new ol.style.Icon({
                            src: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                                    <circle cx="20" cy="20" r="18" fill="#ed8936" stroke="#c05621" stroke-width="2"/>
                                    <text x="20" y="26" text-anchor="middle" fill="white" font-size="20" font-weight="bold">🚁</text>
                                </svg>
                            `)
                        })
                    });
                }
            },
            zIndex: 100
        });

        this.map.addLayer(this.takeoffLayer);
    },

    /**
     * Создание слоя для маршрутов
     */
    createRoutesLayer() {
        const source = new ol.source.Vector();

        this.routesLayer = new ol.layer.Vector({
            source: source,
            style: (feature) => {
                const routeId = feature.get('routeId');
                const status = feature.get('status') || 'pending';
                const colors = {
                    pending: '#a0aec0',
                    full: '#48bb78',
                    partial: '#ed8936',
                    skipped: '#f56565'
                };

                return new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: colors[status] || '#a0aec0',
                        width: 4
                    }),
                    fill: new ol.style.Fill({
                        color: (colors[status] || '#a0aec0') + '33'
                    })
                });
            },
            zIndex: 50
        });

        this.map.addLayer(this.routesLayer);
    },

    /**
     * Создание слоя для переходов
     */
    createTransitionsLayer() {
        const source = new ol.source.Vector();

        this.transitionsLayer = new ol.layer.Vector({
            source: source,
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#667eea',
                    width: 2,
                    lineDash: [5, 5]
                })
            }),
            zIndex: 40
        });

        this.map.addLayer(this.transitionsLayer);
    },

    /**
     * Отобразить точку взлёта
     */
    displayTakeoffPoint(point) {
        if (!this.takeoffLayer) return;

        const feature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([point.lon, point.lat])),
            type: 'takeoff',
            priority: point.priority,
            name: point.name
        });

        this.takeoffLayer.getSource().addFeature(feature);
        console.log('🗺️ Точка взлёта отображена:', point.name);
    },

    /**
     * Отобразить все точки взлёта
     */
    displayAllTakeoffPoints(points) {
        if (!this.takeoffLayer) return;

        this.takeoffLayer.getSource().clear();

        points.forEach(point => {
            this.displayTakeoffPoint(point);
        });
    },

    /**
     * Отобразить маршрут
     */
    displayRoute(route) {
        if (!this.routesLayer) return;

        const segments = route.segments || [];
        if (segments.length === 0) return;

        // Создание линии маршрута
        const coordinates = segments.map(s =>
            ol.proj.fromLonLat([s.lon, s.lat])
        );

        const lineFeature = new ol.Feature({
            geometry: new ol.geom.LineString(coordinates),
            routeId: route.id,
            status: route.status || 'pending',
            name: route.name
        });

        // Создание точек для сегментов
        segments.forEach((s, i) => {
            const pointFeature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([s.lon, s.lat])),
                type: 'segment',
                routeId: route.id,
                segmentId: i + 1,
                status: route.status || 'pending'
            });

            pointFeature.setStyle(new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 6,
                    fill: new ol.style.Fill({
                        color: route.status === 'full' ? '#48bb78' :
                               (route.status === 'partial' ? '#ed8936' :
                               (route.status === 'skipped' ? '#f56565' : '#a0aec0'))
                    }),
                    stroke: new ol.style.Stroke({
                        color: '#fff',
                        width: 2
                    })
                })
            }));

            this.routesLayer.getSource().addFeature(pointFeature);
        });

        this.routesLayer.getSource().addFeature(lineFeature);
        console.log('🗺️ Маршрут отображён:', route.name);
    },

    /**
     * Отобразить все маршруты
     */
    displayAllRoutes(routes) {
        if (!this.routesLayer) return;

        this.routesLayer.getSource().clear();

        routes.forEach(route => {
            this.displayRoute(route);
        });
    },

    /**
     * Отобразить переход между точками
     */
    displayTransition(from, to, label) {
        if (!this.transitionsLayer) return;

        const feature = new ol.Feature({
            geometry: new ol.geom.LineString([
                ol.proj.fromLonLat([from.lon, from.lat]),
                ol.proj.fromLonLat([to.lon, to.lat])
            ]),
            type: 'transition',
            label: label
        });

        this.transitionsLayer.getSource().addFeature(feature);
    },

    /**
     * Отобразить все переходы
     */
    displayAllTransitions(transitions) {
        if (!this.transitionsLayer) return;

        this.transitionsLayer.getSource().clear();

        transitions.forEach(t => {
            // Для простоты используем заглушки координат
            // В реальной реализации нужно брать из маршрутов
            this.displayTransition(
                { lon: 37.6, lat: 55.7 },
                { lon: 37.7, lat: 55.8 },
                t.from + ' → ' + t.to
            );
        });
    },

    /**
     * Отобразить зону антенны (круг 60 км)
     */
    displayAntennaZone(point, range = 60) {
        if (!this.routesLayer) return;

        const center = ol.proj.fromLonLat([point.lon, point.lat]);
        const radius = range * 1000; // км → метры

        const circle = new ol.geom.Circle(center, radius);

        const feature = new ol.Feature({
            geometry: circle,
            type: 'antennaZone'
        });

        feature.setStyle(new ol.style.Style({
            fill: new ol.style.Fill({
                color: 'rgba(102, 126, 234, 0.1)'
            }),
            stroke: new ol.style.Stroke({
                color: 'rgba(102, 126, 234, 0.5)',
                width: 2,
                lineDash: [10, 10]
            })
        }));

        this.routesLayer.getSource().addFeature(feature);
    },

    /**
     * Очистить все слои
     */
    clear() {
        if (this.takeoffLayer) {
            this.takeoffLayer.getSource().clear();
        }
        if (this.routesLayer) {
            this.routesLayer.getSource().clear();
        }
        if (this.transitionsLayer) {
            this.transitionsLayer.getSource().clear();
        }
        console.log('🗺️ Карта очищена');
    },

    /**
     * Приблизить к точкам взлёта
     */
    fitToTakeoffPoints() {
        if (!this.takeoffLayer) return;

        const features = this.takeoffLayer.getSource().getFeatures();
        if (features.length === 0) return;

        const extent = ol.extent.createEmpty();
        features.forEach(feature => {
            ol.extent.extend(extent, feature.getGeometry().getExtent());
        });

        this.map.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 500
        });
    },

    /**
     * Приблизить к маршрутам
     */
    fitToRoutes() {
        if (!this.routesLayer) return;

        const features = this.routesLayer.getSource().getFeatures();
        if (features.length === 0) return;

        const extent = ol.extent.createEmpty();
        features.forEach(feature => {
            ol.extent.extend(extent, feature.getGeometry().getExtent());
        });

        this.map.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 500
        });
    }
};

// Инициализация при загрузке
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiRouteMapModule;
}
