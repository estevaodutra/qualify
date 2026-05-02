import React, { useState } from "react";
import { Search, Trash2, FileText, Music, Video, Image as ImageIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaLibrary, MediaItem, MediaType } from "@/hooks/useMediaLibrary";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MediaLibraryPickerProps {
  mediaType: MediaType;
  onSelect: (item: MediaItem) => void;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaIcon({ mediaType }: { mediaType: MediaType }) {
  const iconClass = "h-8 w-8 text-muted-foreground";
  switch (mediaType) {
    case "image":
    case "sticker":
      return <ImageIcon className={iconClass} />;
    case "video":
      return <Video className={iconClass} />;
    case "audio":
      return <Music className={iconClass} />;
    case "document":
      return <FileText className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
}

function MediaThumbnail({ item }: { item: MediaItem }) {
  const [hasError, setHasError] = useState(false);

  if (item.mediaType === "image" || item.mediaType === "sticker") {
    if (hasError) {
      return <MediaIcon mediaType={item.mediaType} />;
    }
    return (
      <img
        src={item.publicUrl}
        alt={item.filename}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    );
  }

  if (item.mediaType === "video") {
    if (hasError) {
      return <MediaIcon mediaType={item.mediaType} />;
    }
    return (
      <video
        src={item.publicUrl}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    );
  }

  return <MediaIcon mediaType={item.mediaType} />;
}

export function MediaLibraryPicker({ mediaType, onSelect }: MediaLibraryPickerProps) {
  const { mediaItems, isLoading, deleteFromLibrary, isDeleting } = useMediaLibrary(mediaType);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteItem, setDeleteItem] = useState<MediaItem | null>(null);

  const filteredItems = searchQuery
    ? mediaItems.filter((item) =>
        item.filename.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mediaItems;

  const handleDelete = async () => {
    if (!deleteItem) return;
    await deleteFromLibrary({ id: deleteItem.id, storagePath: deleteItem.storagePath });
    setDeleteItem(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar arquivos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          {searchQuery ? "Nenhum arquivo encontrado" : "Nenhum arquivo na biblioteca"}
        </div>
      ) : (
        <ScrollArea className="h-[200px]">
          <div className="grid grid-cols-3 gap-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "group relative border rounded-lg overflow-hidden cursor-pointer",
                  "hover:border-primary hover:ring-1 hover:ring-primary/50",
                  "transition-all"
                )}
                onClick={() => onSelect(item)}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-muted flex items-center justify-center">
                  <MediaThumbnail item={item} />
                </div>

                {/* Info */}
                <div className="p-1.5 bg-background">
                  <p className="text-xs font-medium truncate" title={item.filename}>
                    {item.filename}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSize(item.fileSize)}
                  </p>
                </div>

                {/* Delete button (hover) */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteItem(item);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo "{deleteItem?.filename}" será removido permanentemente da sua biblioteca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
