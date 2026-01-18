import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Img,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface VerificationEmailProps {
  supabase_url: string
  token_hash: string
  redirect_to: string
  email_action_type: string
  token: string
}

export const VerificationEmail = ({
  supabase_url,
  token_hash,
  redirect_to,
  email_action_type,
  token,
}: VerificationEmailProps) => {
  const confirmLink = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`

  return (
    <Html>
      <Head />
      <Preview>Confirme seu email para acessar o Gamako</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🍽️ Bem-vindo ao Gamako!</Heading>
          
          <Text style={text}>
            Obrigado por se cadastrar! Para ativar sua conta e começar a usar o sistema, 
            confirme seu endereço de email clicando no botão abaixo:
          </Text>
          
          <Link href={confirmLink} target="_blank" style={button}>
            Confirmar Email
          </Link>
          
          <Text style={text}>
            Ou copie e cole este link no seu navegador:
          </Text>
          
          <code style={code}>{confirmLink}</code>
          
          <Text style={smallText}>
            Se você não criou uma conta no Gamako, pode ignorar este email com segurança.
          </Text>
          
          <Text style={footer}>
            © 2024 Gamako - Sistema de Gestão para Restaurantes
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default VerificationEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  maxWidth: '560px',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const button = {
  backgroundColor: '#10b981',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'block',
  fontSize: '16px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  textDecoration: 'none',
  padding: '16px 32px',
  margin: '24px auto',
  maxWidth: '240px',
}

const code = {
  display: 'block',
  padding: '12px',
  backgroundColor: '#f4f4f4',
  borderRadius: '4px',
  border: '1px solid #eaeaea',
  color: '#333',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
  margin: '16px 0',
}

const smallText = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '24px 0 0',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '32px 0 0',
  borderTop: '1px solid #eaeaea',
  paddingTop: '24px',
}
