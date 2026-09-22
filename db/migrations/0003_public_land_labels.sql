ALTER TABLE public_lands ADD COLUMN IF NOT EXISTS type_label text;
ALTER TABLE public_lands ADD COLUMN IF NOT EXISTS region text;
CREATE INDEX IF NOT EXISTS public_lands_type_idx ON public_lands (type);
