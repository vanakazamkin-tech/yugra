# Yugra18 — регламент проверки и переноса миграций качества данных

**Статус на 07.11.2026:** подготовка процедуры. Три миграции направления №4 находятся в PR #11 и не применены к production Supabase. Этот документ не является разрешением на их применение.

## 1. Область действия

Порядок относится только к трём миграциям ветки `feat/data-quality`:

1. `20261106210000_data_quality_provenance_guardrails.sql`
2. `20261106230000_add_municipality_indicator_quality_view.sql`
3. `20261106233000_extend_data_source_provenance_metadata.sql`

Они добавляют приватные связи происхождения наблюдений, диагностическое view и nullable-поля каталога источников. Миграции не должны менять значения в `municipality_indicators`, автоматически подтверждать данные или переписывать URL.

**Запрещено в рамках этого регламента:** менять `main`, сливать PR без отдельного разрешения, выполнять `db reset --remote`, использовать `--include-seed` на production, отключать RLS, выдавать API-ролям доступ к приватным данным, выполнять `migration repair` без отдельного расследования.

## 2. Почему нельзя начинать с пустого проекта

Миграции предполагают наличие базовых таблиц `public.municipalities`, `public.municipality_indicators` и `public.data_sources`. Поэтому пустой Supabase-проект без схемы Yugra18 не является подходящей staging-средой.

Нужен отдельный Supabase-проект, не совпадающий с production, с совместимой базовой схемой и контролируемым набором данных. Предпочтительно восстановить в staging резервную копию/логический экспорт в соответствии с политикой доступа проекта либо подготовить эквивалентную схему и синтетические данные. Копирование production-данных в staging допустимо только после проверки состава данных, прав доступа и необходимости обезличивания.

Не использовать production project ref в командах ниже. Не сохранять access token, database password, connection string или service-role key в Git, документации или выводе CI.

## 3. Подготовка staging

Перед началом ответственный должен подтвердить:

- staging project ref и его владельца;
- что это отдельный проект, а не production;
- версию PostgreSQL и наличие нужных расширений;
- наличие трёх базовых таблиц и совместимых колонок;
- наличие справочников муниципалитетов и источников, на которые ссылаются observations;
- способ восстановления staging и точку резервного копирования;
- отсутствие production credentials в локальном окружении.

В staging до миграций выполнить базовый аудит:

```bash
supabase login
supabase link --project-ref "$STAGING_PROJECT_REF"
supabase migration list --remote
```

Убедиться, что CLI связан именно со staging. Если история миграций расходится с репозиторием, есть неизвестные pending migrations или применённые вручную изменения — остановиться. Не исправлять историю через `supabase migration repair` и не запускать `db pull` автоматически: сначала установить происхождение расхождения и зафиксировать его отдельным решением.

Выполнить `supabase/audits/data-quality-audit.sql` в staging и сохранить результаты. Минимальные исходные контрольные значения:

- число строк и distinct observation IDs в `municipality_indicators`;
- число муниципалитетов и источников;
- число `source_id/source_url` с пропусками;
- число дублей по полному ключу миграции;
- состояние legacy constraint/index `municipality_indicators_observation_unique`;
- текущие RLS и grants для затрагиваемых таблиц.

Для production на 06.11.2026 read-only аудит фиксировал 1 445 наблюдений, 22 муниципалитета и 160 карточек источников. Эти цифры — контрольная точка того среза, а не жёстко заданные значения для будущего staging-клона.

## 4. Dry-run и применение только в staging

После подтверждения базовой схемы и истории:

```bash
supabase db push --dry-run --remote
```

Dry-run должен показать только три ожидаемые миграции из раздела 1. Если он показывает другие миграции, неизвестные изменения или не показывает ожидаемые три — **не продолжать**.

Перед применением зафиксировать:

- staging project ref;
- commit SHA ветки `feat/data-quality`;
- вывод dry-run;
- результаты базового аудита;
- подтверждение резервной копии staging.

Затем применить pending migrations только к staging:

```bash
supabase db push --remote
supabase migration list --remote
```

Не добавлять `--include-seed`. Не использовать `db reset --remote`: команда разрушительна и не нужна для проверки миграций на существующей схеме.

Операцию выполняет один ответственный оператор. Не запускать параллельные `db push` из нескольких рабочих мест.

## 5. Проверки после миграций

Запустить `supabase/audits/data-quality-post-migration-audit.sql` по частям. Проверить:

