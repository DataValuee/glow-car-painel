import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  clienteNome: string;
  clienteEmail: string;
  placa: string;
  pdfUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clienteNome, clienteEmail, placa, pdfUrl }: EmailRequest = await req.json();

    console.log("Sending email to:", clienteEmail);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Glow Car Detailing <onboarding@resend.dev>",
        to: [clienteEmail],
        subject: `Relatório de Entrega - ${placa}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background-color: #141414; border-radius: 12px; padding: 30px; }
              .header { text-align: center; margin-bottom: 30px; }
              .logo { color: #c9a86c; font-size: 24px; font-weight: bold; }
              .content { line-height: 1.6; }
              .button { display: inline-block; background-color: #c9a86c; color: #0a0a0a; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
              .footer { margin-top: 30px; text-align: center; color: #888; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">GLOW CAR DETAILING</div>
              </div>
              <div class="content">
                <p>Olá, <strong>${clienteNome}</strong>!</p>
                <p>Seu veículo <strong>${placa}</strong> foi entregue com sucesso!</p>
                <p>Segue o relatório de entrega com todas as fotos e detalhes do serviço realizado.</p>
                <p style="text-align: center;">
                  <a href="${pdfUrl}" class="button">📄 Ver Relatório PDF</a>
                </p>
                <p>Agradecemos a preferência! Seu veículo merece brilhar. ✨</p>
              </div>
              <div class="footer">
                <p>Glow Car Detailing</p>
                <p>Seu veículo merece brilhar</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const data = await response.json();
    console.log("Resend response:", data);

    if (!response.ok) {
      throw new Error(data.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
