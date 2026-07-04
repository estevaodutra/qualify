import { cn } from "@/lib/utils";

interface IndicatorTilesProps {
  requested: number;
  found: number;
  validPhone: number;
  duplicates: number;
  discarded: number;
  enriched: number;
  qualified: number;
  queued: number;
  processing: number;
  contacted: number;
  replied: number;
  completed: number;
  errors: number;
}

function Tile({ label, value, accent }: { label: string; value: number; accent?: "warning" | "destructive" | "success" }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/50 px-3 py-2.5 min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground/60 truncate">{label}</p>
      <p
        className={cn(
          "text-xl font-bold font-['JetBrains_Mono'] mt-0.5",
          accent === "warning" && "text-warning",
          accent === "destructive" && "text-destructive",
          accent === "success" && "text-success"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function IndicatorTiles(props: IndicatorTilesProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      <Tile label="Solicitados" value={props.requested} />
      <Tile label="Encontrados" value={props.found} />
      <Tile label="Com telefone válido" value={props.validPhone} />
      <Tile label="Duplicados" value={props.duplicates} />
      <Tile label="Descartados" value={props.discarded} accent={props.discarded > 0 ? "warning" : undefined} />
      <Tile label="Enriquecidos" value={props.enriched} />
      <Tile label="Qualificados" value={props.qualified} accent="success" />
      <Tile label="Aguardando na fila" value={props.queued} />
      <Tile label="Em processamento" value={props.processing} />
      <Tile label="Contatados" value={props.contacted} accent="success" />
      <Tile label="Responderam" value={props.replied} accent="success" />
      <Tile label="Concluídos" value={props.completed} accent="success" />
      <Tile label="Com erro" value={props.errors} accent={props.errors > 0 ? "destructive" : undefined} />
    </div>
  );
}
