/**
 * Player de Áudio Estilo WhatsApp (AJ-021).
 * Experiência compacta e fluida inspirada em mensagens de voz:
 * - Botão Play / Pause arredondado com feedback visual
 * - Forma de onda (waveform) interativa com suporte a scrubbing por clique/arrasto
 * - Marcadores de tempo: decorrido / duração total
 * - Seletor de velocidade: 1x, 1.5x, 2x
 * - Metadados de autor, data/hora e badge de versão
 * - Transcrição integrada com opção de edição e cópia
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Check,
  Copy,
  Trash2,
  Download,
  Star,
  MoreVertical,
  Volume2,
  FileText,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { AudioRecording } from "../../domain/types";

interface WhatsAppAudioPlayerProps {
  recording: AudioRecording;
  requestTitle?: string;
  onSetPrimary?: (recordingId: string) => void;
  onDelete?: (recordingId: string) => void;
  onTranscribe?: (recordingId: string) => void;
  isTranscribing?: boolean;
}

export const WhatsAppAudioPlayer: React.FC<WhatsAppAudioPlayerProps> = ({
  recording,
  requestTitle,
  onSetPrimary,
  onDelete,
  onTranscribe,
  isTranscribing = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const [showTranscription, setShowTranscription] = useState(false);
  const [hasCopiedTranscription, setHasCopiedTranscription] = useState(false);

  // Formas de onda padrão caso não tenha sido gerada na captura (36 barras estilizadas)
  const defaultWaveform = [
    0.2, 0.4, 0.7, 0.5, 0.8, 1.0, 0.6, 0.9, 0.4, 0.3, 0.6, 0.85, 0.95, 0.7, 0.5,
    0.75, 0.9, 0.65, 0.4, 0.8, 0.9, 1.0, 0.7, 0.5, 0.85, 0.6, 0.4, 0.65, 0.8,
    0.5, 0.3, 0.7, 0.6, 0.4, 0.3, 0.2,
  ];

  const waveformBars =
    recording.waveform && recording.waveform.length > 0
      ? recording.waveform
      : defaultWaveform;

  // Sincronizar duration quando o áudio carregar
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [recording.audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Erro ao reproduzir áudio:", err);
          toast.error("Não foi possível reproduzir este áudio.");
        });
    }
  };

  const handleCycleSpeed = () => {
    const audio = audioRef.current;
    const nextRate: 1 | 1.5 | 2 = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audio) {
      audio.playbackRate = nextRate;
    }
  };

  const handleSeek = (index: number) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;
    const progressFraction = (index + 0.5) / waveformBars.length;
    const targetSeconds = progressFraction * duration;
    audio.currentTime = targetSeconds;
    setCurrentTime(targetSeconds);
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleCopyTranscription = () => {
    const text =
      recording.transcription?.editedText || recording.transcription?.text;
    if (text) {
      navigator.clipboard.writeText(text);
      setHasCopiedTranscription(true);
      toast.success("Transcrição copiada!");
      setTimeout(() => setHasCopiedTranscription(false), 2000);
    }
  };

  const formattedDate = new Date(recording.createdAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const progressFraction = duration > 0 ? currentTime / duration : 0;
  const currentBarIndex = Math.floor(progressFraction * waveformBars.length);

  return (
    <div className="w-full bg-card/80 dark:bg-card border border-border/80 rounded-2xl p-3 shadow-xs hover:border-emerald-500/40 transition-all space-y-2">
      <audio ref={audioRef} src={recording.audioUrl} preload="metadata" />

      {/* Linha Principal do Player estilo WhatsApp */}
      <div className="flex items-center gap-3">
        {/* Botão Play / Pause estilo WhatsApp */}
        <button
          type="button"
          onClick={togglePlay}
          className="h-10 w-10 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-700/20 transition-all cursor-pointer"
          title={isPlaying ? "Pausar" : "Ouvir gravação"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-white" />
          ) : (
            <Play className="h-4 w-4 fill-white ml-0.5" />
          )}
        </button>

        {/* Onda Sonora (Waveform) Interativa com Scrubbing */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div
            className="flex items-center gap-[2.5px] h-8 cursor-pointer py-1 group/wave select-none"
            title="Clique na barra para avançar/voltar"
          >
            {waveformBars.map((val, idx) => {
              const isPlayed = idx <= currentBarIndex;
              const heightPx = Math.max(5, Math.round(val * 24));

              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeek(idx);
                  }}
                  style={{ height: `${heightPx}px` }}
                  className={`w-1 rounded-full transition-all group-hover/wave:scale-y-110 ${
                    isPlayed
                      ? "bg-emerald-600 dark:bg-emerald-400"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              );
            })}
          </div>

          {/* Marcadores de Tempo e Informações */}
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-0.5">
            <span>{isPlaying ? formatSeconds(currentTime) : formatSeconds(duration)}</span>

            <div className="flex items-center gap-2 font-sans text-[10px]">
              {recording.isPrimary && (
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] py-0 px-1 font-bold">
                  ★ Principal
                </Badge>
              )}
              {recording.isApproved && (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] py-0 px-1 font-bold">
                  ✓ Aprovado
                </Badge>
              )}
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Controles Laterais: Velocidade + Menu de Opções */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Botão de Velocidade 1x / 1.5x / 2x */}
          <button
            type="button"
            onClick={handleCycleSpeed}
            className="h-7 px-2 rounded-lg bg-muted/60 hover:bg-muted text-foreground text-[10px] font-mono font-bold border border-border/60 transition-all cursor-pointer"
            title="Alternar velocidade de reprodução"
          >
            {playbackRate}x
          </button>

          {/* Menu de Ações da Gravação */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-2xl shadow-xl">
              {onTranscribe && (
                <DropdownMenuItem
                  onClick={() => onTranscribe(recording.id)}
                  disabled={isTranscribing}
                  className="cursor-pointer text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                  {isTranscribing ? "Transcrevendo..." : "Transcrever com IA"}
                </DropdownMenuItem>
              )}

              {recording.transcription?.text && (
                <DropdownMenuItem
                  onClick={() => setShowTranscription(!showTranscription)}
                  className="cursor-pointer text-xs"
                >
                  <FileText className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  {showTranscription ? "Ocultar Transcrição" : "Ver Transcrição"}
                </DropdownMenuItem>
              )}

              {onSetPrimary && !recording.isPrimary && (
                <DropdownMenuItem
                  onClick={() => onSetPrimary(recording.id)}
                  className="cursor-pointer text-xs"
                >
                  <Star className="h-3.5 w-3.5 mr-2 text-amber-500" />
                  Definir como Principal
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                asChild
                className="cursor-pointer text-xs"
              >
                <a
                  href={recording.audioUrl}
                  download={`audio-${recording.id}.webm`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  Baixar Áudio
                </a>
              </DropdownMenuItem>

              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(recording.id)}
                    className="cursor-pointer text-xs text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Excluir Gravação
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Autor da Mensagem de Voz */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-1.5 px-0.5">
        <span className="flex items-center gap-1 font-medium text-foreground/80">
          <User className="h-3 w-3 text-muted-foreground/60" />
          <span>{recording.authorName || "Expert"}</span>
          <span className="text-muted-foreground font-normal">
            (Gravação #{recording.version || 1})
          </span>
        </span>

        {recording.transcription?.text && (
          <button
            onClick={() => setShowTranscription(!showTranscription)}
            className="text-primary hover:underline font-semibold flex items-center gap-1"
          >
            <Sparkles className="h-2.5 w-2.5" />
            <span>{showTranscription ? "Ocultar texto" : "Ver transcrição"}</span>
          </button>
        )}
      </div>

      {/* Área Expansível de Transcrição */}
      {showTranscription && recording.transcription?.text && (
        <div className="mt-2 p-3 bg-muted/50 border border-border/80 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground flex items-center gap-1 text-[11px]">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Transcrição do Áudio</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyTranscription}
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
            >
              {hasCopiedTranscription ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copiar</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-foreground/90 leading-relaxed italic text-xs bg-background/60 p-2.5 rounded-lg border border-border/50">
            "{recording.transcription.editedText || recording.transcription.text}"
          </p>
        </div>
      )}
    </div>
  );
};
