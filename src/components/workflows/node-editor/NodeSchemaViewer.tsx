interface NodeSchemaViewerProps {
  data: any;
}

export function NodeSchemaViewer({ data }: NodeSchemaViewerProps) {
  if (!data || typeof data !== "object") {
    return <div className="text-muted-foreground p-4 text-xs italic">Nenhum schema disponível.</div>;
  }

  const getSchemaRows = (obj: any, prefix = ""): Array<{ path: string; type: string }> => {
    if (!obj) return [];
    let items: Array<{ path: string; type: string }> = [];
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        items.push(...getSchemaRows(v, path));
      } else {
        const typeStr = Array.isArray(v) ? "array" : v === null ? "null" : typeof v;
        items.push({ path, type: typeStr });
      }
    }
    return items;
  };

  const rows = getSchemaRows(data);

  if (rows.length === 0) {
    return <div className="text-muted-foreground p-4 text-xs italic">Nenhum schema disponível.</div>;
  }

  return (
    <div className="rounded-xl border bg-slate-900/5 p-4 font-mono text-[11px] overflow-auto h-full max-h-[450px]">
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.path} className="flex items-center gap-1.5 py-0.5 border-b border-slate-100 last:border-0 hover:bg-slate-100/50 rounded px-1 transition-colors">
            <span className="text-[#8A3CFF] font-semibold">{row.path}</span>
            <span className="text-slate-400">:</span>
            <span className="text-emerald-600 font-medium">{row.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
