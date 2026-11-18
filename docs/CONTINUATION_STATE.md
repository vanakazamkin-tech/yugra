## Checkpoint — official comparison, mobile/settlement exports and Release 1.0 status consolidated (2026-11-18, UTC+05:00)

- **Статус:** IN_PROGRESS — desktop/mobile comparability acceptance завершена; оба exact-HEAD CI прогона последнего проверенного SHA успешны; Production и human owner approval не выполнялись.
- **Рабочая ветка / PR:** fix/risk-stable-provenance-gate-2026-11-18, PR #27 open / Draft / mergeable=true.
- **Последний проверенный code/docs SHA перед обновлением Release Plan:** 061840749d30ee9456f77b984ceed7ae3a061030.
- **GitHub Actions exact HEAD:** Push run 44293063022 и Pull Request run 44293069716 — success; в обоих build и data-migrations-integration завершились success, failed steps отсутствуют.
- **main:** 4cb1171faf0c4e4568bc16226178730f5d04a9f5; branch comparison на этом checkpoint — 55 commits ahead / 0 behind.
- **Последний готовый application Preview:** deployment dpl_3emHYQqMKoWXuoTbqf8mysufHguj, READY, URL https://yugra18-feh8kptgq-napishtu.vercel.app, exact app SHA e0e2da4adccccd82d3d4e9b8c96d471ab731dc15. Последующие commits до 0618407 были docs-only. Новые documentation-only deploys блокировались Hobby/free-tier deployment rate limit; не повторять вызовы ради получения другого URL.
- **Official comparison desktop:** 19 series, 36 periods, 371 rows. 0 wrong-period, 0 duplicate/empty territory, 0 unsafe/missing HTTP(S) source; page errors=0, failed requests=0. Геоуровень заголовка соответствует конфигурации каждой серии (municipality vs settlement), внутри ряда уровни не смешиваются. Exact code/unit/geography/period gates также покрыты CI tests.
- **Official municipal CSV:** yugra-official-municipal-comparison.csv — 1,208 bytes, UTF-8 BOM, header + 3 municipal rows; один показатель, 2026 Q1, unit тыс. руб., all rows have source ID and HTTPS source URL.
- **Official settlement CSV:** population_settlement для 2024 — 4,642 bytes, UTF-8 BOM; 16 городов; все строки имеют geography Населённый пункт, unit тыс. человек, один период и HTTPS source URL; municipal geography rows отсутствуют.
- **Official comparison mobile:** viewport 390×844, touch enabled; все 19 серий доступны, 29 first/last period samples проверены; selected period matched, all tables had rows, no page errors / failed requests, document/body width=390px. Table scroll area is internal (client 338px, content 760px); viewport-level overflow=false.
- **Map/passports:** все 22 SVG hit targets открывают корректный паспорт по точке внутри фактической заливки (22/22); synchronized map list desktop/mobile также 22/22. Все 22 паспорта содержат demo disclaimer; вместе показано 1,433 official rows; invalid URL/missing geography/year/unit/count mismatch=0.
- **Release Plan:** checklist comparison теперь [x]; описаны 19/36/371 sweep, mobile samples, municipal/settlement CSV; status section обновлён CI exact HEAD 0618407, rate-limit и последним application Preview.
- **Документный commit после проверенного CI:** 1b2b0aadad4042bff0a2836d9f49c516b1216b36 обновил только docs/RELEASE_1_0_PLAN_2026-11-20.md, чтобы точно описать последнее CI и Vercel rate limit. Exact-HEAD CI для этого нового SHA нужно проверить отдельно; не переносить на него автоматически run status от 0618407.
- **Старые PR:** #26 закрыт как superseded; #29 закрыт как duplicate docs PR. Полезные handoff/agent rules and release plan в активной PR #27; старый continuation log из PR #26 не объединялся поверх свежего.
- **Production:** production deployment и Supabase DDL/DML/migrations/imports не выполнялись.
- **Оставшиеся gates:** human owner/reviewer approval desktop/mobile ключевых сценариев и PDF; полистная проверка всех 144 PDF pages не выполнена (просмотрены representative pages 1/2/70/144); merge PR #27 после approval; Production release отдельно.
- **Следующее действие:** проверить exact-HEAD CI для 1b2b0aa и обновлённого PR; держать Draft до owner approval. Не запускать Production и не обходить Vercel deployment rate limit.

---

## Checkpoint — mobile comparison, settlement geography and exact-HEAD CI (2026-11-18, UTC+05:00)

- **Статус:** `IN_PROGRESS` — desktop official comparability sweep и mobile selection sweep пройдены; CSV муниципального и поселенческого уровней проверены; Production release не выполнялся.
- **Проверенный exact HEAD до текущего обновления документации:** `e0e2da4adccccd82d3d4e9b8c96d471ab731dc15`.
- **PR #27 CI exact HEAD:** Push run `44292194605` и Pull Request run `44292205069` — оба success. В обоих `build` и `data-migrations-integration` завершились success, failed steps отсутствуют.
- **Vercel Preview exact HEAD:** deployment `dpl_3emHYQqMKoWXuoTbqf8mysufHguj` — READY; URL https://yugra18-feh8kptgq-napishtu.vercel.app; Git SHA совпадает с `e0e2da4`. Это Preview, не Production. Деплои для более поздних docs-only коммитов упирались в rate limit; не обходить его повторными запусками.
- **Desktop official comparison:** 19 indicator series, 36 periods, 371 rendered observation rows; wrong-period rows=0, duplicate/empty names=0, unsafe/missing source URLs=0; browser page errors=0, failed requests=0. Таблица для каждой серии использует единый geography level.
- **Municipal CSV:** `yugra-official-municipal-comparison.csv` для `own_production_shipments_q1`, период 2026-Q1, unit `тыс. руб.`, municipality geography; 1,208 bytes, UTF-8 BOM, header + 3 rows, все строки с source ID и HTTPS source URL.
- **Settlement CSV:** `population_settlement`, период 2024, 16 городов; 4,642 bytes, UTF-8 BOM. Каждая строка имеет geography `Населённый пункт`, unit `тыс. человек`, один период и source URL. Нет смешивания с муниципальным уровнем.
- **Mobile official comparison:** 390×844, touch enabled; все 19 series открываются, 29 first/last period samples проверены; selected period совпадает с отображаемым; rows>0. Таблица прокручивается внутри своего контейнера (client 338px / content 760px); document/body width=390px; page overflow=false; page errors=0; failed requests=0.
- **Release Plan:** comparison checklist marked [x]; added desktop 19/36/371 sweep, municipal CSV, settlement CSV, and mobile 19/29-period sample acceptance. Не считать это статистической валидацией/полнотой coverage.
- **Production:** без изменений; production deployment, Supabase DDL/DML/migrations/imports не выполнялись.
- **Оставшиеся gates:** owner/reviewer approval ключевых desktop/mobile экранов и PDF; просмотр всех 144 PDF страниц не выполнен (только representative pages 1/2/70/144); approval/merge PR #27; Production release отдельно.
- **Следующее действие:** проверить exact-HEAD CI/Preview после текущего docs-only обновления, обновить PR description; оставить PR Draft до human owner approval.

---

## Checkpoint — mobile official comparison acceptance (2026-11-18, UTC+05:00)

