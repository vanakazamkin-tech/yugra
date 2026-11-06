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


---

# Дополнение к аудиту — все индивидуальные CI зелёные, интеграционная база устарела (07.11.2026)

## 1. Последние проверенные PR heads

| PR | Head SHA | GitHub Actions run | Результат |
|---|---|---|---|
| #8 | `fcfac5c4ff1673f716ecd84db08b708f74437e48` | #42283352151 | success |
| #9 | `1a60fbd276b95637bb8933b06dd2d7cb590ee109` | #42283397655 | success |
| #10 | `747bad35f3dd7790d693689355e532af4d5d9b90` | #42283410457 | success |
| #11 | `41e564e2eb8b356f0bae8d897cee9c38aa39fb00` | #42283141738 | success |
| #12 | `6b4d2b0d489c4d137f4c4d39be7101d9c8712ee3` | #42283348713 | success |
| #13 | `474e570205284766f2f9473fd96a64630f4faba9` | #42283430390 | success |

PR #11 run #42283141738 содержит две успешные jobs: `build` и `data-migrations-integration`.
PR #13 run #42283430390 включает `Run forecast model unit tests`, все QA checks и `Build production bundle`; всё success.
PR #12 run #42283348713 завершился success: девять контрактных/интеграционных QA checks и production build.

На всех указанных PR GitHub сообщает `mergeable=true`. Это статус отсутствия известного merge conflict на момент проверки, а не заключение о совместимости всех изменений.

## 2. Два предыдущих CI-блокера исправлены

### PR #9
В `scripts/test-risk-data-gates.mjs` источник проверки изменён с устаревшего React-компонента на `src/lib/riskSeries.js`. Проверки требуют явных:
- `verification_status === 'verified'` (через fail-closed условие);
- `geographic_level === 'municipality'`.

В `riskSeries.js` обе проверки выполняются до включения строки в расчётный ряд. Новый Build verification #42283397655 — success.

**Ограничение QA:** текущий тест всё ещё статический (проверяет исходный текст через regex), а не поведение `buildRiskSeries()` на фиктивных данных. Для более сильной защиты рекомендуется добавить runtime regression tests на отсутствующий/непроверенный provenance и неверный geographic level. Это улучшение качества тестирования, а не текущий CI blocker.

### PR #11
В `scripts/test-duma-budget-parser-structure.mjs` regex теперь корректно содержит `line \\d+ has`, поэтому принимает номер строки в сообщении CSV parser. Негативные тест-кейсы остаются.
Build verification #42283141738: success.
Отдельная `data-migrations-integration` job: success.

## 3. PR #13 — forecast fix сохраняется
На новом head Build verification #42283430390 прошёл, включая `Run forecast model unit tests`. Предыдущая ошибка `investmentRows is not defined` отсутствует в текущем успешном прогоне.

## 4. Критический интеграционный вопрос: четыре PR отстают от main

Текущая ветка `main` на момент проверки:
`9f99481a3843862a17fd9cf640fee48b4ef901ba`.

Сравнение каждого PR head с этим main commit:
- PR #8: ahead 94, behind 0; merge base = current main.
- PR #10: ahead 84, behind 0; merge base = current main.
- PR #9: ahead 84, behind 5; merge base = `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`.
- PR #11: ahead 111, behind 5; merge base = `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`.
- PR #12: ahead 39, behind 5; merge base = `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`.
- PR #13: ahead 36, behind 5; merge base = `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`.

Сравнение `fa006173...` с текущим main показывает, что main содержит пять дополнительных commits. Поэтому PR #9/#11/#12/#13 необходимо обновить относительно актуального main и повторить CI на новых head SHA. Не полагаться на зелёный CI старого merge base.

## 5. Пересечения файлов, требующие интеграционного разрешения

На текущих PR изменяются общие файлы:
- PR #8 и #13: `docs/INDEX_METHODOLOGY.md`;
- PR #9 и #10: `src/components/UnifiedRiskForecast.jsx`;
- PR #11 и #13: `.github/workflows/ci.yml`, `package.json`;
- PR #10 и #13: `src/components/Forecasting.jsx`.

