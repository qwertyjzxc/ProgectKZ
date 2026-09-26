<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ProgectKZ — правила для агентов

- Стек: Next.js 16 App Router, React 19, Supabase, Tailwind 4, shadcn-стиль в `components/ui`.
- Канон категорий сделок: `arenda | pokupka` (`normalizeDealCategory`, `lib/deal-types.ts`).
  `prodaja` — только legacy-вход, нормализовать на границе. Клиенты: `arenda | prodaja`.
- Доступ в API — только через `lib/route-auth.ts` (`requireUser`/`requireAdmin`/`requireCronOrAdmin`).
  Новые ручки без проверки доступа запрещены. GET не мутирует данные.
- Удаления подтверждать через `components/ConfirmDialog.tsx`, не `window.confirm`.
- Пароли — Supabase Auth + обратимая копия `password_enc` для просмотра админом (осознанное решение владельца, не убирать).
- Схема БД: канон `supabase-full-schema.sql`; изменения — новым `supabase-*.sql`
  файлом + запись в README. Fallback в `lib/supabase-column-fallback.ts` только
  логирует дрейф, молча данные не терять.
- Проверки после правок: `npx tsc --noEmit`, `npm test`, при возможности `npm run build`.
