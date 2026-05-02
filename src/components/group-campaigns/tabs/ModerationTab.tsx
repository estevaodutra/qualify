import { useState } from "react";
import { useGroupModeration, ModerationRule, RuleType, ModerationAction } from "@/hooks/useGroupModeration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquareOff,
  Link2Off,
  ImageOff,
  Zap,
  Shield,
  AlertTriangle,
  Loader2,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ModerationTabProps {
  campaignId: string;
}

export function ModerationTab({ campaignId }: ModerationTabProps) {
  const {
    rules,
    logs,
    bannedWordsRule,
    linkBlockRule,
    mediaBlockRule,
    floodLimitRule,
    isLoading,
    createRule,
    updateRule,
    isCreating,
    isUpdating,
  } = useGroupModeration(campaignId);

  // Local state for form
  const [bannedWords, setBannedWords] = useState(
    bannedWordsRule?.config.words?.join("\n") || ""
  );
  const [bannedWordsAction, setBannedWordsAction] = useState<ModerationAction>(
    bannedWordsRule?.action || "delete"
  );
  const [linkBlockEnabled, setLinkBlockEnabled] = useState(linkBlockRule?.active ?? false);
  const [linkBlockAction, setLinkBlockAction] = useState<ModerationAction>(
    linkBlockRule?.action || "delete"
  );
  const [mediaBlockEnabled, setMediaBlockEnabled] = useState(mediaBlockRule?.active ?? false);
  const [mediaBlockAction, setMediaBlockAction] = useState<ModerationAction>(
    mediaBlockRule?.action || "delete"
  );
  const [floodEnabled, setFloodEnabled] = useState(floodLimitRule?.active ?? false);
  const [floodLimit, setFloodLimit] = useState(
    floodLimitRule?.config.maxMessagesPerMinute || 10
  );
  const [floodAction, setFloodAction] = useState<ModerationAction>(
    floodLimitRule?.action || "mute"
  );
  const [adminExempt, setAdminExempt] = useState(
    bannedWordsRule?.config.adminExempt ?? true
  );
  const [maxStrikes, setMaxStrikes] = useState(
    floodLimitRule?.config.maxStrikes || 3
  );
  const [strikeResetDays, setStrikeResetDays] = useState(
    floodLimitRule?.config.strikeResetDays || 7
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Banned words
      const words = bannedWords.split("\n").map((w) => w.trim()).filter(Boolean);
      if (bannedWordsRule) {
        await updateRule({
          id: bannedWordsRule.id,
          updates: {
            config: { words, adminExempt },
            action: bannedWordsAction,
            active: words.length > 0,
          },
        });
      } else if (words.length > 0) {
        await createRule({
          ruleType: "banned_words",
          config: { words, adminExempt },
          action: bannedWordsAction,
        });
      }

      // Link block
      if (linkBlockRule) {
        await updateRule({
          id: linkBlockRule.id,
          updates: {
            config: { adminExempt },
            action: linkBlockAction,
            active: linkBlockEnabled,
          },
        });
      } else if (linkBlockEnabled) {
        await createRule({
          ruleType: "link_block",
          config: { adminExempt },
          action: linkBlockAction,
        });
      }

      // Media block
      if (mediaBlockRule) {
        await updateRule({
          id: mediaBlockRule.id,
          updates: {
            config: { adminExempt },
            action: mediaBlockAction,
            active: mediaBlockEnabled,
          },
        });
      } else if (mediaBlockEnabled) {
        await createRule({
          ruleType: "media_block",
          config: { adminExempt },
          action: mediaBlockAction,
        });
      }

      // Flood limit
      if (floodLimitRule) {
        await updateRule({
          id: floodLimitRule.id,
          updates: {
            config: { maxMessagesPerMinute: floodLimit, adminExempt, maxStrikes, strikeResetDays },
            action: floodAction,
            active: floodEnabled,
          },
        });
      } else if (floodEnabled) {
        await createRule({
          ruleType: "flood_limit",
          config: { maxMessagesPerMinute: floodLimit, adminExempt, maxStrikes, strikeResetDays },
          action: floodAction,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const actionLabels: Record<ModerationAction, string> = {
    delete: "Deletar mensagem",
    warn: "Advertir",
    strike: "Adicionar strike",
    mute: "Silenciar",
    remove: "Remover do grupo",
  };

  const logActionColors: Record<string, string> = {
    delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    warn: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    strike: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    mute: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    remove: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="adminExempt">Administradores isentos de moderação</Label>
            <Switch
              id="adminExempt"
              checked={adminExempt}
              onCheckedChange={setAdminExempt}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Máximo de strikes antes de remoção</Label>
              <Input
                type="number"
                min={1}
                value={maxStrikes}
                onChange={(e) => setMaxStrikes(parseInt(e.target.value) || 3)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reset de strikes após (dias)</Label>
              <Input
                type="number"
                min={1}
                value={strikeResetDays}
                onChange={(e) => setStrikeResetDays(parseInt(e.target.value) || 7)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Banned Words */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareOff className="h-5 w-5" />
            Palavras Banidas
          </CardTitle>
          <CardDescription>
            Mensagens contendo essas palavras serão moderadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Lista de palavras (uma por linha)</Label>
            <Textarea
              placeholder="palavra1&#10;palavra2&#10;palavra3"
              value={bannedWords}
              onChange={(e) => setBannedWords(e.target.value)}
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label>Ação ao detectar</Label>
            <Select value={bannedWordsAction} onValueChange={(v) => setBannedWordsAction(v as ModerationAction)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delete">Deletar mensagem</SelectItem>
                <SelectItem value="warn">Advertir membro</SelectItem>
                <SelectItem value="strike">Adicionar strike</SelectItem>
                <SelectItem value="mute">Silenciar membro</SelectItem>
                <SelectItem value="remove">Remover do grupo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Link Block */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2Off className="h-5 w-5" />
              <CardTitle>Bloqueio de Links</CardTitle>
            </div>
            <Switch checked={linkBlockEnabled} onCheckedChange={setLinkBlockEnabled} />
          </div>
          <CardDescription>
            Bloquear envio de links no grupo.
          </CardDescription>
        </CardHeader>
        {linkBlockEnabled && (
          <CardContent>
            <div className="space-y-2">
              <Label>Ação ao detectar</Label>
              <Select value={linkBlockAction} onValueChange={(v) => setLinkBlockAction(v as ModerationAction)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delete">Deletar mensagem</SelectItem>
                  <SelectItem value="warn">Advertir membro</SelectItem>
                  <SelectItem value="strike">Adicionar strike</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Media Block */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageOff className="h-5 w-5" />
              <CardTitle>Bloqueio de Mídia</CardTitle>
            </div>
            <Switch checked={mediaBlockEnabled} onCheckedChange={setMediaBlockEnabled} />
          </div>
          <CardDescription>
            Bloquear envio de imagens, vídeos e áudios.
          </CardDescription>
        </CardHeader>
        {mediaBlockEnabled && (
          <CardContent>
            <div className="space-y-2">
              <Label>Ação ao detectar</Label>
              <Select value={mediaBlockAction} onValueChange={(v) => setMediaBlockAction(v as ModerationAction)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delete">Deletar mensagem</SelectItem>
                  <SelectItem value="warn">Advertir membro</SelectItem>
                  <SelectItem value="strike">Adicionar strike</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Flood Limit */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <CardTitle>Anti-Flood</CardTitle>
            </div>
            <Switch checked={floodEnabled} onCheckedChange={setFloodEnabled} />
          </div>
          <CardDescription>
            Limitar quantidade de mensagens por minuto.
          </CardDescription>
        </CardHeader>
        {floodEnabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Máximo de mensagens por minuto</Label>
              <Input
                type="number"
                min={1}
                value={floodLimit}
                onChange={(e) => setFloodLimit(parseInt(e.target.value) || 10)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ação ao exceder</Label>
              <Select value={floodAction} onValueChange={(v) => setFloodAction(v as ModerationAction)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warn">Advertir membro</SelectItem>
                  <SelectItem value="mute">Silenciar membro</SelectItem>
                  <SelectItem value="strike">Adicionar strike</SelectItem>
                  <SelectItem value="remove">Remover do grupo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Configurações
        </Button>
      </div>

      {/* Moderation Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Log de Moderações
          </CardTitle>
          <CardDescription>
            Histórico das últimas 100 ações de moderação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma moderação registrada ainda.
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(log.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{log.memberPhone || "-"}</TableCell>
                      <TableCell>
                        <Badge className={logActionColors[log.action] || ""}>
                          {actionLabels[log.action as ModerationAction] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.reason || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
