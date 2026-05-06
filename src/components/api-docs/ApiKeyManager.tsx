import { useState, useEffect } from "react";
import { 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ShieldAlert,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_four: string;
  environment: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-api-key", {
        method: "GET"
      });

      if (error) throw error;
      setKeys(data.keys || []);
    } catch (error: any) {
      console.error("Error fetching API keys:", error);
      toast({
        title: "Erro ao carregar chaves",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-api-key", {
        method: "POST",
        body: { name: newKeyName, environment: "production" }
      });

      if (error) throw error;

      setRevealedKey(data.key);
      setNewKeyName("");
      fetchKeys();
      
      toast({
        title: "Chave criada com sucesso!",
        description: "Certifique-se de copiá-la agora, ela não será exibida novamente.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar chave",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke("generate-api-key", {
        method: "DELETE",
        body: { id }
      });

      if (error) throw error;

      toast({
        title: "Chave revogada",
        description: "A chave API não poderá mais ser utilizada.",
      });
      fetchKeys();
    } catch (error: any) {
      toast({
        title: "Erro ao revogar chave",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copiado!",
      description: "Chave copiada para a área de transferência.",
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Minhas Chaves de API
              </CardTitle>
              <CardDescription>
                Gerencie seus tokens de acesso para integração via API.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {revealedKey && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 animate-pulse-subtle">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Nova Chave Gerada</span>
                <Button variant="ghost" size="sm" onClick={() => setRevealedKey(null)} className="h-6 text-[10px] uppercase font-black">Fechar</Button>
              </div>
              <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-primary/20">
                <code className="font-mono text-sm flex-1 truncate text-foreground">{revealedKey}</code>
                <Button 
                  size="sm" 
                  onClick={() => copyToClipboard(revealedKey, "new")}
                  className="gradient-primary h-8"
                >
                  {copiedId === "new" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-amber-500" />
                Guarde esta chave em segurança. Por motivos de segurança, ela não será exibida novamente.
              </p>
            </div>
          )}

          <form onSubmit={handleCreateKey} className="flex gap-2">
            <Input 
              placeholder="Nome da chave (ex: Servidor Produção)" 
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="bg-muted/30 border-border/50 h-10"
            />
            <Button type="submit" disabled={isCreating || !newKeyName} className="gradient-primary h-10 px-6 gap-2">
              {isCreating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Gerar Token
            </Button>
          </form>

          <div className="space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
                <p className="text-xs text-muted-foreground animate-pulse">Buscando suas chaves...</p>
              </div>
            ) : keys.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-border bg-muted/20">
                <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">Você ainda não gerou nenhuma chave de API.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Crie sua primeira chave acima para começar a integrar.</p>
              </div>
            ) : (
              <div className="border rounded-xl divide-y bg-muted/10">
                {keys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-4 group transition-colors hover:bg-muted/30">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{key.name}</span>
                        {key.revoked_at && <Badge variant="destructive" className="h-5 text-[9px] font-black uppercase">Revogada</Badge>}
                        {!key.revoked_at && <Badge variant="outline" className="h-5 text-[9px] font-black uppercase border-emerald-500/30 text-emerald-500 bg-emerald-500/5">Ativa</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-[11px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/40">
                          {key.key_prefix}••••{key.last_four}
                        </code>
                        <span className="text-[10px] text-muted-foreground/60">Criada em {new Date(key.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!key.revoked_at && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-border bg-background/95 backdrop-blur-xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revogar Chave API?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação é permanente. Qualquer sistema que utilize a chave <strong className="text-foreground">{key.name}</strong> deixará de funcionar imediatamente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl border-border">Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleRevokeKey(key.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                              >
                                Sim, revogar acesso
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