Это не обязательно означает конфликт Git, но означает риск перезаписи изменений и расхождения контрактов. Нужно проверить итоговые версии файлов после синхронизации с main, а не принимать обе стороны автоматически.

## 6. Текущий вердикт

**Индивидуальный CI всех шести PR зелёный. Это заметный прогресс. Общая интеграция всё ещё не разрешена.**

До разрешения интеграции:
1. Обновить PR #9, #11, #12, #13 от актуального main.
2. Получить новые SHA и повторить Build verification; отдельно проверить unit tests PR #13 и migration integration PR #11.
3. Разрешить пересечения общих файлов, перечисленных выше, с ручным просмотром итоговых diff.
4. Запустить общий CI на интеграционном кандидате.
5. Провести браузерные E2E, responsive и accessibility проверки.
6. Не применять production migrations без schema preflight и плана отката.

Browser E2E, production Supabase migration и production deployment по-прежнему не выполнены и не подтверждены этим аудитом.


### Проверка точных compare counts

Перепроверены сравнения **актуальных** head SHA (не предыдущих снимков):
- PR #11 `41e564e2eb8b356f0bae8d897cee9c38aa39fb00`: ahead 111, behind 5 (ранее в таблицу ошибочно попало число 113 от старого head).
- PR #12 после добавления аудита `c1a54af90208f1312f9fb0bb3cc1b76fb858e0c0`: ahead 39, behind 5 (предыдущий head имел ahead 38).
- PR #9: ahead 84, behind 5.
- PR #13: ahead 36, behind 5.

Новый Build verification для QA audit commit `c1a54af...`, run #42283752642, завершился success.


---

# Дополнение к аудиту — повторная проверка heads после новых коммитов (07.11.2026)

## Актуальные состояния на момент проверки

| PR | Проверенный head | GitHub Actions | Отставание от main |
|---|---|---|---|
| #8 | `2f9eac33e38134e80b738ccd57308596e35d5905` | #42283777199 success | 0 |
| #9 | `a0ee7f1bb016eac96aa667d0ca769fe4dcca31a0` | #42284060237 success | 5 |
| #10 | `8960e057f694f2f290bff42e1add99c238ca049c` | #42283895151 success | 0 |
| #11 | `9bb4b4547aea9e214478200f28601db8fc9295af` | #42283880579 success | 5 |
| #12 | `2c2c42ca79936f8f7b5f6b7bf5790aa2097b3040` | #42283907948 success | 5 |
| #13 | `0f239796f024b1418a382355f1a797a82344d002` | не обнаружен для этого SHA | 5 |

PR #11 run #42283880579 включает успешные jobs `build` и `data-migrations-integration`. PR #9 run #42284060237 — success. PR #13 получил новый head после предыдущего успешного CI; его старый успешный прогон не считается проверкой нового SHA.

## Интеграционная база не обновлена

Текущий main на момент проверки: `9f99481a3843862a17fd9cf640fee48b4ef901ba`.
PR #9/#11/#12/#13 всё ещё имеют merge base `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c` и отстают от main на пять commits.

Точные compare counts:
- PR #9: ahead 103 / behind 5.
- PR #11: ahead 114 / behind 5.
- PR #12: ahead 40 / behind 5.
- PR #13: ahead 41 / behind 5.

PR #13 в последнем PR metadata ответе GitHub показывал `mergeable=false`. В PR #13 оставлен комментарий с просьбой разрешить конфликт/проверить merge state, обновиться от актуального main и запустить CI на новом SHA.

## Текущие пересечения файлов

- PR #8 / #13: `docs/INDEX_METHODOLOGY.md`.
- PR #9 / #10: `src/components/UnifiedRiskForecast.jsx`.
- PR #11 / #13: `.github/workflows/ci.yml`, `package.json`.
- PR #10 / #13: `src/components/Forecasting.jsx`.

