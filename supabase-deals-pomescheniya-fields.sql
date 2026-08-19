-- Поля для помещений (deals_pomescheniya)
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Помещения';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS district TEXT DEFAULT '';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS layout TEXT DEFAULT '';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS furniture TEXT DEFAULT '';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS renter_type TEXT DEFAULT '';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS payment TEXT DEFAULT '';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS contract TEXT DEFAULT '';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS broker TEXT DEFAULT '';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS completed TEXT DEFAULT 'В процессе';
