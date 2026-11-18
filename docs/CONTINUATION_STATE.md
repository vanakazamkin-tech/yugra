## Checkpoint — fail-closed provenance for official report rows (2026-11-18 07:08 UTC+05:00)

- **Статус:** `IN_PROGRESS` — второй P0-дефект provenance в отчётах исправлен; ожидается CI нового checkpoint.
- **Ветка / PR:** `fix/risk-stable-provenance-gate-2026-11-18`, PR #27 (open, Draft).
- **Предыдущий HEAD:** `385167a7e89c9bcd2510ab84198200c630b2f28a`; GitHub Actions exact HEAD: runs [44221371684](https://github.com/vanakazamkin-tech/yugra/actions/runs/44221371684) и [44221364621](https://github.com/vanakazamkin-tech/yugra/actions/runs/44221364621), оба завершились success. Build и data-migrations-integration — success. Vercel check остаётся failure из-за внешнего build rate limit (retry in 24 hours), не из-за ошибки приложения.
- **Найденный дефект:** selector официального слоя отчёта проверял verified/geography/year/value/code, но не требовал непустых единицы измерения и source URL. Поэтому неполная по provenance строка могла попасть в отчёт как официальное наблюдение.
- **Исправление:** selector теперь fail-closed требует явную единицу и ссылку на первоисточник; строки без них исключаются.
- **Regression:** `scripts/test-report-official-data-gates.mjs` проверяет оба обязательных provenance gate.
- **Затронутые файлы:** `src/InvestmentDetails.jsx`, `scripts/test-report-official-data-gates.mjs`, `docs/CONTINUATION_STATE.md`.
- **Проверки:** предыдущий exact HEAD прошёл оба CI jobs; новый HEAD ожидает GitHub Actions. Локальные npm-команды не выполнялись.
- **Production:** Supabase и Production deployment не менялись.
- **Следующее действие:** проверить CI exact HEAD; затем продолжить ручные PDF/CSV и desktop/mobile smoke gates, если доступен Preview. Vercel build-rate-limit не обходить созданием production deployment.

---

## Checkpoint — exact-unit gate for official comparison (2026-11-18 07:08 UTC+05:00)

- **Статус:** `IN_PROGRESS` — исправляется воспроизводимый P0-риск происхождения единиц измерения в официальном сравнении.
- **Ветка / PR:** `fix/risk-stable-provenance-gate-2026-11-18`, PR #27 (open, Draft).
- **База PR при создании:** `main` SHA `8f291774044fd9f73e6b766e6196f02db3628bb7`; текущий `main` на момент checkpoint — `4cb1171faf0c4e4568bc16226178730f5d04a9f5`. PR #27 пока не обновлён относительно новых документальных commits main.
- **Предыдущий HEAD:** `9d3434e745f53a8919594e997ae5b80c21b74e5c`; exact-HEAD GitHub Actions run `44220461874` завершился success для jobs build и data-migrations-integration. Vercel status на этом SHA — failure с сообщением build-rate-limit; это не означает production deployment failure.
- **Найденный дефект:** official comparison discovery, period selection и row selection допускали пустую единицу; код подставлял единицу из конфигурации серии. Так наблюдение без единицы могло отображаться/экспортироваться как будто его единица подтверждена.
- **Исправление:** на всех трёх стадиях требуется точное совпадение `item.unit` с единицей серии; ключ периода больше не использует fallback. Пустые/несовпадающие единицы исключаются, а не нормализуются.
- **Regression:** `scripts/test-official-comparison-gates.mjs` проверяет exact-unit gates на discovery, period options и итоговых строках, а также запрещает fallback.
- **Затронутые файлы:** `src/InvestmentDetails.jsx`, `scripts/test-official-comparison-gates.mjs`, `docs/CONTINUATION_STATE.md`.
- **Проверки:** commit `607212a8f5fb9a7968c27d88ff53b26d0b4c5b00` опубликован; GitHub Actions run для него ещё не появился при первом readback. Предыдущий exact HEAD `9d3434e` прошёл build и data-migrations-integration. Локальные npm-команды в текущем окружении не выполнялись.
- **Production:** Supabase не изменялась; DDL/DML/миграции не выполнялись; production deployment не запускался.
- **Следующее действие:** проверить CI exact HEAD и продолжить P0-проверку отчётов/экспортов; PDF и desktop/mobile browser smoke-test остаются отдельными ручными release gates.

---

## Checkpoint — report CSV official-data export fix (2026-11-18)

- **PR:** #27, Draft/open.
- **Код:** `src/InvestmentDetails.jsx` — report CSV теперь включает два явно разделённых блока: демонстрационные показатели и, только при включённом переключателе, проверенные официальные наблюдения. Для официальной строки сохраняются территория, географический уровень, показатель, значение, единица, период, source ID, URL источника, verification status и примечание. Все ячейки проходят общий formula-safe CSV escaper. Файл: `yugra-analytical-report.csv`.
- **Регрессия:** `scripts/test-report-official-data-gates.mjs` проверяет включение официального слоя по toggle, сохранение provenance полей и применение CSV escaping.
- **Коммиты этапа:** implementation `64567ed4f4fc448c17c38de3654ccb1b9ef919bd`; regression test `33b8380635a3e78b4e8a6eb487fd8c3905681649`.
- **CI:** ожидается для текущего checkpoint; не считать исправление проверенным до прохождения exact-HEAD workflow.
- **Production:** Supabase не менялась; production deployment не выполнялся.
- **Следующее действие:** проверить GitHub Actions на новом HEAD; при успехе продолжить следующий P0 блок отчётов/экспорта и оставить PDF/UI ручные gates открытыми до фактической проверки.

---

## CI confirmation — checkpoint 1989d127 (2026-11-18)

- **Текущий HEAD:** `1989d1276c7b2b660853b5fb358bd4a6a7462b59`; опубликован в PR #27.
- **GitHub Actions exact HEAD:** runs `44219963905` и `44219969158`; в обоих jobs `build` и `data-migrations-integration` завершились `success`, без failed steps.
- **Vercel:** check `Vercel Preview Comments` для exact SHA завершился `success` (unresolved feedback отсутствует). Это Preview feedback/status, не ручной браузерный smoke-test и не Production.
- **PR #27:** open / Draft; PR head совпадает с SHA выше.
- **Следующее действие без изменений:** ручная проверка desktop/mobile и PDF/CSV на Preview остаётся незакрытым release gate.

---

## Checkpoint update — 2026-11-18 (после 07:10 UTC+05:00)

- **PR:** #27, Draft/open — https://github.com/vanakazamkin-tech/yugra/pull/27.
- **Исходный code/test HEAD:** `c7e302d019633b4044febc6df2fbc1f3e5ff68d5`; последующий documentation checkpoint HEAD: `1f7bbc08651f093e4c076faa0a6b6ba999ca4a3f`.
- **Exact-HEAD CI для 1f7bbc0:** workflow run `44219541989`; jobs `build` и `data-migrations-integration` завершились `success`. Build прошёл forecast model tests, provenance/source catalog, migration staging/safety, risk provenance/geography, risk pillars, Rosstat crosswalk, official comparison, report official-data gates, municipality passport, operational registry, map coverage, error boundary и production bundle. Integration job прошёл миграции на disposable schema, повторное применение/idempotency, grants/uniqueness и read-only post-migration audit. Vercel Preview status на предыдущем code checkpoint был success; точный новый deployment card в этой сессии не удалось открыть.
- **P0 audit — forecasting:** статически проверены `Forecasting.jsx`, `forecastModel.js`, `forecastModel.test.js`, `forecastCoverage.js`, `FORECASTING_MODEL.md`. Горизонт ограничен 1–3 годами; missing/invalid values остаются null; индексный режим требует approved version + complete result и не fallback-ит на demo score; факторы и uncertainty раскрыты как экспертные допущения, а не статистические оценки/доверительные интервалы. Backtest использует verified municipality-level ряды, разделяет annual и одинаковые календарные даты, разрывает пропуски лет, исключает конфликты без усреднения; малые выборки маркируются. В просмотренном коде воспроизводимый P0-дефект не подтверждён.
- **P0 audit — reports/export:** статически проверены `InvestmentDetails.jsx`, `officialData.js`, `test-report-official-data-gates.mjs`. Официальные наблюдения отделены от demo-агрегатов; отчётный selector ограничивает статус, географический уровень, год, значение и код показателя; отдельная официальная таблица сохраняет географию/период/источник; CSV маркирует демонстрационные значения и экранирует потенциальные формулы. Отдельный CSV официальных наблюдений содержит единицу, период, source ID и URL. Подтверждённого воспроизводимого P0-дефекта не найдено.
- **Ручной gate остаётся открытым:** PDF action — `window.print()`, не серверная генерация. Фактический PDF не сохранён/не открыт/не проверен; browser smoke test на desktop и narrow viewport не выполнен в текущей среде. Не утверждать PDF/UI готовыми до ручной проверки.
- **Production:** Supabase не менялась; никаких DDL/DML/миграций. Production deployment не запускался.
- **Следующее конкретное действие:** выполнить ручной smoke test на текущем Vercel Preview exact SHA (desktop + узкий экран), сохранить PDF из конструктора отчётов и проверить разрывы страниц/таблицы/источники/оговорки; проверить CSV открытиями в табличном редакторе. Если браузерное тестирование недоступно, зафиксировать gate как BLOCKED и не объявлять релиз готовым.

---

## Checkpoint update — 2026-11-18 07:10 UTC+05:00

- **PR:** #27, Draft/open — `https://github.com/vanakazamkin-tech/yugra/pull/27`.
- **Code/test HEAD, CI-verified:** `c7e302d019633b4044febc6df2fbc1f3e5ff68d5`.
- **Exact HEAD CI:** runs `44219455222` and `44219468658`; in both, `build` and `data-migrations-integration` completed `success`. No failed steps. Build job executed forecast unit tests, data/provenance gates, risk model pillars regression (including new stable provenance tests), comparison, passport, map coverage and production bundle.
- **Vercel:** `Vercel Preview Comments` completed `success`; Preview only, not Production.
- **Risk fix:** stable requires explicit latest source and non-provisional status across all six pillars; source-less/provisional quality gaps with no adverse signal return `insufficient`.
- **Production Supabase:** unchanged; no DDL/DML/migrations. Production deploy not performed.
- **Следующее конкретное действие:** продолжить P0-аудит сценариев 1–3 лет и фактических отчётов/экспортов; после проверки — browser smoke test desktop/mobile and exact-HEAD CI. Не переводить PR из Draft до всех gates.

---

## Checkpoint — 2026-11-18 07:04 UTC+05:00

- **Статус:** `IN_PROGRESS` — обнаружен и исправлен P0 fail-closed дефект зелёного статуса риск-модели; regression tests добавлены.
- **Ветка / PR:** `fix/risk-stable-provenance-gate-2026-11-18`; PR создаётся после checkpoint.
- **База:** `main` SHA `8f291774044fd9f73e6b766e6196f02db3628bb7`.
- **Коммиты реализации:** `b01129901cd952aab3d982b137dfed0f6bb35bd4` (risk model), `81833841b38f4028d3119e0f7ff68d07641ddac0` (regression tests).
- **Найденный дефект:** `assessRiskSignals` разрешал `stable`, если были directional observations во всех шести pillars, даже когда latest observation в одном или нескольких направлениях не имел источника или был предварительным.
- **Исправление:** зелёный статус теперь требует по каждому из шести направлений latest observation с `latestSourcePresent === true` и `latestIsProvisional === false`. Иначе при отсутствии негативных сигналов возвращается `insufficient`, перечисляются недостающие quality pillars. Отрицательные сигналы не удаляются и продолжают давать watch/critical по прежним порогам.
- **Regression coverage:** добавлены проверки, что source-less latest value, provisional latest value и полное directional coverage без source provenance блокируют stable; полное покрытие с подтверждёнными непредварительными наблюдениями сохраняет stable.
- **Проверки:** CI для новых коммитов ещё не завершён; локальные npm-команды в этом окружении недоступны. Нужны exact-HEAD GitHub Actions jobs и Vercel Preview.
- **Production Supabase / Production deployment:** не менялись.
- **Затронутые файлы:** `src/lib/riskModel.js`, `scripts/test-risk-model-pillars.mjs`, `docs/CONTINUATION_STATE.md`.
- **Следующее конкретное действие:** запустить CI через PR, проверить оба jobs; если зелёный — продолжить аудит риска на предмет качества provenance/period filters и провести smoke tests на широком/узком экране.

---

## Checkpoint — 2026-11-18 06:52 UTC+05:00

- **Статус:** `IN_PROGRESS` — P0-аудит паспортов и официального сравнения завершён статически; production Supabase проверен read-only.
- **Ветка / PR:** `chore/automatic-session-checkpoints-2026-11-18`, PR #26 (open, Draft).
- **HEAD до этого checkpoint:** `cf886d39a97e0368e1f7296759fa1ca805617622`.
- **CI exact HEAD:** workflow run `44218937582`, оба job (`build`, `data-migrations-integration`) завершились success.
- **Vercel:** status `success` на exact HEAD; это не подтверждение Production.
- **Passport audit:** selector требует `verified`, допустимый явный geography level (`municipality` / `settlement` / `region`), целый год, числовое значение и непустой indicator code; нет fallback отсутствующей географии к municipality. Население для муниципального KPI выбирается отдельно только с `geographic_level='municipality'`; settlement population исключена. Модальное окно маркирует geography, период, unit и source URL; focus trap/Escape/focus restore реализованы.
- **Comparison audit:** фильтрация использует точный indicator code, `verified`, exact geography level, municipality ID, точный year/period/unit key и numeric value; пустые значения не подставляются нулями. Regression test `test-official-comparison-gates.mjs` покрывает geography/unit/period gates.
- **Supabase read-only:** project `dmbikidqikjupkghywbz` ACTIVE_HEALTHY, PostgreSQL 17.11; `municipalities` — 22 строки; `municipality_indicators` — 1,445 строк. SELECT подтвердил: 1,389 verified municipality + 44 verified settlement + 12 needs_review municipality; у этих групп нет пустых unit/source_url.
- **Comparison data readback:** для используемых официальных comparison codes единицы присутствуют и согласованы по кодам/периодам; пустых unit среди verified рядов не обнаружено.
- **Migration drift подтверждён повторно:** Git main содержит 110 SQL migration files, 106 уникальных префиксов и четыре дублирующихся префикса (`20261030194500`, `20261030200000`, `20261030201500`, `20261030203000`); production history — 96 версий, последняя `20261107055919`. Никаких миграций не применялось.
- **Изменения кода:** нет; по статическому аудиту паспортов/сравнения воспроизводимый P0-дефект не подтверждён.
- **Production:** только read-only SELECT/metadata; DDL/DML, миграции и деплой не запускались.
- **Следующее конкретное действие:** P0-аудит fail-closed risk pipeline: проверить входные фильтры (verified municipality-level, provenance, period comparability), направление индикаторов, collapse/conflict handling, quality gates для Critical и недостаточное покрытие; сверить с regression tests. Не менять production.

---

## Checkpoint — 2026-11-18 06:49 UTC+05:00

- **Статус:** `IN_PROGRESS` — восстановление продолжено, этап навигации/карты статически проверен.
- **Ветка / PR:** `chore/automatic-session-checkpoints-2026-11-18`, PR #26 (Draft, open).
- **main SHA:** `8f291774044fd9f73e6b766e6196f02db3628bb7` (проверен через Git ref API).
- **HEAD до этого checkpoint:** `549d4e2b5bb1630e7ad88287f9a5cc231288a1fe`.
- **CI exact HEAD:** workflow run `44216001319`, Build verification — success; jobs `build` и `data-migrations-integration` завершились success. Build job подтвердил install dependencies, тесты модели/данных/сравнения/паспортов/карты и production bundle.
- **Vercel:** commit status `Vercel=success`; это Preview/CI status, не подтверждение Production.
- **Release plan:** `docs/RELEASE_1_0_PLAN_2026-11-20.md` прочитан из рабочей ветки PR #26 (в `main` пока отсутствует).
- **P0 navigation/map static audit:** меню содержит отдельный branch `activeTab === 'map'`; карта и список используют общие `onSelect` для открытия паспорта; SVG targets имеют button role, keyboard handlers, focus/blur и aria-label; map list реализован отдельным дочерним компонентом.
- **Map coverage readback:** 22 муниципалитета JSON ↔ 22 геометрических ID; missing=0, duplicates=0 с обеих сторон.
- **Ограничение проверки:** ручной браузерный smoke-test на широком/узком экране не выполнен. Локальный clone и локальные npm-команды недоступны в этой среде из-за DNS `github.com`; exact-HEAD CI выше прошёл.
- **Изменения кода:** отсутствуют; исправляемый P0-дефект на этапе навигации/карты статическим просмотром не подтверждён.
- **Production Supabase / Production deployment:** не изменялись; БД не записывалась.
- **Следующее конкретное действие:** завершить P0-аудит паспортов и официального сравнения: проверить модальное окно/поля происхождения, municipality vs settlement, period/unit/geography gates и CSV export; сверить с regression tests. Любой найденный воспроизводимый дефект исправить минимально и добавить regression test.

---

## Checkpoint — 18.11.2026, 06:30 (UTC+5): первичный P0 code-path audit

- **HEAD до записи:** 93969bdb313ac3b044329cff461bcc3fe9fad16a (checkpoint recovery/audit уже опубликован).
- **Подтверждение предыдущего checkpoint:** GitHub Actions run 44215813068 на exact SHA 93969bd завершился success; jobs build и data-migrations-integration успешны. Commit checks: build, data-migrations-integration, Vercel Preview Comments — success. Vercel deployment dpl_ox5bCrEZnUrMXwBSzBAUVRP3wrMP — READY для exact SHA 93969bd, Preview URL https://yugra18-jlf5cbuon-napishtu.vercel.app.
- **Проверены статически:** навигационные tab routes в InvestmentDetails.jsx; карта UgraMap.jsx и связанный список муниципалитетов; выборки паспортов и сравнения; reportOfficialIndicators; CSV export handlers; officialData.js fetchOfficialData; supabase.js client config; соответствующие QA gates.
- **Подтверждённые защитные механизмы:** карта и муниципальные списки используют municipality id и проверяют соответствие объектов; официальное сравнение требует verification_status=verified, точный geographic_level, период и единицу; паспорт отдельно ограничивает population municipal-level; официальные наблюдения в отчёте выводятся отдельным слоем с географическим уровнем и источником; CSV escape префиксует опасные текстовые значения, demo CSV явно помечает значения как неофициальные; официальный read path запрашивает только verified indicators и использует детерминированную пагинацию по 500 строк; публичный Supabase client использует только VITE_SUPABASE_ANON_KEY и persistSession=false.
- **Риск / ручной gate:** PDF-кнопка в конструкторе отчётов вызывает window.print(); это browser print-to-PDF, а не серверная генерация файла. По Release Plan PDF нельзя считать принятым до фактического сохранения/открытия файла и проверки страниц, таблиц, источников и оговорок. Такой ручной тест в этой среде не выполнен.
- **Результат аудита:** в просмотренных навигации, карте, паспортах, сравнении, CSV и Supabase read path не подтверждён воспроизводимый P0-дефект. Это статический просмотр кода плюс уже прошедшие CI gates, не ручной browser smoke-test.
- **Следующее конкретное действие:** продолжить проверку риск-модели и сценарного расчёта на edge cases (пропуски, противоречивые периоды, неполные источники, отрицательные/нулевые значения), затем проверить экспортный отчёт в браузере и на узком viewport. Любой найденный дефект сначала воспроизвести тестом; не менять стабильный UI без необходимости.

---
## Последний checkpoint — 18.11.2026, 06:22 (UTC+5)

- **Статус:** IN_PROGRESS — восстановление завершено, P0-аудит приложения начат.
- **Рабочая ветка:** chore/automatic-session-checkpoints-2026-11-18.
- **PR:** #26, OPEN / DRAFT, base main.
- **Базовый main SHA:** 8f291774044fd9f73e6b766e6196f02db3628bb7.
- **HEAD до этого checkpoint:** 037be70fff11d00caeaabf0f28dc498552979e1d.
- **Проверка GitHub:** PR head совпадает с веткой; относительно main — 17 commits ahead, 0 behind; в PR шесть документальных файлов, код приложения не менялся.
- **CI для точного HEAD 037be70:** workflow run 44213682471; jobs build и data-migrations-integration — success. Build включает npm ci, npm test, npm run test:data-quality, migration/forecast/risk/comparison/passport/export gates, map coverage, Rosstat crosswalk и npm run build.
- **Vercel Preview:** deployment dpl_5AEJ8AGysaZzNS1htmk4aa4PGfWH — READY для exact SHA 037be70; URL https://yugra18-pktnnb1ft-napishtu.vercel.app. Это Preview, не Production.
- **Supabase production read-only:** проект dmbikidqikjupkghywbz ACTIVE_HEALTHY, PostgreSQL 17.11. Проверено: 22 municipalities; 1,445 municipality_indicators; 1,433 verified, из них 1,389 municipality-level и 44 other geography; 12 needs_review; 161 data_sources; staging 0; forecast_scenarios 3; forecast_runs 0; migration history 96 записей, последняя 20261107055919. Значения совпадают с зафиксированным срезом 18.11.
- **Migration drift:** в контексте Git — 110 migration files; production history — 96. Новые migration files, отсутствующие в production history, не применялись. db push не выполнялся.
- **Кодовый аудит:** начат статический просмотр riskModel.js, riskSeries.js, forecastModel.js, forecastCoverage.js, UnifiedRiskForecast.jsx, Forecasting.jsx, supabase.js и QA scripts. На текущем проходе подтверждён fail-closed gate risk assessment и фильтр verified municipality-level в buildRiskSeries; окончательный аудит UI/export/read path ещё не завершён. Не зафиксировано доказанного P0-дефекта, требующего немедленного патча.
- **Ограничение среды:** прямой git clone из контейнера не удался из-за DNS/network недоступности github.com. Чтение GitHub API/raw доступно; локальные npm ci/test/build в этой сессии не выполнялись. Их успех подтверждён CI для exact HEAD выше.
- **Production изменения:** отсутствуют. Supabase операции были только get_project, list_tables, list_migrations и read-only SELECT.
- **Следующее конкретное действие:** завершить P0-аудит навигации/карты и паспортов, затем сравнения/отчётов/CSV export и Supabase read path; сверить каждый найденный риск с соответствующими regression tests. Любой патч делать минимальным в этой ветке, добавить regression test, проверить diff и дождаться CI на новом SHA. Не менять production Supabase.

---
# Yugra18 — журнал контрольных сохранений и передачи между чатами

> Единая точка восстановления работы для ChatGPT, Codex, Copilot и других совместимых агентов. Обновляй этот файл по ходу работы, а не только перед завершением чата.

## Как читать этот журнал

- Всегда сверяй записи с фактическими GitHub branch, commit, PR и CI.
- Если свежая версия этого файла находится в открытом PR, а не в `main`, найди PR/ветку и читай журнал оттуда.
- Не считай локальные или написанные в чате изменения сохранёнными, пока соответствующий commit не виден в GitHub.
- Не удаляй историю контрольных точек: добавляй новые записи сверху в раздел «Последние checkpoints», старые можно сворачивать в краткую историю.
- Не записывай секреты, токены, пароли, персональные данные и значения environment variables.

## Текущий статус

- **Дата:** 2026-11-18
- **Статус активной задачи:** `IN_PROGRESS`
- **Активная задача:** стабилизация существующего Yugra18 и подготовка демонстрационного Release 1.0 к 20.11.2026.
- **Рабочая ветка:** `chore/automatic-session-checkpoints-2026-11-18`
- **Базовый main SHA:** `8f291774044fd9f73e6b766e6196f02db3628bb7`
- **Последний подтверждённый HEAD перед этим checkpoint:** `80f7066b70d3f66d0ad4aef5f7b4f07e7e963b94` (сокращены Project instructions до 5 723 символов). После записи журнала перепроверь фактический PR HEAD через GitHub.
- **PR:** [#26 — Add automatic checkpoints and cross-chat continuation state](https://github.com/vanakazamkin-tech/yugra/pull/26) — открыт как Draft; содержит инструкцию checkpoint и план Release 1.0. Не считать изменения частью `main`, пока merge не подтверждён.
- **Предыдущая проверенная база CI:** workflow run `44211503340` на commit `9dfde0dc625dd2f5d84f367fc4369e26f2bafb57` завершился `success`: jobs `build` и `data-migrations-integration` успешны; Vercel status на том commit был `success`.
- **Важно:** эти проверки относятся к предыдущему commit `9dfde0...`, а не к новым документальным commits. Проверить CI и Vercel Preview для актуального HEAD после изменения файлов.
- **Production:** в этой задаче не менялись; миграции и данные production Supabase не применялись.

## Активная задача — Release 1.0 к 20 ноября

Полный план, приоритеты и критерии приёмки: `docs/RELEASE_1_0_PLAN_2026-11-20.md`.

**Цель:** выпустить стабильный демонстрационный аналитический прототип на существующей архитектуре. Не заявлять, что система промышленно готова, а прогноз статистически обучен или валидирован.

**Оценка:** 12–18 часов активной работы на стабилизацию демонстрационного релиза при замороженном объёме. Контролируемый пилот — ориентировочно 3–6 недель; статистическая валидация — 2–4 месяца и более. Это оценки, не гарантии.

### Уже выполнено в текущем checkpoint

1. Добавлен `docs/RELEASE_1_0_PLAN_2026-11-20.md`: P0/P1 объём, исключения, план на 18/19/20 ноября, release gates, автоматические и ручные проверки, условия блокировки релиза, правила безопасной работы с production.
   - Commit: `8cd1d82bfd1cf4e45e4a2c2d8d8ad946b218e32b`.
2. Обновлён корневой `AGENTS.md`: агентам предписано следовать плану, заморозить объём, сохранять дизайн и не ослаблять критерии выпуска ради срока.
   - Commit: `5fed14bb9c3235841d19a8e9bd95af02aa7658f9`.
3. Обновлён `docs/CHATGPT_PROJECT_INSTRUCTIONS.md`: новый чат обязан прочитать Release Plan и продолжать с незакрытого P0, без повторного сбора известного контекста.
   - Commit: `700c2952f31f64df9f2042611bcabcf7c7816c2d`.
4. Обновлён `.github/copilot-instructions.md`: зафиксированы release acceptance rules, scope freeze и отдельная проверка CI/Preview/Production.
   - Commit: `cc0253764ef292601025dc054e744986997d4869`.
5. Сокращён `docs/CHATGPT_PROJECT_INSTRUCTIONS.md` до 5 723 символов, чтобы его можно было целиком вставить в лимит Project instructions 8 000 символов.
   - Commit: `80f7066b70d3f66d0ad4aef5f7b4f07e7e963b94`.
6. Сохранён единый handoff workflow в PR #26; новый чат должен читать самую свежую версию журнала из открытой ветки/PR, а не только из `main`.

### Проверенные исходные ограничения

- На аудите 18.11.2026 Supabase содержал 22 муниципалитета, 1 445 строк `municipality_indicators`, в том числе 1 389 подтверждённых муниципальных наблюдений, 44 подтверждённых поселенческих и 12 `needs_review`.
- Полное покрытие 22 муниципалитетов было только у 8 пар «код + исходное название»; 253 пары имели покрытие 1–4 муниципалитетов. Это не сбалансированная панель.
- Последний документированный runtime risk snapshot: 0 Critical, 21 Watch, 0 Stable, 1 Insufficient. Недостаточное покрытие влияет на статус; это не доказывает кризис в 21 муниципалитете. Пересчитать на проверяемом билде.
- Прогноз и шестинаправленный индекс остаются концептуальными/кандидатными. Часть коэффициентов — экспертные допущения; исторические backtest результаты носят диагностический характер.
- Migration drift остаётся блокером для любых широких production DB-изменений: 110 файлов в Git против 96 production migration records на момент аудита, есть повторяющиеся префиксы. Не выполнять слепой `supabase db push`, не переименовывать/удалять миграции.

### Что осталось сделать

1. Проверить новый GitHub Actions run и Vercel Preview для последнего HEAD после документов в PR #26.
2. Провести актуальный аудит исходного кода ключевых путей: главная навигация, карта и 22 паспорта, сравнение, риск-модель, сценарии 1–3 лет, отчёты и экспорты, Supabase read path.
3. Запустить полный набор:
   - `npm ci`
   - `npm test`
   - `npm run build`
   - `npm run check:map-coverage`
   - `npm run check:risk-pilot-csv`
   - `npm run validate:rosstat-crosswalk`
4. Исправлять воспроизводимые P0-блокеры небольшими изменениями с регрессионной проверкой. Новые функции и редизайн перенести за пределы Release 1.0.
5. Сделать ручной smoke-test на широком и узком экране, проверить экспорты фактическими файлами, метки источников и пустые состояния.
6. 20.11.2026 пройти release gates, проверить точный Production deployment SHA и URL, либо честно зафиксировать блокировку выпуска.
7. Сохранять новые этапы в этой ветке/PR, обновляя журнал в каждом checkpoint.

**Точное следующее действие:** перепроверить текущий PR #26 HEAD и новые CI/Preview checks. После их результата начать P0-аудит кода по порядку: навигация и карта → паспорта и сравнение → риск-модель → сценарный прогноз → отчёты/экспорт → Supabase read path. Не менять production Supabase.

## Формат для каждой следующей задачи

Когда начинается новая существенная задача, замени блок «Активная задача» данными этой задачи, сохранив краткую историю предыдущей завершённой работы внизу документа.

- **Название задачи:**
- **Статус:** `IN_PROGRESS` / `BLOCKED` / `READY_FOR_REVIEW` / `DONE`
- **Цель и критерий готовности:**
- **Рабочая ветка:**
- **Базовый SHA:**
- **PR и статус:**
- **Последний подтверждённый commit SHA:**
- **Изменённые файлы и смысл изменений:**
- **Что завершено:**
- **Что осталось:**
- **Ошибки и блокеры:**
- **Проверки:** команда / результат / ссылка на CI
- **Изменения production:** не было / read-only / выполнены с явным разрешением
- **Следующее конкретное действие:**

## Правило контрольной точки

После каждого логически самостоятельного этапа:

1. Сохрани согласованные изменения кода в текущей рабочей ветке.
2. Обнови этот файл: отметь завершённое, оставшееся, результаты проверок и одно ближайшее действие.
3. Добавь обновлённый журнал в тот же checkpoint commit.
4. Убедись, что commit опубликован в GitHub и доступен по ветке/PR.
5. Перед продолжением следующего крупного этапа проверь, что checkpoint сохранён.

Для длинных многоэтапных задач делай checkpoint после каждого существенного этапа и, когда рабочая среда позволяет, примерно каждые 20–30 минут. Не делай бессмысленные commit на каждую строку, но и не оставляй несколько крупных этапов только в памяти текущего чата.

Если code changes пока нельзя безопасно зафиксировать, запиши в журнал точный список несохранённых файлов, причину и способ восстановления. Не утверждай, что они уже находятся в GitHub.

| 2026-11-18 | Сокращены Project instructions ниже лимита 8 000 символов | та же ветка, PR #26 | Файл содержит 5 723 символа; коммит `80f7066b70d3f66d0ad4aef5f7b4f07e7e963b94` |

## Последние checkpoints

| Дата | Этап | Ветка / PR | Подтверждённый результат |
|---|---|---|---|
| 2026-11-18 | Создана основа постоянных AI-инструкций | `main`, PR #25 | PR #25 объединён; commit `8f291774044fd9f73e6b766e6196f02db3628bb7` |
| 2026-11-18 | Добавлены правила автоматического сохранения и handoff-журнал | `chore/automatic-session-checkpoints-2026-11-18`, PR #26 | PR открыт Draft; исходные проверки CI успешны на раннем commit, перепроверить на актуальном HEAD |
| 2026-11-18 | Подготовлен release-план к 20 ноября и синхронизированы инструкции агентов | та же ветка, PR #26 | Создан Release Plan; AGENTS, ChatGPT Project instructions и Copilot instructions обновлены; ждёт проверки CI для новых commits |

## Краткая история завершённых задач

- 2026-11-18 — PR #25: добавлены `AGENTS.md`, инструкции Copilot, канонический контекст проекта и шаблон Project instructions для ChatGPT. Изменения объединены в `main` (SHA указан выше).
- 2026-11-18 — PR #26: добавлены правила сохранения прогресса между сессиями и единый журнал checkpoint. PR остаётся Draft до повторной проверки актуального diff и CI.
