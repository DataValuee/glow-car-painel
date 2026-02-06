import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export interface EmailData {
  clienteNome: string;
  clienteEmail: string;
  placa: string;
  servico: string;
  pdfUrl: string;
  dataEntrega: string;
}

export const enviarEmailComPDF = async (data: EmailData): Promise<void> => {
  try {
    // Inicializar EmailJS com a public key
    emailjs.init(EMAILJS_PUBLIC_KEY);

    // Parâmetros que serão enviados para o template
    const templateParams = {
      cliente_nome: data.clienteNome,
      to_email: data.clienteEmail,
      placa: data.placa,
      servico: data.servico,
      pdf_url: data.pdfUrl,
      data_entrega: data.dataEntrega,
    };

    // Enviar email
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    if (response.status !== 200) {
      throw new Error('Falha ao enviar email');
    }

    return;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw error;
  }
};
