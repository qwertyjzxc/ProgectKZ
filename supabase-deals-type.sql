-- Добавляет колонку type в сделки (Квартиры / Помещения / Земля)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'kvartiry';
