CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  price NUMERIC DEFAULT 0,
  rooms INTEGER,
  address TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  image_urls JSONB DEFAULT '[]'::jsonb,
  city TEXT DEFAULT '',
  building_type TEXT DEFAULT '',
  complex_name TEXT DEFAULT '',
  year_built INTEGER,
  area NUMERIC,
  bathroom TEXT DEFAULT '',
  ceiling_height NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON properties FOR SELECT USING (true);
CREATE POLICY "Auth insert" ON properties FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "Auth update" ON properties FOR UPDATE USING (auth.role()='authenticated');
CREATE POLICY "Auth delete" ON properties FOR DELETE USING (auth.role()='authenticated');

INSERT INTO storage.buckets (id, name, public) VALUES ('property-images','property-images',true) ON CONFLICT DO NOTHING;
CREATE POLICY "Public read images" ON storage.objects FOR SELECT USING (bucket_id='property-images');
CREATE POLICY "Auth upload images" ON storage.objects FOR INSERT WITH CHECK (bucket_id='property-images' AND auth.role()='authenticated');