- **Статус:** `IN_PROGRESS` — official comparison manual QA завершена на desktop и mobile; Release Plan дополнен, отдельные owner/Production gates остаются.
- **Application Preview:** browser QA выполнялась на коде приложения без последующих JS/JSX/CSS изменений, на Preview https://yugra18-39jtpvntu-napishtu.vercel.app (app SHA `19d508fcbc8b920c544fced1974df5a84d2ca67c`; все последующие изменения — docs-only).
- **Desktop official comparison:** 19 series, 36 period options, 371 rendered observation rows. По всем срезам wrong period=0, duplicate territory=0, empty name=0, invalid/missing HTTP(S) source=0, page errors=0, failed requests=0.
- **CSV official comparison:** файл `yugra-official-municipal-comparison.csv` скачан через UI для series `own_production_shipments_q1`, period `2026|2026-Q1|тыс. руб.`; 1,208 bytes, UTF-8 BOM, 4 lines (header + 3 rows). Все три строки имеют same period, unit, municipal geography level, source IDs and HTTPS Rosstat source URLs.
- **Mobile official comparison:** viewport 390×844, `isMobile=true`, touch enabled. Все 19 series выбирались успешно; первый и последний period каждой серии проверены (29 samples). Selected period matched displayed table period in 29/29; data rows >0 in each sample; no JS errors or failed requests. Table overflow is contained inside its own horizontal scroll area (client width 338px, content width 760px), document/body width remains 390px, page-level horizontal overflow=false.
- **Release Plan:** official comparison checklist now [x]; recorded exhaustive 19/36/371 desktop sweep, real CSV download and mobile 29-sample sweep. README links Release Plan and checkpoint ledger.
- **Production:** без изменений; no Production deployment or Supabase DDL/DML/migrations/imports.
- **Оставшиеся gates:** owner/reviewer approval of screenshots and PDF pagination (only representative PDF pages 1/2/70/144 visually sampled; all 144 pages not manually reviewed); PR #27 review/merge; Production release is separate approval.
- **Следующее действие:** проверить exact-head CI/Preview for updated plan+checkpoint commits, refresh PR description, keep PR Draft until owner approval.

---

## Checkpoint — exhaustive official-comparison UI and CSV acceptance (2026-11-18, UTC+05:00)

- **Статус:** `IN_PROGRESS` — закрыта ручная проверка comparability gate для официального сравнителя; Production/owner release approval остаются отдельными этапами.
- **Preview/application code:** функциональный sweep выполнен в Chromium на Preview build с application code SHA `19d508fcbc8b920c544fced1974df5a84d2ca67c`; с последнего code commit в PR изменялась только документация. Preview URL: https://yugra18-39jtpvntu-napishtu.vercel.app.
- **Официальный сравнитель:** 19 доступных indicator series, 36 периодов, 371 отображённая observation row. Каждая комбинация series-period проверена после выбора в UI.
- **Comparability assertions:** 0 строк с неверным периодом; 0 повторов территории внутри среза; 0 пустых названий; 0 небезопасных или отсутствующих HTTP(S) source URL; 0 browser page errors; 0 failed requests.
- **Geography:** в срезах отображается корректный заголовок географии для настройки серии: «Муниципальное образование» либо «Город / населённый пункт». Муниципальные и поселенческие значения не смешиваются внутри выбранного ряда. Низкое покрытие видно по фактическому числу строк; пропуски не подменяются нулями.
- **Unit/code/period contract:** доступные series options, period options и итоговые rows соответствуют точному `indicator_code`, configured `unit`, configured `geographic_level` и составному ключу `year|period|unit`. Тот же fail-closed контракт покрыт regression gates CI PR #27.
- **CSV export:** скачан `yugra-official-municipal-comparison.csv` для «Отгрузка собственной продукции · I квартал», периода `2026|2026-Q1|тыс. руб.`. 1,208 bytes, UTF-8 BOM, 4 строки (header + 3 муниципалитета); все data rows имеют один период «2026 · I квартал», одну единицу «тыс. руб.», один географический уровень «Муниципальное образование», source ID и HTTPS primary-source URL.
- **Release Plan:** в `docs/RELEASE_1_0_PLAN_2026-11-20.md` comparability checklist отмечен [x], добавлены результаты sweep 19/36/371 и реального CSV export. Отдельный concept/demo comparison рейтингов проверялся ранее; этот sweep относится к отдельному official data comparison panel.
- **Production:** без изменений; production deployment, Supabase DDL/DML/migrations/imports не выполнялись.
- **Оставшиеся gates:** человеческое owner/reviewer approval ключевых экранов и выбранных PDF-страниц; полный PDF на 144 страницы не просматривался постранично; merge PR #27 и отдельное разрешение Production release.
- **Следующее действие:** сохранить этот checkpoint, получить exact-HEAD CI/Preview для обновлённого плана и журнала, затем обновить PR #27 описание. Не переводить PR в Ready/merge и не выпускать Production без owner approval.

---

## Checkpoint — all 22 passport provenance checks passed (2026-11-18, UTC+05:00)

- **Статус:** `IN_PROGRESS` — карта и все 22 паспорта прошли расширенную browser QA; Release Plan обновлён. Сопоставление, human owner review и Production остаются отдельными gates.
- **Preview:** проверен build PR #27 на HEAD `19d508fcbc8b920c544fced1974df5a84d2ca67c`; URL https://yugra18-39jtpvntu-napishtu.vercel.app.
- **Map hit-testing:** 22 SVG targets имеют уникальные aria-label. Для каждого найден экранный point внутри реальной заливки path / clickable city target и выполнен реальный pointer click. Итог: 22/22 заголовков паспорта точно совпадают с aria-label; noVisibleHit=0; mismatch=0; browser page errors=0.
- **Map list / desktop:** 22/22 пункта `button.map-list-item` открывают паспорт с тем же названием; mismatch=0.
- **Map list / mobile:** viewport 390×844, mobile/touch context; 22/22 пункта открывают корректный паспорт; mismatch=0; document/body width=390px; horizontal page overflow отсутствует; page errors=0.
- **Passport provenance QA:** каждый из 22 паспортов открыт через synced list; heading match=22/22; demo disclaimer=22/22; official rows total=1,433; displayed counter matches rendered rows for every territory; invalid HTTP(S) URL=0; missing geography=0; missing year=0; missing unit=0; count mismatches=0; empty official state=0; page errors=0. По текущему срезу хотя бы одна verified запись присутствует в каждом из 22 паспортов. Это означает наличие записей, но не сбалансированное покрытие каждого показателя.
- **False-positive clarification:** предыдущий explorer test использовал forced-click по центру bounding box SVG path. У сложного/вогнутого полигона центр bbox может не лежать в самом path или перекрываться соседней фигурой, поэтому такой тест давал ложные mismatches. Реальная проверка точки внутри fill и обычный pointer click подтвердили корректность всех 22 mapping. Никакой map code/design fix не потребовался.
- **Release Plan:** в `docs/RELEASE_1_0_PLAN_2026-11-20.md` map/passport checklist теперь [x]; manual comparability gate остаётся [ ] до отдельной проверки разных кодов/периодов/geography/unit. Human owner visual approval и Production deployment остаются отдельными gates.
- **Production:** не изменялась; no production deployment, DDL/DML, migrations or imports.
- **Следующее действие:** проверить actual code/plan checkpoint commit на exact-HEAD CI и Preview; затем продолжить целевую ручную проверку comparison comparability. Не объявлять Release 1.0 полностью accepted до owner approval.

