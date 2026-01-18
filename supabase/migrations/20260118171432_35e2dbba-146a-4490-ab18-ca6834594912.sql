-- Create email verification tokens table
CREATE TABLE public.email_verification_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster token lookup
CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);

-- Enable RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own verification tokens
CREATE POLICY "Users can view own verification tokens"
  ON public.email_verification_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all tokens (for edge functions)
-- No public insert/update/delete policies - only edge functions with service role can manage

-- Function to generate verification token
CREATE OR REPLACE FUNCTION public.generate_verification_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Add email_verified column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
  END IF;
END $$;