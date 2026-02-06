import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Suas credenciais do Supabase (do .env)
const SUPABASE_URL = 'https://lvzrqtfzawydwvufdcbz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2enJxdGZ6YXd5ZHd2dWZkY2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjIxMTksImV4cCI6MjA4MTM5ODExOX0.QDKJDzL9c2_55gFCTmrLx3N-u7MY30wVY7-FyZE3IP4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function uploadLogo() {
  try {
    console.log('🚀 Iniciando upload da logo...');

    // Ler o arquivo da logo
    const logoPath = join(__dirname, 'src', 'assets', 'logo-glow-car.jpeg');
    const logoFile = readFileSync(logoPath);

    // Fazer upload para o bucket 'public' (ou 'assets')
    const { data, error } = await supabase.storage
      .from('public')
      .upload('logo-glow-car.jpeg', logoFile, {
        contentType: 'image/jpeg',
        upsert: true, // Sobrescreve se já existir
      });

    if (error) {
      console.error('❌ Erro no upload:', error.message);

      // Se o bucket não existe, tentar criar
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log('📦 Bucket "public" não encontrado. Tentando criar...');
        console.log('⚠️  Você precisa criar o bucket manualmente no painel do Supabase.');
        console.log('👉 Acesse: https://supabase.com/dashboard/project/lvzrqtfzawydwvufdcbz/storage/buckets');
        console.log('👉 Crie um bucket chamado "public" e marque como público');
        return;
      }

      return;
    }

    // Pegar a URL pública
    const { data: urlData } = supabase.storage
      .from('public')
      .getPublicUrl('logo-glow-car.jpeg');

    console.log('✅ Upload concluído com sucesso!');
    console.log('📸 URL da logo:', urlData.publicUrl);
    console.log('\n🎯 Use esta URL no seu template HTML do EmailJS:');
    console.log(`<img src="${urlData.publicUrl}" alt="Glow Car" style="width: 150px;" />`);

  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

uploadLogo();