---

## Checkpoint — проверка 22 паспортов через map hit-testing и mobile list (2026-11-18, UTC+05:00)

- **Статус:** `IN_PROGRESS` — углублённая map/passport functional QA завершена; ошибки геометрии или ID mapping не подтверждены.
- **Preview:** проверен тот же application build, опубликованный на exact doc HEAD `19d508fcbc8b920c544fced1974df5a84d2ca67c`; Preview READY: https://yugra18-39jtpvntu-napishtu.vercel.app.
- **Контракт ID:** `data/municipalities-detailed.json` содержит 22 уникальных municipality IDs; `src/ugraMapGeo.js` содержит 22 уникальных district/city IDs; `scripts/check-map-coverage.mjs` сравнивает обе стороны и ранее прошёл как exact-HEAD CI gate.
- **Карта / desktop:** 22 SVG targets с уникальными aria-label проверены. Для каждого path найден экранный point, который одновременно (a) лежит внутри заполненной геометрии path по `isPointInFill`, (b) является реальным верхним элементом под курсором (`elementFromPoint`). Фактический click по этой точке открыл паспорт с тем же названием, что и aria-label: 22/22 совпадений, noVisibleHit=0, mismatches=0, page errors=0.
- **Важно о методике:** предыдущий exploratory loop использовал центры bounding boxes путём force-click. У вогнутых/непрямоугольных SVG-полигонов bounding-box center иногда лежит вне самого path или перекрыт соседним path; это привело к ложным mismatches тестового метода, а не доказало неверное сопоставление ID. Последующая проверка реальных точек внутри видимого fill подтвердила корректный click-to-passport mapping для всех 22 targets.
- **Список карты / desktop:** все 22 `button.map-list-item` открывают паспорт с точным совпадением выбранного названия: 22/22, mismatches=0, page errors=0.
- **Список карты / mobile:** viewport 390×844, `isMobile=true`, `hasTouch=true`; все 22 пункта по очереди успешно открыли корректный паспорт: 22/22, mismatches=0, page errors=0. Document/body width=390 px; горизонтального overflow нет. Горизонтальная прокрутка верхнего меню остаётся внутри nav-container (clientWidth=338, scrollWidth=863).
- **Вывод:** code fix не нужен; существующие UI handlers используют прямой `byId[id]` lookup, а map IDs сопоставлены с 22 данными. Дизайн, карта и геометрия не менялись.
- **Следующее действие:** обновить Release Plan/PR description с точными результатами desktop/mobile 22/22; оставить owner approval и Production release отдельными gates.

---

## Checkpoint — exact HEAD CI, Preview and PR consolidation verified (2026-11-18, UTC+05:00)

- **Статус:** `IN_PROGRESS` — все автоматические gates на текущем документированном HEAD прошли; Release 1.0 остаётся в review стадии, Production не запускался.
- **Активная ветка / PR:** `fix/risk-stable-provenance-gate-2026-11-18`, PR #27 open / Draft / mergeable=true.
- **Exact HEAD перед этим checkpoint:** `6cbd5e5efd3432269e3c7d5271337d98a49e6f6c`.
- **main:** `4cb1171faf0c4e4568bc16226178730f5d04a9f5`; branch comparison — 44 commits ahead / 0 behind.
- **GitHub Actions exact HEAD:** Push run `44290143179` и Pull Request run `44290152775` — оба success; в каждом `build` и `data-migrations-integration` завершились success, failed steps отсутствуют.
- **Vercel Preview exact HEAD:** deployment `dpl_BG3jiPLAbXvFUUGEPJC6Do1RjT1C` — READY; URL https://yugra18-2g9a5rv1k-napishtu.vercel.app; Git SHA совпадает с exact HEAD. Главная страница проверена HTTP 200, title «ЮГРА — Аналитика муниципалитетов», deployment ID в странице совпадает. Это Preview, не Production.
- **PR consolidation:** #27 теперь включает hardened risk/comparison/report/backtest/forecast behavior, актуальный `docs/RELEASE_1_0_PLAN_2026-11-20.md`, chronology в `docs/CONTINUATION_STATE.md`, README links, durable handoff/Release 1.0 rules в `AGENTS.md`, Copilot и ChatGPT Project instructions.
- **PR #26:** CLOSED / not merged / superseded. Полезные инструкции/checkpoint rules/Release Plan перенесены и актуализированы в PR #27; устаревший continuation log с предыдущей базой намеренно не объединялся.
- **PR #29:** CLOSED / not merged / superseded duplicate documentation PR; Release Plan находится в активной PR #27.
- **Agent prompt length:** `docs/CHATGPT_PROJECT_INSTRUCTIONS.md` — 6 569 символов, меньше ограничения 8 000.
- **Browser acceptance:** application code на SHA `cab70d7c13718b0cfc5f5034dba3a808335f62c1` (предок current HEAD, последующие изменения документальные) прошёл functional Chromium scenarios для 9 основных разделов, 22 МО, паспорта, сравнения (лимит 4), риск-монитора, прогнозов 1/2/3 года, CSV/PDF и Supabase fallback. На мобильном viewport 390×844 все 9 разделов проверены; viewport overflow отсутствует.
- **Visual spot-check:** проверены contact sheets desktop/mobile и PDF pages 1, 2, 70, 144. На выбранных образцах не обнаружены явные clipping/overlap defects. Полный визуальный просмотр всех 144 страниц и human owner approval ещё не выполнены.
- **Оставшиеся gates:** (1) владелец/ревьюер просматривает ключевые desktop/mobile экраны и PDF-страницы; (2) PR #27 получает owner/reviewer approval; (3) merge только после approval; (4) Production deployment — отдельный разрешённый этап на проверенном SHA, затем post-deploy smoke/readback.
- **Production:** Production deployment не запускался; Supabase production DDL/DML, миграции, импорты и массовые записи не выполнялись.
- **Следующее действие:** обновить PR #27 description до exact HEAD и сохранить следующий checkpoint после него. Держать PR Draft до human owner review/approval; не выпускать Production и не менять production Supabase.

---

## Checkpoint — release documentation and agent handoff consolidated (2026-11-18, UTC+05:00)

