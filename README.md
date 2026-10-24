# ProgectKZ — CRM агентства недвижимости (Шымкент)

Next.js 16 (App Router) + React 19 + Supabase (Postgres, Auth, Storage) + Tailwind 4.

Разделы: Главная → Клиенты (аренда/продажа, воронка статусов) → Объекты
(Krisha-парсинг, «Наши объекты», Собственники) → Сделки (admin) → Задачи →
Журнал → Аналитика/Профили (admin) → Настройки (справочники районов и ЖК).

Ключевой флоу: клиент → «Завершить сделку» → `PUT /api/clients/*` +
`POST /api/deals` + запись в `client_activity` + уведомления.

## Запуск

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm test         # vitest
```

## Переменные окружения (`.env.local`, в git не коммитить)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # только сервер, никогда на клиент
YANDEX_API_KEY=              # подсказки адресов
CRON_SECRET=                 # Bearer-секрет для /api/objects/sync, /api/cleanup, /api/ping
```

## Миграции БД (Supabase → SQL Editor, по порядку)

1. `supabase-full-schema.sql` — канон схемы
2. `supabase-fix-rls.sql` (legacy) → затем `supabase-rls-hardening.sql` — настоящий RLS
3. `supabase-clients-rpc.sql` — поиск/пагинация клиентов
4. Остальные `supabase-*.sql` — инкрементальные поля (в т.ч. `supabase-deals-category-unify.sql`,
   `supabase-deals-status-sdelka.sql`)
5. `supabase-storage-policies.sql` — бакеты `property-images`, `deal-documents`, `attachments`
6. `supabase-rls-v2.sql` — границы в самой БД: сделки — только админам
   (`is_admin()`), колонки `clients_*.phone` / `profiles.password_enc` / `profiles.pin`
   закрыты для роли authenticated (column-level), RPC `get_clients_*` — только service_role.
   Телефоны клиентов читаются исключительно через API (маскирование `phone-visibility`)
7. `supabase-storage-private-docs.sql` — бакеты `deal-documents` и `attachments`
   приватные; вложения открываются через `/api/files/view` (сессия + подписанный URL
   на 1 час), `property-images` остаётся публичным для `/p/[id]`.
   Запускать ПОСЛЕ деплоя кода с роутом `/api/files/view`
8. `supabase-drop-clients-pokupka.sql` — удаление мёртвой легаси-таблицы
   (перед запуском проверить `select count(*) from clients_pokupka`)

## Правила для кода

- Категории сделок — канон `arenda | pokupka` (`normalizeDealCategory` в `lib/deal-types.ts`);
  `prodaja` — legacy-алиас только на входе. Клиенты — `arenda | prodaja` (таблицы).
- Подтверждения удалений — только `ConfirmDialog`, не `window.confirm`.
- GET-ручки не пишут в БД (чистка — в `GET /api/cleanup` по крону).
- Пароли — в Supabase Auth + обратимая копия `profiles.password_enc` (AES, `APP_PASSWORD_KEY`) для просмотра админом в «Управлении профилями».
- API-доступ: `requireUser` / `requireAdmin` / `requireCronOrAdmin` из `lib/route-auth.ts`.

## Крон (vercel.json)

- `0 0 * * *` → `/api/objects/sync` (Krisha, до 300 сек)
- `30 1 * * *` → `/api/cleanup` (завершённые задачи, старые уведомления)
