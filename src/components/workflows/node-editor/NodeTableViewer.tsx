import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface NodeTableViewerProps {
  data: any;
}

export function NodeTableViewer({ data }: NodeTableViewerProps) {
  if (!data || typeof data !== "object") {
    return <div className="text-muted-foreground p-4 text-xs italic">Nenhum dado estruturado para exibir.</div>;
  }

  const getFlatMap = (obj: any, prefix = ""): Array<{ key: string; value: string }> => {
    if (!obj) return [];
    let items: Array<{ key: string; value: string }> = [];
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        items.push(...getFlatMap(v, path));
      } else {
        const valStr = typeof v === "object" ? JSON.stringify(v) : String(v);
        items.push({ key: path, value: valStr });
      }
    }
    return items;
  };

  const rows = getFlatMap(data);

  if (rows.length === 0) {
    return <div className="text-muted-foreground p-4 text-xs italic">Nenhum dado estruturado para exibir.</div>;
  }

  return (
    <div className="rounded-xl border overflow-hidden max-h-[450px] overflow-y-auto bg-white">
      <Table>
        <TableHeader className="bg-slate-50 font-semibold text-[10px] uppercase text-slate-500 tracking-wider">
          <TableRow>
            <TableHead className="h-9">Propriedade (Key)</TableHead>
            <TableHead className="h-9">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-xs">
          {rows.map((row) => (
            <TableRow key={row.key} className="hover:bg-slate-50/50">
              <TableCell className="font-mono text-[10px] font-semibold text-slate-600 break-all">{row.key}</TableCell>
              <TableCell className="break-all text-slate-700">{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
