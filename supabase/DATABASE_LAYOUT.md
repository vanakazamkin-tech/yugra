# Yugra: распределение двух Supabase-проектов

## DB1 — паспорта, объекты и сценарии

Project ref: `dmbikidqikjupkghywbz`

| Набор | Таблицы |
|---|---|
| Сценарии | `forecast_scenarios`, закрытая `forecast_runs` |
| Инвестиционные паспорта | `investment_sites`, `municipal_investment_projects`, `municipal_industrial_enterprises` |
| Инфраструктура и земля | `municipal_infrastructure_objects`, `municipal_land_parcels` |
| Учреждения и услуги | `municipal_facilities`, `fuel_price_observations` |
| Внешние рейтинги | `external_rating_catalog`, `external_rating_results` |
| Справочники / служебное | зеркала `municipalities`, `data_sources`, `municipality_legacy_snapshots`, `project_work_log` |

## DB2 — статистика и поступающие данные

Project ref: `zhywrpguzbtvjnmslwvs`

| Набор | Таблицы |
|---|---|
| Справочники — master | `municipalities`, `data_sources` |
| Официальные показатели | `municipality_indicators` |
| Проверка импорта | `municipality_indicator_import_staging` |
| Муниципальные программы | `municipal_program_execution` |

DB2 — единственный источник истины для больших рядов муниципальных показателей. Не реплицировать 84k+ наблюдений в DB1. Внешние ключи внутри каждого проекта локальны; справочники из DB2 зеркалируются в DB1 по ID командой `npm run sync:supabase-reference`.

## Проектные файлы

- `supabase/migrations/` — история схемы DB1.
- `supabase/statistics/migrations/` — история схемы DB2.
- `supabase/audits/` — read-only SQL-диагностика.
- `supabase/imports/` и `supabase/manual_imports/` — исходные и ручные наборы для загрузки/проверки, не браузерная статика.
- `public/` — только ресурсы, которые должен получать браузер.
- `data/` — локальные резервные/исходные наборы для сборки или обработки.
