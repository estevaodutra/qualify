import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, RefreshCw, X } from "lucide-react";
import { QuizSubmissionDetail } from "@/types/quiz/tracking";
import * as XLSX from "xlsx";

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  utmSource: string;
  onUtmSourceChange: (val: string) => void;
  utmCampaign: string;
  onUtmCampaignChange: (val: string) => void;
  deviceType: string;
  onDeviceTypeChange: (val: string) => void;
  leads: QuizSubmissionDetail[];
  onRefresh: () => void;
}

export function QuizLeadsToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  utmSource,
  onUtmSourceChange,
  utmCampaign,
  onUtmCampaignChange,
  deviceType,
  onDeviceTypeChange,
  leads,
  onRefresh
}: Props) {
  const handleClearFilters = () => {
    onSearchChange("");
    onStatusChange("all");
    onUtmSourceChange("");
    onUtmCampaignChange("");
    onDeviceTypeChange("");
  };

  const hasActiveFilters = search || status !== "all" || utmSource || utmCampaign || deviceType;

  // Export to Excel / XLSX
  const handleExportExcel = () => {
    const dataToExport = leads.map(l => ({
      ID: l.publicId,
      Status: l.status,
      Progresso: `${l.stepsCompleted} etapas`,
      Nome: l.leadName || "Anônimo",
      Email: l.leadEmail || "—",
      WhatsApp: l.leadPhone || "—",
      "Origem/Referrer": l.referrer || "—",
      UTM_Source: l.utmSource || "—",
      UTM_Campaign: l.utmCampaign || "—",
      Dispositivo: l.deviceType || "—",
      Navegador: l.browser || "—",
      "Sistema Operacional": l.operatingSystem || "—",
      Duração: l.totalDurationSeconds ? `${l.totalDurationSeconds}s` : "—",
      Criado_Em: new Date(l.firstSeenAt).toLocaleString("pt-BR")
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `leads_funnel_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
        {/* Search */}
        <div className="relative w-full max-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por ID, Nome, Email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 text-xs h-9 bg-slate-50/50 border-slate-200"
          />
        </div>

        {/* Filter Status */}
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[120px] text-xs h-9 bg-slate-50/50 border-slate-200">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="anonymous">Anônimo</SelectItem>
            <SelectItem value="started">Iniciado</SelectItem>
            <SelectItem value="identified">Identificado</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="abandoned">Abandonado</SelectItem>
            <SelectItem value="disqualified">Desqualificado</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter Device */}
        <Select value={deviceType} onValueChange={onDeviceTypeChange}>
          <SelectTrigger className="w-[120px] text-xs h-9 bg-slate-50/50 border-slate-200">
            <SelectValue placeholder="Dispositivo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos Dispositivos</SelectItem>
            <SelectItem value="mobile">Celular</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
            <SelectItem value="desktop">Computador</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter UTM Source */}
        <div className="relative w-[130px]">
          <Input
            placeholder="Origem (UTM)"
            value={utmSource}
            onChange={(e) => onUtmSourceChange(e.target.value)}
            className="text-xs h-9 bg-slate-50/50 border-slate-200"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-9 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 gap-1 rounded-lg"
          >
            <X className="h-3 w-3" />
            Limpar Filtros
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="h-9 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Atualizar
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={handleExportExcel}
          disabled={leads.length === 0}
          className="h-9 text-xs font-semibold bg-[#8A3CFF] hover:bg-[#7830E3] text-white"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Exportar Excel
        </Button>
      </div>
    </div>
  );
}
