# Подключение Yugra к двум проектам Supabase

Приложение использует два независимых проекта Supabase. Они не соединяются SQL JOIN-ами: интерфейс получает наборы из каждого проекта и объединяет их по стабильным ID муниципалитетов и источников.

## 1. Разделение баз данных

### DB1 — паспорта и сценарии
Проект: `dmbikidqikjupkghywbz`

Здесь размещаются:
- `forecast_scenarios` и закрытая `forecast_runs`;
- `investment_sites`, `municipal_facilities`, `fuel_price_observations`;
- `external_rating_catalog` и `external_rating_results`;
- `municipal_investment_projects`, `municipal_industrial_enterprises`;
- `municipal_infrastructure_objects`, `municipal_land_parcels`;
- `project_work_log` и `municipality_legacy_snapshots`.

Таблицы `municipalities` и `data_sources` здесь — зеркала-справочники для локальных внешних ключей. Большие статистические ряды не дублируются.

### DB2 — официальная статистика и загрузка
Проект: `zhywrpguzbtvjnmslwvs`

Здесь находятся:
- `municipalities` — канонический справочник 22 МО;
- `data_sources` — канонический каталог источников;
- `municipality_indicators` — основной слой наблюдений;
- `municipality_indicator_import_staging` — сырой и проверяемый staging;
- `municipal_program_execution` — муниципальные программы и исполнение.

На 22.11.2026 в DB2 сохранены 22 муниципалитета, 30 источников, 84 659 наблюдений, 704 staging-записи и 2 записи об исполнении программ. Не переносите весь `municipality_indicators` в DB1: это создаст лишнее дублирование.

## 2. Переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните две пары публичных ключей (publishable или legacy anon):

- `VITE_SUPABASE_CORE_URL` и `VITE_SUPABASE_CORE_ANON_KEY` — DB1;
- `VITE_SUPABASE_DATA_URL` и `VITE_SUPABASE_DATA_ANON_KEY` — DB2.

Те же четыре переменные добавьте в Vercel для Production/Preview и затем пересоберите deployment. Старые `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` временно поддерживаются как fallback для DB1.

Никогда не используйте `service_role` / `sb_secret_...` в `VITE_*` переменных, коде браузера или Vercel frontend environment.

## 3. Синхронизация справочников

Для корректной работы FK в DB1 должны присутствовать те же `municipality.id` и `data_sources.id`, что и в DB2. Начальные справочники уже скопированы: 22 муниципалитета и 30 источников.

При добавлении территории или источника выполните локальную команду:
```bash
npm run sync:supabase-reference
```
Она требует локальные переменные `SUPABASE_CORE_URL`, `SUPABASE_CORE_SERVICE_ROLE_KEY`, `SUPABASE_DATA_URL`, `SUPABASE_DATA_SERVICE_ROLE_KEY`. Service-role ключи используются только локальным Node.js скриптом и не попадают в браузер. Повторный запуск безопасен: используется upsert по `id`.

## 4. Распределение файлов

- `public/images/` — изображения и орнаменты для браузера.
- `public/data-dictionary.md` — публичная копия словаря данных.
- `data/municipalities-detailed.json` — резервный набор Vite, импортируемый приложением как модуль; он остаётся в `data/`, потому что перенос в `public/` потребовал бы менять загрузчик.
- `data/rosstat/` — шаблоны и материалы подготовки источников, не браузерная статика.
- `supabase/audits/`, `supabase/imports/`, `supabase/manual_imports/`, `supabase/migrations/`, `supabase/statistics/migrations/`, `supabase/tests/` — серверные SQL, загрузочные и проверочные материалы; не переносить в `public/`.
- `docs/`, `scripts/` — проектная документация и локальные инструменты обработки.

Файлы сборки, импорта и диагностики не перемещаются в публичную статику без изменения кода: это может нарушить пути и раскрыть внутренние исходные материалы.

## 5. Обновление

- Справочник муниципалитетов DB2 синхронизируется при запуске и затем раз в 60 секунд.
- Подтверждённые показатели, источники и программы DB2 обновляются раз в 5 минут.
- Паспортные наборы и внешние рейтинги читаются из DB1.
- Недоступность DB1 не скрывает статистику DB2.
- До первой успешной загрузки DB2 используется `data/municipalities-detailed.json`; его концептуальные поля не становятся официальной статистикой.
- Публичное чтение ограничено подтверждёнными записями; staging, служебный журнал и legacy snapshots не открываются браузеру.
