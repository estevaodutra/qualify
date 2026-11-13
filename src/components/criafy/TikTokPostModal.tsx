import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { criafyService } from "@/services/criafy/criafyService";
import type { CriafyContent, CriafySocialAccount, CriafyTikTokCreatorInfo, CriafyTikTokPostOptions } from "@/types/criafy";

const privacyLabels: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Público",
  MUTUAL_FOLLOW_FRIENDS: "Amigos",
  FOLLOWER_OF_CREATOR: "Seguidores",
  SELF_ONLY: "Só eu",
};

type Props = { open: boolean; onOpenChange: (open: boolean) => void; companyId: string; account: CriafySocialAccount | null };

export function TikTokPostModal({ open, onOpenChange, companyId, account }: Props) {
  const requestRef = useRef<{ fingerprint: string; id: string } | null>(null);
  const [creator, setCreator] = useState<CriafyTikTokCreatorInfo | null>(null);
  const [videos, setVideos] = useState<CriafyContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contentId, setContentId] = useState("");
  const [title, setTitle] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [allowComment, setAllowComment] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [commercial, setCommercial] = useState(false);
  const [ownBrand, setOwnBrand] = useState(false);
  const [brandedContent, setBrandedContent] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    if (!open || !account) return;
    let cancelled = false;
    requestRef.current = null;
    setCreator(null); setVideos([]); setContentId(""); setTitle(""); setPrivacy("");
    setAllowComment(false); setAllowDuet(false); setAllowStitch(false);
    setCommercial(false); setOwnBrand(false); setBrandedContent(false);
    setAiGenerated(false); setConsent(false); setResult(""); setLoading(true);
    Promise.all([
      criafyService.getTikTokCreatorInfo(companyId, account.id),
      criafyService.getContents(companyId),
    ]).then(([creatorInfo, contents]) => {
      if (cancelled) return;
      setCreator(creatorInfo);
      setVideos(contents.filter((item) => item.media_type === "VIDEO"));
    }).catch((error) => {
      if (!cancelled) toast.error(`TikTok: ${error.message}`);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, account, companyId]);

  const video = videos.find((item) => item.id === contentId);
  const tooLong = Boolean(video && creator && (!video.duration_seconds || video.duration_seconds > creator.max_video_post_duration_sec));
  const brandedPrivacyInvalid = brandedContent && Boolean(privacy) &&
    !["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS"].includes(privacy);
  const canSubmit = Boolean(creator && video && privacy && consent && !tooLong && !brandedPrivacyInvalid &&
    (!commercial || ownBrand || brandedContent) && !submitting);

  async function publish() {
    if (!account || !canSubmit) return;
    setSubmitting(true);
    const options: CriafyTikTokPostOptions = {
      title: title.trim(), privacy_level: privacy,
      allow_comment: allowComment, allow_duet: allowDuet, allow_stitch: allowStitch,
      commercial_content: commercial, own_brand: commercial && ownBrand,
      branded_content: commercial && brandedContent, is_aigc: aiGenerated, consent,
    };
    const fingerprint = JSON.stringify([account.id, contentId, options]);
    if (requestRef.current?.fingerprint !== fingerprint) {
      requestRef.current = { fingerprint, id: crypto.randomUUID() };
    }
    try {
      const publication = await criafyService.publishTikTokVideo(companyId, account.id, contentId, options, requestRef.current.id);
      setResult("Vídeo enviado. O TikTok está processando a publicação. Acompanhe em Publicações.");
      toast.success("Vídeo enviado ao TikTok para processamento.");
      // A postagem continua no TikTok após fechar esta janela; o histórico consulta o status.
      void criafyService.getTikTokPostStatus(companyId, account.id, publication.id).catch(() => undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o vídeo.");
    } finally {
      setSubmitting(false);
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Publicar vídeo no TikTok</DialogTitle>
        <DialogDescription>Revise o vídeo, escolha as opções da conta e confirme o envio.</DialogDescription>
      </DialogHeader>
      {loading ? <div className="flex items-center gap-2 py-8 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Consultando a conta TikTok...</div> :
      !creator ? <p className="text-sm text-destructive">Não foi possível consultar as opções de publicação desta conta.</p> :
      result ? <p role="status" className="rounded-md border p-4 text-sm">{result}</p> :
      <div className="space-y-4 text-sm">
        <p>Publicando como <strong>{creator.creator_nickname || account?.display_name}</strong> (@{creator.creator_username})</p>
        <label className="block space-y-1">Vídeo da biblioteca
          <select className="w-full rounded-md border bg-background p-2" value={contentId} onChange={(event) => setContentId(event.target.value)}>
            <option value="">Escolha um vídeo</option>
            {videos.map((item) => <option key={item.id} value={item.id}>{item.title || item.media_url.split("/").pop()} {item.duration_seconds ? `(${Math.round(item.duration_seconds)}s)` : ""}</option>)}
          </select>
        </label>
        {videos.length === 0 && <p>Nenhum vídeo encontrado. Adicione um vídeo à Biblioteca de Mídia primeiro.</p>}
        {video && <video key={video.id} src={video.media_url} controls preload="metadata" className="max-h-64 w-full rounded-md bg-black" />}
        {tooLong && <p className="text-destructive">A duração do vídeo não foi medida ou excede o limite de {creator.max_video_post_duration_sec}s desta conta.</p>}
        <label className="block space-y-1">Legenda
          <Textarea value={title} onChange={(event) => setTitle(event.target.value.slice(0, 2200))} rows={3} maxLength={2200} />
          <span className="text-xs text-muted-foreground">{title.length}/2200</span>
        </label>
        <label className="block space-y-1">Quem pode ver este vídeo
          <select className="w-full rounded-md border bg-background p-2" value={privacy} onChange={(event) => setPrivacy(event.target.value)}>
            <option value="">Escolha a privacidade</option>
            {creator.privacy_level_options.map((level) => <option key={level} value={level} disabled={brandedContent && !["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS"].includes(level)}>{privacyLabels[level] || level}</option>)}
          </select>
        </label>
        <fieldset className="space-y-2 rounded-md border p-3"><legend className="px-1 font-medium">Interações</legend>
          <label className="flex gap-2"><input type="checkbox" checked={allowComment} disabled={creator.comment_disabled} onChange={(event) => setAllowComment(event.target.checked)} /> Permitir comentários</label>
          <label className="flex gap-2"><input type="checkbox" checked={allowDuet} disabled={creator.duet_disabled} onChange={(event) => setAllowDuet(event.target.checked)} /> Permitir Dueto</label>
          <label className="flex gap-2"><input type="checkbox" checked={allowStitch} disabled={creator.stitch_disabled} onChange={(event) => setAllowStitch(event.target.checked)} /> Permitir Costurar</label>
        </fieldset>
        <fieldset className="space-y-2 rounded-md border p-3"><legend className="px-1 font-medium">Declarações</legend>
          <label className="flex gap-2"><input type="checkbox" checked={commercial} onChange={(event) => { setCommercial(event.target.checked); if (!event.target.checked) { setOwnBrand(false); setBrandedContent(false); } }} /> Este vídeo promove uma marca, produto ou serviço</label>
          {commercial && <div className="ml-5 space-y-2">
            <label className="flex gap-2"><input type="checkbox" checked={ownBrand} onChange={(event) => setOwnBrand(event.target.checked)} /> Minha própria marca</label>
            {ownBrand && !brandedContent && <p className="text-xs text-muted-foreground">O vídeo será identificado como conteúdo promocional.</p>}
            <label className="flex gap-2"><input type="checkbox" checked={brandedContent} onChange={(event) => { setBrandedContent(event.target.checked); if (event.target.checked && !["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS"].includes(privacy)) setPrivacy(""); }} /> Parceria com outra marca</label>
            {brandedContent && <p className="text-xs text-muted-foreground">O vídeo será identificado como parceria paga e precisa estar visível ao público ou a amigos.</p>}
          </div>}
          <label className="flex gap-2"><input type="checkbox" checked={aiGenerated} onChange={(event) => setAiGenerated(event.target.checked)} /> Conteúdo gerado por IA</label>
        </fieldset>
        <label className="flex gap-2 rounded-md border p-3"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>Ao publicar, concordo com a <a className="underline" href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">Confirmação de Uso de Música do TikTok</a>{brandedContent && <> e a <a className="underline" href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">Política de Conteúdo de Marca</a></>}. Confirmo o envio deste vídeo à conta selecionada.</span>
        </label>
        <p className="text-xs text-muted-foreground">Teste no sandbox: ative <strong>Conta privada</strong> nas configurações de privacidade da própria conta TikTok e selecione <strong>Só eu</strong> acima.</p>
      </div>}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        {!result && <Button disabled={!canSubmit} onClick={publish}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar ao TikTok</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
