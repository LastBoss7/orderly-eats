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

    // Get user data from auth.users to retrieve metadata
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (userError || !user) {
      console.error('Error fetching user:', userError)
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    // If no profile exists and user has pending setup metadata, create the restaurant and profile
    if (!existingProfile && user.user_metadata?.pending_setup) {
      const metadata = user.user_metadata

      console.log('Creating restaurant and profile for user:', userId, metadata)

      // Create restaurant
      const { data: restaurantData, error: restaurantError } = await supabaseAdmin
        .from('restaurants')
        .insert({
          name: metadata.restaurant_name,
          slug: metadata.restaurant_slug,
          cnpj: metadata.cnpj,
        })
        .select('id')
        .single()

      if (restaurantError) {
        console.error('Error creating restaurant:', restaurantError)
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar restaurante. Tente novamente.' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: userId,
          restaurant_id: restaurantData.id,
          full_name: metadata.full_name,
          email_verified: true,
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // Try to rollback restaurant creation
        await supabaseAdmin.from('restaurants').delete().eq('id', restaurantData.id)
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar perfil. Tente novamente.' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }

      // Create admin role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin',
        })

      if (roleError) {
        console.error('Error creating user role:', roleError)
        // Non-critical, continue
      }

      // Create salon settings
      const { error: salonError } = await supabaseAdmin
        .from('salon_settings')
        .insert({
          restaurant_id: restaurantData.id,
        })

      if (salonError) {
        console.error('Error creating salon settings:', salonError)
        // Non-critical, continue
      }

      // Update user metadata to remove pending_setup flag
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...metadata,
          pending_setup: false,
          email_verified: true,
        },
      })

      // Confirm the user's email in Supabase Auth
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      })

      console.log(`Email verified and profile created successfully for user ${userId}`)
    } else {
      // Just update existing profile as verified
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ email_verified: true })
        .eq('user_id', userId)

      if (profileError) {
        console.error('Error updating profile:', profileError)
      }

      // Confirm the user's email in Supabase Auth
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      })

      console.log(`Email verified successfully for user ${userId}`)
    }

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
