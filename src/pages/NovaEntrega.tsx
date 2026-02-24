import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Upload,
  UploadCloud,
  X,
  Camera,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import logoGlowCar from "@/assets/logo-glow-car.jpeg";
import { enviarEmailComPDF } from "@/services/emailService";
import { processImageForPDF } from "@/utils/imageOptimization";
import { pdf } from "@react-pdf/renderer";
import { ReportPDF } from "@/components/ReportPDF";
import { Progress } from "@/components/ui/progress";

const SERVICOS = [
  "Estética Completa",
  "Polimento Técnico",
  "Vitrificação",
  "Higienização Interna",
  "Lavagem Premium",
  "Outro",
];

const NovaEntrega = () => {
  const [formData, setFormData] = useState({
    placa: "",
    clienteNome: "",
    clienteEmail: "",
    clienteWhatsapp: "",
    servico: "",
    servicoOutro: "",
  });
  const [fotos, setFotos] = useState<File[]>([]);
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [resultado, setResultado] = useState<{
    pdfUrl: string;
    pdfBlob: Blob;
    clienteNome: string;
    clienteWhatsapp: string;
    servico: string;
    dataEntrega: string;
  } | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        navigate("/login", { replace: true });
      }
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatWhatsapp = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const handleFotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalFotos = fotos.length + files.length;

    if (totalFotos > 10) {
      toast({
        variant: "destructive",
        title: "Limite excedido",
        description: "Máximo de 10 fotos permitido",
      });
      return;
    }

    const validFiles = files.filter(
      (f: File) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
    );

    setFotos((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, [fotos.length, toast]);

  const removeFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
    setFotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const gerarPDF = async (fotosUrls: string[]): Promise<Blob> => {
    setActiveStep("Finalizando PDF");
    setProgress(90);

    const logoBase64 = await processImageForPDF(logoGlowCar, 200, 0.9);

    const blob = await pdf(
      <ReportPDF
        data={{
          placa: formData.placa,
          clienteNome: formData.clienteNome,
          servico: formData.servico === "Outro" ? formData.servicoOutro : formData.servico,
          dataEntrega: `${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
          fotos: fotosUrls,
          logoUrl: logoBase64,
        }}
      />
    ).toBlob();

    setProgress(100);
    return blob;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (fotos.length === 0) {
      toast({
        variant: "destructive",
        title: "Foto obrigatória",
        description: "Adicione pelo menos 1 foto do veículo",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Upload das fotos
      setActiveStep("Enviando fotos...");
      setProgress(10);

      const fotosUrls: string[] = [];
      const optimizedFotosUrls: string[] = [];
      const timestamp = Date.now();

      for (let i = 0; i < fotos.length; i++) {
        setActiveStep(`Processando foto ${i + 1} de ${fotos.length}`);
        const foto = fotos[i];

        // Create object URL for processing
        const localUrl = URL.createObjectURL(foto);
        const optimizedBase64 = await processImageForPDF(localUrl, 800, 0.75);
        URL.revokeObjectURL(localUrl);

        optimizedFotosUrls.push(optimizedBase64);

        // Upload original/optimized to Supabase
        const sanitizedName = foto.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9._-]/g, "")
          .toLowerCase();

        const fileName = `${timestamp}-${i}-${Math.random().toString(36).substring(7)}-${sanitizedName}`;

        const { error } = await supabase.storage
          .from("entregas-fotos")
          .upload(fileName, foto);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("entregas-fotos")
          .getPublicUrl(fileName);

        fotosUrls.push(urlData.publicUrl);
        setProgress(10 + ((i + 1) / fotos.length) * 40); // Up to 50%
      }

      // 2. Gerar PDF
      setActiveStep("Gerando layout do PDF...");
      setProgress(60);
      const pdfBlob = await gerarPDF(optimizedFotosUrls);
      const pdfFileName = `entrega-${formData.placa}-${Date.now()}.pdf`;

      // 3. Upload do PDF
      setActiveStep("Salvando relatório...");
      setProgress(85);
      const { error: pdfError } = await supabase.storage
        .from("entregas-pdf")
        .upload(pdfFileName, pdfBlob, { contentType: "application/pdf" });

      if (pdfError) throw pdfError;

      const { data: pdfUrlData } = supabase.storage
        .from("entregas-pdf")
        .getPublicUrl(pdfFileName);

      // 4. Salvar no banco
      const { error: dbError } = await supabase.from("entregas").insert({
        placa_veiculo: formData.placa.toUpperCase(),
        cliente_nome: formData.clienteNome,
        vendedor_numero: formData.clienteWhatsapp.replace(/\D/g, ""),
        pdf_url: pdfUrlData.publicUrl,
        quantidade_fotos: fotos.length,
        status: "Concluída",
        data_hora: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      setResultado({
        pdfUrl: pdfUrlData.publicUrl,
        pdfBlob: pdfBlob,
        clienteNome: formData.clienteNome,
        clienteWhatsapp: formData.clienteWhatsapp.replace(/\D/g, ""),
        servico: formData.servico === "Outro" ? formData.servicoOutro : formData.servico,
        dataEntrega: new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });

      toast({
        title: "Sucesso!",
        description: "Relatório gerado com sucesso",
      });
    } catch (error: any) {
      console.error("Erro completo:", error);
      const errorMessage = error?.message || "Não foi possível gerar o relatório";
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
      setActiveStep("");
      setProgress(0);
    }
  };

  const handleWhatsappShare = () => {
    if (!resultado) return;
    const message = encodeURIComponent(
      `Olá ${resultado.clienteNome}! Segue o relatório de entrega do seu veículo na Glow Car. Obrigado pela preferência! ${resultado.pdfUrl}`
    );
    window.open(`https://wa.me/55${resultado.clienteWhatsapp}?text=${message}`, "_blank");
  };

  const handleEnviarEmail = async () => {
    if (!resultado) return;

    setSendingEmail(true);

    try {
      await enviarEmailComPDF({
        clienteNome: resultado.clienteNome,
        clienteEmail: formData.clienteEmail,
        placa: formData.placa.toUpperCase(),
        servico: resultado.servico,
        pdfUrl: resultado.pdfUrl,
        dataEntrega: resultado.dataEntrega,
      });

      toast({
        title: "Email enviado com sucesso!",
        description: `Relatório enviado para ${formData.clienteEmail}`,
      });
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar email",
        description: "Não foi possível enviar o email. Tente novamente.",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (resultado) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 animate-fade-in text-center">
          <div className="w-20 h-20 mx-auto bg-success/20 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            Relatório gerado com sucesso!
          </h1>

          <div className="space-y-3">
            <Button
              onClick={() => {
                const url = URL.createObjectURL(resultado.pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio-entrega-${formData.placa || 'veiculo'}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="w-full h-14 text-lg btn-gold"
            >
              Baixar PDF
            </Button>

            <Button
              variant="outline"
              onClick={handleEnviarEmail}
              disabled={sendingEmail}
              className="w-full h-12 border-primary text-primary hover:bg-primary/10"
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando email...
                </>
              ) : (
                "Enviar por Email"
              )}
            </Button>

            <Button
              onClick={handleWhatsappShare}
              className="w-full h-14 text-lg btn-whatsapp"
            >
              Compartilhar WhatsApp
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setResultado(null);
                setFormData({
                  placa: "",
                  clienteNome: "",
                  clienteEmail: "",
                  clienteWhatsapp: "",
                  servico: "",
                  servicoOutro: "",
                });
                setFotos([]);
                setFotoPreviews([]);
              }}
              className="w-full h-12 border-border text-muted-foreground hover:bg-secondary"
            >
              Nova Entrega
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-8">
      {/* Header */}
      <header className="border-b border-border bg-card/80 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/painel")}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-foreground">Nova Entrega</h1>
        </div>
      </header>

      {/* Form */}
      <main className="container mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
          {/* Placa */}
          <div className="space-y-2">
            <Label className="text-foreground">Placa do Veículo *</Label>
            <Input
              placeholder="ABC-1234"
              value={formData.placa}
              onChange={(e) => handleInputChange("placa", e.target.value.toUpperCase())}
              required
              className="input-premium h-12 uppercase"
              maxLength={8}
            />
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label className="text-foreground">Nome do Cliente *</Label>
            <Input
              placeholder="Nome completo"
              value={formData.clienteNome}
              onChange={(e) => handleInputChange("clienteNome", e.target.value)}
              required
              className="input-premium h-12"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="text-foreground">Email do Cliente *</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={formData.clienteEmail}
              onChange={(e) => handleInputChange("clienteEmail", e.target.value)}
              required
              className="input-premium h-12"
            />
          </div>

          {/* WhatsApp */}
          <div className="space-y-2">
            <Label className="text-foreground">WhatsApp do Cliente *</Label>
            <Input
              placeholder="(00) 00000-0000"
              value={formData.clienteWhatsapp}
              onChange={(e) =>
                handleInputChange("clienteWhatsapp", formatWhatsapp(e.target.value))
              }
              required
              className="input-premium h-12"
            />
          </div>

          {/* Serviço */}
          <div className="space-y-2">
            <Label className="text-foreground">Serviço Realizado *</Label>
            <Select
              value={formData.servico}
              onValueChange={(value) => handleInputChange("servico", value)}
              required
            >
              <SelectTrigger className="input-premium h-12">
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {SERVICOS.map((servico) => (
                  <SelectItem key={servico} value={servico}>
                    {servico}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.servico === "Outro" && (
            <div className="space-y-2">
              <Label className="text-foreground">Especifique o Serviço *</Label>
              <Input
                placeholder="Descreva o serviço"
                value={formData.servicoOutro}
                onChange={(e) => handleInputChange("servicoOutro", e.target.value)}
                required
                className="input-premium h-12"
              />
            </div>
          )}

          {/* Upload de Fotos */}
          <div className="space-y-3">
            <Label className="text-foreground">
              Fotos do Veículo * ({fotos.length}/10)
            </Label>

            <div className="group relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#1E1E1E] hover:shadow-[0_0_20px_rgba(212,175,55,0.1)] rounded-2xl bg-[#121212] transition-all duration-300 cursor-pointer">

              {/* Opção 1: Galeria / Arquivos (Hero Area) */}
              <div
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full gap-4 z-10"
              >
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#D4AF37]/10 group-hover:bg-[#D4AF37]/20 transition-colors duration-300">
                  <UploadCloud className="w-8 h-8 text-[#D4AF37]" />
                </div>

                <div className="text-center space-y-1">
                  <p className="text-base font-bold text-white font-sans">
                    Clique para adicionar fotos
                  </p>
                  <p className="text-sm font-normal text-[#A0A0A0] font-sans">
                    ou arraste para esta área
                  </p>
                </div>
              </div>

              {/* Divisor Sutil */}
              <div className="w-full max-w-[200px] h-px bg-white/5 my-6" />

              {/* Opção 2: Câmera */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // Evita disparar o clique do container pai se houver overlap
                  cameraInputRef.current?.click();
                }}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-all duration-300 border border-[#D4AF37]/30 hover:border-[#D4AF37] w-full sm:w-auto"
              >
                <Camera className="w-4 h-4" />
                <span>Tirar foto com a câmera</span>
              </button>

              {/* Inputs Ocultos */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*.HEIC,image/*.heic,image/*" // Adicionando suporte explícito se necessário, mas image/* cobre
                multiple
                onChange={handleFotoSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                // @ts-ignore
                capture="environment"
                onChange={handleFotoSelect}
                className="hidden"
              />
            </div>

            {/* Preview Grid */}
            {/* Preview Grid */}
            {fotoPreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8 mb-10">
                {fotoPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-video group animate-fade-in">
                    <img
                      src={preview}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl shadow-lg border border-white/10 transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <button
                      type="button"
                      onClick={() => removeFoto(index)}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-destructive text-white rounded-full flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-colors z-10"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10 pointer-events-none" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="space-y-4">
            {loading && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between text-sm font-medium text-primary">
                  <span>{activeStep}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-primary/10" />
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-16 text-lg btn-gold gold-glow"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Gerando...
                </>
              ) : (
                "Gerar Relatório"
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default NovaEntrega;