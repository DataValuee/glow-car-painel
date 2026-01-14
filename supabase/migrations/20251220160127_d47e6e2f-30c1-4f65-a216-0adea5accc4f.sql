-- Corrigir avisos: RLS habilitado sem políticas (documentos, retiradas)

-- documentos: acesso apenas para usuários autenticados
CREATE POLICY "documentos_select_authenticated"
ON public.documentos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "documentos_insert_authenticated"
ON public.documentos
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "documentos_update_authenticated"
ON public.documentos
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "documentos_delete_authenticated"
ON public.documentos
FOR DELETE
TO authenticated
USING (true);

-- retiradas: acesso apenas para usuários autenticados
CREATE POLICY "retiradas_select_authenticated"
ON public.retiradas
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "retiradas_insert_authenticated"
ON public.retiradas
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "retiradas_update_authenticated"
ON public.retiradas
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "retiradas_delete_authenticated"
ON public.retiradas
FOR DELETE
TO authenticated
USING (true);