## Дополнительная рекомендация к тестированию PR #9

Текущий provenance/geography test теперь смотрит в правильный модуль `src/lib/riskSeries.js`, а CI проходит. Однако это статическая проверка исходного текста. Рекомендовано добавить runtime regression tests для `buildRiskSeries()`: пропускать только verified municipality observations, исключать missing/unverified provenance и неверный/отсутствующий geographic level, а также проверять отсутствие мутации входного массива. Замечание оставлено в PR #9; это улучшение покрытия, не текущий CI blocker.

## Вердикт

На момент этого снимка пять из шести последних heads имеют успешный GitHub Actions; PR #13 обновился после своего успешного CI и нуждается в новом прогоне. Четыре PR (#9/#11/#12/#13) по-прежнему требуют синхронизации с main. Общая интеграция не подтверждена. Browser E2E, responsive/accessibility проверки, production Supabase migration и production deployment не выполнены.


---

# Дополнение к аудиту — новый ретест после исправлений тестов (07.11.2026)

## Последние heads и CI

| PR | Head SHA | Run | Состояние |
|---|---|---|---|
| #9 | `228ba5114a29a91674b38b979922eaa7e0ea7361` | #42284450098 | in progress на момент снимка |
| #11 | `3be0b99eec0f1efa1e23a29b973622d3bed57cb1` | #42284450469 | in progress: build + migration integration |
| #12 | `136016043d01b007fbe8df027c2269244adfb6e0` | #42284255575 | success |
| #13 | `47b7bcb8acbe80cad00f2a6522c352c8ae06bd3b` | #42284363328 | success |

PR #13 получил новый успешный прогон на SHA `47b7bcb...`; это снимает предыдущую неопределённость CI на его новом head. PR #11 новый run включает обе jobs — `build` и `data-migrations-integration`; до завершения обеих не считать PR проверенным. PR #9 также получил новый head и отдельный прогон; статус ожидается.

## Повторная ошибка PR #9 и исправление, которое ожидается

На предыдущем head `3ede9be...` Build verification #42284357193 упал в `scripts/test-risk-model-pillars.mjs`:
`ReferenceError: Cannot access 'riskSignal' before initialization` на строке 60.
Новая sharp-change проверка вызывала helper `riskSignal` до объявления `const riskSignal = ...`. Перед этим была исправлена несовместимость expected object с новым полем `sharpChangePercent: 10`.

Замечание с точным местом и предложением переместить helper выше первого использования оставлено в PR #9. Новый head `228ba511...` запущен в CI; его результат должен подтвердить, что исправление корректно.

## Интеграционная база

Текущий main остаётся `9f99481a3843862a17fd9cf640fee48b4ef901ba`. Последняя подтверждённая проверка compare показала, что PR #9/#11/#12/#13 всё ещё отстают от main на 5 commits и имеют merge base `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`. Перед интеграцией нужно повторить сравнение после новых commits; зелёный CI на прежней базе не заменяет синхронизацию.

## Текущий вердикт

QA PR #12 CI зелёный; PR #13 CI зелёный на новом head; PR #9 и PR #11 находятся в новых CI-прогонах. Общая интеграция по-прежнему не подтверждена. Browser E2E, responsive/accessibility, production Supabase migration и production deployment не выполнялись.


---

# Дополнение к аудиту — подтверждение исправления PR #9 и повторный head PR #13 (07.11.2026)

- PR #9: head `8b347ee686a2051b7662161afd71725dbeb722f7`, Build verification #42284626985 завершился success. Предыдущая ошибка helper initialization в `test-risk-model-pillars.mjs` на этом прогоне не воспроизвелась.
- PR #11: head `3be0b99eec0f1efa1e23a29b973622d3bed57cb1`, Build verification #42284450469 завершился success; обе jobs (`build` и `data-migrations-integration`) успешны.
- PR #12: QA audit head `ab4b98d39aaac90b97e4ab67f11450519520fe90`, Build verification #42284545498 завершился success.
- PR #13: новый head `7ef9452763bef0f935d71fa4f8c811f5e4695572`; Build verification #42284664070 находится в процессе на момент фиксации. Предыдущий head PR #13 проходил CI, но это не подтверждает новый SHA.

