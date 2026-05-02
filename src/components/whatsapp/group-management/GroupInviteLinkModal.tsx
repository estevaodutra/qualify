import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, ExternalLink, Copy } from "lucide-react";

export interface GroupInviteLinkModalProps {
  instanceId: string;
  groupId: string;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GroupInviteLinkModal({ instanceId, groupId, children, open: controlledOpen, onOpenChange }: GroupInviteLinkModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => { if (!isControlled) setInternalOpen(v); onOpenChange?.(v); };

  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setLink(null);
    supabase.functions.invoke("zapi-proxy", { body: { instanceId, endpoint: `/group-invitation-link/${groupId}`, method: "GET" } })
      .then(({ data, error: fnError }) => { if (fnError) throw fnError; setLink(data?.invitationLink || ""); })
      .catch((err) => setError((err as Error).message || "Falha ao buscar link"))
      .finally(() => setLoading(false));
  }, [open, instanceId, groupId]);

  const copyLink = () => { if (!link) return; navigator.clipboard.writeText(link); toast.success("Link copiado!"); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {children || <Button variant="outline" size="sm"><Link className="h-4 w-4 mr-2" />Link de Convite</Button>}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader><DialogTitle>Link de Convite do Grupo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {loading && <Skeleton className="h-10 w-full" />}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {link && (
            <>
              <Input value={link} readOnly className="font-mono text-xs" />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={copyLink}><Copy className="h-4 w-4 mr-2" />Copiar Link</Button>
                <Button variant="outline" className="flex-1" onClick={() => window.open(link, "_blank")}><ExternalLink className="h-4 w-4 mr-2" />Abrir Link</Button>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
