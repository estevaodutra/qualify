import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type MediaType = "image" | "video" | "audio" | "document" | "sticker";

export interface MediaItem {
  id: string;
  userId: string;
  filename: string;
  storagePath: string;
  publicUrl: string;
  mediaType: MediaType;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

interface DbMediaItem {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  public_url: string;
  media_type: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}

const transformMediaItem = (item: DbMediaItem): MediaItem => ({
  id: item.id,
  userId: item.user_id,
  filename: item.filename,
  storagePath: item.storage_path,
  publicUrl: item.public_url,
  mediaType: item.media_type as MediaType,
  mimeType: item.mime_type,
  fileSize: item.file_size,
  createdAt: item.created_at,
});

export function useMediaLibrary(mediaType?: MediaType) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mediaItems, isLoading, refetch } = useQuery({
    queryKey: ["media-library", user?.id, mediaType],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("user_media_library")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (mediaType) {
        query = query.eq("media_type", mediaType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data as DbMediaItem[]).map(transformMediaItem);
    },
    enabled: !!user,
  });

  const addToLibraryMutation = useMutation({
    mutationFn: async (item: {
      filename: string;
      storagePath: string;
      publicUrl: string;
      mediaType: MediaType;
      mimeType?: string;
      fileSize?: number;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("user_media_library").insert({
        user_id: user.id,
        filename: item.filename,
        storage_path: item.storagePath,
        public_url: item.publicUrl,
        media_type: item.mediaType,
        mime_type: item.mimeType || null,
        file_size: item.fileSize || null,
      });

      if (error) {
        // Ignorar erro de duplicata
        if (error.code === "23505") {
          return;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
    },
    onError: (error) => {
      console.error("Erro ao adicionar à biblioteca:", error);
    },
  });

  const deleteFromLibraryMutation = useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      if (!user) throw new Error("Usuário não autenticado");

      // Deletar do Storage
      const { error: storageError } = await supabase.storage
        .from("sequence-media")
        .remove([storagePath]);

      if (storageError) {
        console.error("Erro ao deletar do storage:", storageError);
      }

      // Deletar do banco
      const { error: dbError } = await supabase
        .from("user_media_library")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
      toast({ title: "Arquivo removido da biblioteca" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover arquivo",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const searchMedia = async (query: string): Promise<MediaItem[]> => {
    if (!user) return [];

    let dbQuery = supabase
      .from("user_media_library")
      .select("*")
      .eq("user_id", user.id)
      .ilike("filename", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (mediaType) {
      dbQuery = dbQuery.eq("media_type", mediaType);
    }

    const { data, error } = await dbQuery;
    if (error) throw error;

    return (data as DbMediaItem[]).map(transformMediaItem);
  };

  return {
    mediaItems: mediaItems || [],
    isLoading,
    refetch,
    addToLibrary: addToLibraryMutation.mutateAsync,
    deleteFromLibrary: deleteFromLibraryMutation.mutateAsync,
    isDeleting: deleteFromLibraryMutation.isPending,
    searchMedia,
  };
}
