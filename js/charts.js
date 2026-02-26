/**
 * MIRA - Графики (charts.js)
 * Plotly.js визуализация метеоданных
 */

const ChartsModule = {
    defaultLayout: {
        autosize: true,
        margin: { t: 30, r: 20, l: 50, b: 40 },
        font: { family: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' },
        showlegend: false,
        hovermode: 'x unified',
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)'
    },

    defaultConfig: {
        responsive: true,
        displayModeBar: false,
        scrollZoom: false,
        displaylogo: false
    },

    /**
     * Временной ряд метеопараметров
     */
    createTimeSeriesChart(containerId, data) {
        if (!data || !data.times) return;

        const trace1 = {
            x: data.times,
            y: data.temperature,
            name: 'Температура',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#e53e3e', width: 2 },
            marker: { size: 4 },
            yaxis: 'y1'
        };

        const trace2 = {
            x: data.times,
            y: data.wind10m,
            name: 'Ветер',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#3182ce', width: 2 },
            marker: { size: 4 },
            yaxis: 'y2'
        };

        const trace3 = {
            x: data.times,
            y: data.precip,
            name: 'Осадки',
            type: 'bar',
            marker: { color: '#4299e1', opacity: 0.7 },
            yaxis: 'y2'
        };

        const layout = {
            ...this.defaultLayout,
            yaxis: {
                title: '°C',
                titlefont: { color: '#e53e3e' },
                tickfont: { color: '#e53e3e' }
            },
            yaxis2: {
                title: 'м/с, мм',
                titlefont: { color: '#3182ce' },
                tickfont: { color: '#3182ce' },
                overlaying: 'y',
                side: 'right'
            },
            xaxis: {
                title: 'Время',
                tickangle: -45
            }
        };

        Plotly.newPlot(containerId, [trace1, trace2, trace3], layout, this.defaultConfig);
    },

    /**
     * Вертикальный профиль ветра
     */
    createVerticalWindProfile(containerId, windData) {
        const heights = [10, 100, 250, 350, 450, 550];
        const windSpeeds = windData || [5, 7, 10, 12, 14, 16];

        const trace = {
            x: windSpeeds,
            y: heights,
            name: 'Ветер',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#3182ce', width: 3, shape: 'spline' },
            marker: { size: 8, color: '#3182ce' },
            fill: 'tozero',
            fillcolor: 'rgba(49, 130, 206, 0.1)'
        };

        const layout = {
            ...this.defaultLayout,
            xaxis: {
                title: 'Ветер (м/с)',
                range: [0, Math.max(...windSpeeds) * 1.2]
            },
            yaxis: {
                title: 'Высота (м)',
                range: [0, 600]
            }
        };

        Plotly.newPlot(containerId, [trace], layout, this.defaultConfig);
    },

    /**
     * Вертикальный профиль температуры
     */
    createTemperatureProfile(containerId, tempData) {
        const heights = [10, 100, 250, 350, 450, 550];
        const temps = tempData || [20, 19, 17, 15, 13, 11];

        const trace = {
            x: temps,
            y: heights,
            name: 'Температура',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#e53e3e', width: 3, shape: 'spline' },
            marker: { size: 8, color: '#e53e3e' }
        };

        const layout = {
            ...this.defaultLayout,
            xaxis: {
                title: 'Температура (°C)'
            },
            yaxis: {
                title: 'Высота (м)',
                range: [0, 600]
            }
        };

        Plotly.newPlot(containerId, [trace], layout, this.defaultConfig);
    },

    /**
     * Роза ветров
     */
    createWindRose(containerId, windData) {
        const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
        const angles = [0, 45, 90, 135, 180, 225, 270, 315];
        
        // Группировка по направлениям
        const sectorData = new Array(8).fill(0);
        const sectorCount = new Array(8).fill(0);

        if (windData && windData.windDir) {
            windData.windDir.forEach((dir, i) => {
                const sector = Math.round(dir / 45) % 8;
                sectorData[sector] += windData.wind10m[i] || 0;
                sectorCount[sector]++;
            });
        }

        const avgWind = sectorData.map((sum, i) => 
            sectorCount[i] > 0 ? sum / sectorCount[i] : 0
        );

        const trace = {
            theta: angles,
            r: avgWind,
            name: 'Ветер',
            type: 'barpolar',
            marker: {
                color: avgWind.map(v => {
                    if (v > 10) return '#e53e3e';
                    if (v > 5) return '#ed8936';
                    return '#38a169';
                }),
                line: {
                    color: '#fff',
                    width: 1
                }
            }
        };

        const layout = {
            ...this.defaultLayout,
            polar: {
                radialaxis: {
                    visible: true,
                    range: [0, Math.max(...avgWind, 10)]
                },
                angularaxis: {
                    direction: 'clockwise',
                    period: 8,
                    tickvals: angles,
                    ticktext: directions
                }
            },
            margin: { t: 30, r: 20, l: 20, b: 20 }
        };

        Plotly.newPlot(containerId, [trace], layout, this.defaultConfig);
    },

    /**
     * Индекс турбулентности
     */
    createTurbulenceChart(containerId, data) {
        if (!data || !data.times) return;

        const turbulence = data.wind10m.map((wind, i) => {
            const gust = data.windGust ? data.windGust[i] : wind * 1.3;
            return ((gust - wind) / wind * 100).toFixed(1);
        });

        const trace = {
            x: data.times,
            y: turbulence,
            name: 'Турбулентность',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#ed8936', width: 2 },
            marker: { size: 4 },
            fill: 'tozero',
            fillcolor: 'rgba(237, 137, 54, 0.1)'
        };

        const layout = {
            ...this.defaultLayout,
            yaxis: {
                title: 'Турбулентность (%)',
                range: [0, 100]
            },
            xaxis: {
                title: 'Время',
                tickangle: -45
            },
            shapes: [
                {
                    type: 'line',
                    y0: 50,
                    y1: 50,
                    x0: 0,
                    x1: 1,
                    xref: 'paper',
                    line: { color: '#ed8936', width: 1, dash: 'dash' }
                },
                {
                    type: 'line',
                    y0: 75,
                    y1: 75,
                    x0: 0,
                    x1: 1,
                    xref: 'paper',
                    line: { color: '#e53e3e', width: 1, dash: 'dash' }
                }
            ],
            annotations: [
                {
                    x: 1,
                    y: 50,
                    xref: 'paper',
                    yref: 'y',
                    text: 'Средняя',
                    showarrow: false,
                    xanchor: 'right',
                    font: { size: 10, color: '#ed8936' }
                },
                {
                    x: 1,
                    y: 75,
                    xref: 'paper',
                    yref: 'y',
                    text: 'Высокая',
                    showarrow: false,
                    xanchor: 'right',
                    font: { size: 10, color: '#e53e3e' }
                }
            ]
        };

        Plotly.newPlot(containerId, [trace], layout, this.defaultConfig);
    },

    /**
     * Высота нижней границы облаков
     */
    createCeilingChart(containerId, data) {
        if (!data || !data.times) return;

        // Примерная высота облаков на основе cloud cover
        const ceiling = data.cloudCover.map(cc => {
            if (cc < 20) return 3000;
            if (cc < 50) return 1500;
            if (cc < 80) return 800;
            return 400;
        });

        const trace = {
            x: data.times,
            y: ceiling,
            name: 'НГО',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#805ad5', width: 2 },
            marker: { size: 4 },
            fill: 'tozero',
            fillcolor: 'rgba(128, 90, 213, 0.1)'
        };

        const layout = {
            ...this.defaultLayout,
            yaxis: {
                title: 'Высота (м)',
                range: [0, 3000]
            },
            xaxis: {
                title: 'Время',
                tickangle: -45
            },
            shapes: [
                {
                    type: 'line',
                    y0: 300,
                    y1: 300,
                    x0: 0,
                    x1: 1,
                    xref: 'paper',
                    line: { color: '#e53e3e', width: 2, dash: 'dash' }
                }
            ],
            annotations: [
                {
                    x: 1,
                    y: 300,
                    xref: 'paper',
                    yref: 'y',
                    text: 'Минимум',
                    showarrow: false,
                    xanchor: 'right',
                    font: { size: 10, color: '#e53e3e' }
                }
            ]
        };

        Plotly.newPlot(containerId, [trace], layout, this.defaultConfig);
    },

    /**
     * Тепловая карта полётных окон
     */
    createFlightWindowsCalendar(containerId, flightWindows) {
        if (!flightWindows || flightWindows.length === 0) {
            // Пустая тепловая карта
            const trace = {
                type: 'heatmap',
                x: [],
                y: [],
                z: [],
                colorscale: [[0, '#38a169'], [0.5, '#ed8936'], [1, '#e53e3e']]
            };
            Plotly.newPlot(containerId, [trace], this.defaultLayout, this.defaultConfig);
            return;
        }

        // Создаём данные для тепловой карты (24 часа x 7 дней)
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        
        const z = days.map(() => hours.map(() => 0));

        flightWindows.forEach(window => {
            const startDate = new Date(window.start);
            const dayIndex = (startDate.getDay() + 6) % 7; // Пн=0
            
            window.hours.forEach(h => {
                const hour = new Date(h.time).getHours();
                const riskValue = h.riskScore >= 5 ? 2 : h.riskScore >= 2 ? 1 : 0;
                z[dayIndex][hour] = riskValue;
            });
        });

        const trace = {
            type: 'heatmap',
            x: hours.map(h => `${h}:00`),
            y: days,
            z: z,
            colorscale: [
                [0, '#38a169'],
                [0.5, '#ed8936'],
                [1, '#e53e3e']
            ],
            showscale: false,
            hovertemplate: 'День: %{y}<br>Время: %{x}<br>Риск: %{z}<extra></extra>'
        };

        const layout = {
            ...this.defaultLayout,
            xaxis: {
                title: 'Время суток',
                tickangle: -45
            },
            yaxis: {
                title: 'День недели'
            },
            margin: { t: 30, r: 20, l: 50, b: 60 }
        };

        Plotly.newPlot(containerId, [trace], layout, this.defaultConfig);
    },

    /**
     * Сравнение прогноза и факта
     */
    createComparisonChart(containerId, forecast, actual) {
        const times = forecast.times || [];

        const forecastTrace = {
            x: times,
            y: forecast.temperature || [],
            name: 'Прогноз',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#3182ce', width: 2, dash: 'dash' },
            marker: { size: 4 }
        };

        const actualTrace = {
            x: times,
            y: actual.temperature || [],
            name: 'Факт',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#e53e3e', width: 2 },
            marker: { size: 4 }
        };

        const layout = {
            ...this.defaultLayout,
            yaxis: {
                title: 'Температура (°C)'
            },
            xaxis: {
                title: 'Время',
                tickangle: -45
            }
        };

        Plotly.newPlot(containerId, [forecastTrace, actualTrace], layout, this.defaultConfig);
    },

    /**
     * Профиль маршрута с рисками
     */
    createRouteProfileChart(containerId, segments, risks) {
        const distances = [0];
        const riskValues = [];
        
        let totalDistance = 0;
        segments.forEach((segment, i) => {
            if (i > 0) {
                const prev = segments[i - 1][0];
                const curr = segment[0];
                totalDistance += Utils.calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
            }
            distances.push(totalDistance);
            
            const riskMap = { low: 1, medium: 2, high: 3 };
            riskValues.push(riskMap[risks[i] || 'low']);
        });

        const trace = {
            x: distances,
            y: riskValues,
            name: 'Риск',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#3182ce', width: 2, shape: 'hv' },
            marker: { 
                size: 8,
                color: riskValues.map(v => {
                    if (v >= 3) return '#e53e3e';
                    if (v >= 2) return '#ed8936';
                    return '#38a169';
                })
            },
            fill: 'tozero',
            fillcolor: 'rgba(49, 130, 206, 0.1)'
        };

        const layout = {
            ...this.defaultLayout,
            yaxis: {
                title: 'Уровень риска',
                tickvals: [1, 2, 3],
                ticktext: ['Низкий', 'Средний', 'Высокий'],
                range: [0, 3.5]
            },
            xaxis: {
                title: 'Дистанция (км)'
            }
        };

        Plotly.newPlot(containerId, [trace], layout, this.defaultConfig);
    },

    /**
     * Обновление графика при изменении размера
     */
    resizeAllCharts() {
        const charts = document.querySelectorAll('.js-plotly-plot');
        charts.forEach(chart => {
            Plotly.Plots.resize(chart);
        });
    },

    /**
     * Очистка графика
     */
    clearChart(containerId) {
        Plotly.purge(containerId);
    },

    /**
     * Экспорт графика в изображение
     */
    exportChartToImage(containerId, filename = 'chart.png') {
        Plotly.downloadImage(containerId, {
            format: 'png',
            width: 800,
            height: 600,
            filename: filename
        });
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartsModule;
}
