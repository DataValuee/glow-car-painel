import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, FileText, Loader2, Download, Mail, MessageCircle, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoGlowCar from "@/assets/logo-glow-car.jpeg";
import { enviarEmailComPDF } from "@/services/emailService";

interface Entrega {
  id: string;
  placa_veiculo: string;
  cliente_nome: string;
  vendedor_numero: string;
  data_hora: string | null;
  pdf_url: string;
  status: string;
}

const Painel = () => {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchEntregas();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        navigate("/login", { replace: true });
        return;
      }

      setUserName(session.user.email?.split("@")[0] || "Funcionário");
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const fetchEntregas = async () => {
    try {
      const { data, error } = await supabase
        .from("entregas")
        .select("*")
        .order("data_hora", { ascending: false })
        .limit(10);

      if (error) throw error;
      setEntregas(data || []);
    } catch (error) {
      console.error("Erro ao buscar entregas:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as entregas",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedEntrega) return;

    try {
      const response = await fetch(selectedEntrega.pdf_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${selectedEntrega.placa_veiculo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: "O PDF está sendo baixado",
      });
    } catch (error) {
      console.error("Erro no download:", error);
      toast({
        variant: "destructive",
        title: "Erro no download",
        description: "Tente novamente",
      });
    }
  };

  const handleWhatsAppShare = () => {
    if (!selectedEntrega) return;

    const message = encodeURIComponent(
      `Olá ${selectedEntrega.cliente_nome}! Segue o relatório de entrega do seu veículo ${selectedEntrega.placa_veiculo} na Glow Car Detailing. Obrigado pela preferência! 🚗✨\n\n${selectedEntrega.pdf_url}`
    );

    const whatsappNumber = selectedEntrega.vendedor_numero?.replace(/\D/g, "") || "";
    window.open(`https://wa.me/55${whatsappNumber}?text=${message}`, "_blank");
  };

  const handleSendEmail = async () => {
    if (!selectedEntrega || !emailInput) return;

    setSendingEmail(true);

    try {
      await enviarEmailComPDF({
        clienteNome: selectedEntrega.cliente_nome,
        clienteEmail: emailInput,
        placa: selectedEntrega.placa_veiculo,
        servico: "Serviço realizado",
        pdfUrl: selectedEntrega.pdf_url,
        dataEntrega: formatDate(selectedEntrega.data_hora),
      });

      toast({
        title: "Email enviado com sucesso!",
        description: `Relatório enviado para ${emailInput}`,
      });

      setEmailModalOpen(false);
      setEmailInput("");
    } catch (error: any) {
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
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoGlowCar}
              alt="Glow Car"
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p className="text-sm text-muted-foreground">Olá,</p>
              <p className="font-semibold text-primary">{userName}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {/* Nova Entrega Button */}
        <Button
          onClick={() => navigate("/painel/nova-entrega")}
          className="w-full h-16 text-lg btn-gold gold-glow"
        >
          <Plus className="w-6 h-6 mr-2" />
          Nova Entrega
        </Button>

        {/* Entregas List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Últimas Entregas
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : entregas.length === 0 ? (
            <Card className="card-premium p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhuma entrega registrada ainda
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {entregas.map((entrega) => (
                <Card
                  key={entrega.id}
                  className="card-premium p-4 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-primary">
                        {entrega.placa_veiculo}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                        {entrega.status}
                      </span>
                    </div>
                    <p className="text-sm text-foreground truncate">
                      {entrega.cliente_nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(entrega.data_hora)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEntrega(entrega)}
                    className="ml-3 border-primary/50 text-primary hover:bg-primary/10"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Ver PDF
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Ações do PDF */}
      <Dialog open={!!selectedEntrega} onOpenChange={() => setSelectedEntrega(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Relatório - {selectedEntrega?.placa_veiculo}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview do PDF */}
            <div className="bg-muted rounded-lg p-4 text-center">
              <FileText className="w-16 h-16 mx-auto text-primary mb-2" />
              <p className="text-sm text-foreground font-medium">
                {selectedEntrega?.cliente_nome}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(selectedEntrega?.data_hora || null)}
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-3">
              <Button
                onClick={handleDownloadPDF}
                className="w-full h-12 btn-gold"
              >
                <Download className="w-5 h-5 mr-2" />
                Baixar PDF
              </Button>

              <Button
                variant="outline"
                onClick={() => setEmailModalOpen(true)}
                className="w-full h-12 border-primary text-primary hover:bg-primary/10"
              >
                <Mail className="w-5 h-5 mr-2" />
                Enviar por Email
              </Button>

              <Button
                onClick={handleWhatsAppShare}
                className="w-full h-12 btn-whatsapp"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Compartilhar WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Email */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Enviar por Email</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Email do destinatário</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="input-premium"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setEmailModalOpen(false)}
                className="flex-1 border-border text-muted-foreground"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={!emailInput || sendingEmail}
                className="flex-1 btn-gold"
              >
                {sendingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Painel;
