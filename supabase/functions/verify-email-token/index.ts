import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyTokenRequest {
  token: string
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

    const { token }: VerifyTokenRequest = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Find the verification token
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !tokenRecord) {
      console.error('Token not found or expired:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Mark token as verified
    const { error: updateTokenError } = await supabaseAdmin
      .from('email_verification_tokens')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', tokenRecord.id)

    if (updateTokenError) {
      console.error('Error updating token:', updateTokenError)
      throw new Error('Failed to verify token')
    }

    // Update profile to mark email as verified
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ email_verified: true })
      .eq('user_id', tokenRecord.user_id)

    if (updateProfileError) {
      console.error('Error updating profile:', updateProfileError)
      // Don't throw - token is still verified
    }

    console.log(`Email verified successfully for user ${tokenRecord.user_id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email verificado com sucesso!',
        userId: tokenRecord.user_id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error: unknown) {
    console.error('Error verifying email:', error)
    const err = error as { message?: string }
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to verify email' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
