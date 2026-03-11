-- Políticas RLS para tabela entregas
CREATE POLICY "Permitir insert para usuários autenticados"
ON public.entregas
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Permitir select para usuários autenticados"
ON public.entregas
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir update para usuários autenticados"
ON public.entregas
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Permitir delete para usuários autenticados"
ON public.entregas
FOR DELETE
TO authenticated
USING (true);