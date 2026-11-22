# Yugra: распределение двух Supabase-проектов

Обе базы являются рабочими частями одной системы. DB1 — исходная база; DB2 — её продолжение с новыми статистическими рядами и staging. Никакую из них нельзя считать пустой или заменять другую.

## DB1 — исходная база

Project ref: `dmbikidqikjupkghywbz`

| Набор | Таблицы и количество строк |
|---|---|
| Статистика | `municipality_indicators` — 220 632 |
| Каталог источников | `data_sources` — 493 |
| Муниципальные программы | `municipal_program_execution` — 1 389 |
| Сценарии | `forecast_scenarios` — 3; `forecast_runs` закрыта |
| Инвестплощадки | `investment_sites` — 354 |
| Учреждения | `municipal_facilities` — 456 |
| Инвестпроекты | `municipal_investment_projects` — 469 |
| Промышленные предприятия | `municipal_industrial_enterprises` — 107 |
| Инфраструктурные объекты | `municipal_infrastructure_objects` — 947 |
| Земельные участки | `municipal_land_parcels` — 30 |
| Прочее | `fuel_price_observations` — 9; `external_rating_catalog` — 15; `external_rating_results` — 99 |

## DB2 — продолжение

Project ref: `zhywrpguzbtvjnmslwvs`

| Набор | Таблицы и количество строк |
|---|---|
| Статистика | `municipality_indicators` — 85 655 |
| Каталог источников | `data_sources` — 30 |
| Проверка импорта | `municipality_indicator_import_staging` — 704 |
| Муниципальные программы | `municipal_program_execution` — 2 |
| Справочник муниципалитетов | `municipalities` — 22 |

Количество строк получено прямыми `COUNT(*)) 22.11.2026. Оно не равно числу `verified` наблюдений: приложение читает подтверждённые данные с фильтром по статусу, а staging, рабочий журнал и legacy snapshots не публикует.

## Как работает объединение

- Муниципалитеты — по `municipality.id`.
- Источники — по `data_sources.id`.
- Статистические наблюдения — из обеих баз; точные повторы схлопываются по муниципалитету, коду, году, периоду, географии, единице и источнику.
- Исполнение программ — из обеих баз; ключ: муниципалитет + источник + код программы + отчётная дата.
- Паспортные объекты и внешние рейтинги — из DB1.
- Ни одна строка статистики не переносится между базами автоматически.

## Миграции и файлы проекта

- `supabase/migrations/` — применённые миграции DB1.
- `supabase/statistics/migrations/` — применённые миграции DB2.
- `supabase/audits/` — SQL для read-only диагностики.
- `supabase/imports/` и `supabase/manual_imports/` — сырьё и подготовленные пакеты загрузки.
- `public/` — только ресурсы для браузера.
- `data/` — резервные и исходные материалы для сборки/обработки.
- `docs/`, `scripts/` — документация и инструменты.
