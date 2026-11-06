# Yugra18 — независимый QA-аудит

**Дата актуальной проверки:** 07.11.2026  
**QA-ветка:** `feat/qa-testing`  
**QA PR:** [#12](https://github.com/vanakazamkin-tech/yugra/pull/12), Draft, не объединён.  
**Проверенный исходный head QA до обновления тест-раннера:** `68ff381961d4367ea47b7ded4b11e11d44ce023c`.  
**QA-коммит с расширением test runner:** `21adb03ce943240d99f463528f13470789aa9f16`.

## 1. Границы и безопасность

- Все изменения QA выполняются только в `feat/qa-testing`.
- PR #8–#13 остаются отдельными, открытыми и не объединёнными.
- `main`, чужие ветки, production Supabase, production-данные и RLS не изменялись.
- Production-миграции не запускались.
- Vercel deployments дополнительно не запускались: для всех проверенных SHA статус Vercel возвращал `build-rate-limit`. Это ограничение провайдера, не доказательство ошибки приложения и не доказательство успешной Vercel-сборки.

## 2. Зафиксированные SHA и CI

SHA ниже получены повторным чтением PR непосредственно перед аудитом 07.11.2026. Исторические SHA из предыдущей версии этого документа не используются как текущие.

| PR | Направление | Head SHA | GitHub Actions для этого SHA | Состояние PR |
|---|---|---|---|---|
| #8 | Индекс | `ed2fc7ddde4bcb2be1508f69b4e730356585a25a` | PR-triggered run для точного SHA не найден; Vercel — build-rate-limit | open, mergeable=false |
| #9 | Риски | `0b83d8625566e0d9e411f1dd4c95d2fc409427a9` | Build #42277756610 — success | open, Draft |
| #10 | Интерфейс | `94bff0003f8eafb2455c85b781aff795f62f74a9` | Build #42277658644 — success | open, Draft |
| #11 | Данные / Supabase | `a83bc05262ae70a23234436358ce249f231765d5` | Build + data-migrations-integration #42277695712 — success | open |
| #12 | QA | `68ff381961d4367ea47b7ded4b11e11d44ce023c` | Build #42277912343 — success; шаги этого run не содержали `npm test` | open, Draft |
| #13 | Прогнозирование | `40abd4f39e719429cded4090cf606470f5d8779e` | Build #42268245956 — success, включая forecast unit tests | open |

**Ограничение проверки CI:** доступный список workflow runs по commit возвращает PR-triggered runs. Отдельный push-run workflow `.github/workflows/qa.yml` для PR #12 этим способом независимо подтвердить не удалось. Поэтому наличие успешного Build verification не засчитывается как доказательство успешного `npm test` в QA workflow.

## 3. Подтверждённые дефекты и исправления

### DEF-RISK-001 — пустой reference_period трактуется как annual

**Приоритет:** средний.  
**Владелец:** PR #9.  
**Файлы:** `src/lib/riskModel.js`, `src/components/UnifiedRiskForecast.jsx`.

В текущем head PR #9:
- `comparablePeriodSequence()` возвращает годовую частоту, если `reference_period` пустой;
- `signature()` в UI также подменяет пустой период на `annual`.

Таким образом, неизвестная частота наблюдения может участвовать в годовой последовательности и формировать повторный сигнал раннего предупреждения. Наличие `reference_year` само по себе не доказывает годовую периодичность.

**Ожидаемое поведение:** пустой/неизвестный период не должен считаться годовым без подтверждённого source-specific правила; серия должна быть исключена из последовательного раннего предупреждения или отправлена на проверку.

**Статус:** открыт. Требуются исправление владельцем PR #9 и регрессионные тесты.

### DEF-RISK-002 — конфликт reference_year и года в reference_period

**Приоритет:** средний.  
**Владелец:** PR #9.  
**Файл:** `src/lib/riskModel.js`.

Текущая логика предпочитает `reference_year` году, извлечённому из периода. Например, `reference_year=2023` вместе с `reference_period='2024-Q1'` может быть молча отнесено к 2023 году.

**Ожидаемое поведение:** противоречивые временные метаданные должны отклоняться или помещаться в карантин, а не исправляться приоритетом одного поля.

**Статус:** открыт. Требуются тесты на противоречивый год и квартал.

### Исправление прогнозирования — whitespace numeric coercion

**Приоритет до исправления:** средний.  
**Владелец:** PR #13.  
**Файл:** `src/lib/forecastModel.js`.

В текущем head PR #13 функция `numeric()` принимает только конечные числа и непустые строки после `trim()`. Строки из пробелов возвращают `null`, а не ноль. `src/lib/forecastModel.test.js` содержит проверки пустой строки, пробелов, null, boolean и реального нуля.

**Статус:** исправление подтверждено статическим чтением кода и успешным CI run #42268245956; шаг forecast model unit tests завершился success. Старое замечание о whitespace coercion из предыдущей версии QA-аудита закрыто.

### Исправление миграции данных — UNIQUE constraint / DROP INDEX

**Приоритет до исправления:** высокий, блокирующий миграцию.  
**Владелец:** PR #11.  
**Файлы:** `supabase/migrations/20261106210000_data_quality_provenance_guardrails.sql`, `supabase/tests/data_quality_migrations_bootstrap.sql`.

В текущем head PR #11 миграция:
- проверяет наличие UNIQUE constraint через `pg_constraint`;
- при наличии ограничения использует `ALTER TABLE ... DROP CONSTRAINT`;
- оставляет fallback `DROP INDEX` только для старых установок с самостоятельным индексом;
- disposable bootstrap теперь создаёт именно UNIQUE constraint, а не только самостоятельный индекс;
- CI повторно применяет миграции для проверки идемпотентности и проверяет grants/уникальность.

Run #42277695712: оба job — `build` и `data-migrations-integration` — завершились success.

**Статус:** исходный дефект исправлен в текущем PR #11 и покрыт disposable PostgreSQL integration run. Предыдущее сообщение в этом документе о неизбежном падении миграции устарело. Это не разрешение применять миграцию к production: до этого нужен отдельный preflight на актуальном schema snapshot и согласованная процедура отката.

## 4. Состояние QA-инфраструктуры

В PR #12:
- `npm test` запускает `scripts/test-all.mjs`;
- `qa.yml` настроен на push в `feat/qa-testing` и ручной запуск;
- обязательный runner содержит девять проверок: миграционный staging syntax, staging filters, forecast coverage, risk provenance/geography, classification/risk pillars, official comparison, report gates, municipality passport, operational registry;
- тест индекса подключается как optional script, если он присутствует на ветке;
- `package-lock.json` отсутствует, поэтому зависимости не закреплены lock-файлом;
- линт-скрипт в проверенном `package.json` не объявлен.

В QA-коммите `21adb03` runner дополнен автоматическим обнаружением `src/lib/*.test.js` и запуском найденных файлов через Node test runner. Это позволит автоматически включить unit tests прогнозирования и других модулей после появления этих файлов в интегрированном checkout. На изолированной QA-ветке такие feature-файлы могут отсутствовать, поэтому пропуск фиксируется, а не считается успешным тестом.

**Важно:** локальные `npm test` и `npm run build` в этом аудите не запускались. CI Build verification на QA SHA подтвердил production build, но его шаги не включали `npm test`. Отдельный QA push-run пока не подтверждён.

## 5. Совместимость шести направлений

Проверка сравнения base/head выявила пересекающиеся файлы:

| Пересечение | Общие файлы | Риск интеграции |
|---|---|---|
| #8, #11, #13 | `.github/workflows/ci.yml` | Потеря шагов CI при принятии одной версии файла |
| #11, #12, #13 | `package.json` | Конфликт scripts и порядка команд тестирования |
| #10, #13 | `src/components/Forecasting.jsx` | Конфликт интерфейсных изменений и подключения forecastModel |
| #9, #10 | `src/components/UnifiedRiskForecast.jsx` | Конфликт риск-логики и UI/UX изменений |

PR #10 использует base SHA `9f99481a3843862a17fd9cf640fee48b4ef901ba`, тогда как остальные проверенные PR используют `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`. Перед интеграцией необходимо согласовать единый актуальный main и повторно прогнать CI на итоговом merge candidate.

PR #8 имеет `mergeable=false`; до разрешения состояния и получения CI на точном head его нельзя считать готовым к объединению.

## 6. Браузер, UI и production

В этой проверке не выполнены и не заявляются как выполненные:
- браузерные E2E-сценарии;
- проверка карты и выбора муниципалитета;
- паспорт муниципалитета, сравнение, фильтры и пустые состояния;
- запуск сценариев прогноза и изменение параметров в браузере;
- экспорт CSV из интерфейса;
- адаптивность на реальном широком и узком viewport;
- клавиатурная навигация и screen-reader;
- проверка опубликованного сайта через реальный браузер;
- live-проверка production Supabase и миграций.

GitHub Actions build не заменяет эти проверки. Vercel build-rate-limit не является успешным deployment.

## 7. Итоговое решение

**Интеграцию всех шести направлений пока не разрешать.**

Блокирующие условия перед общей интеграцией:
1. PR #9: исправить DEF-RISK-001 и DEF-RISK-002 и добавить регрессионные тесты.
2. PR #8: устранить `mergeable=false`, получить CI на точном актуальном head.
3. PR #12: подтвердить запуск QA workflow с `npm test` на новом head после обновления runner.
4. Согласовать единый base/main для всех PR и разрешить пересечения файлов в одном интеграционном кандидате.
5. После сборки общего кандидата выполнить полный CI, disposable migration tests и браузерные E2E.
6. До применения миграций к production выполнить preflight на актуальной копии схемы; не менять RLS/grants ради тестов.

### Подсчёт проверок

- Подтверждённые успешные GitHub Actions workflow runs: #9, #10, #11, #12 Build verification, #13 — 5 runs.
- Отдельный PR #11 migration integration job: success.
- PR #8: CI на точном head не подтверждён.
- QA `npm test` на точном текущем head: пока не подтверждён.
- Локальные тесты и локальный build: не запускались.
- Количество внутренних assertions/test cases по workflow summary не раскрывается; точное число пройденных тест-кейсов не заявляется.
- Браузерные E2E: 0 подтверждённых сценариев в рамках этой проверки.


---

# Дополнение к аудиту — повторная проверка новых head (07.11.2026)

Этот раздел **заменяет устаревшие статусы** выше для PR #8–#13. Старые SHA и выводы сохраняются только как история предыдущего раунда.

## A. Новые актуальные SHA и состояния

| PR | Новый head SHA | mergeable | Последний доступный GitHub Actions |
|---|---|---|---|
| #8 | `6f24555c1e759e03d904a46ef7a1040b0dd408a9` | true | #42282309934 — Build verification success |
| #9 | `e20ff6902495ded93c5f00a00558fcb70fb71d54` | true | #42282678637 — failure |
| #10 | `5bf032b6cede6697b83ef09afdc4cdcb435832cb` | true | #42282537205 — Build verification success |
| #11 | `82d7822f210beb4fa5564eddd6a667b2ad64506a` | true | #42282687228 — build success + data-migrations-integration success |
| #12 | `bb955fb3dd2359badbefba9f2e9b6ad563aa9018` | true | #42282496573 — Build verification success |
| #13 | `d6863eae3902f241076d7f530bc19f20b9de5c64` | true | #42282662820 — failure |

У всех шести SHA status context Vercel сообщает `build-rate-limit`. Это внешний лимит Vercel; он не заменяет GitHub Actions.

## B. Повторная проверка DEF-RISK-001/002 — исправлены

В новом PR #9:
- `parseRiskPeriod()` в `src/lib/riskModel.js` требует явный `reference_period`;
- один `reference_year` не преобразуется автоматически в annual;
- несоответствие года в поле и метке периода возвращает null;
- `buildRiskSeries()` в `src/lib/riskSeries.js` использует проверенную периодичность для сопоставления, change и adverse streak;
- тесты в `scripts/test-risk-model-pillars.mjs` покрывают пустой период, отсутствие периода, конфликт года/периода, неизвестную частоту, разрывы, conflicting duplicates и adverse streak.

**Вердикт:** исходные два дефекта закрыты на уровне кода и регрессионных тестов нового head PR #9.

## C. Новый CI failure PR #9 — устаревший тест, не подтверждённый бизнес-дефект

Run #42282678637 падает на шаге `Test risk data provenance and geography gates`.

Файл `scripts/test-risk-data-gates.mjs` ищет литерал `row.verification_status !== 'verified'` в `src/components/UnifiedRiskForecast.jsx`. Проверка была перенесена в `src/lib/riskSeries.js`, где реально выполняются:
- `row.verification_status !== 'verified'`;
- `row.geographic_level !== 'municipality'`.

То есть тест привязан к старому местоположению реализации. Нельзя просто удалить проверки или ослабить фильтр. Нужно переписать тест на актуальный модуль/поведение и повторить CI.

**Статус:** PR #9 блокируется красным CI до исправления теста. Это дефект тестовой инфраструктуры направления #3, а не подтверждение того, что текущий fail-closed фильтр отсутствует.

## D. Новый дефект PR #13 — summarizeForecast падает

**DEF-FORECAST-001 — HIGH.**

Файл: `src/lib/forecastModel.js:155`, функция `summarizeForecast()`.

Код возвращает:
`investmentCoverage: investmentRows.length`

Переменная `investmentRows` внутри функции не объявлена. Поэтому каждый вызов `summarizeForecast()` приводит к `ReferenceError`, включая пустой массив и обычные данные.

Run #42282662820:
- `npm test` запущен;
- всего 18 тестов;
- 15 passed;
- 3 failed;
- все три отказа связаны с `ReferenceError: investmentRows is not defined` на строке 155;
- шаг `Run forecast model unit tests` завершился failure.

**Ожидаемое исправление:** считать покрытие по безопасному массиву строк с конечным `projectedInvestments`, включая явный ноль, но исключая null/undefined/невалидные значения; не подменять ошибку нулём. После исправления повторить полный test suite и production build.

**Статус:** открыт, высокий приоритет, блокирует прогнозную сводку.

## E. Актуальная QA-ветка

QA PR #12 остаётся на head:
`bb955fb3dd2359badbefba9f2e9b6ad563aa9018`.

Run #42282496573 завершился success. Он выполнил девять интеграционных/контрактных проверок и production build. В этом workflow run не было отдельного шага `npm test`; поэтому этот run не подтверждает полный Node unit-test suite QA branch.

Изменения QA runner и документации остаются в `feat/qa-testing`. Бизнес-логику PR #9/#13 QA не менял.

## F. Актуальные совместимость и merge-readiness

На новых головах все PR сообщают `mergeable=true`, но базы неодинаковы:
- PR #8 и #10 используют base `9f99481a3843862a17fd9cf640fee48b4ef901ba`;
- PR #9, #11, #12 и #13 используют base `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`.

Это требует согласования единого base перед общей интеграцией. Само значение `mergeable=true` не подтверждает корректность содержимого и не устраняет CI failures.

**Новые блокирующие условия:**
1. PR #9: обновить устаревший `test-risk-data-gates.mjs`, сохранив fail-closed тестирование, и получить зелёный CI.
2. PR #13: исправить undefined `investmentRows`; повторить unit tests и build.
3. Согласовать общий base/main для шести направлений.
4. Разрешить пересечения `.github/workflows/ci.yml`, `package.json`, `Forecasting.jsx`, `UnifiedRiskForecast.jsx` в общем merge candidate.
5. На итоговом кандидате выполнить общий CI, migration integration, браузерные E2E и responsive checks.

PR #8, #10, #11 и #12 имеют успешные Build verification на указанных выше SHA; PR #11 также прошёл отдельную data-migrations-integration. Это не равнозначно полной браузерной и production проверке.

## G. Итог после повторного раунда

**Объединение всех шести направлений всё ещё не разрешено.**

- Исходные проблемы временных периодов PR #9: исправлены и покрыты тестами.
- Исходная проблема whitespace coercion PR #13: исправление сохраняется, тесты на пустые/пробельные строки и ноль присутствуют; однако новый дефект в `summarizeForecast()` блокирует PR.
- UNIQUE constraint миграция PR #11: предыдущая проверка остаётся положительной; новый integration run также успешен.
- PR #8: mergeable true, Build verification success.
- PR #9: красный CI из-за устаревшего теста.
- PR #13: красный CI из-за реального runtime дефекта.
- Browser E2E, production Supabase, local build и Vercel deployment в этом раунде не выполнены.


---

# Дополнение к аудиту — ретест после следующих исправлений (07.11.2026)

## 1. Текущие head и CI

| PR | Проверенный head SHA | Build verification | Дополнительные результаты |
|---|---|---|---|
| #8 | `15484db921a045ae74d620eb1c597035855addb2` | #42283042241 success | mergeable=true |
| #9 | `2105e6a26252dae6198f5f4e352c8800e02e50d3` | #42283083273 failure | mergeable=true |
| #10 | `5da1254a0cf3c0adb8c12a51fb5009d81d4ae4f6` | #42283006776 success | mergeable=true |
| #11 | `225d88aaa8821a3b272705b3ede7faef58f99523` | #42283046565 failure | data-migrations-integration success |
| #12 | `f09a40a926a63fc508fa29e1f1217d679313b31f` | #42282998117 success | все QA checks + production build |
| #13 | `1bfe67dd22e05d0fae04765e1638d68737e0c4f0` | #42282998466 success | forecast model unit tests + build |

Vercel status для этих SHA остаётся failure из-за build-rate-limit. Это не интерпретируется как кодовая ошибка или успешный deployment.

## 2. PR #9 — тест по-прежнему не обновлён

На head `2105e6a...` файл `scripts/test-risk-data-gates.mjs` всё ещё читает `UnifiedRiskForecast.jsx` и ищет в нём две проверки provenance/geography. Реализация уже импортирует `buildRiskSeries`, а fail-closed условия находятся в `src/lib/riskSeries.js`.

Run #42283083273 повторно падает именно на этом assertion. Следовательно, предыдущее замечание не было исправлено в этом head.

**Требуемое действие:** тестировать поведение `buildRiskSeries()` на непроверенном/отсутствующем статусе и неверном уровне географии. Оставить fail-closed фильтры в модели данных. После изменения получить зелёный CI.

## 3. PR #11 — миграционная интеграция успешна, parser contract test имеет дефект

На head `225d88a...`:
- job `data-migrations-integration` завершился success;
- build job падает на последнем тесте `scripts/test-duma-budget-parser-structure.mjs`.

Тестовый кейс `extra column` получает ожидаемую parser error: `CSV line 2 has 10 columns; expected 9`. Но регулярное выражение assertion написано с избыточным экранированием: оно ищет буквальную последовательность `\\d`, а не цифровой номер строки. Поэтому корректное сообщение парсера не совпадает.

**Оценка:** это дефект теста, а не подтверждённый дефект CSV parser. Нужно исправить regex и оставить негативные тесты на лишнюю/недостающую колонку, повторные заголовки и некорректные кавычки. Не изменять parser validation для обхода теста.

## 4. PR #13 — DEF-FORECAST-001 закрыт

На новом head `1bfe67d...`:
- `investmentRows is not defined` устранено;
- `investmentCoverage` рассчитывается фильтрацией `safeRows` через `numeric(projectedInvestments) != null`;
- явный ноль остаётся валидным наблюдением;
- тест `summary reports coverage and does not convert missing values to zero` присутствует;
- run #42282998466 прошёл forecast unit tests и build.

**Вердикт:** предыдущий HIGH дефект закрыт на уровне кода и зелёного CI. Не заявлять browser E2E.

## 5. QA PR #12 — новый run успешен

На head `f09a40a...` run #42282998117 завершился success:
- migration staging syntax;
- migration staging filters;
- forecast coverage;
- risk provenance/geography gate;
- indicator classification / resilience pillars;
- official comparison comparability;
- analytical report official-data gates;
- municipality passport integrity;
- operational registry integrity;
- production build.

Это Build verification со списком конкретных QA checks; он не является доказательством запуска полного `npm test` или браузерного E2E.

## 6. Текущий verdict

**Все шесть направлений пока не объединять.**

Блокеры:
1. PR #9 — заменить устаревший тест проверкой реального поведения `buildRiskSeries()`, получить зелёный CI.
2. PR #11 — исправить regex в `test-duma-budget-parser-structure.mjs`, повторить весь `test:data-quality` и build; migration integration отдельно уже зелёный.
3. Свести все PR на единый актуальный base. В предыдущих проверках фиксировались разные base SHA; не предполагать совместимость только по `mergeable=true`.
4. Провести совместную сборку на итоговом merge candidate и закрыть пересечения файлов.
5. Провести browser E2E, responsive и accessibility checks; подтвердить production deployment отдельно.

Положительная динамика: PR #8, #10, #12 имеют успешные build verification; PR #13 исправил forecast runtime defect; PR #11 migration integration зелёная. Основные незакрытые CI-предметы сейчас локализованы в тестах PR #9 и PR #11.
