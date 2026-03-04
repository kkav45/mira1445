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
     * Инициализация pdfMake
     */
    initPdfMake() {
        if (typeof pdfMake !== 'undefined') {
            pdfMake.fonts = this.fonts;
            console.log('✅ pdfMake инициализирован');
        }
    },

    /**
     * Генерация отчёта
     */
    async generateReport(data) {
        console.log('📄 PDF Export: начало генерации', data);

        // Поддержка старого формата (один маршрут) и нового (массив маршрутов)
        let routes = data.routes || [];

        if (routes.length === 0 && data.route) {
            // Старый формат - один маршрут
            routes = [data];
        }

        if (routes.length === 0) {
            showToast('Нет данных для экспорта', 'error');
            return;
        }

        if (typeof pdfMake === 'undefined') {
            console.error('❌ pdfMake не загружен');
            showToast('PDF модуль не загружен. Обновите страницу.', 'error');
            return;
        }

        // Инициализация шрифтов
        this.initPdfMake();

        try {
            console.log('📄 PDF Export: создание документа...');
            const docDefinition = this.createDocDefinition({ routes, pilotData: data.pilotData, correctedAnalysis: data.correctedAnalysis });
            console.log('📄 PDF Export: docDefinition создан');

            pdfMake.fonts = this.fonts;
            const pdf = pdfMake.createPdf(docDefinition);
            console.log('📄 PDF Export: PDF создан, начинается загрузка...');

            const filename = routes.length === 1
                ? this.formatFilename(routes[0].route.name)
                : `MIRA_Report_${new Date().toISOString().split('T')[0]}`;
            
            pdf.download(`${filename}.pdf`, () => {
                console.log('✅ PDF успешно загружен');
            });

            console.log('📄 PDF отчёт сгенерирован');
        } catch (error) {
            console.error('❌ Ошибка в generateReport:', error);
            showToast('Ошибка при создании PDF: ' + error.message, 'error');
        }
    },

    /**
     * Создание структуры документа
     */
    createDocDefinition(data) {
        const routes = data.routes || [];
        const pilotData = data.pilotData;
        
        const content = [];

        // Заголовок документа
        content.push(this.createMainHeader(routes));
        content.push({ text: '', margin: [0, 10] });

        // По каждому маршруту
        routes.forEach((routeData, index) => {
            const route = routeData.route;
            const segmentAnalysis = routeData.segmentAnalysis || [];
            const meteorology = routeData.meteorology;
            const flightWindows = routeData.flightWindows || [];
            const recommendations = routeData.recommendations || [];
            
            // Заголовок маршрута
            content.push(this.createRouteHeader(route, segmentAnalysis));
            content.push({ text: '', margin: [0, 8] });

            // Параметры маршрута
            content.push(this.createRouteParams(route, segmentAnalysis));
            content.push({ text: '', margin: [0, 10] });

            // Метеоанализ
            content.push(this.createMeteorologySection(meteorology));
            content.push({ text: '', margin: [0, 10] });

            // Данные пилота (если есть)
            if (pilotData) {
                content.push(this.createPilotDataSection(pilotData));
                content.push({ text: '', margin: [0, 10] });
            }

            // Окна безопасности
            content.push(this.createFlightWindowsSectionPDF(flightWindows));
            content.push({ text: '', margin: [0, 10] });

            // Рекомендации
            content.push(this.createRecommendationsPDF(recommendations));
            
            // Разделитель между маршрутами
            if (index < routes.length - 1) {
                content.push({ text: '', margin: [0, 20], pageBreak: 'after' });
            }
        });

        return {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [40, 35, 35, 40],
            content: content,
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
     * Главный заголовок документа
     */
    createMainHeader(routes) {
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
                                { text: `Маршрутов: ${routes.length}`, style: 'meta', alignment: 'right' }
                            ],
                            alignment: 'right'
                        }
                    ]
                ]
            },
            layout: 'noBorders'
        };
    },

    /**
     * Заголовок маршрута
     */
    createRouteHeader(route, segmentAnalysis) {
        const overallRisk = segmentAnalysis?.[0]?.riskLevel || 'low';
        const riskLabels = { low: 'НИЗКИЙ', medium: 'СРЕДНИЙ', high: 'ВЫСОКИЙ' };
        const riskColors = { low: '#38a169', medium: '#ed8936', high: '#e53e3e' };

        return {
            table: {
                widths: ['*', 'auto'],
                body: [
                    [
                        {
                            stack: [
                                { text: `🛣️ ${route.name}`, style: 'routeTitle' },
                                { text: `Тип: ${route.type === 'kml' ? 'KML' : 'Ручной'}`, style: 'small' }
                            ],
                            alignment: 'left'
                        },
                        {
                            text: `⚠️ ${riskLabels[overallRisk] || '—'}`,
                            style: 'riskBadge',
                            fillColor: riskColors[overallRisk] || '#cbd5e0',
                            color: '#fff',
                            alignment: 'right'
                        }
                    ]
                ]
            },
            layout: {
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 0,
                paddingBottom: () => 3
            }
        };
    },

    /**
     * Параметры маршрута
     */
    createRouteParams(route, segmentAnalysis) {
        return {
            table: {
                widths: ['*', '*', '*', '*'],
                body: [
                    [
                        {
                            stack: [
                                { text: 'Длина', style: 'paramLabel' },
                                { text: `${route.distance?.toFixed(1) || 0} км`, style: 'paramValue' }
                            ],
                            alignment: 'center',
                            fillColor: '#f7fafc'
                        },
                        {
                            stack: [
                                { text: 'Время', style: 'paramLabel' },
                                { text: `${route.flightTime || 0} мин`, style: 'paramValue' }
                            ],
                            alignment: 'center',
                            fillColor: '#f7fafc'
                        },
                        {
                            stack: [
                                { text: 'Сегменты', style: 'paramLabel' },
                                { text: `${segmentAnalysis?.length || 0}`, style: 'paramValue' }
                            ],
                            alignment: 'center',
                            fillColor: '#f7fafc'
                        },
                        {
                            stack: [
                                { text: 'Тип', style: 'paramLabel' },
                                { text: route.type === 'kml' ? 'KML' : 'Ручной', style: 'paramValue' }
                            ],
                            alignment: 'center',
                            fillColor: '#f7fafc'
                        }
                    ]
                ]
            },
            layout: {
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                paddingLeft: () => 3,
                paddingRight: () => 3,
                paddingTop: () => 3,
                paddingBottom: () => 3
            }
        };
    },

    /**
     * Метеоанализ
     */
    createMeteorologySection(meteorology) {
        const hourly = meteorology?.hourly?.[0] || {};
        const temp = hourly.temp2m !== undefined ? `${hourly.temp2m >= 0 ? '+' : ''}${Math.round(hourly.temp2m)}°C` : '—';
        const wind = hourly.wind10m !== undefined ? `${hourly.wind10m.toFixed(1)} м/с` : '—';
        const visibility = hourly.visibility !== undefined ? `${hourly.visibility} км` : '—';
        const precip = hourly.precip !== undefined ? `${hourly.precip.toFixed(1)} мм` : '—';

        return {
            table: {
                widths: ['*', '*', '*', '*'],
                body: [
                    [
                        {
                            stack: [
                                { text: '🌡️ Температура', style: 'meteoLabel' },
                                { text: temp, style: 'meteoValue' }
                            ],
                            alignment: 'center',
                            fillColor: 'rgba(59, 130, 246, 0.1)'
                        },
                        {
                            stack: [
                                { text: '💨 Ветер', style: 'meteoLabel' },
                                { text: wind, style: 'meteoValue' }
                            ],
                            alignment: 'center',
                            fillColor: 'rgba(16, 185, 129, 0.1)'
                        },
                        {
                            stack: [
                                { text: '👁️ Видимость', style: 'meteoLabel' },
                                { text: visibility, style: 'meteoValue' }
                            ],
                            alignment: 'center',
                            fillColor: 'rgba(245, 158, 11, 0.1)'
                        },
                        {
                            stack: [
                                { text: '🌧️ Осадки', style: 'meteoLabel' },
                                { text: precip, style: 'meteoValue' }
                            ],
                            alignment: 'center',
                            fillColor: 'rgba(139, 92, 246, 0.1)'
                        }
                    ]
                ]
            },
            layout: {
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                paddingLeft: () => 5,
                paddingRight: () => 5,
                paddingTop: () => 5,
                paddingBottom: () => 5
            }
        };
    },

    /**
     * Данные пилота
     */
    createPilotDataSection(pilotData) {
        return {
            table: {
                widths: ['*', '*', '*'],
                body: [
                    [
                        {
                            stack: [
                                { text: '📍 Координаты', style: 'pilotLabel' },
                                { text: `${pilotData.lat?.toFixed(4) || '—'}, ${pilotData.lon?.toFixed(4) || '—'}`, style: 'pilotValue' }
                            ],
                            alignment: 'center'
                        },
                        {
                            stack: [
                                { text: '💨 Ветер', style: 'pilotLabel' },
                                { text: `${pilotData.windSpeed || '—'} м/с ${pilotData.windDir ? '(' + pilotData.windDir + '°)' : ''}`, style: 'pilotValue' }
                            ],
                            alignment: 'center'
                        },
                        {
                            stack: [
                                { text: '🌡️ Температура', style: 'pilotLabel' },
                                { text: `${pilotData.temp || '—'}`, style: 'pilotValue' }
                            ],
                            alignment: 'center'
                        }
                    ]
                ]
            },
            layout: {
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                paddingLeft: () => 5,
                paddingRight: () => 5,
                paddingTop: () => 5,
                paddingBottom: () => 5
            },
            margin: [0, 5, 0, 5]
        };
    },

    /**
     * Окна безопасности
     */
    createFlightWindowsSectionPDF(flightWindows) {
        const safeWindows = (flightWindows || []).filter(w => w.risk === 'low');
        
        if (safeWindows.length === 0) {
            return {
                stack: [
                    { text: '⏰ Окна безопасности', style: 'sectionTitle', margin: [0, 0, 0, 5] },
                    { text: '⚠️ Безопасные окна не найдены', color: '#c05621', fontSize: 10 }
                ]
            };
        }

        const windowsText = safeWindows.map(w => `${w.start} – ${w.end} (${w.duration} ч)`).join(', ');

        return {
            stack: [
                { text: '⏰ Окна безопасности', style: 'sectionTitle', margin: [0, 0, 0, 5] },
                { text: windowsText, fontSize: 10, color: '#276749' }
            ]
        };
    },

    /**
     * Рекомендации
     */
    createRecommendationsPDF(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return {
                stack: [
                    { text: '📋 Рекомендации', style: 'sectionTitle', margin: [0, 0, 0, 5] },
                    { text: '✓ Все параметры в норме', color: '#276749', fontSize: 10 }
                ]
            };
        }

        const recs = recommendations.map(rec => {
            const colors = {
                success: '#38a169',
                warning: '#ed8936',
                critical: '#e53e3e',
                info: '#3b82f6'
            };
            return {
                text: `• ${rec.text}`,
                fontSize: 9,
                color: colors[rec.type] || '#2d3748',
                margin: [5, 2, 0, 2]
            };
        });

        return {
            stack: [
                { text: '📋 Рекомендации', style: 'sectionTitle', margin: [0, 0, 0, 5] },
                ...recs
            ]
        };
    },

    /**
     * Стили для PDF
     */
    getStyles() {
        return {
            mainTitle: {
                fontSize: 24,
                bold: true,
                color: '#667eea',
                margin: [0, 0, 0, 5]
            },
            subheader: {
                fontSize: 10,
                color: '#718096',
                italics: true
            },
            routeTitle: {
                fontSize: 16,
                bold: true,
                color: '#2d3748',
                margin: [0, 0, 0, 3]
            },
            sectionTitle: {
                fontSize: 12,
                bold: true,
                color: '#2d3748',
                margin: [0, 8, 0, 5]
            },
            label: {
                fontSize: 9,
                color: '#718096',
                margin: [0, 0, 0, 3]
            },
            value: {
                fontSize: 14,
                bold: true,
                color: '#2d3748'
            },
            paramLabel: {
                fontSize: 8,
                color: '#718096',
                textTransform: 'uppercase',
                margin: [0, 0, 0, 2]
            },
            paramValue: {
                fontSize: 12,
                bold: true,
                color: '#2d3748'
            },
            meteoLabel: {
                fontSize: 8,
                color: 'rgba(0,0,0,0.6)',
                textTransform: 'uppercase',
                margin: [0, 0, 0, 2]
            },
            meteoValue: {
                fontSize: 11,
                bold: true,
                color: '#2d3748'
            },
            pilotLabel: {
                fontSize: 8,
                color: 'rgba(0,0,0,0.6)',
                margin: [0, 0, 0, 2]
            },
            pilotValue: {
                fontSize: 10,
                bold: true,
                color: '#2d3748'
            },
            riskBadge: {
                fontSize: 10,
                bold: true,
                color: '#fff',
                padding: [8, 4, 8, 4],
                alignment: 'center'
            },
            small: {
                fontSize: 8,
                color: '#718096'
            },
            meta: {
                fontSize: 9,
                color: '#718096'
            },
            footer: {
                fontSize: 8,
                color: '#a0aec0',
                italics: true
            },
            note: {
                fontSize: 9,
                color: '#718096',
                italics: true
            }
        };
    },

    /**
     * Форматирование имени файла
     */
    formatFilename(name) {
        return `MIRA_${name.replace(/[^a-z0-9а-яё]/gi, '_')}_${new Date().toISOString().split('T')[0]}`;
    },

    /**
     * Получить label для риска
     */
    getRiskLabel(risk) {
        const labels = { low: 'НИЗКИЙ', medium: 'СРЕДНИЙ', high: 'ВЫСОКИЙ' };
        return labels[risk] || '—';
    }
};

// Экспорт модуля
window.PdfExport2PageModule = PdfExport2PageModule;
console.log('✅ PdfExport2PageModule загружен');

// Инициализация pdfMake после загрузки страницы
if (typeof pdfMake !== 'undefined') {
    PdfExport2PageModule.initPdfMake();
} else {
    console.log('⏳ Ожидание загрузки pdfMake...');
    window.addEventListener('load', () => {
        if (typeof pdfMake !== 'undefined') {
            PdfExport2PageModule.initPdfMake();
        }
    });
}
