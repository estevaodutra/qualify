import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  Video,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Instagram,
  Plus,
  Trash2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import { CriafyContent, CriafyInstagramAccount } from "@/types/criafy";

interface MediaLibraryViewProps {
  accounts: CriafyInstagramAccount[];
  selectedAccountId: string;
  onSelectAccountFilter: (id: string) => void;
}

export function MediaLibraryView({
  accounts,
  selectedAccountId,
  onSelectAccountFilter,
}: MediaLibraryViewProps) {
  const { activeCompanyId } = useCompany();
  const [contents, setContents] = useState<CriafyContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  // Account linkage modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<CriafyContent | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [savingBindings, setSavingBindings] = useState(false);

  useEffect(() => {
    if (activeCompanyId) {
      loadContents();
    }
  }, [activeCompanyId, selectedAccountId]);

  const loadContents = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const data = await criafyService.getContents(activeCompanyId, selectedAccountId);
      setContents(data);
    } catch (err: any) {
      toast.error(`Erro ao carregar conteúdos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeCompanyId) return;

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Upload to storage
        const { mediaUrl, mediaType, mimeType } = await criafyService.uploadMediaFile(
          activeCompanyId,
          file
        );

        // Bind automatically to current account filter if selected, or all accounts
        const defaultAccounts =
          selectedAccountId !== "all" ? [selectedAccountId] : accounts.map((a) => a.id);

        await criafyService.createContent(
          {
            company_id: activeCompanyId,
            title: file.name,
            media_url: mediaUrl,
            media_type: mediaType,
            mime_type: mimeType,
            file_size_bytes: file.size,
          },
          defaultAccounts
        );

        successCount++;
      } catch (err) {
        console.error("Erro no upload do arquivo:", file.name, err);
        failCount++;
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} arquivo(s) adicionado(s) à biblioteca de mídias!`);
      loadContents();
    }
    if (failCount > 0) {
      toast.error(`Falha no upload de ${failCount} arquivo(s).`);
    }
    // Reset file input
    e.target.value = "";
  };

  const openLinkModal = (content: CriafyContent) => {
    setSelectedContent(content);
    setSelectedAccountIds(content.linked_account_ids || []);
    setLinkModalOpen(true);
  };

  const handleSaveBindings = async () => {
    if (!selectedContent || !activeCompanyId) return;
    setSavingBindings(true);
    try {
      await criafyService.updateContentAccountBindings(
        activeCompanyId,
        selectedContent.id,
        selectedAccountIds
      );
      toast.success("Vínculo de contas atualizado!");
      setLinkModalOpen(false);
      loadContents();
    } catch (err: any) {
      toast.error(`Erro ao atualizar vínculo: ${err.message}`);
    } finally {
      setSavingBindings(false);
    }
  };

  const handleArchive = async (contentId: string) => {
    try {
      await criafyService.archiveContent(contentId);
      toast.success("Conteúdo arquivado!");
      loadContents();
    } catch (err: any) {
      toast.error(`Erro ao arquivar: ${err.message}`);
    }
  };

  const filteredContents = contents.filter((c) =>
    (c.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/30 p-4 rounded-xl border border-muted">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar conteúdos..."
              className="pl-9 bg-background h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-48">
            <Select value={selectedAccountId} onValueChange={onSelectAccountFilter}>
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Filtrar por Conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    @{acc.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label
            htmlFor="batch-upload"
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs shadow-sm hover:opacity-90 transition-all"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload em Lote (Imagens / Vídeos)
          </Label>
          <Input
            id="batch-upload"
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleBatchUpload}
            disabled={uploading}
          />
        </div>
      </div>

      {/* Grid of Media Contents */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredContents.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed rounded-xl bg-card">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-base mb-1">Nenhum conteúdo na biblioteca</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
            Faça upload em lote de vídeos e imagens para começar a alimentar a biblioteca da sua empresa no Criafy.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredContents.map((content) => (
            <Card key={content.id} className="overflow-hidden group hover:shadow-md transition-all">
              <div className="relative aspect-square bg-muted/50 flex items-center justify-center overflow-hidden">
                {content.media_type === "VIDEO" ? (
                  <video
                    src={content.media_url}
                    className="w-full h-full object-cover"
                    controls={false}
                  />
                ) : (
                  <img
                    src={content.media_url}
                    alt={content.title || "Mídia Criafy"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                  />
                )}

                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <Badge variant="secondary" className="bg-black/60 text-white text-[10px] backdrop-blur-sm border-0">
                    {content.media_type === "VIDEO" ? (
                      <Video className="w-3 h-3 mr-1 text-sky-400" />
                    ) : (
                      <ImageIcon className="w-3 h-3 mr-1 text-emerald-400" />
                    )}
                    {content.media_type}
                  </Badge>
                </div>

                <div className="absolute top-2 right-2">
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] backdrop-blur-sm"
                  >
                    Meta Validado
                  </Badge>
                </div>
              </div>

              <CardContent className="p-3 space-y-2">
                <div className="truncate font-medium text-xs" title={content.title}>
                  {content.title || "Conteúdo sem título"}
                </div>

                <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground pt-1 border-t border-muted">
                  <button
                    type="button"
                    onClick={() => openLinkModal(content)}
                    className="flex items-center gap-1 text-primary hover:underline font-medium"
                  >
                    <Instagram className="w-3 h-3" />
                    {content.linked_account_ids?.length || 0} conta(s)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleArchive(content.id)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                    title="Arquivar conteúdo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Account Bindings Modal */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Vincular Conteúdo às Contas</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione quais contas do Instagram poderão utilizar esta mídia para publicações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[300px] overflow-y-auto">
            {accounts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma conta conectada.
              </p>
            ) : (
              accounts.map((acc) => {
                const isChecked = selectedAccountIds.includes(acc.id);
                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-muted hover:bg-muted/30 cursor-pointer"
                    onClick={() => {
                      if (isChecked) {
                        setSelectedAccountIds(selectedAccountIds.filter((id) => id !== acc.id));
                      } else {
                        setSelectedAccountIds([...selectedAccountIds, acc.id]);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center text-xs font-bold">
                        @{acc.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold">@{acc.username}</p>
                        <p className="text-[10px] text-muted-foreground">{acc.name || "Conta Instagram"}</p>
                      </div>
                    </div>
                    <Checkbox checked={isChecked} />
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setLinkModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveBindings} disabled={savingBindings}>
              {savingBindings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Vínculos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
