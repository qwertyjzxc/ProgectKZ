CREATE TABLE IF NOT EXISTS districts (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS residential_complexes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE residential_complexes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON districts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON residential_complexes FOR ALL USING (true) WITH CHECK (true);

INSERT INTO districts (name) VALUES
  ('Абайский район'),
  ('Аль-Фарабийский район'),
  ('Енбекшинский район'),
  ('Каратауский район'),
  ('Туранский район')
ON CONFLICT (name) DO NOTHING;

INSERT INTO residential_complexes (name) VALUES
  ('4YOU Shymkent'),('4Seasons Crystal'),('4Seasons Dream'),('4Seasons Joy'),
  ('AinaLine'),('Al-Farabi'),('Almaville'),('Aqua by Aulet'),('Arman Qala'),
  ('Art House'),('Asyl Mura'),('Atamura Amanat'),('Atamura Bolashaq'),
  ('Atamura Dastur'),('Atamura Urpaq'),('Avenue 32'),('Aq Zhaiyq'),
  ('Asar House Plus'),('BAI-TUR'),('Baidibek'),('Baiterek'),('Baqsaray'),
  ('Baityn'),('Baqyt'),('BOSFOR CITY'),('Capital City'),('Capital Residence'),
  ('Firkan Primo'),('Flora Gardens'),('Gardens'),('Grand Park'),('Grand Park Aura'),
  ('Grand Park Terra'),('Grand Park Vita'),('Hyde Park'),('Jas Otau Tulip'),
  ('Jas Otau Turan'),('Kainar Village'),('Kausar Riverside'),('Kerege City'),
  ('Latifa'),('Modern City'),('MUQAGALI'),('Murager'),('New Life'),('Niet'),
  ('Nomad City'),('Otbasy'),('Otyrar Premium'),('PANORAMA'),('Pioneer City'),
  ('Prime Park 2'),('Qaratau'),('Royal Apartments'),('Sayram'),('Shahristan-2'),
  ('Shanyraq Park'),('Shattyq City'),('Shyrai Residence'),('Smart'),
  ('Tamerlan Residence'),('Tandau'),('Tole Bi'),('Tulpar'),('Tulpar Comfort'),
  ('Uly Orda'),('Urban Hills'),('Velar Residence'),('Zhanuya'),('Zhas Qanat'),
  ('Абат'),('Ай-Барыс'),('Арман Кала'),('Керей Жанибек'),('Кокжайлау'),
  ('Мерей-Art'),('София'),('Улы Дала'),('Шымкент Плаза')
ON CONFLICT (name) DO NOTHING;