Все эти PR по-прежнему основаны на `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`, тогда как текущий main — `9f99481a3843862a17fd9cf640fee48b4ef901ba`; они отстают на 5 commits. PR #13 в последней проверке показывал `mergeable=false`; в PR оставлено повторное замечание о синхронизации и проверке merge state. PR #9/#11/#12/#13 требуют обновления от актуального main и повторной проверки на новых SHA.

**QA вердикт:** последние индивидуальные прогоны PR #9/#11/#12 зелёные; PR #13 ожидает завершения CI на новом SHA. Общая интеграция, browser E2E, responsive/accessibility, production Supabase migration и production deployment не подтверждены.


---

# Дополнение к аудиту — проверка фактических пересечений PR (07.11.2026)

## 1. Все последние индивидуальные CI завершились успешно

| PR | Head SHA | Build verification |
|---|---|---|
| #8 | `3b3cbca00ae24ddf70224cda39f33bd2b1444acb` | #42284818725 — success |
| #9 | `c55e02630bfe8fcd6e0303dcb4353763acc155b6` | #42284810591 — success |
| #10 | `413c6dbac9632b4d2c8fac9212055d1ed407ec76` | #42284850858 — success |
| #11 | `08a3792016398dad040857b6fdbd2a949398a483` | #42284777257 — success |
| #12 | `dbbbd913df48bf99ac37c343abd9a4c857a224c3` | #42284741284 — success |
| #13 | `7ef9452763bef0f935d71fa4f8c811f5e4695572` | #42284664070 — success |

У PR #11 успешны обе jobs: `build` и `data-migrations-integration`.

## 2. Подтверждённые пересечения содержимого, не только списка файлов

Проверены фактические версии файлов из PR heads:

### PR #8 / #13 — методология
Обе ветки меняют `docs/INDEX_METHODOLOGY.md`. Версия PR #8 — около 12.9 KB, PR #13 — около 8.8 KB. Они не эквивалентны: PR #8 содержит более широкий материал по методологии/устойчивости; PR #13 включает раздел про acceptedNames и точное исходное название показателя. Простая замена одной версии другой может потерять часть требований. Нужен ручной semantic merge.

### PR #9 / #10 — риск UI
Обе ветки меняют `src/components/UnifiedRiskForecast.jsx`.
- PR #9 использует `buildRiskSeries` из `riskSeries.js` и fail-closed provenance/geography gates.
- PR #10 добавляет `projectScoreScenarios`, `classify` и другие UI/сценарные изменения.
Нужно объединить обе реализации, сохранив защиту качества данных и сценарный интерфейс.

### PR #10 / #13 — прогнозирование
Обе ветки меняют `src/components/Forecasting.jsx`. PR #10 содержит UI сценариев/визуализацию, PR #13 подключает `buildForecasts`, `normalizeScenarioRows`, `summarizeForecast`, `sumFiniteValues` и новые параметры сценариев. Нужен ручной merge, после которого тестировать UI и model integration вместе.

### PR #10 / #11 / #13 — workflow и package scripts
Все три ветки меняют `.github/workflows/ci.yml` и/или `package.json`.
- PR #10 добавляет `check:map-coverage` и map coverage step.
- PR #11 добавляет `test:data-quality`, source/data-quality tests и отдельную `data-migrations-integration` job.
- PR #13 добавляет `test` (`node --test src/lib/*.test.js`) и запуск forecast unit tests через `npm test`.
Текущий workflow PR #13 содержит forecast tests, но не содержит отдельную migration integration job PR #11; package.json PR #13 не содержит `test:data-quality` PR #11 и `check:map-coverage` PR #10. Если принять одну версию целиком, часть проверок исчезнет. Итоговый интегрированный workflow должен запускать все эти проверки.

