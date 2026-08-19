INSERT INTO storage.buckets (id, name, public) VALUES ('deal-documents','deal-documents',true) ON CONFLICT DO NOTHING;
CREATE POLICY "Public read deal docs" ON storage.objects FOR SELECT USING (bucket_id='deal-documents');
CREATE POLICY "Auth upload deal docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id='deal-documents' AND auth.role()='authenticated');
CREATE POLICY "Auth delete deal docs" ON storage.objects FOR DELETE USING (bucket_id='deal-documents' AND auth.role()='authenticated');
