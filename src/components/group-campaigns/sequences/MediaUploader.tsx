import React, { useRef, useState } from "react";
import { Upload, Link2, Loader2, CheckCircle, ExternalLink, X, FileText, Trash2, FolderOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { MediaLibraryPicker } from "./MediaLibraryPicker";
import { MediaItem } from "@/hooks/useMediaLibrary";

type MediaType = "image" | "video" | "audio" | "document" | "sticker";

// Helper functions
const getFilenameFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split('/').pop() || 'arquivo');
  } catch {
    return url.split('/').pop() || 'arquivo';
  }
};

const getFileExtension = (url: string): string => {
  const filename = getFilenameFromUrl(url);
  return filename.split('.').pop()?.toUpperCase() || '';
};

// Media Preview Component
function MediaPreview({ mediaType, url }: { mediaType: MediaType; url: string }) {
  const [hasError, setHasError] = useState(false);

  if (!url || hasError) return null;

  switch (mediaType) {
    case "image":
    case "sticker":
      return (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          <img
            src={url}
            alt="Preview"
            className="w-full h-full object-contain"
            onError={() => setHasError(true)}
          />
        </div>
      );

    case "video":
      return (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
          <video
            src={url}
            controls
            className="w-full h-full object-contain"
            onError={() => setHasError(true)}
          />
        </div>
      );

    case "audio":
      return (
        <div className="p-3 bg-muted rounded-lg">
          <audio
            src={url}
            controls
            className="w-full h-8"
            onError={() => setHasError(true)}
          />
        </div>
      );

    case "document":
      return (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {getFilenameFromUrl(url)}
            </p>
            <p className="text-xs text-muted-foreground">
              {getFileExtension(url)}
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}

interface MediaUploaderProps {
  mediaType: MediaType;
  currentUrl: string;
  onUpload: (url: string, filename?: string) => void;
  onUrlChange: (url: string) => void;
  placeholder?: string;
}

export function MediaUploader({ 
  mediaType, 
  currentUrl, 
  onUpload, 
  onUrlChange,
  placeholder = "https://exemplo.com/arquivo"
}: MediaUploaderProps) {
  const { upload, isUploading, progress, acceptedTypes, maxSizeMB, typesLabel } = useMediaUpload(mediaType);
  const [mode, setMode] = useState<"url" | "upload" | "library">(currentUrl ? "url" : "library");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await upload(file);
    if (result) {
      onUpload(result.url, result.filename);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const result = await upload(file);
    if (result) {
      onUpload(result.url, result.filename);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleLibrarySelect = (item: MediaItem) => {
    onUpload(item.publicUrl, item.filename);
  };

  const clearUrl = () => {
    onUrlChange("");
  };

  const sizeLabel = maxSizeMB >= 1 ? `${maxSizeMB}MB` : `${maxSizeMB * 1000}KB`;

  return (
    <div className="space-y-3">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "url" | "upload" | "library")}>
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="library" className="text-xs">
            <FolderOpen className="h-3 w-3 mr-1.5" />
            Biblioteca
          </TabsTrigger>
          <TabsTrigger value="upload" className="text-xs">
            <Upload className="h-3 w-3 mr-1.5" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs">
            <Link2 className="h-3 w-3 mr-1.5" />
            URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-2">
          <MediaLibraryPicker mediaType={mediaType} onSelect={handleLibrarySelect} />
        </TabsContent>

        <TabsContent value="url" className="mt-2">
          <div className="relative">
            <Input
              placeholder={placeholder}
              value={currentUrl}
              onChange={(e) => onUrlChange(e.target.value)}
              className="pr-8"
            />
            {currentUrl && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={clearUrl}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            className="hidden"
            onChange={handleFileSelect}
          />
          
          <div 
            className={`
              border-2 border-dashed rounded-lg p-4 text-center cursor-pointer 
              transition-colors
              ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
              ${isUploading ? "pointer-events-none" : ""}
            `}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {isUploading ? (
              <div className="space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                <Progress value={progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground">Enviando... {progress}%</p>
              </div>
            ) : (
              <div>
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Clique para selecionar ou arraste
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  {typesLabel} • Máx: {sizeLabel}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Visual + URL */}
      {currentUrl && (
        <div className="space-y-2">
          <MediaPreview mediaType={mediaType} url={currentUrl} />
          
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
            <CheckCircle className="h-3 w-3 text-primary shrink-0" />
            <span className="truncate flex-1 text-muted-foreground">
              {getFilenameFromUrl(currentUrl)}
            </span>
            <a 
              href={currentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="shrink-0 text-primary hover:text-primary/80"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0"
              onClick={clearUrl}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