## 3. Состояние PR и база

На момент снимка PR #9, #10 и #12 помечены как draft. PR #8, #11 и #13 не draft. Draft не обязательно означает техническую ошибку, но эти PR нельзя считать объявленными авторами готовыми к финальному review.

Текущий main: `9f99481a3843862a17fd9cf640fee48b4ef901ba`.
PR #8/#10 основаны на текущем main. PR #9/#11/#12/#13 всё ещё основаны на `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c` и отстают от main на 5 commits.

## 4. Действия QA

В PR #8/#9/#10/#11/#13 оставлены отдельные комментарии с конкретными пересечениями и обязательными условиями ручного объединения. Автоматическое разрешение конфликтов через выбор целой версии файла не рекомендуется.

## 5. Вердикт

**Все шесть последних индивидуальных CI зелёные, но общий интеграционный кандидат не сформирован.** Наиболее существенный риск сейчас — потеря проверок и функциональности при разрешении общих файлов `ci.yml`, `package.json`, `UnifiedRiskForecast.jsx`, `Forecasting.jsx` и `INDEX_METHODOLOGY.md`.

Не выполнять merge до semantic merge этих файлов, синхронизации отстающих веток с main и успешного общего CI. Browser E2E, responsive/accessibility, production Supabase migration и production deployment остаются невыполненными.


## Последняя оперативная перепроверка heads (07.11.2026, поздний снимок)

- PR #8: `3b3cbca00ae24ddf70224cda39f33bd2b1444acb`, run #42284818725 — success.
- PR #9: `c55e02630bfe8fcd6e0303dcb4353763acc155b6`, run #42284810591 — success; PR draft.
- PR #10: head обновился до `e187044e30b4d731df27ddc0f56ff13c909ad131`; на этот точный SHA Build verification ещё не обнаружен, GitHub metadata показывает `mergeable=false`; PR draft. Предыдущий success на `413c6db...` не засчитывается как проверка нового head. В PR #10 оставлен комментарий с просьбой разрешить merge state и повторить CI.
- PR #11: `09d1f85488c6df24245d9911b961734ecc9bedd4`, run #42285055745 — success; jobs `build` и `data-migrations-integration` обе успешны.
- PR #12: `611998acbdcdae2bbb8a344b895dbf30fda9476e`, run #42285184098 — success; PR draft.
- PR #13: `1465e40987bbfb59d34219c98e47154c551a8737`, run #42285013626 — success.

PR #9/#11/#12/#13 всё ещё основаны на старом base `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`; PR #8/#10 указывают base текущего main `9f99481a3843862a17fd9cf640fee48b4ef901ba`. При этом PR #10 имеет отдельный текущий mergeable=false blocker.

Итог: 5 из 6 текущих heads имеют подтверждённый зелёный CI; PR #10 — нет. Это не отменяет уже установленные semantic overlaps и отсутствие общей интеграционной сборки.


## Проверка regressions после новых commits (07.11.2026)

### PR #13 — найден и исправлен fail-open в выборе источника балла

На head `710fa7fca19268778994cae9fa96ac8488d28f83` CI #42285377818 упал: `npm test`, 21/22 тестов прошло. Тест `forecast can use only complete results from an explicitly approved index contract` ожидал `projectedScore === null`, но получил `75`.

Причина: при явно заданном `scoreSource: 'resilience-index'` и неутверждённом контракте модель переключалась на `municipality.score`. Это был fail-open fallback, противоречащий контракту режима индекса.

В PR #13 оставлен blocker с требованием не ослаблять тест. На следующем head `494beff16b2a5aeac584f4bdb97136e9f500afc8` код исправлен: добавлен отдельный `indexModeRequested`; если режим индекса явно запрошен, но контракт не approved/неполон, `scoreRaw` становится null, fallback на концептуальный score не происходит. CI #42285531824 завершился success. Это подтверждает, что исправление прошло текущий forecast unit test и build job.

