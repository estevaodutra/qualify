import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Music, Youtube } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criafyService } from "@/services/criafy/criafyService";
import type { CriafySocialAccount, CriafyTikTokCreatorInfo,
  CriafyTikTokPostOptions, CriafyYouTubeShortOptions } from "@/types/criafy";

export type CrossPostSelection = {
  tiktokAccountId: string;
  tiktokPrivacy: string;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  commercial: boolean;
  ownBrand: boolean;
  brandedContent: boolean;
  aiGenerated: boolean;
  tiktokConsent: boolean;
  creator: CriafyTikTokCreatorInfo | null;
  youtubeAccountId: string;
  youtubeTitle: string;
  youtubePrivacy: "" | "private" | "unlisted" | "public";
  madeForKids: "" | "yes" | "no";
  synthetic: boolean;
  youtubeConsent: boolean;
};

export const emptyCrossPost: CrossPostSelection = {
  tiktokAccountId: "", tiktokPrivacy: "", allowComment: false,
  allowDuet: false, allowStitch: false, commercial: false,
  ownBrand: false, brandedContent: false, aiGenerated: false,
  tiktokConsent: false, creator: null,
  youtubeAccountId: "", youtubeTitle: "", youtubePrivacy: "",
  madeForKids: "", synthetic: false, youtubeConsent: false,
};

const privacyLabels: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Público", MUTUAL_FOLLOW_FRIENDS: "Amigos",
  FOLLOWER_OF_CREATOR: "Seguidores", SELF_ONLY: "Só eu",
};

export type CrossPostVideo = {
  title?: string;
  duration_seconds?: number | null;
  width?: number | null;
  height?: number | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
};

export function validateCrossPost(selection: CrossPostSelection, videos: CrossPostVideo[]): string | null {
  if (!selection.tiktokAccountId && !selection.youtubeAccountId) return null;
  if (videos.length === 0) return "Escolha ao menos um vídeo para publicar nas outras redes.";
  if (videos.some((video) => !video.duration_seconds || !video.file_size_bytes ||
      !/^video\/(mp4|quicktime|webm)$/.test(video.mime_type || ""))) {
    return "Os vídeos precisam ter duração, tamanho e formato MP4, MOV ou WebM medidos.";
  }
  if (selection.tiktokAccountId) {
    if (!selection.creator || !selection.tiktokPrivacy || !selection.tiktokConsent) {
      return "Revise a privacidade e confirme a publicação no TikTok.";
    }
    if (!selection.creator.privacy_level_options.includes(selection.tiktokPrivacy) ||
        videos.some((video) => Number(video.duration_seconds) > selection.creator!.max_video_post_duration_sec ||
          Number(video.file_size_bytes) > 4 * 1024 ** 3)) {
      return "Um vídeo excede o limite ou a privacidade da conta TikTok.";
    }
    if (selection.commercial && !selection.ownBrand && !selection.brandedContent) {
      return "Indique qual marca é promovida no TikTok.";
    }
    if (selection.brandedContent && !["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS"].includes(selection.tiktokPrivacy)) {
      return "Conteúdo de parceria no TikTok precisa ser público ou visível a amigos.";
    }
  }
  if (selection.youtubeAccountId) {
    if (!selection.youtubePrivacy || !selection.madeForKids || !selection.youtubeConsent) {
      return "Revise a visibilidade, a indicação infantil e confirme o envio ao YouTube.";
    }
    if (selection.youtubeTitle.length > 100 || videos.some((video) =>
      Number(video.duration_seconds) > 180 || !video.width || !video.height ||
      video.width > video.height || Number(video.file_size_bytes) > 2 * 1024 ** 3)) {
      return "Shorts precisam ser vídeos quadrados ou verticais de até 3 minutos e 2 GB.";
    }
  }
  return null;
}

export function tikTokOptions(selection: CrossPostSelection, caption: string): CriafyTikTokPostOptions {
  return {
    title: caption.slice(0, 2200), privacy_level: selection.tiktokPrivacy,
    allow_comment: selection.allowComment, allow_duet: selection.allowDuet,
    allow_stitch: selection.allowStitch, commercial_content: selection.commercial,
    own_brand: selection.commercial && selection.ownBrand,
    branded_content: selection.commercial && selection.brandedContent,
    is_aigc: selection.aiGenerated, consent: selection.tiktokConsent,
  };
}

