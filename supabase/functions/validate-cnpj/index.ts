import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();

    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: "CNPJ é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remove non-digits
    const cnpjDigits = cnpj.replace(/\D/g, "");

    if (cnpjDigits.length !== 14) {
      return new Response(
        JSON.stringify({ error: "CNPJ deve ter 14 dígitos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query BrasilAPI (free, no API key required)
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`);

    if (!response.ok) {
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ error: "CNPJ não encontrado na base da Receita Federal" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Erro ao consultar API");
    }

    const data = await response.json();

    // Check if company is active
    const situacao = data.descricao_situacao_cadastral || data.situacao_cadastral;
    const isActive = situacao?.toUpperCase() === "ATIVA";

    const result: CNPJData = {
      cnpj: cnpjDigits,
      razao_social: data.razao_social || "",
      nome_fantasia: data.nome_fantasia || "",
      situacao_cadastral: situacao || "",
      logradouro: data.logradouro || "",
      numero: data.numero || "",
      bairro: data.bairro || "",
      municipio: data.municipio || "",
      uf: data.uf || "",
      cep: data.cep || "",
      telefone: data.ddd_telefone_1 || "",
    };

    return new Response(
      JSON.stringify({
        valid: true,
        active: isActive,
        data: result,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error validating CNPJ:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao validar CNPJ. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