### Новые подтверждённые статусы

| PR | Head SHA | Run | Результат |
|---|---|---|---|
| #8 | `747670efc1cf5c1a1c6652a1bc5e5a4399fede29` | #42285233396 | success |
| #9 | `eeedd2d3c0e4fa56c8e1107aa4ab459a10c930fb` | #42285480380 | success |
| #10 | `2b751860b0b04dae95b232ed97de6b929d12e07b` | #42285426216 | success |
| #11 | `162ffc6e63f9ef84c8a4d9d0233f1f1d22e38841` | #42285519200 | success; build + migration integration |
| #12 | `909f69325193aa403c7f3b2d305c7e8d207bc011` | #42285322080 | success |
| #13 | `494beff16b2a5aeac584f4bdb97136e9f500afc8` | #42285531824 | success |

PR #9 был перебазирован на текущий main `9f99481a3843862a17fd9cf640fee48b4ef901ba` (behind 0). PR #11 и #13 по сравнению с main всё ещё behind 5 commits. PR #10 после предыдущего `mergeable=false` снова показывает mergeable=true и новый head прошёл CI. PR #9 остаётся draft; PR #10 draft; PR #12 draft.

На момент этой проверки PR #9 уже имел run #42285480380 success. Текущая ветка PR #13 прошла новый CI; прежний failure относится к предыдущему SHA и не должен скрываться из истории — он был реальным regression, который исправлен в следующем commit.

## Обновлённый QA вывод

Прогресс есть: новый fail-open в прогнозной модели найден по CI, исправлен автором и проверен успешным CI. Миграционная интеграция PR #11 снова прошла на новом SHA. Однако #11/#13 ещё отстают от main, draft PR остаются неготовыми к финальному review, а ручная интеграция общих файлов и общий CI по объединённому дереву всё ещё не выполнены. Browser E2E, accessibility/responsive и production validation по-прежнему не выполнены.


### Снимок heads после последнего цикла синхронизации (07.11.2026)

| PR | Head SHA | CI run | Итог |
|---|---|---|---|
| #8 | `cfc4b1e90624df25d1d7d6261d9cd9b0c48ff427` | #42285552549 | success |
| #9 | `eeedd2d3c0e4fa56c8e1107aa4ab459a10c930fb` | #42285480380 | success |
| #10 | `593f3b3e286b8729d2e5174c73073333cd8bf6ee` | #42285618889 | success |
| #11 | `162ffc6e63f9ef84c8a4d9d0233f1f1d22e38841` | #42285519200 | success; build + migration integration |
| #12 | `9599abc18d5ba53207c23fdce06bfcaa974e0070` | #42285675779 | success |
| #13 | `494beff16b2a5aeac584f4bdb97136e9f500afc8` | #42285531824 | success |

В этом снимке все шесть текущих heads имеют успешный CI. PR #8/#9/#10 основаны на актуальном main `9f99481a3843862a17fd9cf640fee48b4ef901ba`; PR #11/#12/#13 всё ещё отстают от main на 5 commits (merge base `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`). PR #9/#10/#12 имеют draft=true. PR #11/#13 не draft.

PR #10 после очередного обновления head `593f3b3...` снова mergeable=true и его текущий CI success. PR #13 fail-open regression исправлен и проверен успешным forecast test/build run. PR #11 повторно прошёл migration integration.

Последний QA docs commit `9599abc...` сам прошёл build job #42285675779 success. Vercel всё ещё сообщает `build-rate-limit`; это не результат GitHub build и не deployment. Общая сборка после semantic merge всех веток, browser E2E, responsive/accessibility и production Supabase validation ещё не выполнены.

## QA-цикл: повторная проверка после новых commits (07.11.2026)

### Текущие головы PR и CI

