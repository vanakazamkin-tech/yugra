# Подключение Supabase к Yugra

## 1. Установить зависимости

```bash
npm install
```

В `package.json` добавлен `@supabase/supabase-js`.

## 2. Настроить локальный запуск

Скопируйте `.env.example` в `.env.local` и замените значение `VITE_SUPABASE_ANON_KEY` своим публичным ключом проекта Supabase. Поддерживаются ключ `sb_publishable_...` и старый публичный `anon`.

Не используйте `service_role`, `sb_secret_...` или другие секретные ключи в клиентском приложении. Не коммитьте `.env.local`.

## 3. Настроить Vercel

В настройках Vercel → Project → Settings → Environment Variables добавьте:

- `VITE_SUPABASE_URL` = `https://dmbikidqikjupkghywbz.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = публичный ключ из Supabase → Settings → API Keys

Примените переменные ко всем нужным средам и сделайте новый deployment.

## 4. Настроить таблицу

Файл `supabase/schema.sql` содержит предоставленную SQL-схему и начальные записи. Запустите его в SQL Editor вашего Supabase-проекта, если таблица ещё не создана. Для чтения приложением должна быть разрешена операция `SELECT` для `anon`/публичной роли через RLS.

## 5. Как работает синхронизация

Приложение сразу запрашивает `public.municipalities`, затем повторяет чтение через 60 секунд. В строке статуса под шапкой отображается время последней успешной синхронизации. При ошибке сеть не обнуляет текущие данные: используется последняя удачная загрузка, а до первой удачной загрузки — локальный JSON в `data/municipalities-detailed.json`.

Это опрос REST API раз в минуту, а не подписка push через Supabase Realtime. Позже можно заменить опрос на Realtime-подписку, сохранив тот же формат данных.
