import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Check,
  Loader2,
  Volume2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadSprintFile } from "../utils/sprintFileUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useSprintStore } from "../state/sprintStore";

interface SprintAudioRecorderProps {
  cardId: string;
  boardId: string;
  companyId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

export const SprintAudioRecorder: React.FC<SprintAudioRecorderProps> = ({
  cardId,
  boardId,
  companyId,
  onSuccess,
  onCancel,
  compact = false,
}) => {
  const { user } = useAuth();
  const { addCardComment, loadCardAttachments } = useSprintStore();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Limpeza de URLs e timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl && audioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Iniciar Gravação
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Microfone não suportado pelo seu navegador.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Formatos suportados
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "audio/mp4";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "";
          }
        }
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: audioType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Desligar tracks do microfone
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(200);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Erro ao acessar microfone:", err);
      toast.error("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  // Parar gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Descartar gravação
  const discardRecording = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlaying(false);
    setRecordedBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setDuration(0);
  };

  // Tocar / Pausar prévia
  const togglePlay = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  // Salvar áudio no Sprint
  const handleSaveAudio = async () => {
    if (!recordedBlob || !user) return;

    try {
      setIsUploading(true);

      const ext = recordedBlob.type.includes("mp4") ? "mp4" : "webm";
      const fileName = `audio_gravado_${formatTime(duration).replace(":", "m")}s.${ext}`;
      const audioFile = new File([recordedBlob], fileName, {
        type: recordedBlob.type,
      });

      // 1. Upload do arquivo para o bucket do Sprint
      const uploaded = await uploadSprintFile(audioFile, user.id, boardId);

      // 2. Adicionar como comentário e anexo oficial do card
      await addCardComment(
        cardId,
        `🎙️ **Áudio gravado (${formatTime(duration)}):** Gravação de voz anexada pelo cliente/equipe.`,
        audioFile
      );

      // 3. Atualizar lista de anexos
      await loadCardAttachments(cardId);

      toast.success("Áudio gravado e anexado com sucesso!");
      discardRecording();
      onSuccess?.();
    } catch (err: any) {
      console.error("Erro ao salvar áudio:", err);
      toast.error(err.message || "Erro ao salvar gravação de áudio");
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400">
            <Volume2 className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">Gravar Áudio na Demanda</h4>
            <p className="text-[10px] text-muted-foreground">Grave orientações, depoimentos ou locução diretamente</p>
          </div>
        </div>
        {onCancel && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            disabled={isRecording || isUploading}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            ✕
          </Button>
        )}
      </div>

      {/* Áudio player oculto para prévia */}
      {audioUrl && (
        <audio
          ref={audioPlayerRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Estado: Sem gravação */}
      {!isRecording && !recordedBlob && (
        <div className="flex items-center gap-2.5 pt-1">
          <Button
            type="button"
            size="sm"
            onClick={startRecording}
            className="gap-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-medium text-xs shadow-xs"
          >
            <Mic className="h-3.5 w-3.5" />
            <span>Iniciar Gravação de Áudio</span>
          </Button>
        </div>
      )}

      {/* Estado: Gravando */}
      {isRecording && (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-rose-600 animate-ping" />
            <span className="text-xs font-bold text-rose-600 font-mono">
              Gravando... {formatTime(duration)}
            </span>
          </div>

          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={stopRecording}
            className="h-7 px-3 text-xs gap-1.5"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Concluir Gravação</span>
          </Button>
        </div>
      )}

      {/* Estado: Prévia gravada */}
      {!isRecording && recordedBlob && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/60 border border-border text-xs">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={togglePlay}
                className="h-7 w-7 p-0 rounded-full"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
              </Button>
              <span className="font-mono font-medium text-foreground text-xs">
                Duração: {formatTime(duration)}
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={discardRecording}
              disabled={isUploading}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Regravar</span>
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={discardRecording}
              disabled={isUploading}
              className="text-xs h-7"
            >
              Descartar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAudio}
              disabled={isUploading}
              className="text-xs h-7 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Salvando no Cartão...</span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  <span>Anexar ao Cartão</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
