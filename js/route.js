/**
 * MIRA - Управление маршрутами (route.js)
 * KML, сегментация, кэширование, анализ
 */

const RouteModule = {
    currentRoute: null,
    segments: [],
    segmentAnalysis: [],
    segmentLengthKm: 10,

    /**
     * Хранилище данных анализа по маршрутам: { [routeId]: { segments, segmentAnalysis } }
     */
    routeAnalysisData: {},

    /**
     * Получение сохранённых маршрутов (геттер)
     */
    get savedRoutes() {
        return this.getSavedRoutes();
    },

    /**
     * Инициализация модуля
     */
    init() {
        this.loadAnalysisData();
        console.log('✅ RouteModule инициализирован, загружено анализов:', Object.keys(this.routeAnalysisData).length);
    },

    /**
     * Обновление состояния кнопки «Анализ»
     */
    updateAnalyzeButtonState() {
        const analyzeBtn = document.getElementById('getWeatherBtn');
        console.log('🔍 updateAnalyzeButtonState:', analyzeBtn);

        if (analyzeBtn) {
            const routes = Storage.getSavedRoutes();
            const hasRoutes = routes && routes.length > 0;
            console.log('📦 Маршрутов в Storage:', routes?.length, 'hasRoutes:', hasRoutes);
            console.log('📦 Маршруты:', routes);

            if (hasRoutes) {
                analyzeBtn.disabled = false;
                analyzeBtn.classList.remove('disabled');
                analyzeBtn.style.opacity = '';
                analyzeBtn.style.cursor = '';
                
                // Принудительно показываем кнопку
                analyzeBtn.style.display = 'flex';
                analyzeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                console.log('✅ Кнопка «Анализ» активирована (маршрутов:', routes.length + ')');
            } else {
                analyzeBtn.disabled = true;
                analyzeBtn.classList.add('disabled');
                console.log('🚫 Кнопка «Анализ» деактивирована (нет маршрутов)');
            }
        } else {
            console.error('❌ Кнопка getWeatherBtn не найдена');
        }
    },

    /**
     * Загрузка данных анализа из localStorage
     */
    loadAnalysisData() {
        const saved = localStorage.getItem('mira_route_analysis_data');
        if (saved) {
            try {
                this.routeAnalysisData = JSON.parse(saved);
                console.log('📦 Загружено данных анализа:', Object.keys(this.routeAnalysisData).length);
            } catch (e) {
                console.error('Ошибка загрузки данных анализа:', e);
                this.routeAnalysisData = {};
            }
        }
    },

    /**
     * Сохранение данных анализа в localStorage
     */
    saveAnalysisData() {
        try {
            localStorage.setItem('mira_route_analysis_data', JSON.stringify(this.routeAnalysisData));
            console.log('💾 Данные анализа сохранены в localStorage');
        } catch (e) {
            console.error('Ошибка сохранения данных анализа:', e);
        }
    },

    /**
     * Создание маршрута из точек
     */
    createRoute(points, name = null) {
        if (points.length < 2) {
            Utils.error('Недостаточно точек для маршрута');
            return null;
        }

        const route = {
            id: Utils.generateId(),
            name: name || `Маршрут ${new Date().toLocaleDateString('ru-RU')}`,
            points: points,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            distance: this.calculateRouteDistance(points),
            flightTime: this.estimateFlightTime(points),
            type: 'manual'
        };

        this.currentRoute = route;
        Utils.log(`Маршрут создан: ${route.name}, ${route.distance.toFixed(1)} км`);
        return route;
    },

    /**
     * Расчёт общей дистанции маршрута
     */
    calculateRouteDistance(points) {
        let total = 0;
        for (let i = 1; i < points.length; i++) {
            total += Utils.calculateDistance(
                points[i - 1].lat, points[i - 1].lon,
                points[i].lat, points[i].lon
            );
        }
        return total;
    },

    /**
     * Оценка времени полёта (при скорости 50 км/ч)
     */
    estimateFlightTime(points, speedKmh = 50) {
        const distance = this.calculateRouteDistance(points);
        return Math.round(distance / speedKmh * 60); // минуты
    },

    /**
     * Разбиение на сегменты
     */
    createSegments(route = this.currentRoute) {
        if (!route || !route.points) return [];

        this.segments = [];
        const points = route.points;
        let currentSegment = [points[0]];
        let currentDistance = 0;

        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const dist = Utils.calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);

            if (currentDistance + dist >= this.segmentLengthKm) {
                // Завершаем сегмент
                const segmentDist = currentDistance + dist;
                this.segments.push({
                    points: [...currentSegment, curr],
                    center: this.getSegmentCenter([...currentSegment, curr]),
                    distance: Math.round(segmentDist * 10) / 10,  // Ось маршрута
                    distanceTotal: Math.round(segmentDist * 2.5 * 10) / 10  // Полная (×2.5)
                });

                // Начинаем новый
                currentSegment = [curr];
                currentDistance = 0;
            } else {
                currentSegment.push(curr);
                currentDistance += dist;
            }
        }

        // Последний сегмент
        if (currentSegment.length > 0) {
            this.segments.push({
                points: [...currentSegment],
                center: this.getSegmentCenter(currentSegment),
                distance: Math.round(currentDistance * 10) / 10,  // Ось маршрута
                distanceTotal: Math.round(currentDistance * 2.5 * 10) / 10  // Полная (×2.5)
            });
        }

        Utils.log(`Создано ${this.segments.length} сегментов`);
        return this.segments;
    },

    /**
     * Оптимизация маршрута (НОВОЕ)
     */
    async optimizeRoute(startPoint, endPoint, options = {}) {
        const { maxDetour = 0.3, riskWeight = 0.7, distanceWeight = 0.3 } = options;

        console.log('🔍 Оптимизация маршрута...', {startPoint, endPoint, options});

        // 1. Прямой маршрут
        const directRoute = this.createRoute([startPoint, endPoint], 'Прямой');
        const directRisk = await this.calculateRouteRisk(directRoute);
        const directDistance = directRoute.distance;

        console.log('📊 Прямой маршрут:', {
            distance: directDistance.toFixed(1) + ' км',
            risk: directRisk.avgRisk.toFixed(2),
            score: directRisk.score.toFixed(2)
        });

        // 2. Генерация альтернатив
        const alternatives = this.generateAlternativeRoutes(startPoint, endPoint, maxDetour);
        console.log('🛤️ Сгенерировано альтернатив:', alternatives.length);

        // 3. Оценка
        const evaluatedRoutes = [
            {route: directRoute, risk: directRisk, score: directRisk.score, type: 'direct'},
            ...alternatives.map(alt => ({route: alt, risk: null, score: null, type: 'alternative'}))
        ];

        // 4. Расчёт рисков для альтернатив
        for (let i = 0; i < evaluatedRoutes.length; i++) {
            if (evaluatedRoutes[i].type === 'alternative') {
                const risk = await this.calculateRouteRisk(evaluatedRoutes[i].route);
                evaluatedRoutes[i].risk = risk;
                evaluatedRoutes[i].score = risk.score;
            }
        }

        // 5. Выбор лучшего
        const bestRoute = evaluatedRoutes.reduce((best, current) => 
            current.score < best.score ? current : best
        );

        console.log('✅ Лучший маршрут:', {
            type: bestRoute.type,
            distance: bestRoute.route.distance.toFixed(1) + ' км',
            risk: bestRoute.risk.avgRisk.toFixed(2),
            score: bestRoute.score.toFixed(2)
        });

        return {
            direct: directRoute,
            alternatives: evaluatedRoutes,
            best: bestRoute,
            riskSavings: ((directRisk.score - bestRoute.score) / directRisk.score * 100).toFixed(1) + '%'
        };
    },

    /**
     * Генерация альтернативных маршрутов (НОВОЕ)
     */
    generateAlternativeRoutes(start, end, maxDetour = 0.3) {
        const alternatives = [];
        const directDistance = Utils.calculateDistance(start.lat, start.lon, end.lat, end.lon);
        const maxDistance = directDistance * (1 + maxDetour);

        const midPoint = {lat: (start.lat + end.lat) / 2, lon: (start.lon + end.lon) / 2};

        const directions = [
            {lat: 0.01, lon: 0}, {lat: -0.01, lon: 0},
            {lat: 0, lon: 0.01}, {lat: 0, lon: -0.01},
            {lat: 0.01, lon: 0.01}, {lat: -0.01, lon: -0.01},
            {lat: 0.01, lon: -0.01}, {lat: -0.01, lon: 0.01}
        ];

        for (const dir of directions) {
            const waypoint = {lat: midPoint.lat + dir.lat, lon: midPoint.lon + dir.lon};
            const routeDistance = 
                Utils.calculateDistance(start.lat, start.lon, waypoint.lat, waypoint.lon) +
                Utils.calculateDistance(waypoint.lat, waypoint.lon, end.lat, end.lon);

            if (routeDistance <= maxDistance) {
                const route = this.createRoute([start, waypoint, end], 'Альтернатива');
                alternatives.push(route);
            }
        }

        return alternatives;
    },

    /**
     * Расчёт риска маршрута (НОВОЕ)
     */
    async calculateRouteRisk(route) {
        if (!route || !route.points) return null;

        const segments = this.createSegments(route);
        const segmentRisks = [];
        
        for (const segment of segments) {
            const center = segment.center;
            const forecast = await WeatherModule.getForecast(center.lat, center.lon);
            const analyzed = WeatherModule.analyzeForecast(forecast);
            const avgRisk = analyzed.hourly.slice(0, 6).reduce((sum, h) => sum + h.riskScore, 0) / 6;
            
            segmentRisks.push({
                segment: segment,
                avgRisk: avgRisk,
                distance: segment.distance
            });
        }

        const totalDistance = segmentRisks.reduce((sum, s) => sum + s.distance, 0);
        const weightedRisk = segmentRisks.reduce((sum, s) => sum + (s.avgRisk * s.distance), 0) / totalDistance;
        const distanceFactor = Math.min(1, route.distance / 100);
        const score = weightedRisk * (1 + distanceFactor * 0.2);

        return {
            avgRisk: weightedRisk,
            score: score,
            segments: segmentRisks,
            totalDistance: totalDistance
        };
    },

    /**
     * Сравнение маршрутов (НОВОЕ)
     */
    compareRoutes(routes) {
        if (!routes || routes.length === 0) return null;

        const evaluated = routes.map(r => ({
            route: r, name: r.name, distance: r.distance, flightTime: r.flightTime
        }));

        const minDist = Math.min(...evaluated.map(e => e.distance));
        const maxDist = Math.max(...evaluated.map(e => e.distance));

        return evaluated.map(e => ({
            ...e,
            normalizedDistance: (e.distance - minDist) / (maxDist - minDist) || 0
        })).sort((a, b) => a.distance - b.distance);
    },

    /**
     * Получение центральной точки сегмента
     */
    getSegmentCenter(points) {
        if (points.length === 0) return { lat: 0, lon: 0 };
        if (points.length === 1) return points[0];

        const midIndex = Math.floor(points.length / 2);
        return points[midIndex];
    },

    /**
     * Анализ сегментов
     */
    async analyzeSegments(date = null) {
        if (this.segments.length === 0) {
            Utils.error('Нет сегментов для анализа');
            return [];
        }

        this.segmentAnalysis = [];

        // Параллельная загрузка данных для всех сегментов
        const promises = this.segments.map(async (segment, i) => {
            const center = segment.center;

            try {
                const forecast = await WeatherModule.getForecast(center.lat, center.lon, date);
                const analyzed = WeatherModule.analyzeForecast(forecast);

                return {
                    segmentIndex: i,
                    coordinates: center,
                    distance: segment.distance,
                    forecast: forecast,
                    analyzed: analyzed,
                    riskLevel: analyzed.summary.overallRisk,
                    riskScore: this.calculateSegmentRiskScore(analyzed)
                };
            } catch (error) {
                Utils.error(`Ошибка анализа сегмента ${i}`, error);
                return {
                    segmentIndex: i,
                    coordinates: center,
                    error: error.message
                };
            }
        });

        // Ждём завершения всех запросов
        this.segmentAnalysis = await Promise.all(promises);

        // Сохраняем данные анализа для текущего маршрута
        if (this.currentRoute && this.currentRoute.id) {
            this.routeAnalysisData[this.currentRoute.id] = {
                segments: [...this.segments],
                segmentAnalysis: [...this.segmentAnalysis]
            };
            console.log('💾 Данные анализа сохранены для маршрута:', this.currentRoute.id, this.routeAnalysisData[this.currentRoute.id]);
            console.log('📦 routeAnalysisData:', Object.keys(this.routeAnalysisData));

            // Сохраняем в localStorage
            this.saveAnalysisData();
        } else {
            console.warn('⚠️ currentRoute или currentRoute.id не определён:', this.currentRoute);
        }

        Utils.log(`Проанализировано ${this.segmentAnalysis.length} сегментов`);
        return this.segmentAnalysis;
    },

    /**
     * Расчёт риска сегмента
     */
    calculateSegmentRiskScore(analyzed) {
        if (!analyzed || !analyzed.hourly) return 0;

        const highRiskCount = analyzed.hourly.filter(h => h.risk === 'high').length;
        const mediumRiskCount = analyzed.hourly.filter(h => h.risk === 'medium').length;
        const total = analyzed.hourly.length;

        const highRatio = highRiskCount / total;
        const mediumRatio = mediumRiskCount / total;

        if (highRatio > 0.3) return 3;
        if (highRatio > 0.1 || mediumRatio > 0.5) return 2;
        if (mediumRatio > 0.2) return 1;
        return 0;
    },

    /**
     * Получение данных сегмента по индексу
     */
    getSegmentData(index) {
        if (index < 0 || index >= this.segments.length) return null;

        const segment = this.segments[index];
        const analysis = this.segmentAnalysis[index];

        return {
            ...segment,
            analysis: analysis,
            index: index
        };
    },

    /**
     * Сохранение маршрута
     */
    saveRoute(route = this.currentRoute) {
        if (!route) return false;
        const result = Storage.saveRoute(route);
        
        // Обновление состояния кнопки теперь в desktop.html
        console.log('✅ Маршрут сохранён:', route.name);
        
        return result;
    },

    /**
     * Загрузка сохранённых маршрутов
     */
    getSavedRoutes() {
        return Storage.getSavedRoutes();
    },

    /**
     * Загрузка маршрута по ID
     */
    loadRoute(id) {
        const route = Storage.getRouteById(id);
        if (route) {
            this.currentRoute = route;
            this.createSegments(route);
        }
        return route;
    },

    /**
     * Удаление маршрута
     */
    deleteRoute(id) {
        return Storage.deleteRoute(id);
    },

    /**
     * Получить полный отчёт по всем маршрутам
     */
    getFullReport() {
        const routes = this.getSavedRoutes();
        const report = [];

        routes.forEach(route => {
            const analysisData = this.routeAnalysisData[route.id] || null;
            const pilotData = this.getPilotDataForRoute(route.id);

            report.push({
                route: route,
                analysisDate: analysisData?.segmentAnalysis?.[0]?.analyzed?.hourly?.[0]?.time || null,
                segments: analysisData?.segments || [],
                segmentAnalysis: analysisData?.segmentAnalysis || [],
                pilotData: pilotData,
                meteorology: analysisData?.segmentAnalysis?.[0]?.analyzed || null,
                flightWindows: analysisData?.segmentAnalysis?.[0]?.analyzed?.summary?.flightWindows || [],
                recommendations: this.generateRouteRecommendations(analysisData, pilotData)
            });
        });

        return report;
    },

    /**
     * Получить данные пилота для маршрута
     */
    getPilotDataForRoute(routeId) {
        // Проверяем WizardModule.stepData
        if (typeof WizardModule !== 'undefined' && WizardModule.stepData) {
            return WizardModule.stepData.pilotData || null;
        }
        return null;
    },

    /**
     * Сгенерировать рекомендации для маршрута
     */
    generateRouteRecommendations(analysisData, pilotData) {
        if (!analysisData || !analysisData.segmentAnalysis?.length) {
            return [];
        }

        const analyzed = analysisData.segmentAnalysis[0].analyzed;
        if (typeof WeatherModule !== 'undefined' && WeatherModule.generateRecommendations) {
            return WeatherModule.generateRecommendations(analyzed, pilotData);
        }

        return [];
    },

    /**
     * Удалить данные анализа для маршрута
     */
    deleteRouteAnalysis(routeId) {
        if (this.routeAnalysisData[routeId]) {
            delete this.routeAnalysisData[routeId];
            this.saveAnalysisData();
            console.log('🗑️ Данные анализа удалены для маршрута:', routeId);
        }
    },

    /**
     * Импорт KML
     */
    async importKML(file) {
        try {
            const result = await MapModule.loadKML(file);

            if (result.routePoints && result.routePoints.length >= 2) {
                this.currentRoute = {
                    id: Utils.generateId(),
                    name: file.name.replace('.kml', ''),
                    points: result.routePoints,
                    createdAt: new Date().toISOString(),
                    distance: this.calculateRouteDistance(result.routePoints),
                    flightTime: this.estimateFlightTime(result.routePoints),
                    type: 'kml'
                };

                this.createSegments();
                
                // Сохраняем маршрут
                this.saveRoute(this.currentRoute);
                
                return this.currentRoute;
            }

            return null;
        } catch (error) {
            Utils.error('Ошибка импорта KML', error);
            throw error;
        }
    },

    /**
     * Экспорт маршрута в KML
     */
    exportToKML(route = this.currentRoute) {
        if (!route || !route.points) return null;

        const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${route.name}</name>
    <Placemark>
      <name>${route.name}</name>
      <LineString>
        <coordinates>
          ${route.points.map(p => `${p.lon},${p.lat},0`).join('\n          ')}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

        const blob = new Blob([kmlContent], { type: 'application/kml+xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${route.name}.kml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Utils.log('Маршрут экспортирован в KML');
    },

    /**
     * Очистка текущего маршрута
     */
    clear() {
        this.currentRoute = null;
        this.segments = [];
        this.segmentAnalysis = [];
        MapModule.clearRoute();
        Utils.log('Маршрут очищен');
    },

    /**
     * Получение сводки по всем сегментам
     */
    getRouteSummary() {
        if (this.segmentAnalysis.length === 0) return null;

        const totalDistance = this.segments.reduce((sum, s) => sum + s.distance, 0);
        const avgRiskScore = this.segmentAnalysis.reduce((sum, s) => sum + (s.riskScore || 0), 0) / this.segmentAnalysis.length;
        
        const riskLevels = {
            low: this.segmentAnalysis.filter(s => s.riskLevel === 'low').length,
            medium: this.segmentAnalysis.filter(s => s.riskLevel === 'medium').length,
            high: this.segmentAnalysis.filter(s => s.riskLevel === 'high').length
        };

        let overallRisk = 'low';
        if (riskLevels.high > this.segmentAnalysis.length * 0.3) {
            overallRisk = 'high';
        } else if (riskLevels.medium > this.segmentAnalysis.length * 0.5) {
            overallRisk = 'medium';
        }

        return {
            totalSegments: this.segments.length,
            totalDistance: totalDistance.toFixed(1),
            avgRiskScore: avgRiskScore.toFixed(1),
            riskLevels: riskLevels,
            overallRisk: overallRisk,
            flightTime: this.estimateFlightTime(this.currentRoute.points)
        };
    },

    /**
     * Установка длины сегмента
     */
    setSegmentLength(lengthKm) {
        this.segmentLengthKm = lengthKm;
        if (this.currentRoute) {
            this.createSegments();
        }
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RouteModule;
}
