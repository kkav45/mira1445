# MIRA — Техническая документация

**Версия проекта:** 0.1.5.0  
**Дата:** 26 февраля 2026 г.

---

## 📚 Структура документации

### Основные документы

| № | Документ | Файл | Описание |
|---|----------|------|----------|
| 1 | [Архитектура проекта](01_ARCHITECTURE.md) | `01_ARCHITECTURE.md` | Общий обзор, модули, зависимости |
| 2 | [WeatherModule](02_WEATHER_MODULE.md) | `02_WEATHER_MODULE.md` | Получение и анализ метеоданных |
| 3 | [RouteModule](03_ROUTE_MODULE.md) | `03_ROUTE_MODULE.md` | Управление маршрутами |
| 4 | [PilotModule](04_PILOT_MODULE.md) | `04_PILOT_MODULE.md` | Коррекция по фактическим данным |
| 5 | [ChartsModule](05_CHARTS_MODULE.md) | `05_CHARTS_MODULE.md` | Визуализация данных |
| 6 | [WizardModule](06_WIZARD_MODULE.md) | `06_WIZARD_MODULE.md` | Пошаговый мастер |
| 7 | [PdfExportModule](07_PDF_EXPORT_MODULE.md) | `07_PDF_EXPORT_MODULE.md` | Экспорт отчётов |
| 8 | [StorageModule](08_STORAGE_MODULE.md) | `08_STORAGE_MODULE.md` | Хранение данных |
| 9 | [Расчёт рисков](09_RISK_CALCULATIONS.md) | `09_RISK_CALCULATIONS.md` | Формулы и пороги |

---

## 🎯 Быстрый старт

### Для разработчиков

1. **Изучите архитектуру:** [01_ARCHITECTURE.md](01_ARCHITECTURE.md)
2. **Поймите расчёт рисков:** [09_RISK_CALCULATIONS.md](09_RISK_CALCULATIONS.md)
3. **Разберите основные модули:**
   - [WeatherModule](02_WEATHER_MODULE.md) — метеоданные
   - [RouteModule](03_ROUTE_MODULE.md) — маршруты
   - [PilotModule](04_PILOT_MODULE.md) — коррекция

### Для тестировщиков (QA)

1. **Пороговые значения:** [09_RISK_CALCULATIONS.md](09_RISK_CALCULATIONS.md)
2. **Сценарии тестирования:**
   - Получение прогноза (WeatherModule)
   - Создание маршрута (RouteModule)
   - Коррекция данных (PilotModule)
   - Экспорт отчёта (PdfExportModule)

### Для технических писателей

1. **Структура проекта:** [01_ARCHITECTURE.md](01_ARCHITECTURE.md)
2. **Функции модулей:** документы 02-08
3. **Математические модели:** [09_RISK_CALCULATIONS.md](09_RISK_CALCULATIONS.md)

---

## 📊 Диаграмма компонентов

```
┌─────────────────────────────────────────────────────┐
│                    App (Ядро)                       │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Weather  │  │  Route   │  │  Wizard  │         │
│  │ Module   │  │ Module   │  │ Module   │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       │             │             │                │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐         │
│  │  Charts  │  │   Map    │  │  Pilot   │         │
│  │ Module   │  │ Module   │  │ Module   │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       │             │             │                │
│  ┌────┴─────────────┴─────────────┴────┐           │
│  │         Storage Module              │           │
│  │         (localStorage)              │           │
│  └─────────────────────────────────────┘           │
└─────────────────────────────────────────────────────┘
         │                    │
    ┌────┴────┐          ┌────┴────┐
    │Open-Meteo│          │OpenLayers│
    │   API    │          │  Map     │
    └─────────┘          └──────────┘
```

---

## 🔑 Ключевые концепции

### 1. Модульная архитектура

Проект разделён на независимые модули:
- **WeatherModule** — метеоданные, анализ, риски
- **RouteModule** — маршруты, сегментация, KML
- **PilotModule** — коррекция по факту
- **ChartsModule** — визуализация
- **WizardModule** — мастер анализа
- **PdfExportModule** — отчёты
- **StorageModule** — хранение

### 2. 4-шаговый мастер

```
Шаг 1: Маршрут → Шаг 2: Анализ → Шаг 3: Пилот → Шаг 4: Отчёт
```

### 3. Коррекция прогноза

```
Прогноз Open-Meteo + Фактические данные пилота
       ↓
Расчёт коэффициентов (windBias, tempOffset)
       ↓
Применение с экспоненциальным затуханием
       ↓
Скорректированный прогноз + Рекомендации
```

### 4. Расчёт рисков

```
Параметры → Risk Score → Уровень риска → Статус полёта
           (0-8)        (Low/Med/High)  (Разрешён/...)
```

---

## 📖 Глоссарий

| Термин | Значение |
|--------|----------|
| **БВС** | Беспилотное воздушное судно |
| **Risk Score** | Балл риска (0-8) |
| **Flight Window** | Благоприятное окно для полёта |
| **Сегмент** | Участок маршрута (10 км) |
| **windBias** | Коэффициент коррекции ветра |
| **tempOffset** | Поправка температуры |
| **weight** | Весовой коэффициент затухания |

---

## 🔗 Ссылки

### Внешние ресурсы

- **Open-Meteo API:** https://open-meteo.com/
- **OpenLayers:** https://openlayers.org/
- **Plotly.js:** https://plotly.com/javascript/
- **pdfmake:** http://pdfmake.org/

### Внутренние документы

- [README проекта](../README.md)
- [PILOT-CORRECTION-ANALYSIS.md](../PILOT-CORRECTION-ANALYSIS.md)
- [PDF-EXPORT-STRUCTURE.md](../PDF-EXPORT-STRUCTURE.md)

---

## 📝 Changelog документации

### Версия 1.0 (26.02.2026)

- ✅ Создано 9 документов по модулям и расчётам
- ✅ Добавлена навигация и глоссарий
- ✅ Описаны математические модели

---

**Контакт:** kkav45  
**Репозиторий:** https://github.com/kkav45/mira0141
