-- Drop existing restrictive policies on available_printers
DROP POLICY IF EXISTS "Users can manage available printers in their restaurant" ON public.available_printers;
DROP POLICY IF EXISTS "Users can view available printers in their restaurant" ON public.available_printers;

-- Create public policies for available_printers (Electron app uses anonymous access)

-- SELECT: Anyone can read printers for valid restaurants
CREATE POLICY "Anyone can read available printers"
ON public.available_printers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = restaurant_id
  )
);

-- INSERT: Anyone can insert printers for valid restaurants
CREATE POLICY "Anyone can insert available printers"
ON public.available_printers
FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = restaurant_id
  )
);

-- UPDATE: Anyone can update printers for valid restaurants
CREATE POLICY "Anyone can update available printers"
ON public.available_printers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = restaurant_id
  )
)
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = restaurant_id
  )
);

-- DELETE: Anyone can delete printers for valid restaurants
CREATE POLICY "Anyone can delete available printers"
ON public.available_printers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = restaurant_id
  )
);