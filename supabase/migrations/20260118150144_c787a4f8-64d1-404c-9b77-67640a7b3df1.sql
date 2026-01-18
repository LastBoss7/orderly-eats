-- Add user_id column to waiters table to link with auth.users
ALTER TABLE public.waiters 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_waiters_user_id ON public.waiters(user_id);

-- Create waiter_invites table for invitation system
CREATE TABLE IF NOT EXISTS public.waiter_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  waiter_id uuid NOT NULL REFERENCES public.waiters(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  email text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on waiter_invites
ALTER TABLE public.waiter_invites ENABLE ROW LEVEL SECURITY;

-- Policies for waiter_invites
CREATE POLICY "Users can create invites for their restaurant"
ON public.waiter_invites
FOR INSERT
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can view invites for their restaurant"
ON public.waiter_invites
FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can delete invites for their restaurant"
ON public.waiter_invites
FOR DELETE
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Anyone can read invites by token (for registration page)
CREATE POLICY "Anyone can read invite by token"
ON public.waiter_invites
FOR SELECT
USING (true);

-- Create function to generate secure invite token
CREATE OR REPLACE FUNCTION public.generate_waiter_invite_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Update RLS policy for waiters to allow access by authenticated waiter
CREATE POLICY "Waiters can view their own data"
ON public.waiters
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Waiters can update their own data"
ON public.waiters
FOR UPDATE
USING (user_id = auth.uid());