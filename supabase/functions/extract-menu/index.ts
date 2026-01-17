import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: "Imagem é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "AI não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Extracting menu from image...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em extrair informações de cardápios de restaurantes.
Analise a imagem do cardápio e extraia os produtos visíveis.

REGRAS IMPORTANTES:
1. Se um produto tem MÚLTIPLOS TAMANHOS/PREÇOS (P, M, G ou 1 pessoa, 2 pessoas, etc), crie APENAS 1 produto com o MENOR preço
2. Para cada produto, extraia: name, description (opcional), price (número), category
3. Se o preço tiver "R$" ou "," converta para número decimal com ponto
4. Retorne APENAS JSON válido, sem markdown, sem \`\`\`, sem explicações
5. Limite máximo: 50 produtos por imagem`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia os produtos e retorne APENAS JSON puro (sem markdown): {\"products\":[{\"name\":\"...\",\"description\":\"...\",\"price\":0.00,\"category\":\"...\"}]}"
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Limite de requisições excedido, tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Créditos insuficientes para IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao processar imagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: "Não foi possível extrair produtos da imagem" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from the response
    let products = [];
    try {
      let jsonStr = content.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.includes("```json")) {
        jsonStr = jsonStr.split("```json")[1].split("```")[0].trim();
      } else if (jsonStr.includes("```")) {
        jsonStr = jsonStr.split("```")[1].split("```")[0].trim();
      }
      
      // Try to fix incomplete JSON by finding the last complete object
      if (!jsonStr.endsWith("}")) {
        // Find the last complete product object
        const lastBracket = jsonStr.lastIndexOf("}");
        if (lastBracket > 0) {
          jsonStr = jsonStr.substring(0, lastBracket + 1);
          // Close the array and object
          if (!jsonStr.endsWith("]}")) {
            jsonStr += "]}";
          }
        }
      }
      
      const parsed = JSON.parse(jsonStr);
      products = parsed.products || parsed;
      
      // Validate products array
      if (!Array.isArray(products)) {
        throw new Error("Products is not an array");
      }
      
      // Filter valid products only
      products = products.filter(p => p && typeof p.name === 'string' && p.name.length > 0);
      
    } catch (parseError) {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao interpretar produtos. Tente com uma imagem mais clara ou menor." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracted ${products.length} products from menu`);

    return new Response(
      JSON.stringify({ success: true, products }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error extracting menu:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
