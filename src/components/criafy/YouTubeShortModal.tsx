import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { criafyService } from "@/services/criafy/criafyService";
import type { CriafyContent, CriafySocialAccount, CriafyYouTubeShortOptions } from "@/types/criafy";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; companyId: string;
  account: CriafySocialAccount | null };

export function YouTubeShortModal({ open, onOpenChange, companyId, account }: Props) {
  const requestRef = useRef<{ fingerprint: string; id: string } | null>(null);
  const [videos, setVideos] = useState<CriafyContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [contentId, setContentId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<CriafyYouTubeShortOptions["privacy"]>("private");
  const [madeForKids, setMadeForKids] = useState<"" | "yes" | "no">("");
  const [synthetic, setSynthetic] = useState(false);
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState("");

  useEffect(() => {
    if (!open || !account) return;
    let cancelled = false;
    requestRef.current = null;
    setVideos([]); setContentId(""); setTitle(""); setDescription("");
    setPrivacy("private"); setMadeForKids(""); setSynthetic(false);
    setConsent(false); setProgress(0); setResult(""); setLoading(true);
    criafyService.getContents(companyId)
      .then((contents) => { if (!cancelled) setVideos(contents.filter((item) => item.media_type === "VIDEO")); })
      .catch((error) => { if (!cancelled) toast.error(error.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, account, companyId]);

  const video = videos.find((item) => item.id === contentId);
  const validVideo = Boolean(video && video.duration_seconds && video.duration_seconds <= 180 &&
    video.width && video.height && video.width <= video.height && video.file_size_bytes &&
    video.file_size_bytes <= 2 * 1024 ** 3);
  const canSubmit = Boolean(account && validVideo && title.trim() && title.length <= 100 &&
    new TextEncoder().encode(description).length <= 5000 && madeForKids && consent && !uploading);

  async function publish() {
    if (!account || !video || !canSubmit) return;
    setUploading(true);
    const options: CriafyYouTubeShortOptions = {
      title: title.trim(), description: description.trim(), privacy,
      madeForKids: madeForKids === "yes", containsSyntheticMedia: synthetic, consent,
    };
    const fingerprint = JSON.stringify([account.id, video.id, options]);
    if (requestRef.current?.fingerprint !== fingerprint) {
      requestRef.current = { fingerprint, id: crypto.randomUUID() };
    }
    try {
      const publication = await criafyService.startYouTubeShort(
        companyId, account.id, video.id, options, requestRef.current.id,
      );
      if (publication.status === "FAILED") throw new Error("Esta tentativa falhou. Altere os dados para iniciar outra.");
      let current = publication;
      while (!current.youtube_video_id) {
        const step = await criafyService.advanceYouTubeShort(companyId, account.id, publication.id);
        current = step.publication;
        if (current.status === "FAILED") throw new Error(current.youtube_failure_reason || "O upload do Short falhou.");
        setProgress(Math.round(100 * (current.youtube_uploaded_bytes || 0) /
          (step.totalSize || video.file_size_bytes || 1)));
      }
      setResult(`Vídeo enviado ao YouTube. O processamento continua em Publicações. ID: ${current.youtube_video_id}`);
      toast.success("Short enviado ao YouTube para processamento.");
      void criafyService.getYouTubeShortStatus(companyId, account.id, publication.id).catch(() => undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar o Short.");
    } finally { setUploading(false); }
  }

  return <Dialog open={open} onOpenChange={(next) => { if (!uploading) onOpenChange(next); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Publicar YouTube Short</DialogTitle>
        <DialogDescription>Escolha o vídeo, revise as informações e autorize o envio ao canal.</DialogDescription>
      </DialogHeader>
      {loading ? <div className="flex items-center gap-2 py-8 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Carregando vídeos...</div> :
      result ? <p role="status" className="rounded-md border p-4 text-sm">{result}</p> :
      <div className="space-y-4 text-sm">
        <p>Canal: <strong>{account?.display_name}</strong></p>
        <label className="block space-y-1">Vídeo da biblioteca
          <select className="w-full rounded-md border bg-background p-2" value={contentId}
            onChange={(event) => setContentId(event.target.value)}>
            <option value="">Escolha um vídeo</option>
            {videos.map((item) => <option key={item.id} value={item.id}>
              {item.title || item.media_url.split("/").pop()} {item.duration_seconds ? `(${Math.round(item.duration_seconds)}s)` : ""}
            </option>)}
          </select>
        </label>
        {video && <video key={video.id} src={video.media_url} controls preload="metadata"
          className="max-h-64 w-full rounded-md bg-black" />}
        {video && !validVideo && <p className="text-destructive">Para Shorts, escolha vídeo quadrado ou vertical de até 3 minutos, com dimensões e duração medidas e arquivo de até 2 GB.</p>}
        <label className="block space-y-1">Título do Short
          <Input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder="Título do vídeo" />
          <span className="text-xs text-muted-foreground">{title.length}/100</span>
        </label>
        <label className="block space-y-1">Descrição
          <Textarea value={description} rows={3} onChange={(event) => setDescription(event.target.value)}
            placeholder="Descrição, links e hashtags" />
          <span className="text-xs text-muted-foreground">{new TextEncoder().encode(description).length}/5000 bytes</span>
        </label>
        <label className="block space-y-1">Visibilidade
          <select className="w-full rounded-md border bg-background p-2" value={privacy}
            onChange={(event) => setPrivacy(event.target.value as CriafyYouTubeShortOptions["privacy"])}>
            <option value="private">Privado</option><option value="unlisted">Não listado</option><option value="public">Público</option>
          </select>
        </label>
        <fieldset className="space-y-2 rounded-md border p-3"><legend className="px-1 font-medium">Este vídeo é feito para crianças?</legend>
          <label className="flex gap-2"><input type="radio" name="made-for-kids" checked={madeForKids === "yes"}
            onChange={() => setMadeForKids("yes")} /> Sim</label>
          <label className="flex gap-2"><input type="radio" name="made-for-kids" checked={madeForKids === "no"}
            onChange={() => setMadeForKids("no")} /> Não</label>
        </fieldset>
        <label className="flex gap-2"><input type="checkbox" checked={synthetic}
          onChange={(event) => setSynthetic(event.target.checked)} /> Contém mídia sintética ou alterada de forma realista</label>
        <label className="flex gap-2 rounded-md border p-3"><input type="checkbox" checked={consent}
          onChange={(event) => setConsent(event.target.checked)} />
          <span>Confirmo que tenho direito de publicar este vídeo e autorizo seu envio ao canal selecionado, conforme os <a className="underline" href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">Termos do YouTube</a>.</span></label>
        {uploading && <p role="status">Enviando vídeo: {progress}%. Mantenha esta página aberta até o envio terminar.</p>}
      </div>}
      <DialogFooter>
        <Button variant="outline" disabled={uploading} onClick={() => onOpenChange(false)}>Fechar</Button>
        {!result && <Button disabled={!canSubmit} onClick={publish}>
          {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar ao YouTube
        </Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
