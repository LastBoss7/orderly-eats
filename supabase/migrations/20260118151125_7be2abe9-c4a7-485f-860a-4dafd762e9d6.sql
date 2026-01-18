-- Allow waiter_id to be nullable in waiter_invites for generic invites
ALTER TABLE public.waiter_invites ALTER COLUMN waiter_id DROP NOT NULL;

-- Update the foreign key to handle null values
ALTER TABLE public.waiter_invites DROP CONSTRAINT IF EXISTS waiter_invites_waiter_id_fkey;
ALTER TABLE public.waiter_invites 
  ADD CONSTRAINT waiter_invites_waiter_id_fkey 
  FOREIGN KEY (waiter_id) 
  REFERENCES public.waiters(id) 
  ON DELETE CASCADE;