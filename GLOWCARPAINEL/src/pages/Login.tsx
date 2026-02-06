import { useState } from "react";
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
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        navigate("/painel");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Conta criada com sucesso!",
          description: "Você já pode fazer login.",
        });
        setMode("login");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });

        if (error) throw error;

        toast({
          title: "Email enviado",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        setMode("login");
      }
    } catch (error: any) {
      console.error("Login error detailed:", error);
      let message = error.message;

      if (error.message.includes("Invalid login credentials")) {
        message = "Email ou senha incorretos";
      } else if (error.message.includes("User already registered")) {
        message = "Este email já está cadastrado. Tente fazer login ou recuperar senha.";
      }

      toast({
        variant: "destructive",
        title: "Erro",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
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
            {mode === "login" && "Login do Sistema"}
            {mode === "signup" && "Criar Nova Conta"}
            {mode === "reset" && "Recuperar Senha"}
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

          {mode !== "reset" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground">
                  Senha
                </Label>
                {mode === "login" && (
                  <Button
                    variant="link"
                    className="px-0 font-normal text-xs text-muted-foreground hover:text-primary"
                    onClick={() => setMode("reset")}
                    type="button"
                  >
                    Esqueci minha senha
                  </Button>
                )}
              </div>
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
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 text-lg btn-gold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                {mode === "login" && "Entrar"}
                {mode === "signup" && "Criar Conta"}
                {mode === "reset" && "Enviar Link"}
              </>
            )}
          </Button>

          <div className="text-center text-sm">
            {mode === "login" ? (
              <p className="text-muted-foreground">
                Não tem uma conta?{" "}
                <Button
                  variant="link"
                  className="p-0 text-primary font-semibold hover:underline"
                  onClick={() => setMode("signup")}
                  type="button"
                >
                  Crie agora
                </Button>
              </p>
            ) : (
              <Button
                variant="link"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setMode("login")}
                type="button"
              >
                Voltar para Login
              </Button>
            )}
          </div>
        </form>

        <p className="text-center text-muted-foreground text-xs">
          © 2025 Glow Car Detailing. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;