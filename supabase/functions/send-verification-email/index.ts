import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { Resend } from "https://esm.sh/resend@4.0.0"

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendVerificationRequest {
  email: string
  userId: string
  redirectUrl?: string
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

    const { email, userId, redirectUrl }: SendVerificationRequest = await req.json()

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: 'Email and userId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Generate verification token using Web Crypto API
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    const token = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')

    // Delete any existing tokens for this user
    await supabaseAdmin
      .from('email_verification_tokens')
      .delete()
      .eq('user_id', userId)

    // Insert new verification token
    const { error: insertError } = await supabaseAdmin
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        email: email,
        token: token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })

    if (insertError) {
      console.error('Error inserting token:', insertError)
      throw new Error('Failed to save verification token')
    }

    // Build verification URL
    const baseUrl = redirectUrl || 'https://barerest.lovable.app'
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: 'Gamako <noreply@gamako.com.br>',
      to: [email],
      subject: '✅ Confirme seu email - Gamako',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px;">
          <div style="background-color: #ffffff; margin: 0 auto; padding: 40px 20px; border-radius: 8px; max-width: 560px;">
            <h1 style="color: #1a1a1a; font-size: 28px; font-weight: bold; text-align: center; margin: 0 0 24px;">🍽️ Bem-vindo ao Gamako!</h1>
            
            <p style="color: #484848; font-size: 16px; line-height: 24px; margin: 16px 0;">
              Obrigado por se cadastrar! Para ativar sua conta e começar a usar o sistema, 
              confirme seu endereço de email clicando no botão abaixo:
            </p>
            
            <a href="${verificationUrl}" target="_blank" style="background-color: #10b981; border-radius: 8px; color: #ffffff; display: block; font-size: 16px; font-weight: bold; text-align: center; text-decoration: none; padding: 16px 32px; margin: 24px auto; max-width: 240px;">
              Confirmar Email
            </a>
            
            <p style="color: #484848; font-size: 16px; line-height: 24px; margin: 16px 0;">
              Ou copie e cole este link no seu navegador:
            </p>
            
            <code style="display: block; padding: 12px; background-color: #f4f4f4; border-radius: 4px; border: 1px solid #eaeaea; color: #333; font-size: 12px; word-break: break-all; margin: 16px 0;">${verificationUrl}</code>
            
            <p style="color: #8898aa; font-size: 14px; line-height: 20px; margin: 24px 0 0;">
              Se você não criou uma conta no Gamako, pode ignorar este email com segurança.
            </p>
            
            <p style="color: #8898aa; font-size: 12px; text-align: center; margin: 32px 0 0; border-top: 1px solid #eaeaea; padding-top: 24px;">
              © 2024 Gamako - Sistema de Gestão para Restaurantes
            </p>
          </div>
        </body>
        </html>
      `,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      throw new Error('Failed to send verification email')
    }

    console.log(`Verification email sent successfully to ${email}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Verification email sent' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error: unknown) {
    console.error('Error sending verification email:', error)
    const err = error as { message?: string }
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to send verification email' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
