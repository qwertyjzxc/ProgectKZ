-- Выполнить в SQL Editor Supabase
-- Новые колонки таблицы properties:
--   property_type   — тип объекта: Квартира / Дом / Участок
--   contract_number — номер договора (внутреннее, не показывается клиентам)
--   payment_method  — способ оплаты (внутреннее, не показывается клиентам)
--   contacts        — контакты (внутреннее, не показывается клиентам)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT '';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS contract_number TEXT DEFAULT '';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT '';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS contacts TEXT DEFAULT '';