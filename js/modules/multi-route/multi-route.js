/**
 * MIRA - Multi-Route Module
 * Управление несколькими маршрутами и точками взлёта
 * Версия: 0.4.0 — с акцентом на метеоанализ
 */

const MultiRouteModule = {
    /**
     * Точки взлёта (базы)
     */
    takeoffPoints: [],

    /**
     * Загруженные маршруты
     */
    routes: [],

    /**
     * Оптимизированное распределение
     */
    assignment: null,

    /**
     * Конфигурация БВС
     */
    droneConfig: {
        cruiseSpeed: 69,        // км/ч (крейсерская скорость)
        energyPerKm: 8,         // Вт·ч/км (базовый расход)
        batteryCapacity: 39000, // мА·ч
        batteryVoltage: 25.4,   // В (полное)
        minVoltage: 16.8        // В (посадка)
    },

    /**
     * Инициализация модуля
     */
    init() {
        this.takeoffPoints = [];
        this.routes = [];
        this.assignment = null;
        console.log('✅ MultiRouteModule инициализирован');
        
        // Загрузка сохранённых маршрутов из Storage
        this.loadSavedRoutes();
    },

    /**
     * Загрузка сохранённых маршрутов
     */
    loadSavedRoutes() {
        if (typeof Storage === 'undefined') return;
        
        try {
            const savedRoutes = Storage.getSavedRoutes();
            if (savedRoutes && savedRoutes.length > 0) {
                console.log('📦 Загрузка', savedRoutes.length, 'сохранённых маршрутов...');
                
                savedRoutes.forEach(routeData => {
                    // Преобразуем формат Storage в формат MultiRoute
                    const route = {
                        id: routeData.id,
                        name: routeData.name || routeData.routeName || 'Маршрут',
                        points: routeData.points || [],
                        segments: routeData.segments || []
                    };
                    
                    // Добавляем маршрут через addRoute (с активацией кнопки)
                    this.addRoute(route);
                });
                
                console.log('✅ Загружено', this.routes.length, 'маршрутов');
            } else {
                // Если маршрутов нет, проверяем кнопку
                setTimeout(() => this.updateAnalyzeButtonState(), 100);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки маршрутов:', error);
        }
    },

    /**
     * Добавить точку взлёта
     */
    addTakeoffPoint(point) {
        const takeoffPoint = {
            id: 'base-' + Date.now(),
            name: point.name || `База ${this.takeoffPoints.length + 1}`,
            lat: point.lat,
            lon: point.lon,
            priority: point.priority || this.takeoffPoints.length + 1,
            battery: {
                voltage: point.voltage || 25.4,
                capacity: point.capacity || 39000,
                minVoltage: point.minVoltage || 19.8
            },
            antenna: point.antenna || 60,  // км
            weatherWindow: null
        };

        this.takeoffPoints.push(takeoffPoint);
        console.log('✅ Добавлена точка взлёта:', takeoffPoint.name);
        return takeoffPoint;
    },

    /**
     * Удалить точку взлёта
     */
    removeTakeoffPoint(id) {
        this.takeoffPoints = this.takeoffPoints.filter(p => p.id !== id);
        console.log('❌ Удалена точка взлёта:', id);
    },

    /**
     * Добавить маршрут (с правильной сегментацией 10 км)
     */
    addRoute(route) {
        // Конвертируем points в segments если нужно
        let segments = route.segments || [];
        
        if (segments.length === 0 && route.points && route.points.length > 0) {
            // Используем RouteModule для правильной сегментации (10 км)
            if (typeof RouteModule !== 'undefined') {
                // Временно устанавливаем маршрут в RouteModule
                const tempRoute = {
                    id: route.id,
                    name: route.name,
                    points: route.points
                };
                
                // Создаём сегменты по 10 км
                RouteModule.currentRoute = tempRoute;
                const createdSegments = RouteModule.createSegments(tempRoute);
                
                // Копируем сегменты
                segments = createdSegments.map((s, index) => ({
                    id: index + 1,
                    lat: s.center.lat,
                    lon: s.center.lon,
                    distance: Math.round(s.distance * 10) / 10
                }));
                
                console.log('✅ Создано', segments.length, 'сегментов по 10 км');
            } else {
                // Fallback: просто конвертируем точки
                segments = route.points.map((p, index) => ({
                    id: index + 1,
                    lat: p.lat,
                    lon: p.lon,
                    distance: 5
                }));
            }
        }
        
        // Расчёт общей дистанции
        const totalDistance = segments.reduce((sum, s) => sum + (s.distance || 0), 0);

        const newRoute = {
            id: route.id || 'route-' + Date.now(),
            name: route.name || `Маршрут ${this.routes.length + 1}`,
            segments: segments,
            totalDistance: Math.round(totalDistance * 10) / 10,
            status: 'pending',
            entryPoint: null,
            flightPlan: null,
            assignedBase: null,
            takeoffPoint: null,
            assignedBaseId: null
        };

        this.routes.push(newRoute);
        console.log('✅ Добавлен маршрут:', newRoute.name, 'сегментов:', segments.length, 'дистанция:', newRoute.totalDistance.toFixed(1), 'км');
        
        // Активация кнопки «Анализ» при загрузке маршрутов
        this.enableAnalyzeButton();
        
        return newRoute;
    },

    /**
     * Активация кнопки «Анализ»
     */
    enableAnalyzeButton() {
        const analyzeBtn = document.getElementById('getWeatherBtn');
        if (analyzeBtn && this.routes.length > 0) {
            analyzeBtn.disabled = false;
            analyzeBtn.classList.remove('disabled');
            analyzeBtn.style.opacity = '1';
            analyzeBtn.style.cursor = 'pointer';
            console.log('✅ Кнопка «Анализ» активирована (маршрутов:', this.routes.length + ')');
        }
    },

    /**
     * Удалить маршрут
     */
    removeRoute(id) {
        this.routes = this.routes.filter(r => r.id !== id);
        console.log('❌ Удалён маршрут:', id);
        
        // Деактивация кнопки «Анализ» если маршрутов не осталось
        this.updateAnalyzeButtonState();
    },

    /**
     * Обновление состояния кнопки «Анализ»
     */
    updateAnalyzeButtonState() {
        const analyzeBtn = document.getElementById('getWeatherBtn');
        if (analyzeBtn) {
            const hasRoutes = this.routes && this.routes.length > 0;
            if (hasRoutes) {
                this.enableAnalyzeButton();
            } else {
                analyzeBtn.disabled = true;
                analyzeBtn.classList.add('disabled');
                analyzeBtn.style.opacity = '0.5';
                analyzeBtn.style.cursor = 'not-allowed';
                console.log('🚫 Кнопка «Анализ» деактивирована (нет маршрутов)');
            }
        }
    },

    /**
     * Проверка маршрута на доступность из точки взлёта (радиус антенны)
     * @param {object} route - маршрут с сегментами
     * @param {object} takeoffPoint - точка взлёта {lat, lon}
     * @param {number} antennaRange - радиус антенны в км (по умолчанию 60)
     * @returns {object} { status, reason, segmentsInRange, segmentsOutOfRange, inRangePercent }
     */
    checkRouteAvailability(route, takeoffPoint, antennaRange = 60) {
        if (!route.segments || route.segments.length === 0) {
            return { 
                available: false, 
                reason: 'no_segments',
                segmentsInRange: [],
                segmentsOutOfRange: [],
                inRangePercent: 0
            };
        }
        
        const segmentsInRange = [];
        const segmentsOutOfRange = [];
        
        // Проверяем КАЖДЫЙ сегмент
        for (const segment of route.segments) {
            const distance = this.calculateDistance(
                takeoffPoint,
                { lat: segment.lat, lon: segment.lon }
            );
            
            const segmentInfo = {
                segmentId: segment.id,
                lat: segment.lat,
                lon: segment.lon,
                distance: Math.round(distance * 10) / 10,
                inRange: distance <= antennaRange
            };
            
            if (distance <= antennaRange) {
                segmentsInRange.push(segmentInfo);
            } else {
                segmentsOutOfRange.push(segmentInfo);
            }
        }
        
        // Определение статуса
        const totalSegments = route.segments.length;
        const inRangePercent = (segmentsInRange.length / totalSegments) * 100;
        
        let status, reason;
        
        if (segmentsOutOfRange.length === 0) {
            // ✅ Все сегменты в радиусе
            status = 'full';
            reason = 'all_in_range';
        } else if (segmentsInRange.length === 0) {
            // ❌ Все сегменты вне радиуса
            status = 'unavailable';
            reason = 'all_out_of_range';
        } else {
            // ⚠️ Частичная доступность
            status = 'partial';
            reason = `partial_in_range (${inRangePercent.toFixed(0)}%)`;
        }
        
        return {
            status,
            reason,
            totalSegments,
            segmentsInRange,
            segmentsOutOfRange,
            inRangePercent,
            maxDistance: Math.max(
                ...segmentsInRange.map(s => s.distance),
                ...segmentsOutOfRange.map(s => s.distance)
            ),
            minDistance: Math.min(
                ...segmentsInRange.map(s => s.distance),
                ...segmentsOutOfRange.map(s => s.distance)
            )
        };
    },

    /**
     * Группировка маршрутов по точкам взлёта
     */
    groupRoutesByTakeoffPoints() {
        const routesByBase = {};
        
        // Инициализация для всех баз
        for (const base of this.takeoffPoints) {
            routesByBase[base.id] = [];
        }
        
        // Распределение маршрутов по базам
        for (const route of this.routes) {
            if (route.takeoffPoint?.baseId) {
                const baseId = route.takeoffPoint.baseId;
                
                if (!routesByBase[baseId]) {
                    routesByBase[baseId] = [];
                }
                
                routesByBase[baseId].push(route);
            } else {
                // Маршруты без назначенной точки
                if (!routesByBase['unassigned']) {
                    routesByBase['unassigned'] = [];
                }
                routesByBase['unassigned'].push(route);
            }
        }
        
        return routesByBase;
    },

    /**
     * Расчёт расстояния между двумя точками (Haversine)
     */
    calculateDistance(point1, point2) {
        const R = 6371; // Радиус Земли, км
        const dLat = this.toRad(point2.lat - point1.lat);
        const dLon = this.toRad(point2.lon - point1.lon);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(point1.lat)) *
            Math.cos(this.toRad(point2.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    /**
     * Конвертация в радианы
     */
    toRad(degrees) {
        return degrees * Math.PI / 180;
    },

    /**
     * Расчёт влияния ветра на полёт БВС
     * @param {number} droneSpeed - скорость дрона (км/ч)
     * @param {number} windSpeed - скорость ветра (м/с)
     * @param {number} droneHeading - курс дрона (градусы 0-360)
     * @param {number} windDirection - направление ветра (градусы 0-360)
     * @returns {object} { groundSpeed, timeFactor, energyFactor, windComponent, isHeadwind, isTailwind }
     */
    calculateWindEffect(droneSpeed = 69, windSpeed, droneHeading, windDirection) {
        if (!windSpeed || !droneHeading || !windDirection) {
            return {
                groundSpeed: droneSpeed,
                timeFactor: 1,
                energyFactor: 1,
                windComponent: 0,
                isHeadwind: false,
                isTailwind: false,
                isCalm: true
            };
        }

        // Конвертация ветра из м/с в км/ч
        const windSpeedKmh = windSpeed * 3.6;

        // Угол между курсом и ветром
        let angle = droneHeading - windDirection;
        if (angle < -180) angle += 360;
        if (angle > 180) angle -= 360;

        // Попутная/встречная составляющая
        const windComponent = windSpeedKmh * Math.cos(this.toRad(angle));

        // Путевая скорость (минимум 15 км/ч для безопасности)
        const groundSpeed = Math.max(15, droneSpeed + windComponent);

        // Коэффициенты
        const timeFactor = droneSpeed / groundSpeed;
        const energyFactor = timeFactor;

        return {
            groundSpeed: Math.round(groundSpeed * 10) / 10,
            timeFactor: Math.round(timeFactor * 100) / 100,
            energyFactor: Math.round(energyFactor * 100) / 100,
            windComponent: Math.round(windComponent * 10) / 10,
            isHeadwind: windComponent < -2,    // Встречный (> 2 м/с)
            isTailwind: windComponent > 2,     // Попутный (> 2 м/с)
            isCalm: Math.abs(windComponent) <= 2  // Штиль
        };
    },

    /**
     * Расчёт доступной энергии батареи
     * @param {object} battery - { voltage, capacity, minVoltage }
     * @returns {object} { usable, reserve, total }
     */
    calculateAvailableEnergy(battery) {
        const voltageFull = battery.voltage || this.droneConfig.batteryVoltage;
        const capacityAh = (battery.capacity || this.droneConfig.batteryCapacity) / 1000;

        // Полная энергия батареи (Вт·ч)
        const totalEnergy = voltageFull * capacityAh;

        // Доступная энергия (80% DoD - Depth of Discharge)
        const availableEnergy = totalEnergy * 0.80;

        // Резерв 15% от доступной
        const reserveEnergy = availableEnergy * 0.15;

        // Полезная энергия (доступная минус резерв)
        const usableEnergy = availableEnergy - reserveEnergy;

        return {
            usable: Math.round(usableEnergy),      // ~673 Вт·ч
            reserve: Math.round(reserveEnergy),    // ~119 Вт·ч
            total: Math.round(totalEnergy)         // ~991 Вт·ч
        };
    },

    /**
     * Расчёт плана полёта для сегментов (с учётом ветра)
     */
    calculateFlightPlanForSegments(route, segmentsToAnalyze, takeoffPoint, weatherData) {
        if (!segmentsToAnalyze || segmentsToAnalyze.length === 0) return null;

        let totalDistance = 0;
        let totalTime = 0;
        let totalEnergy = 0;
        let windSummary = { headwind: 0, tailwind: 0, calm: 0, segments: [] };

        // Расчёт для каждого сегмента
        for (let i = 0; i < segmentsToAnalyze.length; i++) {
            const segment = segmentsToAnalyze[i];
            const distance = segment.distance || 5;
            totalDistance += distance;

            // Получаем ветер для сегмента
            const windData = this.getWindForSegment(segment, weatherData, i);

            // Курс дрона на этом сегменте (если есть следующий сегмент)
            const nextSegment = segmentsToAnalyze[i + 1];
            const heading = nextSegment ? this.calculateHeading(segment, nextSegment) : 0;

            // Расчёт с учётом ветра
            const windEffect = this.calculateWindEffect(
                this.droneConfig.cruiseSpeed,
                windData.speed,
                heading,
                windData.direction
            );

            // Время и энергия для сегмента
            const baseTime = distance / this.droneConfig.cruiseSpeed;  // часы
            const segmentTime = baseTime * windEffect.timeFactor * 60;  // минуты

            const baseEnergy = distance * this.droneConfig.energyPerKm;
            const segmentEnergy = baseEnergy * windEffect.energyFactor;

            totalTime += segmentTime;
            totalEnergy += segmentEnergy;

            // Статистика ветра
            if (windEffect.isHeadwind) windSummary.headwind++;
            else if (windEffect.isTailwind) windSummary.tailwind++;
            else windSummary.calm++;

            windSummary.segments.push({
                segmentId: segment.id,
                windSpeed: windData.speed,
                windDirection: windData.direction,
                windEffect: windEffect.isHeadwind ? 'headwind' : (windEffect.isTailwind ? 'tailwind' : 'calm'),
                energy: Math.round(segmentEnergy),
                time: Math.round(segmentTime)
            });
        }

        // Базовая энергия (без ветра)
        const baseEnergy = Math.round(totalDistance * this.droneConfig.energyPerKm);

        // Влияние ветра
        const windEffectTotal = totalEnergy - baseEnergy;
        const windEffectPercent = Math.round((windEffectTotal / baseEnergy) * 100);

        // Определение преобладающего ветра
        let windCondition = 'Смешанный';
        let windIcon = '🟡';
        if (windSummary.tailwind > windSummary.headwind * 1.5) {
            windCondition = 'Попутный';
            windIcon = '🟢';
        } else if (windSummary.headwind > windSummary.tailwind * 1.5) {
            windCondition = 'Встречный';
            windIcon = '🔴';
        }

        return {
            total: {
                distance: Math.round(totalDistance * 10) / 10,
                time: Math.round(totalTime),
                energy: Math.round(totalEnergy),
                baseEnergy: baseEnergy,
                windEffect: windEffectTotal,
                windEffectPercent: windEffectPercent
            },
            windSummary: {
                headwind: windSummary.headwind,
                tailwind: windSummary.tailwind,
                calm: windSummary.calm,
                condition: windCondition,
                icon: windIcon,
                segments: windSummary.segments
            },
            segmentsCount: segmentsToAnalyze.length
        };
    },

    /**
     * Расчёт плана полёта для маршрута от точки входа (с учётом ветра)
     */
    calculateFlightPlan(route, entryPoint, takeoffPoint, weatherData) {
        if (!entryPoint || !route.segments) return null;

        const entryIndex = entryPoint.segmentId - 1;
        const segments = route.segments;

        // Расчёт левой стороны (от точки входа к началу)
        let leftDistance = 0;
        let leftTime = 0;
        let leftEnergy = 0;
        let windSummary = { headwind: 0, tailwind: 0, calm: 0, segments: [] };

        for (let i = entryIndex; i > 0; i--) {
            const segment = segments[i];
            const distance = segment.distance || 5;
            leftDistance += distance;

            // Получаем ветер для сегмента из weatherData
            const windData = this.getWindForSegment(segment, weatherData, i);

            // Курс дрона на этом сегменте
            const prevSegment = segments[i - 1];
            const heading = prevSegment ? this.calculateHeading(prevSegment, segment) : 0;

            // Расчёт с учётом ветра
            const windEffect = this.calculateWindEffect(
                this.droneConfig.cruiseSpeed,
                windData.speed,
                heading,
                windData.direction
            );

            // Время и энергия для сегмента
            const baseTime = distance / this.droneConfig.cruiseSpeed;  // часы
            const segmentTime = baseTime * windEffect.timeFactor * 60;  // минуты

            const baseEnergy = distance * this.droneConfig.energyPerKm;
            const segmentEnergy = baseEnergy * windEffect.energyFactor;

            leftTime += segmentTime;
            leftEnergy += segmentEnergy;

            // Статистика ветра
            if (windEffect.isHeadwind) windSummary.headwind++;
            else if (windEffect.isTailwind) windSummary.tailwind++;
            else windSummary.calm++;

            windSummary.segments.push({
                segmentId: i,
                windSpeed: windData.speed,
                windDirection: windData.direction,
                windEffect: windEffect.isHeadwind ? 'headwind' : (windEffect.isTailwind ? 'tailwind' : 'calm'),
                energy: Math.round(segmentEnergy),
                time: Math.round(segmentTime)
            });
        }

        // Расчёт правой стороны (от точки входа к концу)
        let rightDistance = 0;
        let rightTime = 0;
        let rightEnergy = 0;

        for (let i = entryIndex; i < segments.length; i++) {
            const segment = segments[i];
            const distance = segment.distance || 5;
            rightDistance += distance;

            // Получаем ветер для сегмента
            const windData = this.getWindForSegment(segment, weatherData, i);

            // Курс дрона на этом сегменте
            const nextSegment = segments[i + 1];
            const heading = nextSegment ? this.calculateHeading(segment, nextSegment) : 0;

            // Расчёт с учётом ветра
            const windEffect = this.calculateWindEffect(
                this.droneConfig.cruiseSpeed,
                windData.speed,
                heading,
                windData.direction
            );

            // Время и энергия для сегмента
            const baseTime = distance / this.droneConfig.cruiseSpeed;
            const segmentTime = baseTime * windEffect.timeFactor * 60;

            const baseEnergy = distance * this.droneConfig.energyPerKm;
            const segmentEnergy = baseEnergy * windEffect.energyFactor;

            rightTime += segmentTime;
            rightEnergy += segmentEnergy;

            // Статистика ветра
            if (windEffect.isHeadwind) windSummary.headwind++;
            else if (windEffect.isTailwind) windSummary.tailwind++;
            else windSummary.calm++;

            windSummary.segments.push({
                segmentId: i,
                windSpeed: windData.speed,
                windDirection: windData.direction,
                windEffect: windEffect.isHeadwind ? 'headwind' : (windEffect.isTailwind ? 'tailwind' : 'calm'),
                energy: Math.round(segmentEnergy),
                time: Math.round(segmentTime)
            });
        }

        // Общее расстояние и энергия
        const totalDistance = leftDistance + rightDistance;
        const totalTime = Math.round(leftTime + rightTime);
        const totalEnergy = Math.round(leftEnergy + rightEnergy);

        // Базовая энергия (без ветра)
        const baseEnergy = Math.round(totalDistance * this.droneConfig.energyPerKm);

        // Влияние ветра
        const windEffectTotal = totalEnergy - baseEnergy;
        const windEffectPercent = Math.round((windEffectTotal / baseEnergy) * 100);

        // Определение преобладающего ветра
        let windCondition = 'Смешанный';
        let windIcon = '🟡';
        if (windSummary.tailwind > windSummary.headwind * 1.5) {
            windCondition = 'Попутный';
            windIcon = '🟢';
        } else if (windSummary.headwind > windSummary.tailwind * 1.5) {
            windCondition = 'Встречный';
            windIcon = '🔴';
        }

        return {
            entryPoint: entryPoint,
            leftSide: {
                distance: Math.round(leftDistance * 10) / 10,
                time: Math.round(leftTime),
                energy: Math.round(leftEnergy)
            },
            rightSide: {
                distance: Math.round(rightDistance * 10) / 10,
                time: Math.round(rightTime),
                energy: Math.round(rightEnergy)
            },
            total: {
                distance: Math.round(totalDistance * 10) / 10,
                time: totalTime,
                energy: totalEnergy,
                baseEnergy: baseEnergy,
                windEffect: windEffectTotal,
                windEffectPercent: windEffectPercent
            },
            windSummary: {
                headwind: windSummary.headwind,
                tailwind: windSummary.tailwind,
                calm: windSummary.calm,
                condition: windCondition,
                icon: windIcon,
                segments: windSummary.segments
            }
        };
    },

    /**
     * Расчёт плана полёта с индивидуальными метеоданными для каждого сегмента (НОВОЕ)
     * @param {object} route - маршрут
     * @param {array} segmentsToAnalyze - сегменты для анализа
     * @param {array} segmentWeatherData - массив данных погоды для каждого сегмента [{segmentId, weather}, ...]
     * @param {object} takeoffPoint - точка взлёта
     * @returns {object} flightPlan
     */
    calculateFlightPlanWithIndividualWeather(route, segmentsToAnalyze, segmentWeatherData, takeoffPoint) {
        if (!segmentsToAnalyze || segmentsToAnalyze.length === 0) return null;

        let totalDistance = 0;
        let totalTime = 0;
        let totalEnergy = 0;
        let windSummary = { headwind: 0, tailwind: 0, calm: 0, segments: [] };

        // Расчёт для каждого сегмента с индивидуальной погодой
        for (let i = 0; i < segmentsToAnalyze.length; i++) {
            const segment = segmentsToAnalyze[i];
            const distance = segment.distance || 5;
            totalDistance += distance;

            // Находим погоду для этого сегмента
            const segmentWeather = segmentWeatherData.find(sw => sw.segmentId === segment.id);
            const weather = segmentWeather ? segmentWeather.weather : { hourly: [] };

            // Получаем ветер для сегмента из его собственных данных
            const windData = this.getWindForSegment(segment, weather, i);

            // Курс дрона на этом сегменте (если есть следующий сегмент)
            const nextSegment = segmentsToAnalyze[i + 1];
            const heading = nextSegment ? this.calculateHeading(segment, nextSegment) : 0;

            // Расчёт с учётом ветра
            const windEffect = this.calculateWindEffect(
                this.droneConfig.cruiseSpeed,
                windData.speed,
                heading,
                windData.direction
            );

            // Время и энергия для сегмента
            const baseTime = distance / this.droneConfig.cruiseSpeed;  // часы
            const segmentTime = baseTime * windEffect.timeFactor * 60;  // минуты

            const baseEnergy = distance * this.droneConfig.energyPerKm;
            const segmentEnergy = baseEnergy * windEffect.energyFactor;

            totalTime += segmentTime;
            totalEnergy += segmentEnergy;

            // Статистика ветра
            if (windEffect.isHeadwind) windSummary.headwind++;
            else if (windEffect.isTailwind) windSummary.tailwind++;
            else windSummary.calm++;

            windSummary.segments.push({
                segmentId: segment.id,
                windSpeed: windData.speed,
                windDirection: windData.direction,
                windEffect: windEffect.isHeadwind ? 'headwind' : (windEffect.isTailwind ? 'tailwind' : 'calm'),
                energy: Math.round(segmentEnergy),
                time: Math.round(segmentTime)
            });
        }

        // Базовая энергия (без ветра)
        const baseEnergy = Math.round(totalDistance * this.droneConfig.energyPerKm);

        // Влияние ветра
        const windEffectTotal = totalEnergy - baseEnergy;
        const windEffectPercent = Math.round((windEffectTotal / baseEnergy) * 100);

        // Определение преобладающего ветра
        let windCondition = 'Смешанный';
        let windIcon = '🟡';
        if (windSummary.tailwind > windSummary.headwind * 1.5) {
            windCondition = 'Попутный';
            windIcon = '🟢';
        } else if (windSummary.headwind > windSummary.tailwind * 1.5) {
            windCondition = 'Встречный';
            windIcon = '🔴';
        }

        return {
            total: {
                distance: Math.round(totalDistance * 10) / 10,
                time: Math.round(totalTime),
                energy: Math.round(totalEnergy),
                baseEnergy: baseEnergy,
                windEffect: windEffectTotal,
                windEffectPercent: windEffectPercent
            },
            windSummary: {
                headwind: windSummary.headwind,
                tailwind: windSummary.tailwind,
                calm: windSummary.calm,
                condition: windCondition,
                icon: windIcon,
                segments: windSummary.segments
            },
            segmentsCount: segmentsToAnalyze.length,
            hasIndividualWeather: true  // Флаг, что использовались индивидуальные данные
        };
    },

    /**
     * Получение ветра для сегмента (ОБНОВЛЁННАЯ)
     */
    getWindForSegment(segment, weatherData, segmentIndex) {
        if (!weatherData) {
            return { speed: 0, direction: 0 };
        }

        // Получаем hourly из разных возможных форматов
        let hourly = null;
        
        if (weatherData.hourly && Array.isArray(weatherData.hourly)) {
            // Прямой формат: { hourly: [...] }
            hourly = weatherData.hourly;
        } else if (weatherData.analyzed && weatherData.analyzed.hourly && Array.isArray(weatherData.analyzed.hourly)) {
            // Формат с analyzed: { analyzed: { hourly: [...] } }
            hourly = weatherData.analyzed.hourly;
        } else if (weatherData.data && weatherData.data.hourly && Array.isArray(weatherData.data.hourly)) {
            // Формат с data: { data: { hourly: [...] } }
            hourly = weatherData.data.hourly;
        }

        if (!hourly || hourly.length === 0) {
            return { speed: 0, direction: 0 };
        }

        // Берём средние данные за первые 6 часов
        const hourlySlice = hourly.slice(0, 6);
        const avgWindSpeed = hourlySlice.reduce((sum, h) => sum + (h.wind10m || 0), 0) / hourlySlice.length;
        const avgWindDir = hourlySlice.reduce((sum, h) => sum + (h.windDirection10m || 0), 0) / hourlySlice.length;

        return {
            speed: Math.round(avgWindSpeed * 10) / 10,
            direction: Math.round(avgWindDir)
        };
    },

    /**
     * Получение погоды для перехода между точками (НОВОЕ)
     * @param {object} fromPoint - точка начала {lat, lon}
     * @param {object} toPoint - точка назначения {lat, lon}
     * @param {string} date - дата анализа
     * @returns {Promise<object>} weatherData - данные о погоде
     */
    async getWeatherForTransition(fromPoint, toPoint, date) {
        // Вычисляем промежуточную точку
        const midPoint = {
            lat: (fromPoint.lat + toPoint.lat) / 2,
            lon: (fromPoint.lon + toPoint.lon) / 2
        };

        try {
            const weather = await WeatherModule.getForecast(midPoint.lat, midPoint.lon, date);
            return weather;
        } catch (error) {
            console.error('Ошибка получения погоды для перехода:', error);
            return { hourly: [] };
        }
    },

    /**
     * Расчёт энергии для перехода с учётом ветра (НОВОЕ)
     * @param {object} fromPoint - точка начала {lat, lon}
     * @param {object} toPoint - точка назначения {lat, lon}
     * @param {object} weatherData - данные о погоде
     * @returns {object} { distance, energy, time, windEffect }
     */
    calculateTransitionEnergy(fromPoint, toPoint, weatherData) {
        const distance = this.calculateDistance(fromPoint, toPoint);
        
        // Получаем ветер для перехода
        const windData = this.getWindForSegment({ lat: fromPoint.lat, lon: fromPoint.lon }, weatherData, 0);
        
        // Расчёт курса перехода
        const heading = this.calculateHeading(fromPoint, toPoint);
        
        // Расчёт влияния ветра
        const windEffect = this.calculateWindEffect(
            this.droneConfig.cruiseSpeed,
            windData.speed,
            heading,
            windData.direction
        );

        // Время и энергия
        const baseTime = distance / this.droneConfig.cruiseSpeed;  // часы
        const transitionTime = baseTime * windEffect.timeFactor * 60;  // минуты

        const baseEnergy = distance * this.droneConfig.energyPerKm;
        const transitionEnergy = baseEnergy * windEffect.energyFactor;

        return {
            distance: Math.round(distance * 10) / 10,
            time: Math.round(transitionTime),
            energy: Math.round(transitionEnergy),
            baseEnergy: Math.round(baseEnergy),
            windEffect: Math.round((transitionEnergy - baseEnergy) * 10) / 10,
            windSpeed: windData.speed,
            windDirection: windData.direction,
            heading: heading,
            groundSpeed: windEffect.groundSpeed
        };
    },

    /**
     * Расчёт энергии для возврата на базу с учётом ветра (НОВОЕ)
     * @param {object} fromPoint - текущая точка {lat, lon}
     * @param {object} basePoint - точка базы {lat, lon}
     * @param {object} weatherData - данные о погоде
     * @returns {object} { distance, energy, time, windEffect }
     */
    calculateReturnEnergy(fromPoint, basePoint, weatherData) {
        return this.calculateTransitionEnergy(fromPoint, basePoint, weatherData);
    },

    /**
     * Загрузка метео для каждого сегмента маршрута (НОВОЕ)
     * @param {array} segments - массив сегментов
     * @param {string} date - дата анализа
     * @returns {Promise<array>} weatherDataArray - массив погодных данных для каждого сегмента
     */
    async getWeatherForAllSegments(segments, date) {
        const weatherDataArray = [];
        
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            try {
                const weather = await WeatherModule.getForecast(segment.lat, segment.lon, date);
                weatherDataArray.push({
                    segmentId: segment.id,
                    lat: segment.lat,
                    lon: segment.lon,
                    weather: weather
                });
            } catch (error) {
                console.error(`Ошибка получения погоды для сегмента ${i}:`, error);
                weatherDataArray.push({
                    segmentId: segment.id,
                    lat: segment.lat,
                    lon: segment.lon,
                    weather: { hourly: [] }
                });
            }
        }
        
        return weatherDataArray;
    },

    /**
     * Расчёт курса между двумя точками
     */
    calculateHeading(point1, point2) {
        const lat1 = this.toRad(point1.lat);
        const lat2 = this.toRad(point2.lat);
        const dLon = this.toRad(point2.lon - point1.lon);

        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                  Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

        const bearing = Math.atan2(y, x);
        const degrees = (bearing * 180 / Math.PI + 360) % 360;

        return Math.round(degrees);
    },

    /**
     * Проверка диапазона антенны
     */
    checkAntennaRange(route, takeoffPoint, maxRange = 60) {
        if (!route.segments) return false;

        for (const segment of route.segments) {
            const distance = this.calculateDistance(
                takeoffPoint,
                { lat: segment.lat, lon: segment.lon }
            );

            if (distance > maxRange) {
                return false;
            }
        }

        return true;
    },

    /**
     * Проверка энергетического бюджета
     */
    checkEnergyBudget(route, battery, flightPlan) {
        if (!flightPlan) return false;

        // Доступная энергия батареи
        const avgVoltage = (battery.voltage + battery.minVoltage) / 2;
        const availableEnergy = avgVoltage * (battery.capacity / 1000) * 0.8;  // 80% DoD

        // Требуемая энергия
        const requiredEnergy = flightPlan.total.energy;

        return requiredEnergy <= availableEnergy * 0.9;  // 90% от доступной
    },

    /**
     * Оптимизация распределения маршрутов по базам (НОВАЯ ВЕРСИЯ 0.6.0)
     * Каждая база проверяет ВСЕ маршруты с индивидуальными метеоданными
     * Сохранение ПОЛНОЙ аналитики для КАЖДОГО маршрута от КАЖДОЙ базы
     */
    async optimizeAssignment(weatherData, analysisDate) {
        console.log('🔍 Оптимизация распределения маршрутов (каждая база → все маршруты)...');
        console.log('📊 Версия 0.6.0: полная аналитика для каждого маршрута от каждой базы');

        const assignment = [];
        const routeAnalytics = {};  // Новая структура: аналитика для каждого маршрута

        // 1. Загрузка метео для всех баз
        console.log('🌤️ Загрузка метео для точек взлёта...');
        for (const base of this.takeoffPoints) {
            try {
                console.log(`  📍 Загрузка для ${base.name} (${base.lat}, ${base.lon})...`);
                const baseWeather = await WeatherModule.getForecast(base.lat, base.lon, analysisDate);
                base.weatherData = baseWeather;
                base.weatherWindow = this.analyzeWeatherForBase(base, baseWeather);

                if (base.weatherWindow.status === 'unknown') {
                    console.log(`  ⚠️ ${base.name}: Метео загружено, но анализ не удался`);
                } else {
                    console.log(`  ✅ ${base.name}: ${base.weatherWindow.status === 'good' ? '🟢 Благоприятно' : '🟡 Ожидание'}`);
                }
            } catch (error) {
                console.error(`Ошибка загрузки метео для базы ${base.name}:`, error);
                base.weatherData = null;
                base.weatherWindow = {
                    status: 'unknown',
                    start: '—',
                    end: '—',
                    duration: 0,
                    error: error.message
                };
            }
        }

        // 2. Для каждой базы проверяем ВСЕ маршруты
        for (const base of this.takeoffPoints) {
            console.log(`\n🚁 АНАЛИЗ ДЛЯ БАЗЫ: ${base.name} (${base.lat}, ${base.lon})`);

            const analyzedRoutes = [];

            // 2.1 Проверка КАЖДОГО маршрута на доступность из этой базы
            for (const route of this.routes) {
                console.log(`\n  📍 Проверка маршрута: ${route.name}`);

                // Проверка радиуса антенны (каждый сегмент)
                const availability = this.checkRouteAvailability(
                    route,
                    base,
                    base.antenna || 60
                );

                route.availability = availability;

                console.log(`    📡 Антенна: ${availability.status === 'full' ? '✅' : (availability.status === 'partial' ? '⚠️' : '❌')} ${availability.inRangePercent}% в радиусе (${availability.segmentsInRange.length}/${availability.totalSegments})`);

                // Если все сегменты вне радиуса — пропускаем
                if (availability.status === 'unavailable') {
                    analyzedRoutes.push({
                        ...route,
                        status: 'unavailable',
                        skipReason: 'out_of_range',
                        availability: availability,
                        maxDistance: availability.maxDistance,
                        weatherData: null
                    });
                    
                    // Сохраняем аналитику для этого маршрута от этой базы
                    if (!routeAnalytics[route.id]) {
                        routeAnalytics[route.id] = {
                            route: route,
                            analyticsByBase: {}
                        };
                    }
                    routeAnalytics[route.id].analyticsByBase[base.id] = {
                        base: base,
                        status: 'unavailable',
                        skipReason: 'out_of_range',
                        availability: availability,
                        flightPlan: null,
                        segmentWeatherData: null,
                        energy: 0,
                        transitionEnergy: 0,
                        totalEnergy: 0
                    };
                    
                    console.log(`    ❌ Недоступен: вне радиуса антенны (макс: ${availability.maxDistance} км)`);
                    continue;
                }

                // 2.2 Загрузка метео для КАЖДОГО сегмента этого маршрута (НОВОЕ)
                console.log(`    🌤️ Загрузка метео для сегментов маршрута...`);
                const segmentWeatherData = await this.getWeatherForAllSegments(
                    availability.status === 'partial' ? availability.segmentsInRange : route.segments,
                    analysisDate
                );

                // Сохраняем метеоданные для каждого сегмента в маршруте
                route.segmentWeatherData = segmentWeatherData;

                // Используем только сегменты в радиусе для частичных маршрутов
                const segmentsToAnalyze = availability.status === 'partial'
                    ? availability.segmentsInRange
                    : route.segments;

                console.log(`    📊 Сегментов для анализа: ${segmentsToAnalyze.length} из ${route.segments.length}`);

                // 2.3 Расчёт плана полёта с индивидуальными метеоданными для каждого сегмента
                const flightPlan = this.calculateFlightPlanWithIndividualWeather(
                    route,
                    segmentsToAnalyze,
                    segmentWeatherData,
                    base
                );

                if (!flightPlan) {
                    analyzedRoutes.push({
                        ...route,
                        status: 'skipped',
                        skipReason: 'flight_plan_error',
                        availability: availability,
                        weatherData: null
                    });
                    
                    // Сохраняем аналитику
                    if (!routeAnalytics[route.id]) {
                        routeAnalytics[route.id] = {
                            route: route,
                            analyticsByBase: {}
                        };
                    }
                    routeAnalytics[route.id].analyticsByBase[base.id] = {
                        base: base,
                        status: 'skipped',
                        skipReason: 'flight_plan_error',
                        availability: availability,
                        flightPlan: null,
                        segmentWeatherData: segmentWeatherData,
                        energy: 0,
                        transitionEnergy: 0,
                        totalEnergy: 0
                    };
                    
                    console.log(`    ❌ Пропущен: ошибка расчёта плана полёта`);
                    continue;
                }

                route.flightPlan = flightPlan;
                route.availability = availability;

                analyzedRoutes.push({
                    ...route,
                    flightPlan: flightPlan,
                    availability: availability,
                    segmentWeatherData: segmentWeatherData
                });
            }

            // 2.4 Накопительный расчёт энергии для всех доступных маршрутов
            const energyData = this.calculateAvailableEnergy(base.battery);
            let currentEnergy = energyData.usable;

            console.log(`\n  🔋 Энергия доступно: ${currentEnergy} Вт·ч`);

            // Сортировка: сначала полные, потом частичные
            analyzedRoutes.sort((a, b) => {
                if (a.availability.status === 'full' && b.availability.status === 'partial') return -1;
                if (a.availability.status === 'partial' && b.availability.status === 'full') return 1;
                return 0;
            });

            // 2.5 Расчёт энергии с учётом переходов и возврата (НОВОЕ)
            let totalTransitionEnergy = 0;
            let totalReturnEnergy = 0;
            let currentPoint = { lat: base.lat, lon: base.lon };
            const transitions = [];

            for (const route of analyzedRoutes) {
                if (route.status === 'unavailable' || route.status === 'skipped') continue;

                const routeEnergy = route.flightPlan?.total?.energy || 0;

                // Расчёт перехода к точке входа маршрута (НОВОЕ)
                let transitionEnergy = 0;
                if (route.entryPoint || route.flightPlan?.entryPoint) {
                    const entryPoint = route.entryPoint || route.flightPlan.entryPoint;
                    const entryPos = { lat: entryPoint.lat, lon: entryPoint.lon };

                    const transitionWeather = await this.getWeatherForTransition(currentPoint, entryPos, analysisDate);
                    const transitionData = this.calculateTransitionEnergy(currentPoint, entryPos, transitionWeather);

                    transitionEnergy = transitionData.energy;
                    transitions.push({
                        from: currentPoint,
                        to: entryPos,
                        routeId: route.id,
                        routeName: route.name,
                        ...transitionData,
                        weather: transitionWeather
                    });

                    console.log(`    🛤️ Переход к ${route.name}: ${transitionData.distance} км, ${transitionData.energy} Вт·ч`);
                    currentPoint = entryPos;
                }

                // Проверка: достаточно ли энергии на переход + маршрут
                const totalNeeded = transitionEnergy + routeEnergy;

                if (totalNeeded <= currentEnergy) {
                    // ✅ Достаточно энергии
                    route.status = 'allowed';
                    route.transitionEnergy = transitionEnergy;
                    route.energyConsumed = routeEnergy;
                    route.totalEnergyForStage = transitionEnergy + routeEnergy;
                    route.energyReserve = Math.round(currentEnergy - totalNeeded);
                    route.reservePercent = Math.round(((currentEnergy - totalNeeded) / energyData.usable) * 100);
                    currentEnergy -= totalNeeded;

                    console.log(`  ✅ ${route.name}: ${transitionEnergy} (переход) + ${routeEnergy} (маршрут) = ${route.totalEnergyForStage} Вт·ч (остаток: ${route.energyReserve} Вт·ч)`);
                    
                    // Сохраняем аналитику для этого маршрута от этой базы
                    if (!routeAnalytics[route.id]) {
                        routeAnalytics[route.id] = {
                            route: route,
                            analyticsByBase: {}
                        };
                    }
                    routeAnalytics[route.id].analyticsByBase[base.id] = {
                        base: base,
                        status: 'allowed',
                        availability: route.availability,
                        flightPlan: route.flightPlan,
                        segmentWeatherData: route.segmentWeatherData,
                        energy: routeEnergy,
                        transitionEnergy: transitionEnergy,
                        totalEnergy: route.totalEnergyForStage,
                        energyReserve: route.energyReserve,
                        reservePercent: route.reservePercent
                    };
                } else {
                    // ❌ Недостаточно энергии
                    route.status = 'skipped';
                    route.skipReason = 'insufficient_energy';
                    route.energyNeeded = totalNeeded;
                    route.energyAvailable = Math.round(currentEnergy);
                    route.energyDeficit = Math.round(totalNeeded - currentEnergy);

                    console.log(`  ❌ ${route.name}: нет энергии (нужно ${totalNeeded}, есть ${Math.round(currentEnergy)})`);
                    
                    // Сохраняем аналитику
                    if (!routeAnalytics[route.id]) {
                        routeAnalytics[route.id] = {
                            route: route,
                            analyticsByBase: {}
                        };
                    }
                    routeAnalytics[route.id].analyticsByBase[base.id] = {
                        base: base,
                        status: 'skipped',
                        skipReason: 'insufficient_energy',
                        availability: route.availability,
                        flightPlan: route.flightPlan,
                        segmentWeatherData: route.segmentWeatherData,
                        energy: routeEnergy,
                        transitionEnergy: transitionEnergy,
                        totalEnergy: totalNeeded,
                        energyDeficit: route.energyDeficit
                    };
                }
            }

            // 2.6 Расчёт возврата на базу (НОВОЕ)
            if (analyzedRoutes.some(r => r.status === 'allowed')) {
                const lastAllowedRoute = analyzedRoutes.reverse().find(r => r.status === 'allowed');
                if (lastAllowedRoute) {
                    const lastPoint = lastAllowedRoute.entryPoint || lastAllowedRoute.flightPlan?.entryPoint ||
                                     { lat: lastAllowedRoute.segments[0].lat, lon: lastAllowedRoute.segments[0].lon };

                    const returnWeather = await this.getWeatherForTransition(lastPoint, { lat: base.lat, lon: base.lon }, analysisDate);
                    const returnData = this.calculateReturnEnergy(lastPoint, { lat: base.lat, lon: base.lon }, returnWeather);

                    totalReturnEnergy = returnData.energy;

                    // Вычитаем энергию возврата из резерва
                    currentEnergy -= returnData.energy;

                    console.log(`  🏠 Возврат на базу: ${returnData.distance} км, ${returnData.energy} Вт·ч`);
                    console.log(`  🔋 Финальный остаток: ${Math.round(currentEnergy)} Вт·ч`);
                }
            }

            // 2.7 Формирование результата для базы
            const allowedRoutes = analyzedRoutes.filter(r => r.status === 'allowed');
            const partialRoutes = analyzedRoutes.filter(r => r.availability?.status === 'partial' && r.status === 'allowed');
            const skippedRoutes = analyzedRoutes.filter(r => r.status === 'skipped' || r.status === 'unavailable');

            assignment.push({
                base: base,
                routes: analyzedRoutes,
                allowedRoutes: allowedRoutes,
                partialRoutes: partialRoutes,
                skippedRoutes: skippedRoutes,
                transitions: transitions,
                returnEnergy: totalReturnEnergy,
                totalDistance: allowedRoutes.reduce(
                    (sum, r) => sum + (r.flightPlan?.total?.distance || 0),
                    0
                ) + transitions.reduce((sum, t) => sum + t.distance, 0),
                totalEnergy: allowedRoutes.reduce(
                    (sum, r) => sum + (r.totalEnergyForStage || r.energyConsumed || 0),
                    0
                ) + transitions.reduce((sum, t) => sum + t.energy, 0) + totalReturnEnergy,
                energyReserve: Math.round(currentEnergy),
                energyInitial: energyData.usable
            });

            console.log(`\n  📈 Итого по базе ${base.name}:`);
            console.log(`    ✅ Выполнено: ${allowedRoutes.length} из ${this.routes.length}`);
            console.log(`    ⚠️  Частично: ${partialRoutes.length}`);
            console.log(`    ❌ Пропущено: ${skippedRoutes.length}`);
            console.log(`    🔋 Остаток энергии: ${Math.round(currentEnergy)} Вт·ч`);
        }

        // 3. Глобальная оптимизация (исключение дублирования)
        this.assignment = this.optimizeGlobalAssignment(assignment);

        // 4. Сохранение полной аналитики по каждому маршруту (НОВОЕ)
        this.routeAnalytics = routeAnalytics;

        console.log('\n✅ Оптимизация завершена');
        console.log('📊 Итого:', assignment.length, 'баз,',
            assignment.reduce((sum, a) => sum + a.allowedRoutes.length, 0), 'маршрутов доступно');
        console.log('📈 Аналитика сохранена для', Object.keys(routeAnalytics).length, 'маршрутов');

        return this.assignment;
    },

    /**
     * Анализ погоды для базы
     */
    analyzeWeatherForBase(base, weatherData) {
        if (!weatherData || !weatherData.hourly) {
            return {
                start: '—',
                end: '—',
                duration: 0,
                avgWind: 0,
                precip: 0,
                status: 'unknown'
            };
        }

        // Упрощённый анализ: найти лучшее окно
        const hourly = weatherData.hourly;
        let bestWindow = null;
        let currentWindow = null;

        for (let i = 0; i < hourly.length; i++) {
            const hour = hourly[i];
            const isGood = hour.wind10m < 10 && hour.precip < 0.5;

            if (isGood) {
                if (!currentWindow) {
                    currentWindow = {
                        start: hour.time,
                        end: hour.time,
                        hours: [hour]
                    };
                } else {
                    currentWindow.end = hour.time;
                    currentWindow.hours.push(hour);
                }
            } else {
                if (currentWindow && currentWindow.hours.length >= 2) {
                    if (!bestWindow || currentWindow.hours.length > bestWindow.hours.length) {
                        bestWindow = currentWindow;
                    }
                }
                currentWindow = null;
            }
        }

        if (!bestWindow && currentWindow && currentWindow.hours.length >= 2) {
            bestWindow = currentWindow;
        }

        if (bestWindow) {
            const startTime = new Date(bestWindow.start);
            const endTime = new Date(bestWindow.end);
            const duration = (endTime - startTime) / 1000 / 60;  // минут
            const avgWind = bestWindow.hours.reduce(
                (sum, h) => sum + h.wind10m, 0
            ) / bestWindow.hours.length;

            return {
                start: startTime.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                end: endTime.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                duration: Math.round(duration),
                avgWind: Math.round(avgWind * 10) / 10,
                precip: 0,
                status: 'good'
            };
        }

        return {
            start: '—',
            end: '—',
            duration: 0,
            avgWind: 0,
            precip: 0,
            status: 'poor'
        };
    },

    /**
     * Найти доступные маршруты для базы (с накопительным расчётом энергии и метео)
     */
    findReachableRoutes(base, weatherData, availableEnergy = null) {
        const reachable = [];
        console.log(`🔍 Поиск доступных маршрутов для базы ${base.name}...`);

        // Если энергия не передана, рассчитываем доступную
        let currentEnergy = availableEnergy;
        if (!currentEnergy) {
            const energyData = this.calculateAvailableEnergy(base.battery);
            currentEnergy = energyData.usable;
        }

        const initialEnergy = currentEnergy;

        for (const route of this.routes) {
            console.log(`  📍 Проверка маршрута: ${route.name}`);
            
            // Найти ближайшую точку входа
            const entryPoint = this.findNearestEntryPoint(route, base);
            
            if (!entryPoint) {
                console.log(`    ❌ Точка входа не найдена`);
                continue;
            }
            
            console.log(`    ✅ Точка входа: С${entryPoint.segmentId} (${entryPoint.distance} км от базы)`);

            // Проверка антенны — достаточно чтобы точка входа была в радиусе
            const antennaCheck = entryPoint.distance <= base.antenna;
            
            if (!antennaCheck) {
                console.log(`    ❌ Точка входа вне радиуса антенны (${entryPoint.distance} > ${base.antenna} км)`);
                reachable.push({
                    ...route,
                    status: 'skipped',
                    skipReason: 'antenna_range',
                    antennaDistance: entryPoint.distance
                });
                continue;
            }
            
            console.log(`    ✅ Антенна: OK`);

            // Расчёт плана полёта с учётом ветра
            const flightPlan = this.calculateFlightPlan(
                route,
                entryPoint,
                base,
                weatherData
            );
            
            if (!flightPlan) {
                console.log(`    ❌ План полёта не рассчитан`);
                continue;
            }
            
            const routeEnergy = flightPlan.total.energy;
            console.log(`    ✅ План полёта: ${flightPlan.total.distance} км, ${routeEnergy} Вт·ч (ветер: ${flightPlan.windSummary.icon} ${flightPlan.windSummary.condition})`);

            // Проверка энергии
            const energyCheck = routeEnergy <= currentEnergy;
            
            if (!energyCheck) {
                console.log(`    ❌ Недостаточно энергии (нужно ${routeEnergy}, есть ${Math.round(currentEnergy)})`);
                reachable.push({
                    ...route,
                    status: 'skipped',
                    skipReason: 'insufficient_energy',
                    energyNeeded: routeEnergy,
                    energyAvailable: Math.round(currentEnergy),
                    energyDeficit: Math.round(routeEnergy - currentEnergy),
                    flightPlan: flightPlan
                });
                continue;
            }
            
            console.log(`    ✅ Энергия: OK (остаток ${Math.round(currentEnergy - routeEnergy)} Вт·ч)`);

            // Обновляем доступную энергию (накопительный расчёт)
            currentEnergy -= routeEnergy;

            // Добавить в список доступных
            reachable.push({
                ...route,
                status: 'full',
                entryPoint: entryPoint,
                flightPlan: flightPlan,
                assignedBase: base.id,
                distanceFromBase: entryPoint.distance,
                energyConsumed: routeEnergy,
                energyReserve: Math.round(currentEnergy),
                reservePercent: Math.round((currentEnergy / initialEnergy) * 100)
            });
        }
        
        console.log(`  ✅ Найдено ${reachable.length} маршрутов, остаток энергии: ${Math.round(currentEnergy)} Вт·ч`);

        return reachable;
    },

    /**
     * Сортировка маршрутов по приоритету
     */
    sortRoutesByPriority(routes, base) {
        return routes.sort((a, b) => {
            // Приоритет: ближайшие сначала
            if (a.distanceFromBase !== b.distanceFromBase) {
                return a.distanceFromBase - b.distanceFromBase;
            }

            // Затем: меньшие маршруты сначала
            return (
                a.flightPlan?.total?.distance || 0 -
                b.flightPlan?.total?.distance || 0
            );
        });
    },

    /**
     * Глобальная оптимизация распределения
     */
    optimizeGlobalAssignment(assignment) {
        const assignedRoutes = new Set();
        const optimized = [];

        for (const baseAssignment of assignment) {
            const uniqueRoutes = baseAssignment.routes.filter(
                route => !assignedRoutes.has(route.id)
            );

            // Пометить маршруты как назначенные
            uniqueRoutes.forEach(route =>
                assignedRoutes.add(route.id)
            );

            optimized.push({
                ...baseAssignment,
                routes: uniqueRoutes,
                totalDistance: uniqueRoutes.reduce(
                    (sum, r) => sum + (r.flightPlan?.total?.distance || 0),
                    0
                ),
                totalEnergy: uniqueRoutes.reduce(
                    (sum, r) => sum + (r.flightPlan?.total?.energy || 0),
                    0
                )
            });
        }

        return optimized;
    },

    /**
     * Экспорт результата
     */
    getAssignment() {
        return this.assignment;
    },

    /**
     * Получить полную аналитику для конкретного маршрута (НОВОЕ)
     * @param {string} routeId - ID маршрута
     * @returns {object} analytics - аналитика для всех баз
     */
    getRouteAnalytics(routeId) {
        return this.routeAnalytics?.[routeId] || null;
    },

    /**
     * Получить все аналитики по маршрутам (НОВОЕ)
     * @returns {object} routeAnalytics - полная аналитика
     */
    getAllRouteAnalytics() {
        return this.routeAnalytics || {};
    },

    /**
     * Сравнить базы для конкретного маршрута (НОВОЕ)
     * @param {string} routeId - ID маршрута
     * @returns {object} comparison - сравнение баз
     */
    compareBasesForRoute(routeId) {
        const analytics = this.getRouteAnalytics(routeId);
        if (!analytics) return null;

        const bases = Object.values(analytics.analyticsByBase);
        
        // Фильтруем только доступные базы
        const allowedBases = bases.filter(b => b.status === 'allowed');
        
        if (allowedBases.length === 0) {
            return {
                route: analytics.route,
                bestBase: null,
                comparison: bases,
                message: 'Нет доступных баз для этого маршрута'
            };
        }

        // Лучшая база: минимальная энергия, максимальный резерв
        const bestBase = allowedBases.reduce((best, current) => {
            if (current.reservePercent > best.reservePercent) return current;
            if (current.reservePercent === best.reservePercent && current.totalEnergy < best.totalEnergy) return current;
            return best;
        });

        return {
            route: analytics.route,
            bestBase: bestBase,
            comparison: bases,
            allowedBases: allowedBases,
            message: `Лучшая база: ${bestBase.base.name} (резерв ${bestBase.reservePercent}%, энергия ${bestBase.totalEnergy} Вт·ч)`
        };
    },

    /**
     * Статистика
     */
    getSummary() {
        if (!this.assignment) return null;

        // Дистанция сегментов — это ось маршрута
        const totalRoutes = this.assignment.reduce(
            (sum, b) => sum + b.routes.length,
            0
        );

        const axisDistance = this.assignment.reduce(
            (sum, b) => sum + b.totalDistance,
            0
        );
        const totalDistance = axisDistance * 2.5;

        const totalEnergy = this.assignment.reduce(
            (sum, b) => sum + b.totalEnergy,
            0
        );

        return {
            basesCount: this.assignment.length,
            routesCount: totalRoutes,
            axisDistance: Math.round(axisDistance * 10) / 10,
            totalDistance: Math.round(totalDistance * 10) / 10,
            totalEnergy: Math.round(totalEnergy),
            efficiency: Math.round(
                (totalRoutes / this.routes.length) * 100
            )
        };
    }
};

// Инициализация при загрузке
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiRouteModule;
}
