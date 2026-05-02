import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, X, FileText } from "lucide-react";

export interface CampaignOption {
  id: string;
  name: string;
  type: string;
}

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: {
    leads: { name?: string; phone: string; email?: string; tags?: string[]; campaignId?: string; campaignType?: string }[];
    updateExisting: boolean;
    defaultTags: string[];
    defaultCampaignId?: string;
    defaultCampaignType?: string;
  }) => void;
  isLoading?: boolean;
  campaigns?: CampaignOption[];
}

type MappingField = "ignore" | "name" | "phone" | "email" | "tags" | "campaign" | "lid";

export function ImportLeadsDialog({ open, onOpenChange, onImport, isLoading, campaigns = [] }: ImportLeadsDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, MappingField>>({});
  const [updateExisting, setUpdateExisting] = useState(true);
  const [defaultTags, setDefaultTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [defaultCampaign, setDefaultCampaign] = useState<string>("none");

  const campaignsByType = {
    ligacao: campaigns.filter((c) => c.type === "ligacao"),
    despacho: campaigns.filter((c) => c.type === "despacho"),
    grupos: campaigns.filter((c) => c.type === "grupos"),
  };

  const findCampaignByName = (name: string): CampaignOption | undefined => {
    const lower = name.toLowerCase().trim();
    const exact = campaigns.find((c) => c.name.toLowerCase() === lower);
    if (exact) return exact;
    const parts = lower.split("|").map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const match = campaigns.find((c) => c.name.toLowerCase() === part);
      if (match) return match;
    }
    return campaigns.find((c) => lower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(lower));
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else current += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { result.push(current.trim()); current = ""; }
        else current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return;
    const hdrs = parseCSVLine(lines[0]);
    setHeaders(hdrs);
    const dataRows = lines.slice(1).map((line) => parseCSVLine(line));
    setRows(dataRows);

    const autoMapping: Record<number, MappingField> = {};
    hdrs.forEach((h, i) => {
      const lower = h.toLowerCase();
      if (lower.includes("nome") || lower.includes("name")) autoMapping[i] = "name";
      else if (lower.includes("telefone") || lower.includes("phone") || lower.includes("fone")) autoMapping[i] = "phone";
      else if (lower.includes("email") || lower.includes("e-mail")) autoMapping[i] = "email";
      else if (lower.includes("tag") || lower.includes("categoria")) autoMapping[i] = "tags";
      else if (lower.includes("campanha") || lower.includes("campaign")) autoMapping[i] = "campaign";
      else if (lower === "lid" || lower.includes("label_id") || lower.includes("@lid")) autoMapping[i] = "lid";
      else autoMapping[i] = "ignore";
    });
    setMapping(autoMapping);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => parseCSV(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleImport = () => {
    const phoneIdx = Object.entries(mapping).find(([, v]) => v === "phone")?.[0];
    if (phoneIdx === undefined) return;

    const selectedDefault = defaultCampaign !== "none" ? campaigns.find((c) => c.id === defaultCampaign) : undefined;

    const leads = rows
      .map((row) => {
        const lead: { name?: string; phone: string; email?: string; lid?: string; tags?: string[]; campaignId?: string; campaignType?: string } = { phone: "" };
        Object.entries(mapping).forEach(([idx, field]) => {
          const val = row[Number(idx)]?.trim();
          if (!val) return;
          if (field === "phone") lead.phone = val;
          else if (field === "name") lead.name = val;
          else if (field === "email") lead.email = val;
          else if (field === "lid") lead.lid = val;
          else if (field === "tags") lead.tags = val.split(/[;,]/).map((t) => t.trim().toLowerCase()).filter(Boolean);
          else if (field === "campaign") {
            const matched = findCampaignByName(val);
            if (matched) {
              lead.campaignId = matched.id;
              lead.campaignType = matched.type;
            }
          }
        });
        return lead;
      })
      .filter((l) => l.phone);

    onImport({
      leads,
      updateExisting,
      defaultTags,
      defaultCampaignId: selectedDefault?.id,
      defaultCampaignType: selectedDefault?.type,
    });
  };

  const downloadTemplate = () => {
    const csv = "nome,telefone,email,tags,campanha\nJoão Silva,5511999999999,joao@email.com,\"cliente,vip\",Minha Campanha\nMaria Santos,5511888888888,maria@email.com,lead,\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !defaultTags.includes(tag)) setDefaultTags([...defaultTags, tag]);
    setTagInput("");
  };

  const reset = () => {
    setFileName(""); setHeaders([]); setRows([]); setMapping({});
    setUpdateExisting(true); setDefaultTags([]); setTagInput("");
    setDefaultCampaign("none");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Leads</DialogTitle>
          <DialogDescription>Importe leads a partir de um arquivo CSV.</DialogDescription>
        </DialogHeader>

        {!fileName ? (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Arraste um arquivo CSV aqui ou clique para selecionar</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </div>
            <Button variant="link" size="sm" onClick={downloadTemplate} className="gap-1">
              <Download className="h-4 w-4" /> Baixar modelo de planilha
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>Remover</Button>
            </div>

            {/* Column Mapping */}
            <div>
              <Label className="text-sm font-medium">Mapeamento de colunas</Label>
              <div className="space-y-2 mt-2">
                {headers.map((header, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-sm w-40 truncate text-muted-foreground">{header}</span>
                    <span className="text-muted-foreground">→</span>
                    <Select value={mapping[idx] || "ignore"} onValueChange={(v) => setMapping({ ...mapping, [idx]: v as MappingField })}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ignore">Ignorar</SelectItem>
                        <SelectItem value="name">Nome</SelectItem>
                        <SelectItem value="phone">Telefone</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="lid">LID</SelectItem>
                        <SelectItem value="tags">Tag</SelectItem>
                        <SelectItem value="campaign">Campanha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label className="text-sm font-medium">Prévia: {rows.length} leads encontrados</Label>
              <div className="border rounded-lg overflow-auto max-h-40 mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h, i) => mapping[i] !== "ignore" && <TableHead key={i}>{h}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 5).map((row, ri) => (
                      <TableRow key={ri}>
                        {row.map((cell, ci) => mapping[ci] !== "ignore" && <TableCell key={ci}>{cell || "—"}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox checked={updateExisting} onCheckedChange={(c) => setUpdateExisting(!!c)} id="update" />
                <label htmlFor="update" className="text-sm">Atualizar leads existentes (mesmo telefone)</label>
              </div>
              <div>
                <Label className="text-sm">Adicionar tag a todos</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Tag" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} />
                  <Button variant="outline" size="sm" onClick={addTag}>+</Button>
                </div>
                {defaultTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {defaultTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setDefaultTags(defaultTags.filter((t) => t !== tag))} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Default Campaign */}
              {campaigns.length > 0 && (
                <div>
                  <Label className="text-sm">Campanha padrão para todos</Label>
                  <Select value={defaultCampaign} onValueChange={setDefaultCampaign}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {campaignsByType.ligacao.length > 0 && (
                        <>
                          <SelectItem value="__header_ligacao" disabled className="text-xs font-semibold text-muted-foreground">— Ligação —</SelectItem>
                          {campaignsByType.ligacao.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </>
                      )}
                      {campaignsByType.despacho.length > 0 && (
                        <>
                          <SelectItem value="__header_despacho" disabled className="text-xs font-semibold text-muted-foreground">— Despacho —</SelectItem>
                          {campaignsByType.despacho.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </>
                      )}
                      {campaignsByType.grupos.length > 0 && (
                        <>
                          <SelectItem value="__header_grupos" disabled className="text-xs font-semibold text-muted-foreground">— Grupos —</SelectItem>
                          {campaignsByType.grupos.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!fileName || rows.length === 0 || isLoading}>
            {isLoading ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
