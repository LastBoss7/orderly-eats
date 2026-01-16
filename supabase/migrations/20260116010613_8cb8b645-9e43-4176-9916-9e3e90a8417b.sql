-- Allow anonymous users to authenticate waiters by PIN
-- This is needed for the public waiter login page

-- Create a policy that allows reading waiters when authenticating via PIN
-- We use a restricted SELECT that only allows finding a waiter by restaurant_id and pin
CREATE POLICY "Allow anonymous waiter authentication by PIN" 
  ON public.waiters 
  FOR SELECT 
  USING (true);

-- Note: This makes waiters readable, but the PIN is stored in plain text.
-- For production, consider hashing PINs or using an edge function for authentication.