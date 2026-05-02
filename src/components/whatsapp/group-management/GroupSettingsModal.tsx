import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Settings } from "lucide-react";

export interface GroupSettingsModalProps {
  instanceId: string;
  groupId: string;
  currentSettings?: { adminOnlyMessage: boolean; adminOnlySettings: boolean; requireAdminApproval: boolean; adminOnlyAddMember: boolean };
  onSuccess?: () => void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const defaultSettings = { adminOnlyMessage: false, adminOnlySettings: false, requireAdminApproval: false, adminOnlyAddMember: false };

export function GroupSettingsModal({ instanceId, groupId, currentSettings, onSuccess, children, open: controlledOpen, onOpenChange }: GroupSettingsModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => { if (!isControlled) setInternalOpen(v); onOpenChange?.(v); };

  const [settings, setSettings] = useState(currentSettings || defaultSettings);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) setSettings(currentSettings || defaultSettings); }, [open, currentSettings]);

  const toggle = (key: keyof typeof settings) => setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("zapi-proxy", {
        body: { instanceId, endpoint: "/update-group-settings", method: "POST", body: { phone: groupId, ...settings } },
      });
      if (error) throw error;
      toast.success("Configurações salvas!");
      onSuccess?.();
      setOpen(false);
    } catch (err) {
      toast.error("Falha ao salvar: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const items = [
    { key: "adminOnlyMessage" as const, icon: "🔒", label: "Somente admins enviam mensagens", desc: "Bloqueia envio para membros comuns" },
    { key: "adminOnlySettings" as const, icon: "⚙", label: "Somente admins editam o grupo", desc: "Nome, foto e descrição" },
    { key: "requireAdminApproval" as const, icon: "✋", label: "Requer aprovação para entrar", desc: "Admin aprova cada novo membro" },
    { key: "adminOnlyAddMember" as const, icon: "👥", label: "Somente admins adicionam membros", desc: "Membros comuns não podem convidar" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {children || <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-2" />Configurações</Button>}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader><DialogTitle>Configurações do Grupo</DialogTitle></DialogHeader>
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={item.key}>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <Switch checked={settings[item.key]} onCheckedChange={() => toggle(item.key)} />
              </div>
              {i < items.length - 1 && <div className="border-t" />}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Configs →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