| PR | Head SHA | CI | Дополнительное состояние |
|---|---|---|---|
| #8 | cfc4b1e90624df25d1d7d6261d9cd9b0c48ff427 | #42285552549 success | base актуальный main |
| #9 | eeedd2d3c0e4fa56c8e1107aa4ab459a10c930fb | #42285480380 success | Draft; base актуальный main |
| #10 | 312a1402517045bc2e73857bb103d286830c8588 | #42285817027 success | Draft; base актуальный main |
| #11 | 4910b700c0a1967c7f738b0e114eccf77b29707e | #42285887441 failure | build failed; migration integration success |
| #12 | f04809605f5a051abbeb3fe4f2cbda52bf2fa41a | #42285790649 success | Draft |
| #13 | f51af582125a5daeb57ab827e77751e1e575cd67 | no run found for current head | mergeable=false; no current CI |

PR #8/#9/#10 основаны на main 9f99481a3843862a17fd9cf640fee48b4ef901ba (behind 0). PR #11/#12/#13 основаны на fa006173aa096188a2f4eef0d2cb4bcfe135ae1c (behind 5). Сравнение с main: PR #11 ahead 128 / behind 5; PR #12 ahead 47 / behind 5; PR #13 ahead 55 / behind 5.

### PR #11 — новый blocker в Rosstat coverage audit

В run #42285887441:
- data-migrations-integration — success;
- build — failure в шаге Test data provenance and source catalog contracts.

Лог указывает на scripts/test-data-quality-contract.mjs:57: тест ищет строку с пробелами verification_status <> 'verified', тогда как SQL записан без пробелов verification_status<>'verified'. Это поверхностное несовпадение regex и форматирования, но просмотр SQL обнаружил важный semantic defect: в PostgreSQL предикат verification_status <> 'verified' не считает NULL-статусы непроверенными (UNKNOWN). В результате nonverified_rows может не включать записи без статуса.

В PR #11 оставлен blocker: использовать NULL-safe predicate, например verification_status IS DISTINCT FROM 'verified', и изменить тест так, чтобы проверялась семантика, включая NULL, а не форматирование пробелов. Не ослаблять тест простым удалением assertion.

### PR #13 — новый head без CI

Текущий head f51af582125a5daeb57ab827e77751e1e575cd67 не имеет обнаруженного workflow run; PR metadata показывает mergeable=false. Старый success на 494beff... не подтверждает новый SHA. В PR #13 оставлено замечание: устранить merge state, синхронизировать с main и повторить CI; сохранить fail-closed исправление forecast index mode.

### PR #10 и #12

PR #10 обновил head до 312a140...; текущий CI #42285817027 success. PR #12 head f048096... прошёл GitHub Actions #42285790649 success. Vercel build-rate-limit не является GitHub build result.

## Обновлённый вердикт

На этом снимке зелёные CI PR #8/#9/#10/#12; PR #11 имеет реальное падение build при успешной migration integration; PR #13 имеет новый head без CI и mergeable=false. Общая интеграционная сборка не сформирована. Ни одна из этих проверок не подтверждает production Supabase migration или production deployment. Browser E2E, responsive/accessibility остаются невыполненными.


### Follow-up после замечаний QA (07.11.2026, поздний снимок)

Авторы обновили оба затронутых направления:
- PR #11 head теперь 49bea1089dde068edbe8854ae797237b135f7634, mergeable=true; новый run #42286092389 запущен. На момент снимка обе jobs (build и data-migrations-integration) ещё in_progress. Поэтому предыдущий failure #42285887441 не считать исправленным, пока новый build не завершится.
- PR #13 head теперь 218fa6313ebba37bb458075e43e470b9c5939832, mergeable=true; новый run #42286049731. Его build job завершилась success. Полный статус run на момент снимка ещё in_progress; повторно проверить итоговое состояние перед финальным sign-off.

Последний QA docs commit: 5c027ce2a38559a26b3dc3f53c2d4a1662661726. Combined status показывает только Vercel build-rate-limit failure; отдельный GitHub Actions run для документационного коммита не обнаружен. Это ограничение Vercel не трактуется как провал QA test suite.


