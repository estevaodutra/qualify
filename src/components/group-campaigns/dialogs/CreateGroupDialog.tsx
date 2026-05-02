import { useState } from "react";
import { useInstances } from "@/hooks/useInstances";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Link2 } from "lucide-react";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    name: string;
    instanceId?: string;
    groupName?: string;
    groupDescription?: string;
  }) => Promise<void>;
  isCreating: boolean;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: CreateGroupDialogProps) {
  const { instances } = useInstances();
  const connectedInstances = instances.filter((i) => i.status === "connected");

  const [mode, setMode] = useState<"create" | "connect">("create");
  const [name, setName] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupJid, setGroupJid] = useState("");

  const handleSubmit = async () => {
    await onCreate({
      name: name || groupName || "Nova Campanha",
      instanceId: instanceId || undefined,
      groupName: mode === "create" ? groupName : undefined,
      groupDescription: mode === "create" ? groupDescription : undefined,
    });
    
    // Reset form
    setName("");
    setInstanceId("");
    setGroupName("");
    setGroupDescription("");
    setGroupJid("");
    onOpenChange(false);
  };

  const isValid = name.trim() || groupName.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Campanha de Grupo</DialogTitle>
          <DialogDescription>
            Crie um novo grupo ou conecte a um grupo existente do WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "create" | "connect")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Novo Grupo
            </TabsTrigger>
            <TabsTrigger value="connect" className="gap-2">
              <Link2 className="h-4 w-4" />
              Conectar Existente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Nome da Campanha *</Label>
              <Input
                id="campaign-name"
                placeholder="Ex: Grupo de Vendas VIP"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instance">Instância WhatsApp</Label>
              <Select value={instanceId} onValueChange={setInstanceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância" />
                </SelectTrigger>
                <SelectContent>
                  {connectedInstances.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      {instance.name} {instance.phoneNumber ? `(${instance.phoneNumber})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Opcional. Pode ser configurado depois.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-name">Nome do Grupo WhatsApp</Label>
              <Input
                id="group-name"
                placeholder="Nome que aparecerá no WhatsApp"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-desc">Descrição do Grupo</Label>
              <Textarea
                id="group-desc"
                placeholder="Descrição que aparecerá no grupo..."
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="connect" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name-connect">Nome da Campanha *</Label>
              <Input
                id="campaign-name-connect"
                placeholder="Ex: Meu Grupo Existente"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instance-connect">Instância WhatsApp *</Label>
              <Select value={instanceId} onValueChange={setInstanceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância" />
                </SelectTrigger>
                <SelectContent>
                  {connectedInstances.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      {instance.name} {instance.phoneNumber ? `(${instance.phoneNumber})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-jid">ID do Grupo (JID)</Label>
              <Input
                id="group-jid"
                placeholder="Ex: 5511999999999-1234567890@g.us"
                value={groupJid}
                onChange={(e) => setGroupJid(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para selecionar da lista de grupos após criar.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating || !isValid}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Campanha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
