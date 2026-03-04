/**
 * MIRA - Работа с картой (map.js)
 * OpenLayers: слои, маршруты, KML, маркеры
 */

const MapModule = {
    map: null,
    view: null,
    layers: {},
    overlays: {},
    routeSource: null,
    markersSource: null,
    kmlSource: null,
    riskZonesSource: null,
    segmentsSource: null,
    currentRoute: null,
    routeMode: false,
    routePoints: [],
    selectPointMode: false,
    onPointSelected: null,

    /**
     * Инициализация карты
     */
    init(targetElement = 'map') {
        // Слои
        const osmLayer = new ol.layer.Tile({
            source: new ol.source.OSM(),
            visible: true,
            properties: { name: 'OSM' }
        });

        const satelliteLayer = new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attributions: 'Tiles © Esri'
            }),
            visible: false,
            properties: { name: 'Satellite' }
        });

        const terrainLayer = new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
                attributions: 'Tiles © Esri'
            }),
            visible: false,
            properties: { name: 'Terrain' }
        });

        // Слои для маркеров и маршрутов
        this.routeSource = new ol.source.Vector();
        this.markersSource = new ol.source.Vector();
        this.kmlSource = new ol.source.Vector();

        const routeLayer = new ol.layer.Vector({
            source: this.routeSource,
            style: this.routeStyle.bind(this)
        });

        const markersLayer = new ol.layer.Vector({
            source: this.markersSource
        });

        const kmlLayer = new ol.layer.Vector({
            source: this.kmlSource,
            style: this.kmlStyle.bind(this)
        });

        // Сохраняем ссылки на слои
        this.layers = {
            base: { osm: osmLayer, satellite: satelliteLayer, terrain: terrainLayer },
            route: routeLayer,
            markers: markersLayer,
            kml: kmlLayer
        };

        // Представление карты
        this.view = new ol.View({
            center: ol.proj.fromLonLat([37.6173, 55.7558]), // Москва
            zoom: 10,
            minZoom: 3,
            maxZoom: 18
        });

        // Карта
        this.map = new ol.Map({
            target: targetElement,
            layers: [
                osmLayer, satelliteLayer, terrainLayer,
                kmlLayer, routeLayer, markersLayer
            ],
            view: this.view,
            controls: ol.control.defaults.defaults({
                zoom: false,
                attribution: true
            })
        });

        // Обработчик кликов
        this.map.on('click', this.handleMapClick.bind(this));
        this.map.on('dblclick', this.handleMapDoubleClick.bind(this));

        // Popup для отображения информации
        this.createPopup();

        Utils.log('Карта инициализирована');
        return this.map;
    },

    /**
     * Создание popup
     */
    createPopup() {
        const container = document.createElement('div');
        container.className = 'ol-popup';
        container.id = 'popup';

        const content = document.createElement('div');
        content.className = 'ol-popup-content';
        container.appendChild(content);

        const closer = document.createElement('div');
        closer.className = 'ol-popup-closer';
        closer.innerHTML = '×';
        closer.style.cssText = 'position: absolute; top: 2px; right: 5px; cursor: pointer; font-size: 18px; color: #666;';
        closer.onclick = () => {
            this.overlays.popup.setPosition(undefined);
            closer.blur();
            return false;
        };
        container.appendChild(closer);

        this.overlays.popup = new ol.Overlay({
            element: container,
            autoPan: true,
            autoPanAnimation: { duration: 250 }
        });

        this.map.addOverlay(this.overlays.popup);
    },

    /**
     * Обработка клика по карте
     */
    handleMapClick(evt) {
        const coord = ol.proj.toLonLat(evt.coordinate);
        const lat = coord[1];
        const lon = coord[0];

        // Режим выбора точки для пилота
        if (this.selectPointMode && this.onPointSelected) {
            this.onPointSelected(lat, lon);
            return;
        }

        // Режим построения маршрута
        if (this.routeMode) {
            this.addRoutePoint(lat, lon);
            return;
        }

        // Показать координаты в popup
        this.showPopup(evt.coordinate, `
            <div class="ol-popup-coords">
                ${Utils.formatCoords(lat, lon)}
            </div>
        `);
    },

    /**
     * Обработка двойного клика
     */
    handleMapDoubleClick(evt) {
        this.overlays.popup.setPosition(undefined);
    },

    /**
     * Показать popup
     */
    showPopup(coordinate, content) {
        const popup = this.overlays.popup;
        popup.setPosition(coordinate);
        popup.getElement().querySelector('.ol-popup-content').innerHTML = content;
    },

    /**
     * Стили для маршрута
     */
    routeStyle(feature) {
        const style = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: '#667eea',
                width: 4,
                lineDash: [10, 5]
            }),
            image: new ol.style.Circle({
                radius: 8,
                fill: new ol.style.Fill({ color: '#667eea' }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
            })
        });
        return style;
    },

    /**
     * Стили для KML
     */
    kmlStyle(feature) {
        const geometry = feature.getGeometry();
        // Не отображаем отдельные точки, только линии
        if (geometry.getType() === 'Point') {
            return null;
        }
        const style = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: '#764ba2',
                width: 3
            })
        });
        return style;
    },

    /**
     * Стили для зон риска
     */
    riskZoneStyle(feature) {
        const riskLevel = feature.get('riskLevel');
        const colors = {
            low: 'rgba(56, 161, 105, 0.3)',
            medium: 'rgba(237, 137, 54, 0.3)',
            high: 'rgba(229, 62, 62, 0.3)'
        };
        const strokeColors = {
            low: '#38a169',
            medium: '#ed8936',
            high: '#e53e3e'
        };

        return new ol.style.Style({
            fill: new ol.style.Fill({ color: colors[riskLevel] || colors.low }),
            stroke: new ol.style.Stroke({
                color: strokeColors[riskLevel] || strokeColors.low,
                width: 2,
                lineDash: [5, 5]
            })
        });
    },

    /**
     * Стили для сегментов
     */
    segmentStyle(feature) {
        const riskLevel = feature.get('riskLevel') || 'low';
        const colors = {
            low: '#38a169',
            medium: '#ed8936',
            high: '#e53e3e'
        };
        const color = colors[riskLevel] || colors.low;

        return new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: color,
                width: 6,
                lineCap: 'round'
            })
        });
    },

    /**
     * Включение/выключение режима построения маршрута
     */
    toggleRouteMode() {
        this.routeMode = !this.routeMode;
        this.routePoints = [];
        this.routeSource.clear();

        if (this.routeMode) {
            Utils.log('Режим построения маршрута включён');
        } else {
            Utils.log('Режим построения маршрута выключен');
        }

        return this.routeMode;
    },

    /**
     * Добавление точки маршрута
     */
    addRoutePoint(lat, lon) {
        if (!this.routeMode) return;

        this.routePoints.push({ lat, lon });

        // Добавляем маркер точки
        const marker = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat]))
        });
        this.markersSource.addFeature(marker);

        // Рисуем линию маршрута
        if (this.routePoints.length > 1) {
            const coords = this.routePoints.map(p => ol.proj.fromLonLat([p.lon, p.lat]));
            const line = new ol.Feature({
                geometry: new ol.geom.LineString(coords)
            });
            this.routeSource.clear();
            this.routeSource.addFeature(line);
        }

        Utils.log(`Точка маршрута добавлена: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);

        // Если 2 точки - завершаем маршрут
        if (this.routePoints.length === 2) {
            this.routeMode = false;
            if (this.onRouteComplete) {
                this.onRouteComplete(this.routePoints);
            }
        }
    },

    /**
     * Очистка маршрута
     */
    clearRoute() {
        this.routePoints = [];
        this.routeSource.clear();
        this.markersSource.clear();
        this.segmentsSource.clear();
        this.currentRoute = null;
        Utils.log('Маршрут очищен');
    },

    /**
     * Загрузка KML файла
     */
    loadKML(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const kmlText = reader.result;
                    const parser = new ol.format.KML({
                        extractStyles: false
                    });
                    const features = parser.readFeatures(kmlText, {
                        featureProjection: 'EPSG:3857'
                    });

                    this.kmlSource.clear();
                    features.forEach(feature => {
                        this.kmlSource.addFeature(feature);
                    });

                    // Получаем координаты из KML
                    const routePoints = this.extractPointsFromKML(kmlText);
                    if (routePoints.length >= 2) {
                        this.currentRoute = {
                            id: Utils.generateId(),
                            name: file.name.replace('.kml', ''),
                            points: routePoints,
                            type: 'kml'
                        };
                    }

                    Utils.log(`KML загружен: ${file.name}`);
                    resolve({ features, routePoints });
                } catch (error) {
                    Utils.error('Ошибка parsing KML', error);
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    /**
     * Извлечение точек из KML
     */
    extractPointsFromKML(kmlText) {
        const points = [];
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
        
        // Ищем координаты в LineString
        const lineStrings = xmlDoc.getElementsByTagName('LineString');
        for (let ls of lineStrings) {
            const coords = ls.getElementsByTagName('coordinates')[0];
            if (coords) {
                const coordPairs = coords.textContent.trim().split(/\s+/);
                coordPairs.forEach(pair => {
                    const [lon, lat] = pair.split(',').map(Number);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        points.push({ lat, lon });
                    }
                });
            }
        }

        // Если нет LineString, ищем Point
        if (points.length === 0) {
            const points_ = xmlDoc.getElementsByTagName('Point');
            for (let p of points_) {
                const coords = p.getElementsByTagName('coordinates')[0];
                if (coords) {
                    const [lon, lat] = coords.textContent.trim().split(',').map(Number);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        points.push({ lat, lon });
                    }
                }
            }
        }

        return points;
    },

    /**
     * Разбиение маршрута на сегменты
     */
    splitRouteIntoSegments(routePoints, segmentLengthKm = 10) {
        if (routePoints.length < 2) return [];

        const segments = [];
        let currentSegment = [routePoints[0]];
        let currentDistance = 0;

        for (let i = 1; i < routePoints.length; i++) {
            const prev = routePoints[i - 1];
            const curr = routePoints[i];
            const dist = Utils.calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);

            if (currentDistance + dist >= segmentLengthKm) {
                // Завершаем текущий сегмент
                if (currentSegment.length > 0) {
                    segments.push([...currentSegment]);
                }
                // Начинаем новый сегмент
                currentSegment = [curr];
                currentDistance = 0;
            } else {
                currentSegment.push(curr);
                currentDistance += dist;
            }
        }

        // Добавляем последний сегмент
        if (currentSegment.length > 0) {
            segments.push(currentSegment);
        }

        Utils.log(`Маршрут разбит на ${segments.length} сегментов`);
        return segments;
    },

    /**
     * Отображение сегментов на карте
     */
    displaySegments(segments, risks = []) {
        this.segmentsSource.clear();

        segments.forEach((segment, index) => {
            if (segment.length < 2) return;

            const coords = segment.map(p => ol.proj.fromLonLat([p.lon, p.lat]));
            const line = new ol.Feature({
                geometry: new ol.geom.LineString(coords),
                riskLevel: risks[index] || 'low',
                segmentIndex: index
            });

            this.segmentsSource.addFeature(line);
        });
    },

    /**
     * Отображение зон риска
     */
    displayRiskZones(zones) {
        this.riskZonesSource.clear();

        zones.forEach(zone => {
            const coords = zone.coordinates.map(c => ol.proj.fromLonLat(c));
            const polygon = new ol.Feature({
                geometry: new ol.geom.Polygon([coords]),
                riskLevel: zone.riskLevel
            });
            this.riskZonesSource.addFeature(polygon);
        });
    },

    /**
     * Включение/выключение зон риска
     */
    toggleRiskZones() {
        const visible = this.layers.riskZones.getVisible();
        this.layers.riskZones.setVisible(!visible);
        return !visible;
    },

    /**
     * Смена базового слоя
     */
    changeBaseLayer(layerName) {
        Object.values(this.layers.base).forEach(layer => layer.setVisible(false));
        
        if (this.layers.base[layerName]) {
            this.layers.base[layerName].setVisible(true);
            Utils.log(`Слой переключен на: ${layerName}`);
        }
    },

    /**
     * Центрирование на точке
     */
    centerOnPoint(lat, lon, zoom = 12) {
        this.view.setCenter(ol.proj.fromLonLat([lon, lat]));
        this.view.setZoom(zoom);
    },

    /**
     * Отображение всех точек маршрута
     */
    fitToRoute() {
        if (this.routePoints.length === 0) return;

        const coords = this.routePoints.map(p => ol.proj.fromLonLat([p.lon, p.lat]));
        const extent = ol.extent.boundingExtent(coords);
        this.view.fit(extent, { padding: [50, 50, 50, 50], duration: 500 });
    },

    /**
     * Режим выбора точки
     */
    enableSelectPointMode(callback) {
        this.selectPointMode = true;
        this.onPointSelected = callback;
        Utils.log('Режим выбора точки включён');
    },

    /**
     * Отключение режима выбора точки
     */
    disableSelectPointMode() {
        this.selectPointMode = false;
        this.onPointSelected = null;
        Utils.log('Режим выбора точки выключен');
    },

    /**
     * Добавление маркера
     */
    addMarker(lat, lon, options = {}) {
        const marker = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat]))
        });

        if (options.title) {
            marker.set('title', options.title);
        }

        this.markersSource.addFeature(marker);
        return marker;
    },

    /**
     * Очистка маркеров
     */
    clearMarkers() {
        this.markersSource.clear();
    },

    /**
     * Получение текущего маршрута
     */
    getCurrentRoute() {
        return this.currentRoute;
    },

    /**
     * Установка маршрута
     */
    setRoute(route) {
        this.currentRoute = route;
        this.routePoints = route.points || [];

        // Отображаем маршрут на карте
        if (this.routePoints.length > 1) {
            const coords = this.routePoints.map(p => ol.proj.fromLonLat([p.lon, p.lat]));
            const line = new ol.Feature({
                geometry: new ol.geom.LineString(coords)
            });
            this.routeSource.clear();
            this.routeSource.addFeature(line);

            // Добавляем маркеры точек
            this.routePoints.forEach((p, i) => {
                this.addMarker(p.lat, p.lon, { title: `Точка ${i + 1}` });
            });
        }
    },

    /**
     * Показать оптимизированные маршруты (НОВОЕ)
     */
    showOptimizedRoutes(result) {
        console.log('🗺️ Визуализация оптимизированных маршрутов...', result);

        // Очистка
        this.routeSource.clear();

        if (!result || !result.direct) return;

        // Стили
        const directStyle = new ol.style.Style({
            stroke: new ol.style.Stroke({ color: '#e53e3e', width: 3, lineDash: [10, 10] })
        });

        const altStyle = new ol.style.Style({
            stroke: new ol.style.Stroke({ color: '#cbd5e0', width: 2, lineDash: [5, 5] })
        });

        const bestStyle = new ol.style.Style({
            stroke: new ol.style.Stroke({ color: '#38a169', width: 4 })
        });

        // Прямой маршрут (красный пунктир)
        const directCoords = result.direct.route.points.map(p => ol.proj.fromLonLat([p.lon, p.lat]));
        const directFeature = new ol.Feature({ geometry: new ol.geom.LineString(directCoords) });
        directFeature.setStyle(directStyle);
        directFeature.set('name', 'Прямой');
        directFeature.set('score', result.direct.score.toFixed(2));
        this.routeSource.addFeature(directFeature);

        // Альтернативы (серые)
        result.alternatives.forEach((alt, i) => {
            const coords = alt.route.points.map(p => ol.proj.fromLonLat([p.lon, p.lat]));
            const feature = new ol.Feature({ geometry: new ol.geom.LineString(coords) });
            feature.setStyle(alt.type === 'direct' ? directStyle : altStyle);
            feature.set('name', `Альтернатива ${i + 1}`);
            feature.set('score', alt.score.toFixed(2));
            this.routeSource.addFeature(feature);
        });

        // Лучший маршрут (зелёный сплошной)
        const bestCoords = result.best.route.points.map(p => ol.proj.fromLonLat([p.lon, p.lat]));
        const bestFeature = new ol.Feature({ geometry: new ol.geom.LineString(bestCoords) });
        bestFeature.setStyle(bestStyle);
        bestFeature.set('name', '⭐ Лучший');
        bestFeature.set('score', result.best.score.toFixed(2));
        bestFeature.set('savings', result.riskSavings);
        this.routeSource.addFeature(bestFeature);

        // Маркеры старта и финиша
        const start = result.direct.route.points[0];
        const end = result.direct.route.points.slice(-1)[0];

        this.addMarker(start.lat, start.lon, { title: '🚩 Старт', color: '#38a169' });
        this.addMarker(end.lat, end.lon, { title: '🏁 Финиш', color: '#e53e3e' });

        // Приближение к маршруту
        this.fitToFeatures(this.routeSource.getFeatures());

        console.log('✅ Маршруты показаны');
    },

    /**
     * Приближение к объектам (НОВОЕ)
     */
    fitToFeatures(features) {
        if (!features || features.length === 0) return;

        const extent = ol.extent.createEmpty();
        features.forEach(feature => {
            ol.extent.extend(extent, feature.getGeometry().getExtent());
        });

        this.view.fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 500
        });
    },

    /**
     * Очистка маршрутов (НОВОЕ)
     */
    clearRoutes() {
        this.routeSource.clear();
        this.markersSource.clear();
        this.currentRoute = null;
        this.routePoints = [];
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapModule;
}
