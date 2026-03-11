-- Remover foreign key dependente primeiro
ALTER TABLE public.documentos
DROP CONSTRAINT IF EXISTS "documentos_isEntrega_fkey";

-- Agora remover constraint única em entregas.IsEntrega
ALTER TABLE public.entregas
DROP CONSTRAINT IF EXISTS "entregas_IsEntrega_key";