/**
 * MIRA - Экспорт PDF (pdf-export.js)
 * Генерация отчётов с помощью pdfmake
 */

const PdfExportModule = {
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
    generateReport(data) {
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

            pdfMake.fonts = this.fonts;
            const pdf = pdfMake.createPdf(docDefinition);
            
            pdf.download(`${this.formatFilename(data.route.name)}.pdf`);

            Utils.log('PDF отчёт сгенерирован');
        } catch (error) {
            Utils.error('Ошибка генерации PDF', error);
            showToast('Ошибка при создании PDF: ' + error.message, 'error');
        }
    },

    /**
     * Создание структуры документа
     */
    createDocDefinition(data) {
        const summary = data.summary || {
            totalSegments: data.segments?.length || 0,
            totalDistance: '0',
            flightTime: '0',
            overallRisk: 'low',
            riskLevels: { low: 0, medium: 0, high: 0 }
        };
        const hasPilotData = data.pilotData !== null && data.pilotData !== undefined;

        return {
            pageSize: 'A4',
            pageMargins: [40, 60, 40, 40],
            content: [
                // Заголовок
                this.createHeader(data),

                // Сводка маршрута
                this.createRouteSummary(data.route, summary),

                // Карта рисков (таблица)
                this.createRiskTable(data.segments, data.segmentAnalysis),

                // Детали по сегментам
                this.createSegmentsDetails(data.segments, data.segmentAnalysis),

                // Рекомендации
                this.createRecommendations(data),
                
                // Приложение с данными
                this.createDataAppendix(data)
            ],
            styles: this.getStyles(),
            pageBreakBefore: this.getPageBreakBefore
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
            stack: [
                {
                    text: 'MIRA',
                    style: 'mainTitle',
                    margin: [0, 0, 0, 5]
                },
                {
                    text: 'Отчёт о метеоусловиях и анализе рисков',
                    style: 'subtitle',
                    margin: [0, 0, 0, 15]
                },
                {
                    text: `Дата формирования: ${date}`,
                    style: 'meta',
                    margin: [0, 0, 0, 5]
                },
                {
                    text: `Маршрут: ${data.route.name}`,
                    style: 'meta',
                    margin: [0, 0, 0, 20]
                },
                {
                    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#667eea' }]
                }
            ],
            margin: [0, 0, 0, 30]
        };
    },

    /**
     * Сводка маршрута
     */
    createRouteSummary(route, summary) {
        const riskColor = {
            low: '#38a169',
            medium: '#ed8936',
            high: '#e53e3e'
        }[summary.overallRisk];

        return {
            stack: [
                {
                    text: 'Сводка маршрута',
                    style: 'sectionTitle',
                    margin: [0, 0, 0, 10]
                },
                {
                    table: {
                        widths: ['*', '*', '*'],
                        body: [
                            [
                                {
                                    stack: [
                                        { text: summary.totalDistance, style: 'bigStat' },
                                        { text: 'километров', style: 'statLabel' }
                                    ],
                                    alignment: 'center'
                                },
                                {
                                    stack: [
                                        { text: summary.flightTime, style: 'bigStat' },
                                        { text: 'минут полётного времени', style: 'statLabel' }
                                    ],
                                    alignment: 'center'
                                },
                                {
                                    stack: [
                                        { 
                                            text: this.getRiskLabel(summary.overallRisk), 
                                            style: 'bigStat',
                                            color: riskColor
                                        },
                                        { text: 'общий риск', style: 'statLabel' }
                                    ],
                                    alignment: 'center'
                                }
                            ]
                        ]
                    },
                    layout: {
                        hLineWidth: () => 0,
                        vLineWidth: () => 0,
                        paddingLeft: () => 0,
                        paddingRight: () => 0,
                        paddingTop: () => 10,
                        paddingBottom: () => 10
                    },
                    margin: [0, 0, 0, 20]
                },
                {
                    table: {
                        widths: ['25%', '25%', '25%', '25%'],
                        body: [
                            [
                                { text: 'Низкий риск', style: 'tableHeader' },
                                { text: 'Средний риск', style: 'tableHeader' },
                                { text: 'Высокий риск', style: 'tableHeader' },
                                { text: 'Сегментов', style: 'tableHeader' }
                            ],
                            [
                                { text: summary.riskLevels.low.toString(), alignment: 'center' },
                                { text: summary.riskLevels.medium.toString(), alignment: 'center' },
                                { text: summary.riskLevels.high.toString(), alignment: 'center' },
                                { text: summary.totalSegments.toString(), alignment: 'center' }
                            ]
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 20]
                }
            ]
        };
    },

    /**
     * Таблица рисков по сегментам
     */
    createRiskTable(segments, analysis) {
        if (!segments || segments.length === 0) {
            return { text: 'Нет данных для анализа', style: 'meta', margin: [0, 0, 0, 20] };
        }

        const body = [
            [
                { text: 'Сегмент', style: 'tableHeader' },
                { text: 'Дистанция (км)', style: 'tableHeader' },
                { text: 'Координаты', style: 'tableHeader' },
                { text: 'Риск', style: 'tableHeader' },
                { text: 'Ветер (м/с)', style: 'tableHeader' },
                { text: 'Температура (°C)', style: 'tableHeader' }
            ]
        ];

        segments.forEach((segment, i) => {
            const segAnalysis = analysis?.[i] || {};
            const firstHour = segAnalysis?.analyzed?.hourly?.[0] || {};
            const coords = segment.center ?
                `${segment.center.lat.toFixed(4)}, ${segment.center.lon.toFixed(4)}` : '—';

            body.push([
                { text: (i + 1).toString(), alignment: 'center' },
                { text: (segment.distance || 0).toFixed(1), alignment: 'center' },
                { text: coords, fontSize: 9 },
                {
                    text: this.getRiskLabel(segAnalysis?.riskLevel || 'low'),
                    alignment: 'center',
                    color: this.getRiskColor(segAnalysis?.riskLevel || 'low')
                },
                { text: (firstHour?.wind10m || 0).toFixed(1), alignment: 'center' },
                { text: (firstHour?.temp2m || 0).toFixed(1), alignment: 'center' }
            ]);
        });

        return {
            stack: [
                {
                    text: 'Анализ рисков по сегментам',
                    style: 'sectionTitle',
                    margin: [0, 0, 0, 10]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto'],
                        body: body
                    },
                    layout: 'lightHorizontalLines'
                }
            ],
            margin: [0, 0, 0, 20]
        };
    },

    /**
     * Детали по сегментам
     */
    createSegmentsDetails(segments, analysis) {
        const content = [];

        segments.forEach((segment, i) => {
            const segAnalysis = analysis?.[i] || {};
            if (!segAnalysis || !segAnalysis.analyzed) return;

            const recommendations = WeatherModule.generateRecommendations(segAnalysis.analyzed);
            const firstHour = segAnalysis.analyzed.hourly?.[0] || {};

            content.push({
                stack: [
                    {
                        text: `Сегмент ${i + 1}`,
                        style: 'subsectionTitle',
                        margin: [0, 15, 0, 8]
                    },
                    {
                        table: {
                            widths: ['*', '*', '*', '*'],
                            body: [
                                [
                                    { text: `Ветер: ${(firstHour?.wind10m || 0).toFixed(1)} м/с`, fontSize: 10 },
                                    { text: `Температура: ${(firstHour?.temp2m || 0).toFixed(1)}°C`, fontSize: 10 },
                                    { text: `Видимость: ${(firstHour?.visibility || 5).toFixed(1)} км`, fontSize: 10 },
                                    { text: `Осадки: ${(firstHour?.precip || 0).toFixed(1)} мм`, fontSize: 10 }
                                ]
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 10]
                    }
                ]
            });

            if (recommendations.length > 0) {
                content.push({
                    ul: recommendations.map(rec => ({
                        text: rec.text.replace(/<[^>]*>/g, ''),
                        color: this.getRecommendationColor(rec.type),
                        margin: [0, 2, 0, 2]
                    })),
                    margin: [10, 0, 0, 0]
                });
            }
        });

        return {
            stack: [
                {
                    text: 'Детальный анализ по сегментам',
                    style: 'sectionTitle',
                    margin: [0, 0, 0, 10]
                },
                ...content
            ],
            margin: [0, 0, 0, 20]
        };
    },

    /**
     * Рекомендации
     */
    createRecommendations(data) {
        const recommendations = [];
        const segmentAnalysis = data.segmentAnalysis || [];
        const analysis = segmentAnalysis[0]?.analyzed;

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

        if (data.pilotData) {
            recommendations.push({
                type: 'info',
                text: 'Данные скорректированы по фактическим наблюдениям с точки старта.'
            });
        }

        return {
            stack: [
                {
                    text: 'Рекомендации',
                    style: 'sectionTitle',
                    margin: [0, 0, 0, 10]
                },
                {
                    ul: recommendations.map(rec => ({
                        text: rec.text.replace(/<[^>]*>/g, ''),
                        color: this.getRecommendationColor(rec.type),
                        margin: [0, 5, 0, 5],
                        fontSize: 11
                    })),
                    margin: [0, 0, 0, 20]
                }
            ]
        };
    },

    /**
     * Приложение с данными
     */
    createDataAppendix(data) {
        return {
            stack: [
                {
                    text: 'Приложение: Исходные данные',
                    style: 'sectionTitle',
                    margin: [0, 0, 0, 10],
                    pageBreak: 'before'
                },
                {
                    text: 'Координаты маршрута',
                    style: 'subsectionTitle',
                    margin: [0, 15, 0, 8]
                },
                {
                    table: {
                        widths: ['auto', '*', '*'],
                        headerRows: 1,
                        body: [
                            [
                                { text: '№', style: 'tableHeader' },
                                { text: 'Широта', style: 'tableHeader' },
                                { text: 'Долгота', style: 'tableHeader' }
                            ],
                            ...(data.route.points || []).map((p, i) => [
                                { text: (i + 1).toString(), alignment: 'center' },
                                { text: p.lat.toFixed(6) },
                                { text: p.lon.toFixed(6) }
                            ])
                        ]
                    },
                    layout: 'lightHorizontalLines'
                },
                {
                    text: 'Параметры анализа',
                    style: 'subsectionTitle',
                    margin: [0, 15, 0, 8]
                },
                {
                    table: {
                        widths: ['50%', '50%'],
                        body: [
                            [{ text: 'Параметр', style: 'tableHeader' }, { text: 'Значение', style: 'tableHeader' }],
                            [{ text: 'Длина сегмента' }, { text: '10 км' }],
                            [{ text: 'Всего сегментов' }, { text: (data.segments?.length || 0).toString() }],
                            [{ text: 'Коррекция пилота' }, { text: data.pilotData ? 'Применена' : 'Нет' }],
                            [{ text: 'Дата анализа' }, { text: new Date().toLocaleDateString('ru-RU') }]
                        ]
                    },
                    layout: 'lightHorizontalLines'
                }
            ]
        };
    },

    /**
     * Стили документа
     */
    getStyles() {
        return {
            mainTitle: {
                fontSize: 28,
                bold: true,
                color: '#2d3748',
                font: 'Roboto'
            },
            subtitle: {
                fontSize: 14,
                color: '#718096',
                font: 'Roboto'
            },
            meta: {
                fontSize: 10,
                color: '#4a5568',
                font: 'Roboto'
            },
            sectionTitle: {
                fontSize: 16,
                bold: true,
                color: '#2d3748',
                margin: [0, 10, 0, 5],
                font: 'Roboto'
            },
            subsectionTitle: {
                fontSize: 13,
                bold: true,
                color: '#4a5568',
                margin: [0, 8, 0, 4],
                font: 'Roboto'
            },
            bigStat: {
                fontSize: 24,
                bold: true,
                color: '#2d3748',
                font: 'Roboto'
            },
            statLabel: {
                fontSize: 9,
                color: '#718096',
                margin: [0, 2, 0, 0],
                font: 'Roboto'
            },
            tableHeader: {
                fontSize: 10,
                bold: true,
                color: '#4a5568',
                alignment: 'center',
                font: 'Roboto'
            }
        };
    },

    /**
     * Разрыв страницы перед разделами
     */
    getPageBreakBefore(currentNode, followingNodesOnPage) {
        if (currentNode.style === 'sectionTitle' && followingNodesOnPage.length > 10) {
            return true;
        }
        return false;
    },

    /**
     * Форматирование имени файла
     */
    formatFilename(name) {
        return name
            .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s-]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);
    },

    /**
     * Получение метки риска
     */
    getRiskLabel(risk) {
        const labels = {
            low: 'Низкий',
            medium: 'Средний',
            high: 'Высокий'
        };
        return labels[risk] || risk;
    },

    /**
     * Получение цвета риска
     */
    getRiskColor(risk) {
        const colors = {
            low: '#38a169',
            medium: '#ed8936',
            high: '#e53e3e'
        };
        return colors[risk] || '#4a5568';
    },

    /**
     * Получение цвета рекомендации
     */
    getRecommendationColor(type) {
        const colors = {
            critical: '#e53e3e',
            warning: '#dd6b20',
            info: '#3182ce',
            success: '#38a169'
        };
        return colors[type] || '#4a5568';
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PdfExportModule;
}

// Добавляем в глобальную область
window.PdfExportModule = PdfExportModule;
