import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Suas credenciais do Supabase
const SUPABASE_URL = 'https://lvzrqtfzawydwvufdcbz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2enJxdGZ6YXd5ZHd2dWZkY2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjIxMTksImV4cCI6MjA4MTM5ODExOX0.QDKJDzL9c2_55gFCTmrLx3N-u7MY30wVY7-FyZE3IP4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function uploadLogo() {
  try {
    console.log('🚀 Iniciando upload da logo...');

    // Ler o arquivo da logo
    const logoPath = join(__dirname, 'src', 'assets', 'logo-glow-car.jpeg');
    const logoFile = readFileSync(logoPath);

    // Fazer upload para o bucket 'assets'
    const { data, error } = await supabase.storage
      .from('assets')
      .upload('logo-glow-car.jpeg', logoFile, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('❌ Erro no upload:', error.message);

      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log('\n📦 O bucket "assets" não existe ainda.');
        console.log('\n⚠️  PASSOS PARA CRIAR O BUCKET:');
        console.log('1. Acesse: https://supabase.com/dashboard/project/lvzrqtfzawydwvufdcbz/storage/buckets');
        console.log('2. Clique em "New bucket"');
        console.log('3. Nome: assets');
        console.log('4. ✅ Marque como "Public bucket"');
        console.log('5. Clique em "Create bucket"');
        console.log('\n6. Depois execute este script novamente: node upload-logo.mjs');
      }
      return;
    }

    // Pegar a URL pública
    const { data: urlData } = supabase.storage
      .from('assets')
      .getPublicUrl('logo-glow-car.jpeg');

    console.log('\n✅ Upload concluído com sucesso!');
    console.log('\n📸 URL PÚBLICA DA LOGO:');
    console.log(urlData.publicUrl);
    console.log('\n🎯 COLE ESTA TAG NO SEU TEMPLATE HTML DO EMAILJS:');
    console.log(`<img src="${urlData.publicUrl}" alt="Glow Car Logo" width="150" />`);
    console.log('\n💡 TEMPLATE HTML SUGERIDO:');
    console.log(`
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background-color: #000; color: #c9a86c; font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .content { background-color: #1a1a1a; padding: 30px; border-radius: 10px; }
    .button { background-color: #c9a86c; color: #000; padding: 12px 30px;
              text-decoration: none; border-radius: 5px; display: inline-block;
              font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${urlData.publicUrl}" alt="Glow Car" width="150" />
      <h1 style="color: #c9a86c;">Relatório de Entrega</h1>
    </div>
    <div class="content">
      <p>Olá <strong>{{cliente_nome}}</strong>,</p>
      <p>Seu veículo <strong>{{placa}}</strong> foi entregue com sucesso!</p>
      <p><strong>Serviço realizado:</strong> {{servico}}</p>
      <p><strong>Data da entrega:</strong> {{data_entrega}}</p>
      <p style="text-align: center;">
        <a href="{{pdf_url}}" class="button">📄 Acessar Relatório PDF</a>
      </p>
    </div>
    <div class="footer">
      <p>Glow Car Detailing - Seu veículo merece brilhar ✨</p>
    </div>
  </div>
</body>
</html>
    `);

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

uploadLogo();
