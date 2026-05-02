import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type Row = { attendant_id: string; name: string; photo_url: string | null; total: number; completed: number; no_shows: number; success_rate: number };
type Key = keyof Row;

export default function AttendantPerformanceTable({ data }: { data: Row[] }) {
  const [sortKey, setSortKey] = useState<Key>("total");
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      const va = a[sortKey] as any, vb = b[sortKey] as any;
      if (typeof va === "number") return asc ? va - vb : vb - va;
      return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [data, sortKey, asc]);

  const toggle = (k: Key) => { if (sortKey === k) setAsc(!asc); else { setSortKey(k); setAsc(false); } };

  const H = ({ k, label }: { k: Key; label: string }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium" onClick={() => toggle(k)}>
      {label} <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Performance por atendente</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><H k="name" label="Atendente" /></TableHead>
              <TableHead className="text-right"><H k="total" label="Agendamentos" /></TableHead>
              <TableHead className="text-right"><H k="completed" label="Concluídos" /></TableHead>
              <TableHead className="text-right"><H k="no_shows" label="No-shows" /></TableHead>
              <TableHead className="text-right"><H k="success_rate" label="Taxa de sucesso" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sem dados no período</TableCell></TableRow>
            )}
            {sorted.map((r) => (
              <TableRow key={r.attendant_id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      {r.photo_url && <AvatarImage src={r.photo_url} />}
                      <AvatarFallback>{r.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{r.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{r.total}</TableCell>
                <TableCell className="text-right">{r.completed}</TableCell>
                <TableCell className="text-right">{r.no_shows}</TableCell>
                <TableCell className="text-right">{Number(r.success_rate)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
