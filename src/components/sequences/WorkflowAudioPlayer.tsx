import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, Volume1, VolumeX, RotateCcw, ExternalLink, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkflowAudioPlayerProps {
  url: string;
  className?: string;
  compact?: boolean;
  title?: string;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 2];

export function WorkflowAudioPlayer({
  url,
  className,
  compact = false,
  title,
}: WorkflowAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [prevVolume, setPrevVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Reset state when URL changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [url]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((err) => {
          console.warn("[WorkflowAudioPlayer] Erro ao reproduzir áudio:", err);
          setIsPlaying(false);
          setIsLoading(false);
          setHasError(true);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
      setIsLoading(false);
      setHasError(false);
    }
  };

  const handleSeek = (newValues: number[]) => {
    const newTime = newValues[0];
    if (audioRef.current && Number.isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = SPEED_OPTIONS.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIndex];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleVolumeChange = (newValues: number[]) => {
    const newVol = newValues[0];
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMuted) {
      const restored = prevVolume > 0 ? prevVolume : 1;
      setIsMuted(false);
      setVolume(restored);
      if (audioRef.current) audioRef.current.volume = restored;
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      setVolume(0);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Compact variant for canvas cards
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs w-full",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={togglePlay}
          className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 transition-transform active:scale-95 shadow-xs"
          title={isPlaying ? "Pausar" : "Ouvir áudio"}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-3 w-3 fill-current" />
          ) : (
            <Play className="h-3 w-3 fill-current ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{duration > 0 ? formatTime(duration) : "--:--"}</span>
          </div>
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden mt-0.5">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={cycleSpeed}
          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 hover:bg-slate-300 text-slate-700 shrink-0"
          title="Velocidade"
        >
          {playbackRate}x
        </button>

        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className="hidden"
        />
      </div>
    );
  }

  // Full rich player for drawers and configuration panels
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/70 p-3.5 shadow-xs space-y-3",
        className
      )}
    >
      {/* Top Header / Title */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold text-slate-700 truncate">
            {title || "Reproduzir Áudio"}
          </span>
          {isPlaying && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full animate-pulse">
              Reproduzindo
            </span>
          )}
        </div>

        {/* Speed Pill button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={cycleSpeed}
            className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors shadow-2xs"
            title="Clique para alternar a velocidade (1x, 1.25x, 1.5x, 2x)"
          >
            {playbackRate}x
          </button>

          {/* Volume toggle button & slider popover */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              onClick={toggleMute}
              title={isMuted ? "Desmutar" : "Mutar áudio"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4 text-destructive" />
              ) : volume < 0.5 ? (
                <Volume1 className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4 text-primary" />
              )}
            </Button>

            {showVolumeSlider && (
              <div className="absolute right-0 bottom-full mb-1 p-2 bg-white rounded-xl shadow-lg border border-slate-200 z-50 flex items-center gap-2 w-28 animate-in fade-in zoom-in-95 duration-100">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={handleVolumeChange}
                  className="w-full cursor-pointer"
                />
                <span className="text-[10px] font-mono text-slate-500 font-semibold w-7 text-right">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Player Row */}
      <div className="flex items-center gap-3">
        {/* Big Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 transition-transform active:scale-95 shadow-md shadow-primary/20"
          title={isPlaying ? "Pausar" : "Reproduzir"}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Timeline & Scrubber */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Waveform bars simulation */}
          <div className="flex items-center gap-[2.5px] h-4 px-1 overflow-hidden">
            {Array.from({ length: 32 }).map((_, i) => {
              const progress = duration ? (currentTime / duration) : 0;
              const barProgress = i / 32;
              const isPast = barProgress <= progress;
              const baseHeight = 25 + Math.sin(i * 0.7) * 20 + Math.cos(i * 1.3) * 15;
              const heightPct = isPlaying ? Math.max(20, (baseHeight + (i % 3) * 15) % 95) : baseHeight;

              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-full transition-all duration-150",
                    isPast ? "bg-primary" : "bg-slate-200/80"
                  )}
                  style={{
                    height: `${heightPct}%`,
                  }}
                />
              );
            })}
          </div>

          {/* Interactive Scrub Slider */}
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 1}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer py-1"
          />

          {/* Time Display */}
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono font-medium px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{duration > 0 ? formatTime(duration) : "--:--"}</span>
          </div>
        </div>
      </div>

      {/* Error Fallback Banner if file cannot be decoded directly */}
      {hasError && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs">
          <span className="truncate flex-1 text-[11px]">
            Pré-visualização direta indisponível neste navegador.
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-bold text-amber-900 underline hover:text-amber-700 shrink-0 ml-2"
          >
            Abrir arquivo <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className="hidden"
      />
    </div>
  );
}