1. Количество наблюдений до и после совпадает; значения, статусы, URL и source IDs не изменились.
2. Число provenance links равно числу наблюдений, для которых до миграции были заполнены `source_id` и непустой `source_url`. Для проверенного production-среза это ожидалось как 1 445 из 1 445.
3. Нет ссылок provenance на отсутствующие observations или sources и нет пустых URL snapshots.
4. Новый индекс `uq_municipality_indicators_source_observation` существует, имеет UNIQUE и содержит восемь ключевых полей; старый узкий constraint/index удалён.
5. `municipality_indicator_quality_issues` существует и выявляет тестовые классы проблем: межисточниковые конфликты, несовместимые единицы, нестандартные периоды и backlog проверки.
6. View имеет `security_invoker=true`; `anon` и `authenticated` не имеют SELECT на view или private provenance; RLS включён на provenance table; ожидаемые права есть у `service_role`.
7. В `data_sources` появились ровно пять nullable-колонок: `data_owner`, `temporal_coverage`, `data_type`, `access_restrictions`, `retrieved_at`. Старые строки не должны получать выдуманные значения.

Дополнительно выполнить автоматические проверки из CI:

```bash
npm run test:data-quality
```

и сверить с успешным GitHub Actions run на том же commit SHA. SQL assertions из `supabase/tests/data_quality_migrations_assertions.sql` предназначены для тестовой базы/fixtures CI; не запускать их напрямую на staging с реальными данными, поскольку файл содержит тестовые INSERT.

## 6. Условия остановки

Немедленно остановиться и не переходить к production, если:

- dry-run показывает не три ожидаемые миграции;
- staging не соответствует базовой схеме или migration history неясна;
- preflight находит same-source duplicates по полному ключу;
- число/значения observations меняются;
- provenance links не покрывают исходные наблюдения;
- view открывает данные API-ролям или не работает как security invoker;
- RLS/grants отличаются от ожидаемых;
- SQL/CI проверка завершается ошибкой;
- staging недоступен или нет проверенной резервной копии.

Не обходить ошибки удалением строк, изменением статусов, отключением RLS или ручной правкой migration history.

## 7. Production — отдельное решение

Успешная staging-проверка **не является разрешением** на production rollout. Перед production потребуется отдельное подтверждение владельца проекта и повторная сверка:

- PR #11 всё ещё содержит проверенный commit;
- все GitHub Actions jobs успешны на точном SHA;
- нет незапланированных изменений в production migration history;
- создана и проверена резервная копия/точка восстановления;
- определено окно низкой нагрузки и ответственный оператор;
- dry-run на production показывает только эти три миграции;
- заранее сохранены read-only baseline counts и security grants.

На production не выполнять команду применения до отдельного явного разрешения. После такого разрешения использовать только согласованный CI/CD или CLI-процесс, dry-run и одного оператора.

## 8. Восстановление и откат

У этих трёх миграций нет проверенного автоматического down-migration. Не считать удаление новых объектов безопасным универсальным откатом:

- provenance table и quality view — новые объекты, но их удаление уничтожит созданную историю связей/диагностики;
- удалённый старый узкий unique constraint нельзя бездумно восстанавливать: он может блокировать законные варианты по единице и географии;
- новый индекс отражает более полный ключ идентичности.

При проблеме предпочтителен останов дальнейших изменений и forward-fix после диагностики. Восстановление из backup/PITR — отдельная операция с возможным простоем и потерей изменений после точки восстановления; выполнять её только по отдельному решению владельца проекта. Перед восстановлением production оценить возможность restore в новый проект и проверить результат там.

## 9. Официальные инструкции Supabase

- [Deploy database migrations](https://supabase.com/docs/guides/deployment/database-migrations) — история миграций, push, dry-run и устранение расхождений.
- [Local development workflow](https://supabase.com/docs/guides/local-development/cli-workflows) — dry-run перед push; предупреждение не использовать seed на production.
- [Managing environments](https://supabase.com/docs/guides/deployment/managing-environments) — отдельные staging и production проекты.
- [Database backups](https://supabase.com/docs/guides/platform/backups) — резервные копии, логический экспорт и PITR.

---

**Текущий статус:** CI успешно проверяет миграции на одноразовой PostgreSQL 16 базе с production-подобными fixtures. Отдельная Supabase staging-среда ещё не создана/не проверена. Production migrations не применялись. PR #11 остаётся открытым.
