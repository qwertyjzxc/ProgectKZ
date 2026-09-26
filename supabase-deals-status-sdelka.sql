-- Выполнить в SQL Editor Supabase
-- Статус "Завершено" убран из сделок: терминальным стал "Сделка".
-- Переводит старые закрытые сделки на новый статус, чтобы они не висели
-- с удалённым статусом и корректно попадали в фильтры и аналитику.
-- Безопасно перезапускать (идемпотентно).

UPDATE deals_kvartiry SET completed = 'Сделка' WHERE completed = 'Завершено';
UPDATE deals_pomescheniya SET completed = 'Сделка' WHERE completed = 'Завершено';
UPDATE deals_zemlya SET completed = 'Сделка' WHERE completed = 'Завершено';
