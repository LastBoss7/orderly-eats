import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyCodeRequest {
  userId: string
  code: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { userId, code }: VerifyCodeRequest = await req.json()

    if (!userId || !code) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId and code are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Find the verification token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('token', code)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !tokenData) {
      console.log('Token not found or expired:', tokenError)
      return new Response(
        JSON.stringify({ success: false, error: 'Código inválido ou expirado' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Mark token as verified
    const { error: updateTokenError } = await supabaseAdmin
      .from('email_verification_tokens')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', tokenData.id)

    if (updateTokenError) {
      console.error('Error updating token:', updateTokenError)
    }

    // Update user profile as verified
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email_verified: true })
      .eq('user_id', userId)

    if (profileError) {
      console.error('Error updating profile:', profileError)
    }

    console.log(`Email verified successfully for user ${userId}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Email verified successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error: unknown) {
    console.error('Error verifying code:', error)
    const err = error as { message?: string }
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to verify code' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