- **Статус:** `IN_PROGRESS` — план Release 1.0, журнал передачи и инструкции агентов сведены в одну актуальную ветку PR #27. Это документационный этап; код приложения в этих изменениях не менялся.
- **Ветка / PR:** `fix/risk-stable-provenance-gate-2026-11-18`, PR #27 (open / Draft).
- **HEAD до checkpoint:** `3beccf9ba3f2eeeff965c89f7dab7ea257bbc2d4`; compare с `main` `4cb1171faf0c4e4568bc16226178730f5d04a9f5`: 42 commits ahead / 0 behind.
- **Сохранённые docs commits:** updated `AGENTS.md` (`1b3d4bb)); Copilot instructions (`6049139`); ChatGPT Project instructions (`2a08a42`, 6 569 символов, ниже 8 000); README checkpoint link (`3beccf9`). Release Plan и визуальный spot-check сохранены отдельными предыдущими коммитами в той же ветке.
- **Интеграция старого PR #26:** полезные изменения из шести файлов PR #26 перенесены поверх актуальных файлов main: обязательные checkpoints/handoff, Release 1.0 scope rules, обновлённая инструкция Copilot/ChatGPT, README links, текущий continuation ledger и Release Plan. Сохранён актуальный раздел `DEVELOPMENT FIRST` из main; устаревшая версия AGENTS из PR #26 не копировалась целиком. PR #26 на момент checkpoint ещё открыт / Draft и будет закрыт как superseded после проверки exact-HEAD CI.
- **PR #29:** закрыт как duplicate documentation PR; Release Plan перенесён в активную ветку PR #27.
- **Последняя browser QA:** application code проверен на SHA `cab70d7c13718b0cfc5f5034dba3a808335f62c1`; последующие изменения только documentation. Desktop: все 9 разделов, карта/22 МО, passport, comparison, risk, forecasts, CSV/PDF, Supabase fallback. Mobile 390×844: все 9 разделов проверены отдельными screenshots; каждый даёт doc/body width 390px и main width 370px, page errors=0.
- **Визуальный spot-check:** просмотрены contact sheets desktop и mobile; PDF pages 1, 2, 70 и 144. На выбранных образцах не найдено очевидных clipping/overlap/layout-breaking defects. Не просмотрены все 144 PDF-страницы и не получено human owner approval; эти gates остаются открыты.
- **CI/Vercel нового HEAD:** Push workflow `44289929803` был queued на момент фиксации; Vercel deployment `dpl_47xcP6rhXUULee7bQvKjtcBkEoYt` также QUEUED. Не переносить статус success с предыдущего SHA.
- **Production:** без изменений; production deployment не запускался, Supabase DDL/DML, миграции и массовые записи не выполнялись.
- **Следующее действие:** проверить exact-HEAD CI и Preview для документационного checkpoint; при success закрыть PR #26 как superseded, оставить PR #27 Draft до визуального approval владельца и только затем обсуждать merge/Production release.

---

## Checkpoint — visual spot-check desktop/mobile and representative PDF pages (2026-11-18, UTC+05:00)

- **Статус:** `IN_PROGRESS` — дополнительный выборочный визуальный gate пройден на контрольных изображениях; полный пользовательский/владельческий review всё ещё нужен.
- **Preview:** проверен действующий deployment ветки `fix/risk-stable-provenance-gate-2026-11-18`; текущий code-preview exact HEAD до документационных обновлений — `bf2d27802bc0a7d82ca34660efd93c8374a74b7a`, READY URL https://yugra18-hbwal7826-napishtu.vercel.app.
- **Mobile screenshots:** Playwright открыл каждый из 9 основных разделов на viewport 390×844 и сохранил по одному screenshot. Для каждого раздела `documentElement.scrollWidth=390`, `body.scrollWidth=390`, `main width=370px`; горизонтальная прокрутка верхнего меню (scrollWidth=863, clientWidth=338) остаётся внутри nav-контейнера. Browser page errors = 0.
- **Visual spot-check UI:** выбранные desktop и mobile screenshots просмотрены как contact sheets; на контрольных кадрах не обнаружено очевидного перекрытия блоков, обрезанных заголовков или viewport-level overflow. Контактный лист уменьшен для обзора; это не pixel-perfect review каждого компонента.
- **PDF spot-check:** визуально просмотрены representative landscape pages 1, 2, 70 и 144 из сохранённого Chromium PDF. Первая страница содержит сводный блок/график и методологическую вводную; page 2 содержит табличное приложение; pages 70 и 144 — табличные страницы с сохранёнными колонками. На этих четырёх образцах явных обрезаний/перекрытий не обнаружено. PDF остаётся большим (144 страницы); все 144 страницы вручную не просмотрены, поэтому не заявлять полную визуальную проверку PDF.
- **Оставшиеся owner gates:** человеческая проверка ключевых экранов на реальном desktop/mobile устройстве, полистный/выборочный просмотр PDF владельцем, reviewer/owner approval и отдельное разрешение Production release.
- **Production:** без изменений; production deployment, Supabase DDL/DML, миграции и записи не выполнялись.
- **Следующее действие:** обновить текущий Release Plan и PR description с ограничениями этой выборочной визуальной проверки; сохранить PR #27 Draft до owner approval.

---

## Checkpoint — exact latest HEAD, browser smoke and consolidated Release 1.0 plan (2026-11-18, UTC+05:00)

- **Verified branch state before this checkpoint:** PR #27, `fix/risk-stable-provenance-gate-2026-11-18`, HEAD `bf2d27802bc0a7d82ca34660efd93c8374a74b7a`; 35 commits ahead / 0 behind `main` `4cb1171faf0c4e4568bc16226178730f5d04a9f5`; PR open, Draft, mergeable.
- **Exact-head CI:** Push run `44288279848` and Pull Request run `44288289486` — both success; each job `build` and `data-migrations-integration` completed success with no failed steps.
- **Exact-head Preview:** deployment `dpl_BNKmkr81CNj25t2iGqq8cDXi4Emf` — READY; `https://yugra18-hbwal7826-napishtu.vercel.app/`; Git SHA matches `bf2d278...`. Root HTML and app JS / React vendor / Supabase vendor / CSS assets all returned HTTP 200.
- **Repeated current-Preview browser smoke:** Chromium opened all 9 sections (Home, Map, Rating, Risks, Forecast, Comparison, Reports, Data, Concept); each had non-empty main content. Exact current Preview smoke: page errors=0, console errors=0, failed requests=0. Mobile viewport 390×844: document/body width 390 px, main width 370 px, no viewport-level horizontal overflow.
- **Full functional acceptance:** detailed interaction, map/passport, comparison, risk, 1/2/3-year scenario, CSV/PDF, responsive and simulated Supabase 200[] / 503 results are preserved in `docs/RELEASE_1_0_PLAN_2026-11-20.md` §4.1 and the PR #27 description. The application code used by full Playwright acceptance was SHA `cab70d7...`; all commits from that app-test SHA through `bf2d278` changed documentation/README only, not application source.
- **Release plan:** `docs/RELEASE_1_0_PLAN_2026-11-20.md` is now in active PR #27; README links to it. PR #29 is closed as a duplicate after plan consolidation. PR #26 remains open / Draft and diverged from old base; do not merge its stale checkpoint over this branch.
- **Review state:** no PR #27 reviews or unresolved review threads were present at the last review read. Keep PR #27 Draft until a human visually reviews key desktop/mobile screens and selected PDF pages, checks all 22 passports and real comparison pairs, and approves.
- **Outstanding gates:** visual layout/readability (especially 144-page official report), municipality-by-municipality passport correctness, manual comparability review, owner/reviewer approval and merge. A successful HTTP/CI/automated browser run is not equivalent to these human approvals.
- **Production boundary:** no Production deployment, Supabase DDL/DML, migrations, imports or mass writes. No visual redesign. Forecast remains conceptual and not statistically validated; official/demo data remain distinct.
- **Next action:** complete human acceptance/review, then decide whether to merge PR #27. Production deployment requires a separate explicit release decision, exact-SHA build/deploy verification and post-deploy smoke test. The checkpoint commit itself is documentation-only; verify its own Actions and Preview before any merge.

---

## Checkpoint — Release plan consolidated into active code PR (2026-11-18, UTC+05:00)

- **Current workstream:** Release 1.0 acceptance on `fix/risk-stable-provenance-gate-2026-11-18`, PR #27 (open / Draft).
- **HEAD before this checkpoint:** `6b0c365bce9dcc6936b7d7d188604c24f2588b31` — Release 1.0 plan has now been copied from the stale PR #26 branch into the active PR #27 branch and updated with the observed browser QA evidence.
- **Consolidated plan:** `docs/RELEASE_1_0_PLAN_2026-11-20.md` is present on the active code branch; the plan keeps remaining passport-by-passport review, manual data-comparability review, human visual review of PDF/screenshots and Production deployment unchecked. Verified manual/functional items are marked with exact evidence. PR #26 remains open / Draft and diverged from the older base; do not merge its old continuation state over this newer branch. Its documentation is now carried forward in PR #27.
- **Previous browser acceptance tested:** exact Preview HEAD `cab70d7c13718b0cfc5f5034dba3a808335f62c1`, deployment `dpl_DEAsrWcwZFzoq19TkUHvSEkUKCm9`. Results are recorded in the immediately preceding checkpoint and in the new Release 1.0 plan.
- **Acceptance result:** all 9 main sections opened on desktop and at 390×844; no blank pages or uncaught runtime exceptions. Map exposes 22 targets and a selected municipal passport; comparison supports 2/4 selections; risk monitor reports `Недостаточно данных` for all 22 municipalities at zero coverage (0/6), not green; 1/2/3-year scenario controls work; forecast CSV, demo/official report CSV and Chromium PDF were downloaded and inspected as described in plan.
- **Resilience:** simulated REST `200 []` (9 requests) and `503` (33 requests) left app navigable with no uncaught page errors. Empty data uses built-in forecast templates; outage state explicitly warns that verified observations were not received. Simulation intercepted browser requests only; no Supabase writes/DDL/migrations.
- **Mobile:** all nine sections opened at 390×844; document/body remain 390 px wide, main 370 px, no viewport-level horizontal overflow. Table scroll regions and horizontally scrollable navigation remain intentionally contained.
- **Release boundary:** exact CI before documentation consolidation passed both `build` and `data-migrations-integration` on runs `44284698035` and `44284710477`. The plan commit `6b0c365...` has triggered a fresh GitHub Actions run `44288028024` (queued at checkpoint time) and Vercel deployment `dpl_9mwrzbsCmFiPFU6JCZXhGr7SeNrw` (BUILDING). Do not transfer earlier success to the new HEAD; verify new exact-SHA jobs and Preview before accepting this documentation update.
- **Production:** no production deployment, Supabase writes, schema changes or migrations. Current status remains `IN_PROGRESS`; visual/owner acceptance and release authorization are outstanding.
- **Next action:** verify CI and Vercel on the new checkpoint commit; then update PR #27 description with acceptance evidence and exact new SHA. Keep Draft until human visual review/owner approval; only then consider merge and separately authorized Production deployment.

---

## Checkpoint — interactive Preview acceptance, Release 1.0 (2026-11-18, UTC+05:00)

- **Status:** `IN_PROGRESS` — desktop/mobile functional browser acceptance and export/fail-safe checks completed on Preview exact HEAD. Human visual review of screenshots/PDF pages and owner approval remain outstanding; this checkpoint is not a Production release.
- **Repository / branch / PR:** `vanakazamkin-tech/yugra`, `fix/risk-stable-provenance-gate-2026-11-18`, PR #27 (open / Draft).
- **HEAD tested:** `cab70d7c13718b0cfc5f5034dba3a808335f62c1`. The browser QA sandbox checked out this exact SHA; Git working tree was clean.
- **main:** `4cb1171faf0c4e4568bc16226178730f5d04a9f5`; branch comparison at test time: 29 commits ahead / 0 behind.
- **CI exact HEAD:** Push run [44284698035](https://github.com/vanakazamkin-tech/yugra/actions/runs/44284698035) and Pull Request run [44284710477](https://github.com/vanakazamkin-tech/yugra/actions/runs/44284710477) — both `success`; each included successful `build` and `data-migrations-integration` jobs, with no failed steps.
- **Vercel Preview exact HEAD:** deployment `dpl_DEAsrWcwZFzoq19TkUHvSEkUKCm9` — `READY`; URL https://yugra18-gm0iq3er1-napishtu.vercel.app. Preview, not Production.
- **Desktop browser smoke (Chromium 1440×960):** app title/ru locale correct; all 9 main nav sections open and have non-empty content; normal online run reported zero page errors, zero browser console errors and zero failed requests.
- **Map and passports:** map has 22 accessible municipality targets. Selecting Berezovsky district opens a passport modal with explicit demo-vs-official distinction, verification status, municipal geography, periods, units and source links; `Закрыть` and `Создать отчёт по территории` controls are present.
- **Comparison:** 22 municipality selectors; after choosing two municipalities the UI shows `Выбрано 2 из 4` and renders the comparison table (6 body rows including its current table sections). No runtime/request errors in the normal run.
- **Risk module:** municipality selector has 23 choices (All + 22); choosing Surgut district updates the selected territory; the `Сценарный прогноз` sub-section is reachable. No runtime/request errors in normal run.
- **Forecasting:** three scenario variants (stress/base/optimistic), 23 municipality choices and 1/2/3-year horizon buttons are present and responsive; each horizon was clicked and recalculated tables (46/40/31 combined table rows in the rendered scenario result). Sliders and scenario variant selection update. Forecast CSV download `yugra-conceptual-forecast-3y.csv`: 5,913 bytes, UTF-8 BOM, 47 lines; header explicitly says conceptual scenario calculation, not an official forecast, and contains assumptions/method-version caveats.
- **Report CSV:** with official-observation layer off, `yugra-analytical-report.csv` downloaded (8,060 bytes, UTF-8 BOM, 23 lines: header + 22 demo municipality rows). With the official layer enabled, the same export was 1,341,152 bytes / 1,456 lines: 22 demo rows + 1,433 rows under the distinct `Проверенные официальные наблюдения` label. The export contains source ID/URL, geography, periods, units and verification fields; 1,451 HTTP(S) strings were present and no `javascript:`, `data:` or `file://` schemes were found.
- **Print/PDF:** report print button invoked `window.print()` exactly once. Chromium printed the report to a real PDF (1,908,705 bytes); `pdfinfo` confirmed 144 A4 landscape pages; `pdftotext` extracted 12,353 text lines. First page contains the caveat that conceptual scores are not official statistics; extracted PDF includes a distinct `Проверенные официальные наблюдения (1433)` section. This is programmatic text/metadata inspection, not visual page-by-page inspection.
- **Narrow viewport (390×844):** all 9 main sections were opened. For every section document/body width stayed at 390 px and main width at 370 px; no viewport-level horizontal overflow. Data tables remain in horizontal scroll containers; top navigation is horizontally scrollable. Zero page errors in this run.
- **Supabase failure simulation (browser interception only; no production DB writes):**
  - Empty responses: 9 REST requests returned simulated HTTP 200 `[]`; Data/Forecast/Risks remained populated with fallback/empty-state content; zero page errors and zero console errors. Forecast changes to `Встроенные шаблоны`.
  - Unavailable responses: 33 REST requests returned simulated HTTP 503; app remained navigable, no blank screens and no uncaught page errors. The Data panel explicitly says verified observations were not received and instructs checking Supabase/import status; Forecast uses `Встроенные шаблоны`. Twelve browser console entries were expected failed-resource messages for the deliberately injected 503 responses. These tests did not write to or modify Supabase.
- **PR/review:** PR #27 still open / Draft; last review read showed 0 reviews and 0 unresolved review threads. Keep Draft until a human owner visually reviews desktop/mobile screenshots and PDF pagination/content, then review/approve before merge.
- **PR #26 / release plan:** `docs/RELEASE_1_0_PLAN_2026-11-20.md` and its continuation checkpoint remain on the separate PR #26 branch `chore/automatic-session-checkpoints-2026-11-18`; that PR is stale/diverged against old base SHA `8f291774...` (21 ahead / 1 behind, `mergeable=false`). Do not blindly merge it or overwrite the newer PR #27 checkpoint. Reconcile the release-plan document explicitly before closing the documentation PR.
- **Production boundaries:** no Production deployment, production Supabase DDL/DML, migrations or imports were run. Design/ornaments were not changed. Demo figures remain labelled non-official; forecast remains explicitly conceptual/not trained or validated.
- **Remaining release actions:** (1) human visual review of desktop/mobile screenshots and PDF page layout; (2) reconcile/copy the Release 1.0 plan from PR #26 without losing the later checkpoint; (3) owner/reviewer approval and merge; (4) Production deployment only after explicit release approval and verified exact SHA, followed by post-deploy smoke/readback. Until those gates complete, status stays `IN_PROGRESS`, not `Release 1.0 released`.
- **QA environment:** temporary Vercel sandbox `yugra18-browser-smoke-20261118` / session `sbx_ezXq4T33v3GeYnLUCJOxKr8HRQeM`; checked out tested SHA `cab70d7...`. Sandbox tests are disposable QA only.

---

## Checkpoint — интерактивная приёмка Preview / Release 1.0 (2026-11-18, 15:40 UTC+05:00)

- **Статус:** `MANUAL_ACCEPTANCE_PASSED` для проверенного Preview; Release 1.0 ещё не опубликован в Production.
- **Рабочая ветка / PR:** `fix/risk-stable-provenance-gate-2026-11-18`, PR #27 (до обновления описания — Draft).
- **Исходный проверенный HEAD:** `cab70d7c13718b0cfc5f5034dba3a808335f62c1`; compare с `main` `4cb1171faf0c4e4568bc16226178730f5d04a9f5`: 29 commits ahead / 0 behind.
- **GitHub Actions exact HEAD:** Push run `44284698035` и Pull Request run `44284710477` — оба `success`; в обоих `build` и `data-migrations-integration` завершились успешно, failed steps отсутствуют.
- **Vercel Preview exact HEAD:** deployment `dpl_DEAsrWcwZFzoq19TkUHvSEkUKCm9` — `READY`; SHA совпадает с `cab70d7`. URL: https://yugra18-gm0iq3er1-napishtu.vercel.app. Это Preview, не Production.
- **Browser environment:** Playwright + Chromium, checkout exact SHA `cab70d7`; online Preview tested at desktop 1440×960 and narrow viewport 390×844.
- **Main navigation:** все 9 разделов открываются; в online-сценарии нет `pageerror`, console errors и request failures. На 390px нет горизонтального переполнения документа; навигационное меню прокручивается внутри своего контейнера.
- **Map/passports:** 22 географических target; паспорт территории открывается, корректно маркирует демонстрационные поля и отдельный официальный слой. На проверенном паспорте Берёзовского района отображаются 50 подтверждённых наблюдений с уровнем географии, периодом, единицей и ссылками на источники. Диалог закрывается клавишей Escape.
- **Rating:** отображаются строки для 22 муниципалитетов.
- **Comparison:** 22 доступные территории; начальная выборка — 3. Можно выбрать 4-ю, 5-я сверх лимита не добавляется. CSV `yugra-municipality-comparison.csv`: 931 байт, UTF-8 BOM, header + 3 territory rows.
- **Risk monitor:** переключение внутренних экранов `Панель модели`, `Разбор муниципалитета`, `Сценарный прогноз`, `Профиль рисков`, `Показатели и данные` меняет активное состояние и содержимое. Экспорт `yugra-risk-overview.csv`: 2 037 байт, UTF-8 BOM, 22 municipal rows + header.
- **Forecast:** доступны сценарии `Стрессовый`, `Базовый`, `Оптимистичный` и горизонты 1 / 2 / 3 года; при переключении горизонт меняет таблицы результатов. CSV `yugra-conceptual-forecast-3y.csv`: 6 097 байт, 47 строк, UTF-8 BOM; экспорт явно маркируется как концептуальный сценарный расчёт, не официальный прогноз, сохраняет сценарий, горизонт, допущения и версию методики.
- **Report CSV:** в default-состоянии официальный toggle выключен; после включения экспорт содержит ровно 22 демонстрационные строки и 1 433 строки `Проверенные официальные наблюдения` (1 456 строк с заголовком). Все 1 433 официальные строки имеют заполненный source ID и/или source URL; столбцы сохраняют географию, показатель, значение, единицу, период и статус проверки. UTF-8 BOM присутствует.
- **PDF:** кнопка конструктора вызывает `window.print()`; через Chromium сохранён и повторно открыт PDF `report-preview.pdf` размером 1 908 739 байт, 144 страницы. `pdfinfo` и `pdftotext` успешно прочитали документ; первая страница содержит методологическую оговорку о demo-показателях, поздняя страница содержит повторённую шапку официальной таблицы (территория/уровень, показатель, значение, период, примечание/источник). Все официальные строки включены, поэтому документ закономерно большой.
- **Supabase outage fallback:** запросы к `*.supabase.co` искусственно блокировались. Приложение не вызвало unhandled `pageerror`; карта и рейтинг сохранили все 22 муниципалитета. 22 муниципалитета риск-монитора перешли в `Недостаточно данных` с покрытием `0/6`, а не в зелёный статус. Ожидаемые сетевые/console ошибки были результатом намеренного abort тестовых запросов. Сравнение и риск-экспорт продолжили формироваться.
- **CSV safety/data separation:** отчётный CSV содержит два отдельных блока; потенциально формульно опасные текстовые поля проходят общий `csvEscape`. В проверенном файле не обнаружено текстовых formula-injection значений; отрицательная числовая ячейка не классифицируется как формула.
- **PR #26:** отдельный Release Plan `docs/RELEASE_1_0_PLAN_2026-11-20.md` пока остаётся в PR #26; его ветка по последнему compare 21 ahead / 1 behind и diverged. При интеграции сохранить новый checkpoint из PR #27 и согласовать дублирующийся `docs/CONTINUATION_STATE.md`.
- **Production:** production deployment не запускался. Supabase production не менялась; DDL/DML/миграции и массовые записи отсутствуют.
- **Вывод:** автоматические CI gates и ручные Preview acceptance gates текущего code HEAD пройдены. Это подтверждает проверенный демонстрационный интерфейс, а не промышленную готовность, официальность демонстрационных показателей или статистическую валидацию прогноза.
- **Следующее конкретное действие:** перевести PR #27 из Draft в Ready for review и подготовить его к интеграции после повторной проверки exact-HEAD CI. После интеграции согласовать/перенести Release 1.0 plan и checkpoint из PR #26, не перезаписывая историю. Production release остаётся отдельным этапом.

---

## Checkpoint — exact-HEAD CI and Vercel Preview availability (2026-11-18, UTC+05:00)

- **Статус:** `IN_PROGRESS` — автоматические проверки последнего code HEAD успешны; Preview доступен по точному SHA. Интерактивная ручная приёмка ещё не завершена.
- **main:** `4cb1171faf0c4e4568bc16226178730f5d04a9f5`.
- **Рабочая ветка / PR:** `fix/risk-stable-provenance-gate-2026-11-18`, PR #27 (open / Draft).
- **Exact HEAD:** `521e8ffc99a274bd4bf5e5d154a4c59da588b91b`; compare с main: 28 commits ahead / 0 behind. PR mergeable=true; reviews=0, unresolved review threads=0.
- **GitHub Actions exact HEAD:** run `44284184481` — `success`. Jobs `build` и `data-migrations-integration` завершились success; failed steps отсутствуют. Build подтвердил forecast unit tests, provenance/data/risk/comparison/report/passport/registry/map/error-boundary gates и production bundle. Integration job подтвердил disposable-schema migration sequence, повторное применение/idempotency, security grants, uniqueness, controlled staging import и read-only audit.
- **Vercel exact HEAD:** deployment `dpl_G2B5vPDRugvoEE74uG9yLZwawgWZ` — `READY`; Git ref `fix/risk-stable-provenance-gate-2026-11-18`, SHA совпадает с exact HEAD. Preview URL: https://yugra18-f8vodr7gq-napishtu.vercel.app. Это Preview, не Production.
- **Доступность Preview:** Vercel fetch вернул HTTP 200 для главной страницы и для главного JS bundle, CSS, React vendor и Supabase vendor assets. HTML содержит русскую locale, заголовок «ЮГРА — Аналитика муниципалитетов» и метаданные платформы.
- **Ограничение ручной проверки:** доступный здесь Vercel fetch подтверждает HTTP-ответы и загрузку статических ресурсов, но не исполняет клиентское приложение и не предоставляет интерактивный браузер. Попытка прямого сетевого доступа из контейнера/просмотрщика не прошла из-за DNS. Поэтому переходы по экранам, карту, сравнение, прогнозы 1/2/3 года, реальное сохранение/открытие PDF и CSV, desktop/mobile layout и browser console ещё нельзя отметить как пройденные.
- **PR #26:** остаётся open / Draft; его ветка `chore/automatic-session-checkpoints-2026-11-18` — 21 commit ahead / 1 behind main, compare status diverged, mergeable=false. План `docs/RELEASE_1_0_PLAN_2026-11-20.md` пока находится в PR #26; при интеграции нужно согласовать две независимые версии `docs/CONTINUATION_STATE.md`, не затирая новый checkpoint.
- **Production:** Production deployment и Production Supabase не менялись; DB writes, DDL/DML и миграции не выполнялись.
- **Следующее конкретное действие:** выполнить настоящую интерактивную приёмку Preview на desktop и узком viewport: все основные вкладки/карта/паспорта/сравнение, risk monitor, сценарии 1/2/3 года, сохранение и повторное открытие CSV/PDF, проверка source provenance и отсутствие runtime/network ошибок. До этих gates PR #27 оставить Draft; не объявлять Release 1.0 готовым и не выполнять Production deployment.

---

## Checkpoint — HTTP(S) provenance validation for official reports (2026-11-18 15:16 UTC+05:00)

- **Статус:** `IN_PROGRESS` — исправлен обнаруженный fail-open крайний случай в отборе официальных наблюдений для отчётов.
- **Ветка / PR:** `fix/risk-stable-provenance-gate-2026-11-18`, PR #27 open / Draft.
- **Исходный HEAD:** `a224b808d7dabad73c53b5f540af294771002a03`; перед изменением PR был на 22 commits ahead / 0 behind относительно main.
- **Дефект:** отчётный selector требовал только непустой `source_url`. Строка с `javascript:`, `data:` или `file:` могла пройти provenance gate, хотя такой URL не является допустимой ссылкой на первоисточник.
- **Исправление:** добавлен `src/lib/sourceUrl.js` с проверкой корректного URL и схемы HTTP(S); официальный слой отчёта использует этот helper. Внешний дизайн и поведение экспорта не менялись.
- **Regression:** `scripts/test-report-official-data-gates.mjs` входит в `npm test` и исполняет проверки для HTTPS/HTTP; отклоняет javascript/data/file/невалидные URL; отдельно подтверждает вызов helper в selector.
- **Кодовые commits:** helper создан commit `83880f159a24161eb2b8ef99b55d45af6fdeffcd`; selector опубликован в `3c023bf0751af2311d25e6c68db4fc6ebbb5c7d8`. Regression test опубликован в `124cdff182956e300ff2e9a7a70e9850215c17fd` и уточнён в `dfa56d95c69a309b4f17446694623c7b761e24ae`.
- **Проверки:** точные runtime assertions добавлены в существующий test gate; GitHub Actions для нового HEAD ожидается. Локальные npm-команды в текущем окружении не запускались.
- **Preview / Production:** предыдущий Vercel check для исходного HEAD был success; Preview/Production для нового SHA ещё не подтверждены. Production deployment не запускался.
- **Supabase:** не подключалась и не изменялась; DDL/DML/миграции отсутствуют.
- **Осталось:** дождаться exact-HEAD GitHub Actions и Vercel; после успешной сборки продолжить ручную проверку Preview, фактических PDF/CSV и desktop/mobile. Релиз не объявлять готовым до ручных gates.
- **Следующее конкретное действие:** проверить CI для нового HEAD и устранить возможную регрессию, затем выполнить доступную ручную приёмку Preview.

---

## Checkpoint — единицы неопределённости в индексном сценарии (2026-11-18 14:01 UTC+05:00)

- **Статус:** `IN_PROGRESS` — исправлена подпись единицы в UI для опционального режима процентильного индекса.
- **Ветка / PR:** `fix/risk-stable-provenance-gate-2026-11-18`, PR #27 open / Draft.
- **Предыдущий подтверждённый HEAD:** `d46005c2869c539d800f82d4075f90eea1d66d8f`; его GitHub Actions run `44222768230` завершился success. Combined status для этого SHA содержит Vercel failure по внешнему build-rate-limit, без фактического Preview deployment.
- **Найденный дефект:** в `src/components/Forecasting.jsx` при `scoreSource='resilience-index'` подпись ползунка неопределённости корректно называла единицу «баллов», а числовое значение рядом по-прежнему отображалось со знаком «%». Это путало единицу процентильного индекса (баллы) с процентной неопределённостью концептуального балла.
- **Исправление:** отображаемый суффикс теперь зависит от режима: «балла» для индексного режима и «%» для концептуального. Существующая разметка и дизайн сохранены.
- **Кодовый commit:** `645066dbcfa20bfa0e2a57e0a8bf572f06ceefdc`; файл: `src/components/Forecasting.jsx`.
- **CI exact HEAD:** GitHub Actions run [44272282734](https://github.com/vanakazamkin-tech/yugra/actions/runs/44272282734) завершился `success`. `build` и `data-migrations-integration` — success; forecast unit tests, все data/risk/comparison/report/passport/map gates, production bundle, disposable-schema migration/idempotency/security checks и read-only audit завершились успешно.
- **Vercel Preview exact HEAD:** deployment `dpl_5SYF8Y8evSBMrzj2nYgqiomdTXsv` — `READY`, URL https://yugra18-h60v1xzro-napishtu.vercel.app; commit SHA совпадает с `820b75f1b2290ae972e00446bbd25aa0b0b1b2ea`. Это Preview, не Production. Браузерный smoke-test в этой среде не завершён: проверка URL через доступный web-viewer недоступна.
- **Production / Supabase:** Production deployment и production Supabase не менялись.
- **Следующее действие:** выполнить ручную проверку Preview (сценарии 1/2/3 года, PDF/CSV, desktop/mobile), затем обновить checkpoint на exact HEAD после следующего изменения. Не считать Release 1.0 готовым без ручных gates.

---

## Checkpoint — forecast backtest provenance gate (2026-11-18, active work)

- **Статус:** `IN_PROGRESS`; исправлен fail-open путь в диагностической walk-forward проверке прогноза.
- **Ветка / PR:** `fix/risk-stable-provenance-gate-2026-11-18`, PR #27 open / Draft.
- **Кодовый commit:** `97e7cc833b4b6d20e83d5e3c7daf35e5a2c98478`.
- **Дефект:** `buildHistoricalBacktest` отбирал строки только по `verification_status=verified`, географии, периоду, значению, коду/названию и единице. При этом не проверял `source_id` или `source_url`; verified-строка без ссылки на происхождение могла участвовать в диагностике.
- **Исправление:** backtest теперь требует непустой `source_id` либо HTTP(S) `source_url`. Иначе строка исключается и учитывается в `excluded.missingProvenance`. В UI показывается число исключённых строк. Исторические данные не дополняются искусственными источниками.
- **Regression:** добавлены сценарии missing source, source_id, source_url и небезопасного URL; fixtures существующих backtest-тестов дополнены явными source_id.
- **Файлы:** `src/lib/forecastModel.js`, `src/lib/forecastModel.test.js`, `src/components/Forecasting.jsx`, `docs/FORECASTING_MODEL.md`, этот журнал.
- **CI exact checkpoint HEAD:** `f1c30119ed1ad51c7daba8eae0e875de19cc4c09`; GitHub Actions runs [44222658968](https://github.com/vanakazamkin-tech/yugra/actions/runs/44222658968) и [44222651420](https://github.com/vanakazamkin-tech/yugra/actions/runs/44222651420) завершились success. В обоих `build` и `data-migrations-integration` — success, failed steps нет. В build явно прошёл `Run forecast model unit tests` и production bundle.
- **Vercel Preview:** deployment list для exact SHA `f1c3011` пуст; check `Vercel Preview Comments` success не является фактическим Preview deployment. Browser smoke-test пока заблокирован отсутствием Preview.
- **Production:** Supabase и Production deployment не менялись.
- **Следующее действие:** дождаться exact-HEAD CI, исправить регрессию если тесты выявят; затем продолжить P0 сценарного экрана, ручную PDF/CSV и narrow viewport acceptance. Не заявлять релиз готовым без ручных gates.

---

## Checkpoint — main sync and release P0 gates (2026-11-18 07:12 UTC+05:00)

- **Статус:** `IN_PROGRESS` — исправления provenance в risk/comparison/report опубликованы; exact-HEAD CI зелёный.
- **Ветка / PR:** `fix/risk-stable-provenance-gate-2026-11-18`, PR #27 — open / Draft.
- **Последний проверенный HEAD:** `abf0486d367a214906fa1235ee84b83ae7f743b2`.
- **GitHub Actions exact HEAD:** run [44221747108](https://github.com/vanakazamkin-tech/yugra/actions/runs/44221747108) — success; `build` и `data-migrations-integration` оба success. Проверка включает unit tests, official comparison gate, report provenance gate, production bundle, migration integration/idempotency и disposable-schema read-only audit.
- **Vercel:** status failure по внешнему build rate limit (retry in 24 hours); Preview для нового SHA не создан. Production не затронут.
- **Синхронизация main:** main HEAD `4cb1171faf0c4e4568bc16226178730f5d04a9f5` содержит PR #28 с правилами DEVELOPMENT FIRST. Этот commit включён в рабочую ветку как второй parent merge commit; PR больше не должен отставать от main.
- **Merge checkpoint commit:** `7bfe67843674b98c1b4a5fa68ec14428703f5245`; проверка compare: 14 commits ahead, 0 behind; PR mergeable=true.
- **Кодовые изменения текущего этапа:** точные единицы на всех этапах official comparison; отчётный official selector требует unit и source URL; regression tests обновлены.
- **Затронутые файлы:** `AGENTS.md`, `src/InvestmentDetails.jsx`, `scripts/test-official-comparison-gates.mjs`, `scripts/test-report-official-data-gates.mjs`, `docs/CONTINUATION_STATE.md`.
- **Production:** Supabase read-only не запускался в этом этапе; никаких изменений БД, миграций или production deployment.
- **PR #27:** mergeable=true, 14 commits ahead / 0 behind current main; остаётся Draft до ручных gates.
- **Следующее действие:** после снятия Vercel build rate limit создать Preview для exact code HEAD и выполнить desktop/mobile smoke-test, сохранить/открыть PDF и CSV, проверить страницы, таблицы и provenance. Если Preview недоступен, отметить ручные gates BLOCKED; не обходить ограничение production deployment.

---

## Checkpoint — fail-closed provenance for official report rows (2026-11-18 07:08 UTC+05:00)

- **Статус:** `IN_PROGRESS` — второй P0-дефект provenance в отчётах исправлен; ожидается CI нового checkpoint.
- **Ветка / PR:** `fix/risk-stable-provenance-gate-2026-11-18`, PR #27 (open, Draft).
- **Предыдущий HEAD:** `385167a7e89c9bcd2510ab84198200c630b2f28a`; GitHub Actions exact HEAD: runs [44221371684](https://github.com/vanakazamkin-tech/yugra/actions/runs/44221371684) и [44221364621](https://github.com/vanakazamkin-tech/yugra/actions/runs/44221364621), оба завершились success. Build и data-migrations-integration — success. Vercel check остаётся failure из-за внешнего build rate limit (retry in 24 hours), не из-за ошибки приложения.
- **Найденный дефект:** selector официального слоя отчёта проверял verified/geography/year/value/code, но не требовал непустых единицы измерения и source URL. Поэтому неполная по provenance строка могла попасть в отчёт как официальное наблюдение.
- **Исправление:** selector теперь fail-closed требует явную единицу и ссылку на первоисточник; строки без них исключаются.
- **Regression:** `scripts/test-report-official-data-gates.mjs` проверяет оба обязательных provenance gate.
- **Затронутые файлы:** `src/InvestmentDetails.jsx`, `scripts/test-report-official-data-gates.mjs`, `docs/CONTINUATION_STATE.md`.
- **Checkpoint commit:** `198481438592424cc6642dc7113493896e4f0fa1`.
- **Проверки exact HEAD:** GitHub Actions run [44221547413](https://github.com/vanakazamkin-tech/yugra/actions/runs/44221547413) завершился success: `build` и `data-migrations-integration` оба success. Build включает официальный comparison gate, report official-data gate и production bundle; integration job завершил read-only audit disposable schema и cleanup.
- **Vercel:** check остаётся failure из-за build rate limit (retry in 24 hours); deployment не был создан. Локальные npm-команды не выполнялись.
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
