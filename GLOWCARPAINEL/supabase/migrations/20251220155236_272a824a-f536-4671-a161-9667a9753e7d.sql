-- Tornar o bucket entregas-fotos público para leitura
UPDATE storage.buckets SET public = true WHERE id = 'entregas-fotos';

-- Políticas para entregas-fotos
CREATE POLICY "Permitir upload autenticado em entregas-fotos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'entregas-fotos');

CREATE POLICY "Permitir leitura pública em entregas-fotos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'entregas-fotos');

-- Políticas para entregas-pdf
CREATE POLICY "Permitir upload autenticado em entregas-pdf"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'entregas-pdf');

CREATE POLICY "Permitir leitura pública em entregas-pdf"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'entregas-pdf');