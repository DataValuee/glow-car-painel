import { useState, useCallback, useEffect } from "react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ArrowLeft,
  Upload,
  X,
  ImageIcon,
  Loader2,
} from "lucide-react";
import logoGlowCar from "@/assets/logo-glow-car.jpeg";
import { enviarEmailComPDF } from "@/services/emailService";

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
  const [sendingEmail, setSendingEmail] = useState(false);
  const [resultado, setResultado] = useState<{
    pdfUrl: string;
    pdfBlob: Blob;
    clienteNome: string;
    clienteWhatsapp: string;
    servico: string;
    dataEntrega: string;
  } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
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
      (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
    );

    setFotos((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
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
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    // Constants for A4 Page (210mm x 297mm)
    const PAGE_WIDTH = 210;
    const PAGE_HEIGHT = 297;
    const MARGIN = 20;
    const GAP = 10;
    const IMG_WIDTH = (PAGE_WIDTH - (MARGIN * 2) - GAP) / 2; // (210 - 40 - 10) / 2 = 80
    const IMG_HEIGHT = 60;
    const HEADER_HEIGHT = 50;
    const FOOTER_Y = 280;
    const CONTENT_LIMIT = 260; // Max Y before page break (leaves room for footer space)

    const pageWidth = doc.internal.pageSize.getWidth(); // Should be 210

    // --- HEADER (First Page Only) ---
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, pageWidth, HEADER_HEIGHT, "F");

    // Logo
    try {
      const logoImg = await loadImageAsBase64(logoGlowCar);
      doc.addImage(logoImg, "JPEG", pageWidth / 2 - 15, 5, 30, 30);
    } catch (e) {
      console.log("Logo não carregada");
    }

    // Título
    doc.setTextColor(201, 168, 108);
    doc.setFontSize(16);
    doc.text("RELATÓRIO DE ENTREGA", pageWidth / 2, 42, { align: "center" });

    // Data
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(10);
    doc.text(
      `Emitido em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
      pageWidth / 2,
      48,
      { align: "center" }
    );

    // --- CONTENT ---
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    let y = 70; // Start below header

    // Info Block
    doc.setFont("helvetica", "bold");
    doc.text("Placa:", MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(formData.placa.toUpperCase(), MARGIN + 30, y);

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(formData.clienteNome, MARGIN + 30, y);

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Serviço:", MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(formData.servico === "Outro" ? formData.servicoOutro : formData.servico, MARGIN + 30, y);

    // Photos Header
    y += 20;
    doc.setFont("helvetica", "bold");
    doc.text("Fotos do Veículo:", MARGIN, y);
    y += 10;

    // Grid Loop
    let x = MARGIN;

    for (let i = 0; i < fotosUrls.length; i++) {
      // Check for Page Break
      if (y + IMG_HEIGHT > CONTENT_LIMIT) {
        doc.addPage();
        y = MARGIN; // Reset Y to top margin
        x = MARGIN; // Reset X
        // Note: We DO NOT draw the header background on sub-pages
      }

      try {
        const imgData = await loadImageAsBase64(fotosUrls[i]);

        // Draw Image
        doc.addImage(imgData, "JPEG", x, y, IMG_WIDTH, IMG_HEIGHT);

        // Draw Premium Border (Rounded Rect)
        // Set draw color to light gray for subtle effect
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.1);
        doc.roundedRect(x, y, IMG_WIDTH, IMG_HEIGHT, 3, 3, "S"); // S = Stroke

        // Update Position
        if (x === MARGIN) {
          // Move to second column
          x = MARGIN + IMG_WIDTH + GAP;
        } else {
          // Move to next row
          x = MARGIN;
          y += IMG_HEIGHT + GAP;
        }

      } catch (e) {
        console.log("Erro ao adicionar foto:", i);
      }
    }

    // --- FOOTER (Last Page Only) ---
    const pageCount = doc.getNumberOfPages();
    doc.setPage(pageCount);

    // Ensure footer doesn't overlap if content finished exactly at bottom
    // We strictly use y=280 for footer background
    doc.setFillColor(10, 10, 10);
    doc.rect(0, FOOTER_Y, pageWidth, 20, "F");

    doc.setTextColor(201, 168, 108);
    doc.setFontSize(10);
    doc.text("Glow Car Detailing", pageWidth / 2, FOOTER_Y + 8, { align: "center" });

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text("Seu veículo merece brilhar", pageWidth / 2, FOOTER_Y + 13, { align: "center" });

    return doc.output("blob");
  };


  const loadImageAsBase64 = (src: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg"));
      };
      img.onerror = reject;
      img.src = src;
    });
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
      const fotosUrls: string[] = [];
      const timestamp = Date.now();
      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        // Sanitizar nome do arquivo: remover espaços, acentos e caracteres especiais
        const sanitizedName = foto.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove acentos
          .replace(/\s+/g, "_") // Substitui espaços por underscore
          .replace(/[^a-zA-Z0-9._-]/g, "") // Remove caracteres especiais
          .toLowerCase();

        const fileName = `${timestamp}-${i}-${Math.random().toString(36).substring(7)}-${sanitizedName}`;
        const { error } = await supabase.storage
          .from("entregas-fotos")
          .upload(fileName, foto);

        if (error) {
          console.error(`Erro ao fazer upload da foto ${i}:`, error);
          throw error;
        }

        const { data: urlData } = supabase.storage
          .from("entregas-fotos")
          .getPublicUrl(fileName);

        fotosUrls.push(urlData.publicUrl);
      }

      // 2. Gerar PDF
      const pdfBlob = await gerarPDF(fotosUrls);
      const pdfFileName = `entrega-${formData.placa}-${Date.now()}.pdf`;

      // 3. Upload do PDF
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

  if (resultado) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
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
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
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

            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isMobile ? (
                  <>
                    <ImageIcon className="w-8 h-8 text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Toque para selecionar da galeria
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Clique ou arraste as fotos
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFotoSelect}
                className="hidden"
              />
            </label>

            {/* Preview Grid */}
            {fotoPreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {fotoPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-video group">
                    <img
                      src={preview}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl shadow-lg border border-white/10 transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <button
                      type="button"
                      onClick={() => removeFoto(index)}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-destructive text-white rounded-full flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-colors"
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
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-16 text-lg btn-gold gold-glow"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Gerando relatório...
              </>
            ) : (
              "Gerar Relatório"
            )}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default NovaEntrega;