## QA-цикл: повторная верификация всех шести PR (07.11.2026)

### Последние проверенные CI runs

| PR | Проверенный head | Run | Итог |
|---|---|---|---|
| #8 | 78094b364bd973fdd3ed16db2f519bcad1ac6b96 | #42286139831 | build success |
| #9 | 8b4e7b1f65d98c36f05cc69a79d81c6a10661820 | #42286208062 | build success |
| #10 | 738e0b3edaed415e04dfbc83c365bcb70c918eb0 | #42286181854 | build success |
| #11 | eaad092b5feb50a85f19f90f839bbc8af2db7759 | #42286287600 | build success; data-migrations-integration success |
| #12 | 0318ba2112279eff0345797fa7ba3d4e26059ff7 | #42286157146 | build success |
| #13 | 4eff3db8bed6578c23ea287d57171f9c845a059b | #42286181361 | build success |

Все шесть PR имеют mergeable=true в последнем полученном PR snapshot. PR #9/#10/#12 остаются draft. Это не равнозначно общему интеграционному sign-off.

### PR #11 — CI исправлен, semantic QA blocker остаётся

Повторно проверен более новый head `eaad092b5feb50a85f19f90f839bbc8af2db7759`, CI #42286287600 (обе jobs success). Но просмотрены фактические файлы этого SHA: в `supabase/audits/rosstat-bd-pmo-coverage-readonly.sql` строки 24 и 57 всё ещё используют `verification_status <> 'verified'`; тест в `scripts/test-data-quality-contract.mjs:57` проверяет только текстовый regex. PostgreSQL не включает NULL в результат `<> 'verified'`, поэтому missing verification status не учитывается в `nonverified_rows`.

Повторный комментарий оставлен в PR #11 (comment id 6694428657): заменить на NULL-safe `IS DISTINCT FROM 'verified'` и добавить assertion для NULL. Статус PR #11: CI green, semantic QA blocker OPEN. Нельзя считать его полностью проверенным только на основании зелёного CI.

### PR #13 — fail-closed forecast mode сохранён

На head `4eff3db8bed6578c23ea287d57171f9c845a059b` build success (#42286181361). Фактический код `forecastModel.js` сохраняет fail-closed логику: при явно запрошенном `scoreSource: 'resilience-index'` результат берётся только из complete результата при approved контракте с непустой версией; иначе score null, без fallback на `municipality.score`. В `forecastModel.test.js` остаётся regression assertion для candidate contract. Это подтверждает локальный контракт модели, но не общий UI/model integration E2E.

### Синхронизация с main и интеграционные риски

На момент сравнения PR #11/#12/#13 всё ещё имеют base `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`, отстающий от main на 5 commits. Их сравнение с main: #11 ahead 135 / behind 5; #12 ahead 49 / behind 5; #13 ahead 60 / behind 5. PR #8/#9/#10 основаны на актуальном main snapshot `9f99481a3843862a17fd9cf640fee48b4ef901ba` (behind 0).

Ранее выявленные межветочные пересечения остаются обязательными для интеграции вручную: INDEX_METHODOLOGY.md (#8/#13), UnifiedRiskForecast.jsx (#9/#10), Forecasting.jsx (#10/#13), package.json и .github/workflows/ci.yml (#10/#11/#13). Перед интеграцией нужен общий CI с набором тестов всех направлений, а не последовательное принятие несовместимых файлов одной ветки.

### Обновлённый вердикт

Все шесть индивидуальных GitHub Actions runs зелёные на перечисленных SHA. Однако PR #11 содержит подтверждённый SQL NULL-semantics defect, поэтому его semantic QA gate не пройден. Нет общей интеграционной сборки, browser E2E, проверки responsive/accessibility, production Supabase validation или production deployment. Vercel build-rate-limit остаётся внешним ограничением и не засчитывается как успешный deployment.
