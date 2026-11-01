import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Paperclip,
  Download,
  ExternalLink,
  Search,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  File,
  X,
  CheckCircle2,
} from "lucide-react";
import { SprintAttachment } from "../types";
import { formatBytes, downloadSprintFile, getFileExtension } from "../utils/sprintFileUtils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SprintFilesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  attachments: SprintAttachment[];
  onOpenCard?: (cardId: string) => void;
}

export function getFileCategoryIcon(filename: string, fileType?: string | null) {
  const ext = getFileExtension(filename);
  const type = (fileType || "").toLowerCase();

  if (type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
    return <FileImage className="h-4 w-4 text-purple-500" />;
  }
  if (
    type.includes("sheet") ||
    type.includes("excel") ||
    type.includes("csv") ||
    ["xls", "xlsx", "csv"].includes(ext)
  ) {
    return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
  }
  if (
    type.includes("zip") ||
    type.includes("tar") ||
    type.includes("rar") ||
    type.includes("7z") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(ext)
  ) {
    return <FileArchive className="h-4 w-4 text-amber-500" />;
  }
  if (
    type.includes("javascript") ||
    type.includes("typescript") ||
    type.includes("json") ||
    ["js", "ts", "tsx", "jsx", "html", "css", "json", "sql"].includes(ext)
  ) {
    return <FileCode className="h-4 w-4 text-cyan-500" />;
  }
  if (type.includes("pdf") || ext === "pdf") {
    return <FileText className="h-4 w-4 text-rose-500" />;
  }
  if (type.includes("word") || ["doc", "docx"].includes(ext)) {
    return <FileText className="h-4 w-4 text-blue-500" />;
  }
  return <File className="h-4 w-4 text-muted-foreground" />;
}

export const SprintFilesDialog: React.FC<SprintFilesDialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  attachments,
  onOpenCard,
}) => {
  const [search, setSearch] = useState("");

  const filteredAttachments = useMemo(() => {
    if (!search.trim()) return attachments;
    const q = search.toLowerCase();
    return attachments.filter(
      (a) =>
        a.file_name.toLowerCase().includes(q) ||
        (a.card_title && a.card_title.toLowerCase().includes(q)) ||
        (a.checklist_item_title && a.checklist_item_title.toLowerCase().includes(q)) ||
        (a.uploader_name && a.uploader_name.toLowerCase().includes(q))
    );
  }, [attachments, search]);

  const totalSize = useMemo(() => {
    return attachments.reduce((acc, curr) => acc + (curr.file_size || 0), 0);
  }, [attachments]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        <DialogHeader className="p-4 md:p-5 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Paperclip className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base md:text-lg font-bold text-foreground truncate">
                  {title}
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {subtitle && <span className="truncate">{subtitle}</span>}
                  <span>•</span>
                  <span>
                    {attachments.length} {attachments.length === 1 ? "arquivo" : "arquivos"}
                  </span>
                  {totalSize > 0 && (
                    <>
                      <span>•</span>
                      <span>{formatBytes(totalSize)} total</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Busca de Arquivos */}
          {attachments.length > 2 && (
            <div className="relative mt-3">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome do arquivo, cartão ou responsável..."
                className="pl-9 h-8 text-xs bg-background"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Lista de Arquivos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredAttachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                <Paperclip className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="font-semibold text-sm text-foreground">
                {search ? "Nenhum arquivo encontrado para a busca" : "Nenhum arquivo anexado ainda"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                {search
                  ? "Tente buscar com outros termos."
                  : "Arquivos enviados em itens de checklist ou em comentários do cartão aparecerão listados aqui para download."}
              </p>
            </div>
          ) : (
            filteredAttachments.map((attachment) => {
              const isImage = (attachment.file_type || "").startsWith("image/") ||
                ["png", "jpg", "jpeg", "webp", "gif"].includes(getFileExtension(attachment.file_name));

              return (
                <div
                  key={attachment.id}
                  className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/30 hover:border-primary/40 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Thumbnail ou Ícone */}
                    {isImage ? (
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted border border-border shrink-0 relative flex items-center justify-center">
                        <img
                          src={attachment.file_url}
                          alt={attachment.file_name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted/80 border border-border flex items-center justify-center shrink-0">
                        {getFileCategoryIcon(attachment.file_name, attachment.file_type)}
                      </div>
                    )}

                    {/* Detalhes do Arquivo */}
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-medium text-sm text-foreground truncate select-text"
                        title={attachment.file_name}
                      >
                        {attachment.file_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                        {attachment.file_size ? (
                          <span>{formatBytes(attachment.file_size)}</span>
                        ) : null}

                        {attachment.created_at && (
                          <>
                            <span>•</span>
                            <span>{format(new Date(attachment.created_at), "dd/MM/yyyy HH:mm")}</span>
                          </>
                        )}

                        {attachment.card_title && (
                          <>
                            <span>•</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-4 text-[10px] px-1.5 font-normal max-w-[160px] truncate",
                                onOpenCard && "cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                              )}
                              onClick={() => {
                                if (onOpenCard) {
                                  onOpenCard(attachment.card_id);
                                  onClose();
                                }
                              }}
                              title={`Abrir cartão: ${attachment.card_title}`}
                            >
                              Cartão: {attachment.card_title}
                            </Badge>
                          </>
                        )}

                        {attachment.checklist_item_title && (
                          <Badge
                            variant="secondary"
                            className="h-4 text-[10px] px-1.5 font-normal max-w-[160px] truncate bg-primary/10 text-primary border-0"
                            title={`Item: ${attachment.checklist_item_title}`}
                          >
                            Item: {attachment.checklist_item_title}
                          </Badge>
                        )}

                        {attachment.comment_id && (
                          <Badge
                            variant="secondary"
                            className="h-4 text-[10px] px-1.5 font-normal bg-muted text-muted-foreground border-0"
                          >
                            Comentário
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/10 border-primary/30"
                      onClick={() => downloadSprintFile(attachment.file_url, attachment.file_name)}
                      title="Fazer download deste arquivo"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Baixar</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => window.open(attachment.file_url, "_blank", "noopener,noreferrer")}
                      title="Abrir arquivo em nova aba"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
