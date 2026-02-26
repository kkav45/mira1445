/**
 * MIRA - Улучшенные таблицы (table-utils.js)
 * Сортировка, фильтрация, пагинация, экспорт в CSV/Excel
 */

export const TableManager = {
    /**
     * Инициализация таблицы
     * @param {string} tableId - ID таблицы
     * @param {object} options - Опции
     */
    init(tableId, options = {}) {
        this.table = document.getElementById(tableId);
        if (!this.table) {
            console.error(`Таблица с ID "${tableId}" не найдена`);
            return null;
        }

        this.options = {
            sortable: true,
            filterable: true,
            exportable: true,
            pagination: false,
            pageSize: 25,
            ...options
        };

        this.currentSort = { column: null, direction: 'asc' };
        this.filteredData = [];

        this.setup();
        return this;
    },

    /**
     * Настройка таблицы
     */
    setup() {
        if (this.options.sortable) {
            this.addSortableHeaders();
        }

        if (this.options.filterable) {
            this.addFilterRow();
        }

        if (this.options.exportable) {
            this.addExportButtons();
        }

        if (this.options.pagination) {
            this.addPagination();
        }

        this.addStyles();
    },

    /**
     * Добавление сортируемых заголовков
     */
    addSortableHeaders() {
        const headers = this.table.querySelectorAll('thead th');
        
        headers.forEach((th, index) => {
            // Пропускаем заголовки без данных
            if (th.classList.contains('no-sort')) return;

            th.style.cursor = 'pointer';
            th.setAttribute('role', 'button');
            th.setAttribute('tabindex', '0');
            th.setAttribute('aria-sort', 'none');
            th.setAttribute('aria-label', `Сортировать по "${th.textContent.trim()}"`);

            // Добавляем иконку сортировки
            const icon = document.createElement('i');
            icon.className = 'fas fa-sort sort-icon';
            icon.style.marginLeft = '6px';
            icon.style.opacity = '0.5';
            th.appendChild(icon);

            // Обработчик клика
            th.addEventListener('click', () => this.sortByColumn(index));
            
            // Обработчик клавиатуры
            th.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.sortByColumn(index);
                }
            });
        });
    },

    /**
     * Добавление строки фильтрации
     */
    addFilterRow() {
        const headerRow = this.table.querySelector('thead tr');
        if (!headerRow) return;

        const filterRow = document.createElement('tr');
        filterRow.className = 'table-filter-row';

        const headers = headerRow.querySelectorAll('th');
        headers.forEach((th, index) => {
            if (th.classList.contains('no-filter')) {
                const td = document.createElement('td');
                filterRow.appendChild(td);
                return;
            }

            const td = document.createElement('td');
            td.className = 'table-filter-cell';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'table-filter-input';
            input.placeholder = 'Фильтр...';
            input.setAttribute('data-column', index);
            input.setAttribute('aria-label', `Фильтр по колонке ${th.textContent.trim()}`);

            // Debounce для производительности
            const debouncedFilter = this.debounce((e) => {
                this.filterTable();
            }, 300);

            input.addEventListener('input', debouncedFilter);

            td.appendChild(input);
            filterRow.appendChild(td);
        });

        // Вставляем после строки заголовков
        const tbody = this.table.querySelector('tbody');
        if (tbody) {
            tbody.parentNode.insertBefore(filterRow, tbody);
        } else {
            this.table.querySelector('thead').appendChild(filterRow);
        }
    },

    /**
     * Добавление кнопок экспорта
     */
    addExportButtons() {
        const container = this.table.parentElement;
        if (!container) return;

        const exportBar = document.createElement('div');
        exportBar.className = 'table-export-bar';
        exportBar.style.cssText = `
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
            padding: 8px 0;
        `;

        const buttons = [
            {
                icon: 'fa-file-csv',
                label: 'CSV',
                onclick: () => this.exportToCSV()
            },
            {
                icon: 'fa-file-excel',
                label: 'Excel',
                onclick: () => this.exportToExcel()
            },
            {
                icon: 'fa-print',
                label: 'Печать',
                onclick: () => this.printTable()
            }
        ];

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = 'table-export-btn';
            button.innerHTML = `<i class="fas ${btn.icon}"></i> ${btn.label}`;
            button.onclick = btn.onclick;
            button.style.cssText = `
                padding: 8px 14px;
                border: 1px solid rgba(0,0,0,0.15);
                border-radius: 6px;
                background: rgba(255,255,255,0.9);
                color: #4a5568;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s;
            `;
            button.onmouseover = () => {
                button.style.background = 'rgba(255,255,255,1)';
                button.style.transform = 'translateY(-1px)';
                button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            };
            button.onmouseout = () => {
                button.style.background = 'rgba(255,255,255,0.9)';
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = 'none';
            };
            exportBar.appendChild(button);
        });

        container.insertBefore(exportBar, this.table);
    },

    /**
     * Сортировка по колонке
     */
    sortByColumn(columnIndex) {
        const tbody = this.table.querySelector('tbody');
        if (!tbody) return;

        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        // Определяем направление
        if (this.currentSort.column === columnIndex) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = columnIndex;
            this.currentSort.direction = 'asc';
        }

        // Сортировка
        rows.sort((a, b) => {
            const aCell = a.children[columnIndex];
            const bCell = b.children[columnIndex];
            
            if (!aCell || !bCell) return 0;

            const aText = aCell.textContent.trim();
            const bText = bText = bCell.textContent.trim();

            // Числовое сравнение
            const aNum = parseFloat(aText.replace(',', '.').replace(/[^\d.-]/g, ''));
            const bNum = parseFloat(bText.replace(',', '.').replace(/[^\d.-]/g, ''));

            if (!isNaN(aNum) && !isNaN(bNum)) {
                return this.currentSort.direction === 'asc' 
                    ? aNum - bNum 
                    : bNum - aNum;
            }

            // Сравнение дат
            const aDate = new Date(aText);
            const bDate = new Date(bText);
            if (!isNaN(aDate) && !isNaN(bDate)) {
                return this.currentSort.direction === 'asc'
                    ? aDate - bDate
                    : bDate - aDate;
            }

            // Строковое сравнение
            return this.currentSort.direction === 'asc'
                ? aText.localeCompare(bText, 'ru')
                : bText.localeCompare(aText, 'ru');
        });

        // Перерисовка
        rows.forEach(row => tbody.appendChild(row));

        // Обновление иконок
        this.updateSortIcons(columnIndex);

        // Обновление ARIA
        this.updateSortARIA(columnIndex);
    },

    /**
     * Обновление иконок сортировки
     */
    updateSortIcons(activeColumn) {
        const headers = this.table.querySelectorAll('thead th');
        
        headers.forEach((th, index) => {
            const icon = th.querySelector('.sort-icon');
            if (!icon) return;

            if (index === activeColumn) {
                icon.className = `fas fa-sort-${this.currentSort.direction === 'asc' ? 'up' : 'down'} sort-icon`;
                icon.style.opacity = '1';
            } else {
                icon.className = 'fas fa-sort sort-icon';
                icon.style.opacity = '0.5';
            }
        });
    },

    /**
     * Обновление ARIA атрибутов
     */
    updateSortARIA(columnIndex) {
        const headers = this.table.querySelectorAll('thead th');
        
        headers.forEach((th, index) => {
            if (index === columnIndex) {
                th.setAttribute('aria-sort', this.currentSort.direction === 'asc' ? 'ascending' : 'descending');
            } else {
                th.setAttribute('aria-sort', 'none');
            }
        });
    },

    /**
     * Фильтрация таблицы
     */
    filterTable() {
        const filters = this.table.querySelectorAll('.table-filter-input');
        const filterValues = Array.from(filters).map(input => input.value.toLowerCase().trim());

        const tbody = this.table.querySelector('tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        let visibleCount = 0;

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            let isVisible = true;

            filterValues.forEach((filter, index) => {
                if (!filter) return;
                
                const cell = cells[index];
                if (!cell) return;

                const cellText = cell.textContent.toLowerCase().trim();
                
                if (!cellText.includes(filter)) {
                    isVisible = false;
                }
            });

            row.style.display = isVisible ? '' : 'none';
            if (isVisible) visibleCount++;
        });

        // Сообщение если ничего не найдено
        this.showNoResultsMessage(visibleCount === 0);
    },

    /**
     * Сообщение "нет результатов"
     */
    showNoResultsMessage(show) {
        let messageRow = this.table.querySelector('.no-results-row');

        if (show) {
            if (!messageRow) {
                messageRow = document.createElement('tr');
                messageRow.className = 'no-results-row';
                
                const cellCount = this.table.querySelectorAll('thead th').length;
                const td = document.createElement('td');
                td.colSpan = cellCount;
                td.className = 'no-results-cell';
                td.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: rgba(0,0,0,0.5);">
                        <i class="fas fa-search" style="font-size: 24px; margin-bottom: 8px;"></i>
                        <div>Ничего не найдено</div>
                    </div>
                `;
                messageRow.appendChild(td);
            }
            
            const tbody = this.table.querySelector('tbody');
            tbody.appendChild(messageRow);
        } else if (messageRow) {
            messageRow.remove();
        }
    },

    /**
     * Экспорт в CSV
     */
    exportToCSV(filename = 'export.csv') {
        const rows = this.table.querySelectorAll('tr');
        
        const csv = Array.from(rows).map(row => {
            const cells = row.querySelectorAll('th, td');
            return Array.from(cells)
                .map(cell => {
                    let text = cell.textContent.trim();
                    // Экранирование кавычек
                    text = text.replace(/"/g, '""');
                    return `"${text}"`;
                })
                .join(',');
        }).join('\n');

        this.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    },

    /**
     * Экспорт в Excel
     */
    exportToExcel(filename = 'export.xlsx') {
        if (typeof XLSX === 'undefined') {
            // Загружаем библиотеку динамически
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
            script.onload = () => this.doExportToExcel(filename);
            document.head.appendChild(script);
        } else {
            this.doExportToExcel(filename);
        }
    },

    /**
     * Реальный экспорт в Excel
     */
    doExportToExcel(filename) {
        const wb = XLSX.utils.table_to_book(this.table, { sheet: 'Данные' });
        XLSX.writeFile(wb, filename);
    },

    /**
     * Печать таблицы
     */
    printTable() {
        const printWindow = window.open('', '_blank');
        
        const styles = `
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #2d3748; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
                th { background: #667eea; color: white; }
                tr:nth-child(even) { background: #f7fafc; }
                @media print {
                    body { padding: 0; }
                }
            </style>
        `;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Таблица данных</title>
                    ${styles}
                </head>
                <body>
                    <h1>Таблица данных</h1>
                    ${this.table.outerHTML}
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.print();
    },

    /**
     * Скачивание файла
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`Файл ${filename} загружен`, 'success');
    },

    /**
     * Добавление стилей
     */
    addStyles() {
        const styleId = 'table-manager-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .table-filter-input {
                width: 100%;
                padding: 6px 8px;
                border: 1px solid rgba(0,0,0,0.15);
                border-radius: 4px;
                font-size: 12px;
                background: rgba(255,255,255,0.9);
                transition: all 0.2s;
            }

            .table-filter-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
            }

            .table-filter-cell {
                padding: 6px 8px;
            }

            .sort-icon {
                transition: opacity 0.2s;
            }

            th[aria-sort="ascending"] .sort-icon,
            th[aria-sort="descending"] .sort-icon {
                opacity: 1 !important;
            }

            .table-export-btn:hover {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-color: transparent;
            }

            .no-results-cell {
                text-align: center;
                padding: 30px !important;
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Debounce утилита
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Обновление данных таблицы
     */
    updateData(newData) {
        // TODO: Реализовать обновление данных
        console.log('Обновление данных:', newData);
    },

    /**
     * Очистка таблицы
     */
    clear() {
        const tbody = this.table.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
        }
    }
};

/**
 * Глобальная функция showToast (если ещё не определена)
 */
if (typeof showToast === 'undefined') {
    window.showToast = function(message, type = 'info') {
        console.log(`[Toast] ${type}: ${message}`);
    };
}
