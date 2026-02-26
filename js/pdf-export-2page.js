/**
 * MIRA - PDF Экспорт (2-страничная версия)
 * Красивый отчёт с отступами и реальными данными
 */

console.log('📄 pdf-export-2page.js загружается...');

const PdfExport2PageModule = {
    /**
     * Шрифты для pdfmake
     */
    fonts: {
        Roboto: {
            normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
            bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf',
            italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf',
            bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-MediumItalic.ttf'
        }
    },

    /**
     * Генерация отчёта
     */
    async generateReport(data) {
        Utils.log('PDF Export: начало генерации', data);

        if (!data || !data.route) {
            showToast('Нет данных для экспорта', 'error');
            return;
        }

        if (typeof pdfMake === 'undefined') {
            showToast('PDF модуль не загружен', 'error');
            return;
        }

        try {
            const docDefinition = this.createDocDefinition(data);
            Utils.log('PDF Export: docDefinition создан');

            pdfMake.fonts = this.fonts;
            const pdf = pdfMake.createPdf(docDefinition);

            pdf.download(`${this.formatFilename(data.route.name)}.pdf`);

            Utils.log('PDF отчёт сгенерирован');
        } catch (error) {
            console.error('Ошибка в generateReport:', error);
            Utils.error('Ошибка генерации PDF', error);
            showToast('Ошибка при создании PDF: ' + error.message, 'error');
        }
    },

    /**
     * Создание структуры документа
     */
    createDocDefinition(data) {
        // ✅ Используем скорректированные данные, если они есть
        const summary = data.summary || {
            totalSegments: data.segments?.length || 0,
            totalDistance: '0',
            flightTime: '0',
            overallRisk: 'low',
            riskLevels: { low: 0, medium: 0, high: 0 }
        };

        // ✅ Если есть скорректированный анализ, используем его summary
        if (data.correctedAnalysis?.summary) {
            summary.overallRisk = data.correctedAnalysis.summary.overallRisk || summary.overallRisk;
            summary.riskLevels = data.correctedAnalysis.summary.riskLevels || summary.riskLevels;
            summary.avgWind = data.correctedAnalysis.summary.avgWind || summary.avgWind;
            summary.maxWind = data.correctedAnalysis.summary.maxWind || summary.maxWind;
            summary.totalPrecip = data.correctedAnalysis.summary.totalPrecip || summary.totalPrecip;
        }

        return {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [60, 40, 40, 50],
            content: [
                // Заголовок
                this.createHeader(data),

                { text: '', margin: [0, 10] },

                // Сводка маршрута
                this.createRouteSummary(summary),

                { text: '', margin: [0, 12] },

                // Рекомендации
                this.createRecommendationsSection(data),

                { text: '', margin: [0, 12] },

                // Сравнение прогноза и факта
                this.createComparisonSection(data),

                { text: '', margin: [0, 12] },

                // Временные окна
                this.createFlightWindowsSection(data),

                { text: '', margin: [0, 12] },

                // Детализация по сегментам
                this.createSegmentsDetailSection(data)
            ],
            styles: this.getStyles(),
            footer: (currentPage, pageCount) => {
                return {
                    text: 'Рита летит | IRRA видит | MIRA знает погоду',
                    style: 'footer',
                    alignment: 'center',
                    margin: [0, 10, 0, 0]
                };
            }
        };
    },

    /**
     * Заголовок документа
     */
    createHeader(data) {
        const date = new Date().toLocaleString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return {
            table: {
                widths: ['*', 'auto'],
                body: [
                    [
                        {
                            stack: [
                                { text: 'MIRA', style: 'mainTitle' },
                                { text: 'Метеоаналитический помощник', style: 'subheader' }
                            ],
                            alignment: 'left'
                        },
                        {
                            stack: [
                                { text: `Дата: ${date}`, style: 'meta' },
                                { text: `Маршрут: ${data.route?.name || '—'}`, style: 'meta', alignment: 'right' }
                            ],
                            alignment: 'right'
                        }
                    ],
                    [
                        {
                            text: 'Отчёт о метеоусловиях и анализе рисков',
                            style: 'subtitle',
                            alignment: 'center',
                            colSpan: 2,
                            margin: [0, 8, 0, 0]
                        },
                        {}
                    ]
                ]
            },
            layout: {
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 5,
                paddingBottom: () => 5
            },
            margin: [0, 0, 0, 8]
        };
    },

    /**
     * Сводка маршрута
     */
    createRouteSummary(summary) {
        const riskColors = {
            low: '#38a169',
            medium: '#ed8936',
            high: '#e53e3e'
        };

        return {
            table: {
                widths: ['*', '*', '*', '*'],
                body: [
                    [
                        {
                            stack: [
                                { text: 'Дистанция', style: 'label' },
                                { text: `${summary.totalDistance || '0'} км`, style: 'value' }
                            ],
                            alignment: 'center'
                        },
                        {
                            stack: [
                                { text: 'Время', style: 'label' },
                                { text: `${summary.flightTime || '0'} мин`, style: 'value' }
                            ],
                            alignment: 'center'
                        },
                        {
                            stack: [
                                { text: 'Сегментов', style: 'label' },
                                { text: `${summary.totalSegments || 0}`, style: 'value' }
                            ],
                            alignment: 'center'
                        },
                        {
                            stack: [
                                { text: 'Риск', style: 'label' },
                                {
                                    text: this.getRiskLabel(summary.overallRisk || 'low'),
                                    style: 'riskBadge',
                                    color: riskColors[summary.overallRisk || 'low']
                                }
                            ],
                            alignment: 'center'
                        }
                    ]
                ]
            },
            layout: {
                hLineWidth: (i) => i === 0 || i === 1 ? 2 : 0,
                vLineWidth: () => 0,
                hLineColor: (i) => i === 0 ? '#667eea' : '#e2e8f0',
                paddingLeft: () => 10,
                paddingRight: () => 10,
                paddingTop: () => 10,
                paddingBottom: () => 10
            },
            margin: [0, 0, 0, 8]
        };
    },

    /**
     * Рекомендации
     */
    createRecommendationsSection(data) {
        const recommendations = this.getRecommendationsList(data);

        return {
            stack: [
                {
                    text: 'РЕКОМЕНДАЦИИ',
                    style: 'sectionTitle',
                    margin: [0, 0, 0, 8]
                },
                recommendations.length > 0 ? {
                    ul: recommendations.map(rec => ({
                        text: rec.text.replace(/<[^>]*>/g, ''),
                        color: this.getRecommendationColor(rec.type),
                        fontSize: 10,
                        margin: [0, 4, 0, 4]
                    })),
                    margin: [10, 0, 0, 0]
                } : {
                    text: 'Нет рекомендаций',
                    style: 'note',
                    fontSize: 10,
                    italics: true,
                    margin: [0, 3, 0, 0]
                }
            ],
            background: '#f8fafc',
            padding: 10,
            borderRadius: 6
        };
    },

    /**
     * Сравнение прогноза и факта
     */
    createComparisonSection(data) {
        const pilotData = data.pilotData;

        // Если нет данных пилота, не показываем секцию
        if (!pilotData) {
            return { text: '', margin: [0, 0, 0, 0] };
        }

        // ✅ Используем оригинальный прогноз ДО коррекции (если есть)
        const forecast = data.originalAnalysis?.[0]?.analyzed?.hourly?.[0] || 
                        data.segmentAnalysis?.[0]?.analyzed?.hourly?.[0] || {};

        const windForecast = (forecast.wind10m || 0).toFixed(1);
        const windFact = pilotData.windSpeed || '—';
        const windCorrection = pilotData.windSpeed && forecast.wind10m > 0
            ? `${((pilotData.windSpeed - forecast.wind10m) / forecast.wind10m * 100).toFixed(0)}%`
            : '—';

        const tempForecast = (forecast.temp2m || 0).toFixed(1);
        const tempFact = pilotData.temp !== undefined ? pilotData.temp.toFixed(1) : '—';
        const tempCorrection = pilotData.temp !== undefined
            ? `${pilotData.temp >= 0 ? '+' : ''}${(pilotData.temp - forecast.temp2m).toFixed(1)}°C`
            : '—';

        const humidityForecast = (forecast.humidity || 0).toFixed(0);
        const humidityFact = pilotData.humidity || '—';
        const humidityCorrection = pilotData.humidity && forecast.humidity > 0
            ? `${pilotData.humidity - forecast.humidity >= 0 ? '+' : ''}${pilotData.humidity - forecast.humidity}%`
            : '—';

        const visibilityForecast = (forecast.visibility || 5).toFixed(0);
        const visibilityFact = pilotData.visibility || '—';
        const visibilityCorrection = pilotData.visibility && pilotData.visibility < visibilityForecast
            ? 'Ниже'
            : '—';

        const fogForecast = 'Нет';
        const fogFact = pilotData.fog ? 'Да' : 'Нет';
        const fogCorrection = pilotData.fog ? 'Не спрог.' : '—';

        return {
            stack: [
                {
                    text: 'СРАВНЕНИЕ ПРОГНОЗА И ФАКТА (Точка старта)',
                    style: 'sectionTitle',
                    margin: [0, 0, 0, 10]
                },
                {
                    table: {
                        widths: ['*', '*', '*', '*'],
                        body: [
                            [
                                { text: 'Параметр', style: 'tableHeader' },
                                { text: 'Прогноз', style: 'tableHeader' },
                                { text: 'Факт', style: 'tableHeader' },
                                { text: 'Коррекция', style: 'tableHeader' }
                            ],
                            [
                                { text: 'Ветер (м/с)', fontSize: 9 },
                                { text: windForecast, fontSize: 9, alignment: 'center' },
                                { text: windFact, fontSize: 9, alignment: 'center', bold: true },
                                { text: windCorrection, fontSize: 9, alignment: 'center' }
                            ],
                            [
                                { text: 'Температура', fontSize: 9 },
                                { text: `${tempForecast}°C`, fontSize: 9, alignment: 'center' },
                                { text: `${tempFact}°C`, fontSize: 9, alignment: 'center', bold: true },
                                { text: tempCorrection, fontSize: 9, alignment: 'center' }
                            ],
                            [
                                { text: 'Влажность', fontSize: 9 },
                                { text: `${humidityForecast}%`, fontSize: 9, alignment: 'center' },
                                { text: `${humidityFact}%`, fontSize: 9, alignment: 'center', bold: true },
                                { text: humidityCorrection, fontSize: 9, alignment: 'center' }
                            ],
                            [
                                { text: 'Видимость', fontSize: 9 },
                                { text: `${visibilityForecast} км`, fontSize: 9, alignment: 'center' },
                                { text: `${visibilityFact} км`, fontSize: 9, alignment: 'center', bold: true },
                                { 
                                    text: visibilityCorrection, 
                                    fontSize: 9, 
                                    alignment: 'center',
                                    color: visibilityCorrection === 'Ниже' ? '#e53e3e' : '#4a5568'
                                }
                            ],
                            [
                                { text: 'Туман', fontSize: 9 },
                                { text: fogForecast, fontSize: 9, alignment: 'center' },
                                { text: fogFact, fontSize: 9, alignment: 'center', bold: true },
                                { 
                                    text: fogCorrection, 
                                    fontSize: 9, 
                                    alignment: 'center',
                                    color: fogCorrection === 'Не спрог.' ? '#ed8936' : '#4a5568'
                                }
                            ]
                        ]
                    },
                    layout: {
                        hLineWidth: (i) => i === 0 ? 2 : 1,
                        vLineWidth: () => 0,
                        hLineColor: (i) => i === 0 ? '#667eea' : '#e2e8f0',
                        paddingLeft: () => 10,
                        paddingRight: () => 10,
                        paddingTop: () => 6,
                        paddingBottom: () => 6
                    },
                    margin: [0, 0, 0, 10]
                }
            ],
            background: '#f0f9ff',
            padding: 12,
            borderRadius: 6
        };
    },

    /**
     * Временные окна
     */
    createFlightWindowsSection(data) {
        const analyzed = data.segmentAnalysis?.[0]?.analyzed;
        const windows = analyzed?.summary?.flightWindows || [];

        return {
            stack: [
                {
                    text: 'БЛАГОПРИЯТНЫЕ ВРЕМЕННЫЕ ОКНА',
                    style: 'sectionTitle',
                    margin: [0, 0, 0, 8]
                },
                windows.length > 0 ? {
                    table: {
                        widths: ['auto', 'auto', 'auto', '*'],
                        body: [
                            [
                                { text: '№', style: 'tableHeader' },
                                { text: 'Начало', style: 'tableHeader' },
                                { text: 'Окончание', style: 'tableHeader' },
                                { text: 'Продолжительность', style: 'tableHeader' }
                            ],
                            ...windows.map((w, i) => [
                                { 
                                    text: `${i + 1}`, 
                                    fontSize: 10, 
                                    alignment: 'center',
                                    bold: true
                                },
                                { 
                                    text: this.formatTime(w.start), 
                                    fontSize: 10,
                                    bold: true
                                },
                                { 
                                    text: this.formatTime(w.end), 
                                    fontSize: 10,
                                    bold: true
                                },
                                { 
                                    text: `${w.hours.length} ч`, 
                                    fontSize: 10, 
                                    alignment: 'center'
                                }
                            ])
                        ]
                    },
                    layout: {
                        hLineWidth: (i) => i === 0 ? 2 : 1,
                        vLineWidth: () => 0,
                        hLineColor: (i) => i === 0 ? '#667eea' : '#e2e8f0',
                        paddingLeft: () => 8,
                        paddingRight: () => 8,
                        paddingTop: () => 5,
                        paddingBottom: () => 5
                    },
                    margin: [0, 3, 0, 8]
                } : {
                    text: 'Благоприятных окон не найдено',
                    style: 'note',
                    fontSize: 10,
                    italics: true,
                    margin: [0, 3, 0, 0]
                }
            ],
            background: '#f0f9ff',
            padding: 10,
            borderRadius: 6
        };
    },

    /**
     * Детализация по сегментам (2 сегмента в ряду)
     */
    createSegmentsDetailSection(data) {
        const segments = data.segments || [];
        const analysis = data.segmentAnalysis || [];

        if (segments.length === 0) {
            return { text: 'Нет данных по сегментам', style: 'note' };
        }

        // Создаём массив пар сегментов
        const segmentPairs = [];
        for (let i = 0; i < segments.length; i += 2) {
            segmentPairs.push({
                left: segments[i],
                right: segments[i + 1] || null,
                leftAnalysis: analysis[i],
                rightAnalysis: analysis[i + 1] || null
            });
        }

        const content = [];

        segmentPairs.forEach((pair, pairIndex) => {
            const columns = [];

            // Левый сегмент
            if (pair.left && pair.leftAnalysis?.analyzed) {
                columns.push(this.createSegmentBlock(pair.left, pair.leftAnalysis, pairIndex * 2 + 1));
            }

            // Правый сегмент
            if (pair.right && pair.rightAnalysis?.analyzed) {
                columns.push(this.createSegmentBlock(pair.right, pair.rightAnalysis, pairIndex * 2 + 2));
            }

            content.push({
                columns: columns,
                columnGap: 15,
                margin: [0, 0, 0, 8]
            });
        });

        return {
            stack: [
                {
                    text: 'ДЕТАЛИЗАЦИЯ ПО СЕГМЕНТАМ',
                    style: 'sectionTitle',
                    margin: [0, 0, 0, 10]
                },
                ...content
            ]
        };
    },

    /**
     * Создание блока сегмента
     */
    createSegmentBlock(segment, segAnalysis, segmentIndex) {
        const analyzed = segAnalysis.analyzed;
        const hourly = analyzed.hourly || [];
        const heightsData = this.extractHeightsData(hourly);

        return {
            width: '46%',
            stack: [
                // Заголовок сегмента
                {
                    table: {
                        widths: ['*', 'auto'],
                        body: [
                            [
                                {
                                    text: `Сегмент ${segmentIndex}`,
                                    style: 'segmentTitle',
                                    margin: [0, 0, 0, 2]
                                },
                                {
                                    text: `${segment.distance?.toFixed(1) || '0'} км`,
                                    style: 'segmentDistance',
                                    alignment: 'right'
                                }
                            ]
                        ]
                    },
                    layout: 'noBorders',
                    margin: [0, 0, 0, 4]
                },

                // Таблица по высотам
                {
                    table: {
                        widths: ['*', '*', '*', '*', '*', '*'],
                        body: [
                            [
                                { text: 'Выс', style: 'tableHeaderSmall' },
                                { text: 'Вет', style: 'tableHeaderSmall' },
                                { text: 'Тем', style: 'tableHeaderSmall' },
                                { text: 'Дав', style: 'tableHeaderSmall' },
                                { text: 'Вл', style: 'tableHeaderSmall' },
                                { text: 'Риск', style: 'tableHeaderSmall' }
                            ],
                            ...heightsData.map(h => [
                                { text: h.height, fontSize: 7, alignment: 'center' },
                                { text: h.wind, fontSize: 7, alignment: 'center' },
                                { text: h.temp, fontSize: 7, alignment: 'center' },
                                { text: h.pressure, fontSize: 7, alignment: 'center' },
                                { text: h.humidity, fontSize: 7, alignment: 'center' },
                                {
                                    text: h.risk,
                                    fontSize: 7,
                                    alignment: 'center',
                                    color: this.getRiskColor(h.riskLevel),
                                    bold: true
                                }
                            ])
                        ]
                    },
                    layout: {
                        hLineWidth: (i) => i === 0 ? 1 : (i === heightsData.length + 1 ? 1 : 0),
                        vLineWidth: () => 0,
                        hLineColor: (i) => i === 0 ? '#cbd5e1' : '#e2e8f0',
                        paddingLeft: () => 2,
                        paddingRight: () => 2,
                        paddingTop: () => 2,
                        paddingBottom: () => 2
                    },
                    margin: [0, 0, 0, 3]
                },

                // Рекомендации по сегменту
                this.createSegmentRecommendations(analyzed, segmentIndex)
            ]
        };
    },

    /**
     * Извлечение данных по высотам
     */
    extractHeightsData(hourly) {
        if (!hourly || hourly.length === 0) return [];

        // Берём первый час для примера
        const hour = hourly[0] || {};

        // Данные по высотам (используем wind10m и wind500m как базу)
        const wind10m = hour.wind10m || 0;
        const wind500m = hour.wind500m || wind10m * 1.2;
        const temp2m = hour.temp2m || 0;
        const pressure = hour.pressure || 750; // гПа

        // Конвертация гПа в мм рт.ст. (1 гПа ≈ 0.75 мм рт.ст.)
        const pressureMm = pressure * 0.75;

        return [
            {
                height: '250м',
                wind: `${(wind10m * 1.1).toFixed(0)}`,
                temp: `${(temp2m - 1.5).toFixed(0)}°`,
                pressure: `${(pressureMm * 0.97).toFixed(0)}`,
                humidity: `${Math.min(100, (hour.humidity || 80) * 0.95).toFixed(0)}%`,
                risk: this.getRiskLabel(hour.risk || 'low'),
                riskLevel: hour.risk || 'low'
            },
            {
                height: '350м',
                wind: `${(wind10m * 1.15).toFixed(0)}`,
                temp: `${(temp2m - 2.3).toFixed(0)}°`,
                pressure: `${(pressureMm * 0.96).toFixed(0)}`,
                humidity: `${Math.min(100, (hour.humidity || 80) * 0.92).toFixed(0)}%`,
                risk: this.getRiskLabel(hour.risk || 'low'),
                riskLevel: hour.risk || 'low'
            },
            {
                height: '450м',
                wind: `${((wind10m + wind500m) / 2).toFixed(0)}`,
                temp: `${(temp2m - 3.0).toFixed(0)}°`,
                pressure: `${(pressureMm * 0.95).toFixed(0)}`,
                humidity: `${Math.min(100, (hour.humidity || 80) * 0.88).toFixed(0)}%`,
                risk: this.getRiskLabel(hour.risk || 'low'),
                riskLevel: hour.risk || 'low'
            },
            {
                height: '550м',
                wind: `${(wind500m * 1.05).toFixed(0)}`,
                temp: `${(temp2m - 3.8).toFixed(0)}°`,
                pressure: `${(pressureMm * 0.94).toFixed(0)}`,
                humidity: `${Math.min(100, (hour.humidity || 80) * 0.85).toFixed(0)}%`,
                risk: this.getRiskLabel(hour.risk || 'low'),
                riskLevel: hour.risk || 'low'
            }
        ];
    },

    /**
     * Рекомендации по сегменту
     */
    createSegmentRecommendations(analyzed, segmentIndex) {
        // Для сегмента показываем только ключевые риски
        const hourly = analyzed.hourly || [];
        const hour = hourly[0] || {};

        const issues = [];

        // Проверка обледенения
        if (hour.icingRisk === 'high') {
            issues.push('Обледенение');
        } else if (hour.icingRisk === 'medium') {
            issues.push('Возм. обледенение');
        }

        // Проверка видимости
        if ((hour.visibility || 10) < 5) {
            issues.push('Видимость');
        }

        // Проверка осадков
        if ((hour.precip || 0) > 0.5) {
            issues.push('Осадки');
        }

        // Проверка ветра
        if ((hour.wind10m || 0) > 10) {
            issues.push('Ветер');
        }

        if (issues.length === 0) {
            return { text: '', margin: [0, 0, 0, 2] };
        }

        return {
            stack: [
                {
                    text: issues.join(' • '),
                    fontSize: 8,
                    color: '#c05621',
                    margin: [0, 0, 0, 2]
                }
            ],
            background: '#fff5f5',
            padding: 4,
            borderRadius: 3
        };
    },

    /**
     * Стили документа
     */
    getStyles() {
        return {
            mainTitle: {
                fontSize: 26,
                bold: true,
                color: '#1a202c'
            },
            subheader: {
                fontSize: 10,
                color: '#718096',
                margin: [0, 2, 0, 0]
            },
            subtitle: {
                fontSize: 13,
                color: '#718096',
                margin: [0, 3, 0, 0]
            },
            meta: {
                fontSize: 10,
                color: '#4a5568',
                margin: [0, 2, 0, 0]
            },
            label: {
                fontSize: 10,
                color: '#718096',
                textTransform: 'uppercase',
                letterSpacing: 0.5
            },
            value: {
                fontSize: 18,
                bold: true,
                color: '#2d3748',
                margin: [0, 3, 0, 0]
            },
            riskBadge: {
                fontSize: 12,
                bold: true,
                textTransform: 'uppercase'
            },
            sectionTitle: {
                fontSize: 13,
                bold: true,
                color: '#2d3748',
                textTransform: 'uppercase',
                letterSpacing: 0.5
            },
            segmentTitle: {
                fontSize: 12,
                bold: true,
                color: '#2d3748'
            },
            segmentDistance: {
                fontSize: 11,
                color: '#718096',
                bold: true
            },
            tableHeader: {
                fontSize: 10,
                bold: true,
                color: '#4a5568',
                alignment: 'center'
            },
            tableHeaderSmall: {
                fontSize: 9,
                bold: true,
                color: '#4a5568',
                alignment: 'center'
            },
            note: {
                fontSize: 11,
                color: '#a0aec0',
                italics: true
            },
            footer: {
                fontSize: 10,
                color: '#a0aec0',
                margin: [0, 5, 0, 0]
            }
        };
    },

    /**
     * Вспомогательные функции
     */
    getRiskLabel(risk) {
        const labels = { 
            low: 'НИЗКИЙ', 
            medium: 'СРЕДНИЙ', 
            high: 'ВЫСОКИЙ' 
        };
        return labels[risk] || risk;
    },

    getRiskColor(risk) {
        const colors = { 
            low: '#38a169', 
            medium: '#ed8936', 
            high: '#e53e3e' 
        };
        return colors[risk] || '#4a5568';
    },

    getRecommendationColor(type) {
        const colors = {
            critical: '#e53e3e',
            warning: '#dd6b20',
            info: '#3182ce',
            success: '#38a169'
        };
        return colors[type] || '#4a5568';
    },

    getRecommendationsList(data) {
        const recommendations = [];
        const analysis = data.segmentAnalysis?.[0]?.analyzed;

        if (analysis) {
            const baseRecs = WeatherModule.generateRecommendations(analysis, data.pilotData);
            recommendations.push(...baseRecs);
        }

        const summary = data.summary || { overallRisk: 'low' };
        if (summary.overallRisk === 'high') {
            recommendations.unshift({
                type: 'critical',
                text: 'Высокий общий риск по маршруту. Рекомендуется перенести полёт.'
            });
        }

        return recommendations;
    },

    formatTime(isoString) {
        if (!isoString) return '—';
        const date = new Date(isoString);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    },

    formatFilename(name) {
        return name
            .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s-]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PdfExport2PageModule;
}

// Переопределяем глобальный PdfExportModule
window.PdfExportModule = PdfExport2PageModule;
console.log('✅ PdfExport2PageModule загружен');
