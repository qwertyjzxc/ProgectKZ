-- Таблица уведомлений
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  profile_id BIGINT REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT '',
  type TEXT DEFAULT 'info',
  related_to TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update notifications" ON notifications FOR UPDATE USING (true) WITH CHECK (true);

-- Тестовые уведомления для первого профиля
INSERT INTO notifications (profile_id, message, type, related_to, is_read)
VALUES (1, 'Добро пожаловать в kzproject CRM', 'info', '', false),
       (1, 'Новый клиент добавлен в базу', 'client', '/clients/1', false),
       (1, 'Сделка на сумму 15 000 000 ₸ закрыта', 'deal', '/deals/1', false);