export function youTubeOptions(selection: CrossPostSelection, videoTitle: string,
  description: string): CriafyYouTubeShortOptions {
  return {
    title: (selection.youtubeTitle.trim() || videoTitle.trim() || "Short").slice(0, 100),
    description: description.trim(),
    privacy: selection.youtubePrivacy as CriafyYouTubeShortOptions["privacy"],
    madeForKids: selection.madeForKids === "yes",
    containsSyntheticMedia: selection.synthetic,
    consent: selection.youtubeConsent,
  };
}

type Props = {
  companyId: string;
  value: CrossPostSelection;
  onChange: Dispatch<SetStateAction<CrossPostSelection>>;
  isBulk?: boolean;
  isScheduled?: boolean;
};

export function CrossPostSettings({ companyId, value, onChange, isBulk = false, isScheduled = false }: Props) {
  const [accounts, setAccounts] = useState<CriafySocialAccount[]>([]);
  const [creatorError, setCreatorError] = useState("");
  useEffect(() => {
    let alive = true;
    Promise.all([criafyService.getTikTokAccounts(companyId), criafyService.getYouTubeAccounts(companyId)])
      .then(([tikTok, youTube]) => { if (alive) setAccounts([...tikTok, ...youTube]
        .filter((account) => account.connection_status === "CONNECTED")); });
    return () => { alive = false; };
  }, [companyId]);
  useEffect(() => {
    if (!value.tiktokAccountId) return;
    let alive = true;
    setCreatorError("");
    criafyService.getTikTokCreatorInfo(companyId, value.tiktokAccountId)
      .then((creator) => { if (alive) onChange((current) => ({ ...current, creator, tiktokPrivacy: "" })); })
      .catch((error) => { if (alive) setCreatorError(error.message); });
    return () => { alive = false; };
  }, [companyId, value.tiktokAccountId, onChange]);
  const update = (patch: Partial<CrossPostSelection>) => onChange((current) => ({ ...current, ...patch }));
  const tikTok = accounts.filter((account) => account.provider === "TIKTOK");
  const youTube = accounts.filter((account) => account.provider === "YOUTUBE");

  return <div className="space-y-3 rounded-xl border border-border/70 p-3.5">
    <div><p className="text-xs font-bold">Publicar também em outras redes</p>
      <p className="text-[11px] text-muted-foreground">{isBulk
        ? "O envio de cada vídeo começa no horário planejado para o Reel. O processamento de cada rede pode terminar depois."
        : "O mesmo vídeo será enviado às redes escolhidas junto com o Reel."}</p></div>
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="space-y-1 text-xs"><span className="flex items-center gap-1"><Music className="h-3.5 w-3.5" /> TikTok</span>
        <select className="w-full rounded-md border bg-background p-2" value={value.tiktokAccountId}
          onChange={(event) => update({ tiktokAccountId: event.target.value, creator: null, tiktokPrivacy: "" })}>
          <option value="">Não publicar</option>
          {tikTok.map((account) => <option key={account.id} value={account.id}>{account.display_name}</option>)}
        </select></label>
      <label className="space-y-1 text-xs"><span className="flex items-center gap-1"><Youtube className="h-3.5 w-3.5" /> YouTube Shorts</span>
        <select className="w-full rounded-md border bg-background p-2" value={value.youtubeAccountId}
          onChange={(event) => update({ youtubeAccountId: event.target.value })}>
          <option value="">Não publicar</option>
          {youTube.map((account) => <option key={account.id} value={account.id}>{account.display_name}</option>)}
        </select></label>
    </div>
    {value.tiktokAccountId && <div className="space-y-2 rounded-lg border p-3 text-xs">
      <p className="font-semibold">Opções do TikTok</p>
      {creatorError && <p className="text-destructive">{creatorError}</p>}
      <label className="block space-y-1">Quem pode ver
        <select className="w-full rounded-md border bg-background p-2" value={value.tiktokPrivacy}
          onChange={(event) => update({ tiktokPrivacy: event.target.value })}>
          <option value="">Escolha a privacidade</option>
          {value.creator?.privacy_level_options.map((privacy) => <option key={privacy} value={privacy}>
            {privacyLabels[privacy] || privacy}
          </option>)}
        </select></label>
      <div className="flex flex-wrap gap-3">
        {([ ["allowComment", "Comentários", value.creator?.comment_disabled],
          ["allowDuet", "Dueto", value.creator?.duet_disabled],
          ["allowStitch", "Costura", value.creator?.stitch_disabled] ] as const)
          .map(([key, label, disabled]) => <label key={key} className="flex items-center gap-1.5">
            <Checkbox checked={value[key]} disabled={Boolean(disabled)} onCheckedChange={(checked) =>
              update({ [key]: checked === true } as Partial<CrossPostSelection>)} />{label}
          </label>)}
      </div>
      <label className="flex items-center gap-1.5"><Checkbox checked={value.commercial}
        onCheckedChange={(checked) => update({ commercial: checked === true })} /> Promove marca ou produto</label>
      {value.commercial && <div className="flex flex-wrap gap-3 pl-4">
        <label className="flex items-center gap-1.5"><Checkbox checked={value.ownBrand}
          onCheckedChange={(checked) => update({ ownBrand: checked === true })} /> Minha marca</label>
        <label className="flex items-center gap-1.5"><Checkbox checked={value.brandedContent}
          onCheckedChange={(checked) => update({ brandedContent: checked === true })} /> Outra marca</label>
      </div>}
      <label className="flex items-center gap-1.5"><Checkbox checked={value.aiGenerated}
        onCheckedChange={(checked) => update({ aiGenerated: checked === true })} /> Gerado por IA</label>
      <label className="flex items-start gap-1.5"><Checkbox checked={value.tiktokConsent}
        onCheckedChange={(checked) => update({ tiktokConsent: checked === true })} /> Autorizo o envio ao TikTok com estas opções.</label>
    </div>}
    {value.youtubeAccountId && <div className="space-y-2 rounded-lg border p-3 text-xs">
      <p className="font-semibold">Opções do YouTube</p>
      {(isBulk || isScheduled) && <p className="text-[11px] text-muted-foreground">Se o app Google ainda estiver em Teste, a autorização pode expirar após 7 dias. Reconecte o canal antes dos envios futuros.</p>}
      <label className="block space-y-1">{isBulk ? "Título comum (opcional; vazio usa o nome de cada vídeo)" : "Título do Short (opcional; vazio usa o nome do vídeo)"}
        <Input value={value.youtubeTitle} maxLength={100}
          onChange={(event) => update({ youtubeTitle: event.target.value })} /></label>
      <label className="block space-y-1">Visibilidade
        <select className="w-full rounded-md border bg-background p-2" value={value.youtubePrivacy}
          onChange={(event) => update({ youtubePrivacy: event.target.value as CrossPostSelection["youtubePrivacy"] })}>
          <option value="">Escolha a visibilidade</option><option value="private">Privado</option>
          <option value="unlisted">Não listado</option><option value="public">Público</option>
        </select></label>
      <fieldset className="flex gap-3"><legend>Feito para crianças?</legend>
        <label><input type="radio" name={isBulk ? "bulk-youtube-kids" : "youtube-kids"}
          checked={value.madeForKids === "yes"} onChange={() => update({ madeForKids: "yes" })} /> Sim</label>
        <label><input type="radio" name={isBulk ? "bulk-youtube-kids" : "youtube-kids"}
          checked={value.madeForKids === "no"} onChange={() => update({ madeForKids: "no" })} /> Não</label>
      </fieldset>
      <label className="flex items-center gap-1.5"><Checkbox checked={value.synthetic}
        onCheckedChange={(checked) => update({ synthetic: checked === true })} /> Contém mídia sintética realista</label>
      <label className="flex items-start gap-1.5"><Checkbox checked={value.youtubeConsent}
        onCheckedChange={(checked) => update({ youtubeConsent: checked === true })} /> Autorizo o envio ao canal e aceito os <a
          href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer" className="underline">Termos do YouTube</a>.</label>
    </div>}
  </div>;
}
