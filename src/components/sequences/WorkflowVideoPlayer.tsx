import React, { useRef, useState } from "react";
import { Play, Pause, Volume2, Volume1, VolumeX, Maximize2, ExternalLink } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkflowVideoPlayerProps {
  url: string;
  className?: string;
  title?: string;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 2];

export function WorkflowVideoPlayer({
  url,
  className,
  title,
}: WorkflowVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [prevVolume, setPrevVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [hasError, setHasError] = useState(false);

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = SPEED_OPTIONS.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIndex];
    setPlaybackRate(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const handleVolumeChange = (newValues: number[]) => {
    const newVol = newValues[0];
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMuted) {
      const restored = prevVolume > 0 ? prevVolume : 1;
      setIsMuted(false);
      setVolume(restored);
      if (videoRef.current) videoRef.current.volume = restored;
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      setVolume(0);
      if (videoRef.current) videoRef.current.volume = 0;
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-slate-900 overflow-hidden shadow-xs space-y-0",
        className
      )}
    >
      {/* Video Container */}
      <div className="relative aspect-video bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={url}
          controls
          className="w-full h-full object-contain"
          onError={() => setHasError(true)}
        />
      </div>

      {/* Video Controls Toolbar (Speed & Volume) */}
      <div className="flex items-center justify-between p-2.5 bg-slate-900 border-t border-slate-800 text-white">
        <div className="text-[11px] font-medium text-slate-300 truncate max-w-[150px]">
          {title || "Vídeo"}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Speed Toggle Pill */}
          <button
            type="button"
            onClick={cycleSpeed}
            className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            title="Acelerar reprodução do vídeo"
          >
            {playbackRate}x
          </button>

          {/* Volume Control */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={toggleMute}
              title={isMuted ? "Desmutar" : "Mutar"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5 text-destructive" />
              ) : volume < 0.5 ? (
                <Volume1 className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-primary" />
              )}
            </Button>

            {showVolumeSlider && (
              <div className="absolute right-0 bottom-full mb-1 p-2 bg-slate-800 rounded-lg shadow-lg border border-slate-700 z-50 flex items-center gap-2 w-24">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={handleVolumeChange}
                  className="w-full cursor-pointer"
                />
              </div>
            )}
          </div>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white p-1"
            title="Abrir em nova aba"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {hasError && (
        <div className="p-2 bg-amber-950/80 border-t border-amber-800 text-amber-200 text-xs flex items-center justify-between">
          <span className="text-[10px]">Falha ao reproduzir diretamente</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold text-[10px] text-amber-300"
          >
            Abrir vídeo
          </a>
        </div>
      )}
    </div>
  );
}
