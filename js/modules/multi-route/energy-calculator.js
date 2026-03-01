/**
 * MIRA - Multi-Route Energy Calculator
 * Детальный расчёт энергии для мульти-маршрутной системы
 * Версия: 0.3.0
 */

const MultiRouteEnergyCalculator = {
    /**
     * Профиль БВС по умолчанию
     */
    defaultProfile: {
        batteryCapacity: 39000,    // мА·ч (39 А·ч)
        batteryVoltage: 25.4,      // В (6S LiPo, полный заряд)
        cutoffVoltage: 19.8,       // В (отсечка, посадка)
        cruiseSpeed: 69,           // км/ч (крейсерская)
        basePower: 120,            // Вт (бортовые системы)
        dragCoefficient: 0.185,    // коэффициент сопротивления
        weight: 8500,              // г (8.5 кг)
        minReserve: 0.25           // минимальный резерв (25%)
    },

    /**
     * Расчёт доступной энергии батареи
     */
    calculateAvailableEnergy(battery) {
        const profile = { ...this.defaultProfile, ...battery };
        const avgVoltage = (profile.batteryVoltage + profile.cutoffVoltage) / 2;
        const availableEnergy = avgVoltage * (profile.batteryCapacity / 1000) * 0.8;  // 80% DoD
        return Math.round(availableEnergy);
    },

    /**
     * Расчёт энергии для сегмента
     */
    calculateSegmentEnergy(segment, weather, profile) {
        const distance = segment.distance || 5;  // км
        const wind = weather?.wind10m || 0;
        const windDir = weather?.windDir || 0;

        // Угол между ветром и направлением полёта
        const routeAngle = segment.heading || 90;  // по умолчанию восток
        const windAngle = windDir - routeAngle;
        const headwind = -wind * Math.cos(windAngle * Math.PI / 180);

        // Путевая скорость
        const groundSpeed = profile.cruiseSpeed + headwind * 3.6;
        const timeHours = distance / Math.max(30, groundSpeed);

        // Мощность с учётом ветра
        const windPower = 0.5 * Math.pow(Math.max(0, headwind * 3.6), 2);
        const totalPower = profile.basePower + windPower;

        // Энергия
        const energy = totalPower * timeHours;

        return {
            distance: Math.round(distance * 10) / 10,
            groundSpeed: Math.round(groundSpeed),
            headwind: Math.round(headwind * 10) / 10,
            time: Math.round(timeHours * 60),  // минут
            power: Math.round(totalPower),
            energy: Math.round(energy)
        };
    },

    /**
     * Расчёт энергии для маршрута (туда и обратно от точки входа)
     */
    calculateRouteEnergy(route, entryPoint, weatherData, battery) {
        const profile = { ...this.defaultProfile, ...battery };
        const segments = route.segments || [];
        const entryIndex = entryPoint.segmentId - 1;

        if (!segments.length || entryIndex < 0) return null;

        // Левая сторона (от точки входа к началу)
        let leftEnergy = 0;
        let leftDistance = 0;
        let leftTime = 0;

        for (let i = entryIndex; i > 0; i--) {
            const segment = segments[i];
            const weather = this.getWeatherForSegment(weatherData, segment);
            const result = this.calculateSegmentEnergy(segment, weather, profile);

            leftEnergy += result.energy;
            leftDistance += result.distance;
            leftTime += result.time;
        }

        // Правая сторона (от точки входа к концу)
        let rightEnergy = 0;
        let rightDistance = 0;
        let rightTime = 0;

        for (let i = entryIndex; i < segments.length; i++) {
            const segment = segments[i];
            const weather = this.getWeatherForSegment(weatherData, segment);
            const result = this.calculateSegmentEnergy(segment, weather, profile);

            rightEnergy += result.energy;
            rightDistance += result.distance;
            rightTime += result.time;
        }

        // Возврат в точку входа (не требуется, уже там)
        const returnEnergy = 0;
        const returnDistance = 0;
        const returnTime = 0;

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
            return: {
                distance: 0,
                time: 0,
                energy: 0
            },
            total: {
                distance: Math.round((leftDistance + rightDistance) * 10) / 10,
                time: Math.round(leftTime + rightTime),
                energy: Math.round(leftEnergy + rightEnergy)
            }
        };
    },

    /**
     * Расчёт энергии для перехода между маршрутами
     */
    calculateTransitionEnergy(fromPoint, toPoint, weather, battery) {
        const profile = { ...this.defaultProfile, ...battery };

        const distance = this.calculateDistance(fromPoint, toPoint);
        const wind = weather?.wind10m || 0;
        const windDir = weather?.windDir || 0;

        // Направление перехода
        const heading = this.calculateHeading(fromPoint, toPoint);
        const windAngle = windDir - heading;
        const headwind = -wind * Math.cos(windAngle * Math.PI / 180);

        // Путевая скорость
        const groundSpeed = profile.cruiseSpeed + headwind * 3.6;
        const timeHours = distance / Math.max(30, groundSpeed);

        // Мощность
        const windPower = 0.5 * Math.pow(Math.max(0, headwind * 3.6), 2);
        const totalPower = profile.basePower + windPower;

        // Энергия
        const energy = totalPower * timeHours;

        return {
            from: fromPoint,
            to: toPoint,
            distance: Math.round(distance * 10) / 10,
            groundSpeed: Math.round(groundSpeed),
            heading: Math.round(heading),
            time: Math.round(timeHours * 60),
            power: Math.round(totalPower),
            energy: Math.round(energy)
        };
    },

    /**
     * Расчёт энергии для возврата на базу
     */
    calculateReturnEnergy(fromPoint, basePoint, weather, battery) {
        return this.calculateTransitionEnergy(fromPoint, basePoint, weather, battery);
    },

    /**
     * Полный расчёт энергии для базы с маршрутами
     */
    calculateBaseEnergy(base, routes, weatherData) {
        const results = [];
        let totalEnergy = 0;
        let totalDistance = 0;
        let totalTime = 0;

        let currentPoint = { lat: base.lat, lon: base.lon };

        // Подход к первому маршруту
        if (routes.length > 0) {
            const firstRoute = routes[0];
            const approach = this.calculateTransitionEnergy(
                currentPoint,
                { lat: firstRoute.entryPoint.lat, lon: firstRoute.entryPoint.lon },
                weatherData,
                base.battery
            );

            results.push({
                type: 'approach',
                description: `Точка взлёта → ${firstRoute.name}`,
                ...approach
            });

            totalEnergy += approach.energy;
            totalDistance += approach.distance;
            totalTime += approach.time;

            currentPoint = { lat: firstRoute.entryPoint.lat, lon: firstRoute.entryPoint.lon };
        }

        // Маршруты и переходы
        for (let i = 0; i < routes.length; i++) {
            const route = routes[i];

            // Энергия маршрута
            const routeEnergy = this.calculateRouteEnergy(
                route,
                route.entryPoint,
                weatherData,
                base.battery
            );

            if (routeEnergy) {
                results.push({
                    type: 'route',
                    routeId: route.id,
                    routeName: route.name,
                    ...routeEnergy.total,
                    flightPlan: routeEnergy
                });

                totalEnergy += routeEnergy.total.energy;
                totalDistance += routeEnergy.total.distance;
                totalTime += routeEnergy.total.time;
            }

            // Переход к следующему маршруту
            if (i < routes.length - 1) {
                const nextRoute = routes[i + 1];
                const transition = this.calculateTransitionEnergy(
                    currentPoint,
                    { lat: nextRoute.entryPoint.lat, lon: nextRoute.entryPoint.lon },
                    weatherData,
                    base.battery
                );

                results.push({
                    type: 'transition',
                    description: `${route.name} → ${nextRoute.name}`,
                    ...transition
                });

                totalEnergy += transition.energy;
                totalDistance += transition.distance;
                totalTime += transition.time;

                currentPoint = { lat: nextRoute.entryPoint.lat, lon: nextRoute.entryPoint.lon };
            }
        }

        // Возврат на базу
        if (routes.length > 0) {
            const lastRoute = routes[routes.length - 1];
            const returnEnergy = this.calculateReturnEnergy(
                currentPoint,
                { lat: base.lat, lon: base.lon },
                weatherData,
                base.battery
            );

            results.push({
                type: 'return',
                description: `${lastRoute.name} → Точка взлёта`,
                ...returnEnergy
            });

            totalEnergy += returnEnergy.energy;
            totalDistance += returnEnergy.distance;
            totalTime += returnEnergy.time;
        }

        // Резерв
        const availableEnergy = this.calculateAvailableEnergy(base.battery);
        const reserve = Math.max(0, Math.round((1 - totalEnergy / availableEnergy) * 100));
        const status = reserve >= base.battery.minReserve * 100 ? 'allowed' :
                       reserve >= 10 ? 'warning' : 'forbidden';

        return {
            base: base,
            stages: results,
            totalDistance: Math.round(totalDistance * 10) / 10,
            totalTime: Math.round(totalTime),
            totalEnergy: Math.round(totalEnergy),
            availableEnergy: availableEnergy,
            reserve: reserve,
            status: status
        };
    },

    /**
     * Получить погоду для сегмента
     */
    getWeatherForSegment(weatherData, segment) {
        if (!weatherData || !weatherData.hourly) {
            return { wind10m: 0, windDir: 0 };
        }

        // Берём первый час (упрощённо)
        const firstHour = weatherData.hourly[0] || {};

        return {
            wind10m: firstHour.wind10m || 0,
            windDir: firstHour.windDir || 0
        };
    },

    /**
     * Расчёт расстояния между двумя точками
     */
    calculateDistance(point1, point2) {
        const R = 6371;
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
     * Расчёт направления (heading) между двумя точками
     */
    calculateHeading(point1, point2) {
        const lat1 = this.toRad(point1.lat);
        const lat2 = this.toRad(point2.lat);
        const dLon = this.toRad(point2.lon - point1.lon);

        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                  Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

        const heading = Math.atan2(y, x);
        return (this.toDeg(heading) + 360) % 360;
    },

    /**
     * Конвертация в радианы
     */
    toRad(degrees) {
        return degrees * Math.PI / 180;
    },

    /**
     * Конвертация в градусы
     */
    toDeg(radians) {
        return radians * 180 / Math.PI;
    }
};

// Инициализация при загрузке
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiRouteEnergyCalculator;
}
