-- Add columns for hashed PIN storage
ALTER TABLE public.waiters 
ADD COLUMN IF NOT EXISTS pin_hash TEXT,
ADD COLUMN IF NOT EXISTS pin_salt TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_waiters_restaurant_status ON public.waiters(restaurant_id, status);

-- Comment explaining the columns
COMMENT ON COLUMN public.waiters.pin_hash IS 'SHA-256 hash of the PIN';
COMMENT ON COLUMN public.waiters.pin_salt IS 'UUID salt used for hashing the PIN';