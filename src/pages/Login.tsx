import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import logoGlowCar from "@/assets/logo-glow-car.jpeg";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!supabase) {
        toast({
          variant: "destructive",
          title: "Erro de Configuração",
          description: "Cliente Supabase não inicializado",
        });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            variant: "destructive",
            title: "Credenciais inválidas",
            description: "Email ou senha incorretos",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro ao entrar",
            description: error.message,
          });
        }
      } else {
        // Fix iOS/Safari race condition: Wait for session to be fully persisted
        // before navigating, as the storage adapter might be slightly delayed.
        let sessionCheckRetries = 0;
        let sessionPersisted = false;

        while (sessionCheckRetries < 5 && !sessionPersisted) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            sessionPersisted = true;
          } else {
            await new Promise((resolve) => setTimeout(resolve, 100)); // wait 100ms
            sessionCheckRetries++;
          }
        }

        navigate("/painel");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro inesperado",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4">
          <img
            src={logoGlowCar}
            alt="Glow Car Detailing"
            className="w-40 h-40 object-contain rounded-full gold-glow"
          />
          <h1 className="text-2xl font-bold text-primary tracking-wide">
            GLOW CAR DETAILING
          </h1>
          <p className="text-muted-foreground text-sm">
            Sistema de Relatório de Entrega
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-premium h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="input-premium h-12"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 text-lg btn-gold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <p className="text-center text-muted-foreground text-xs">
          © 2025 Glow Car Detailing. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;