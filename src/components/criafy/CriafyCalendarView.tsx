import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Instagram,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import {
  CriafyPublication,
  CriafyInstagramAccount,
  CriafyPublicationAttempt,
} from "@/types/criafy";

interface CriafyCalendarViewProps {
  accounts: CriafyInstagramAccount[];
  selectedAccountId: string;
  onSelectAccountFilter: (id: string) => void;
}

export function CriafyCalendarView({
  accounts,
  selectedAccountId,
  onSelectAccountFilter,
}: CriafyCalendarViewProps) {
  const { activeCompanyId } = useCompany();
  const [publications, setPublications] = useState<CriafyPublication[]>([]);
  const [loading, setLoading] = useState(false);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Post Detail Modal & Attempts state
  const [selectedPub, setSelectedPub] = useState<CriafyPublication | null>(null);
  const [attempts, setAttempts] = useState<CriafyPublicationAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  useEffect(() => {
    if (activeCompanyId) {
      loadPublications();
    }
  }, [activeCompanyId, selectedAccountId]);

  const loadPublications = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const data = await criafyService.getPublications(activeCompanyId, selectedAccountId);
      setPublications(data);
    } catch (err) {
      console.error("Erro ao carregar publicações no calendário:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (pub: CriafyPublication) => {
    setSelectedPub(pub);
    setLoadingAttempts(true);
    try {
      const atts = await criafyService.getPublicationAttempts(pub.id);
      setAttempts(atts);
    } catch (err) {
      console.error("Erro ao carregar tentativas de publicação:", err);
    } finally {
      setLoadingAttempts(false);
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar matrix computation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const weekDayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Group publications by Date YYYY-MM-DD
  const pubsByDate = new Map<string, CriafyPublication[]>();
  publications.forEach((pub) => {
    if (!pub.scheduled_at) return;
    const dateKey = pub.scheduled_at.split("T")[0];
    const existing = pubsByDate.get(dateKey) || [];
    existing.push(pub);
    pubsByDate.set(dateKey, existing);
  });

  return (
    <div className="space-y-4">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/30 p-4 rounded-xl border border-muted">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs font-semibold">
            Hoje
          </Button>
          <div className="flex items-center border border-muted rounded-lg bg-background">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 font-bold text-xs">
              {monthNames[month]} {year}
            </span>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="w-56">
          <Select value={selectedAccountId} onValueChange={onSelectAccountFilter}>
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue placeholder="Filtrar por Conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  @{acc.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border border-muted rounded-xl bg-card overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-muted bg-muted/40 text-center font-bold text-[11px] py-2 text-muted-foreground">
            {weekDayNames.map((day, idx) => (
              <div key={idx}>{day}</div>
            ))}
          </div>

          {/* Days cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-muted">
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} className="min-h-[110px] bg-muted/10 p-1.5" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const formattedDateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const dayPubs = pubsByDate.get(formattedDateKey) || [];
              const isToday =
                new Date().toISOString().split("T")[0] === formattedDateKey;

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`min-h-[110px] p-1.5 space-y-1 transition-colors ${
                    isToday ? "bg-primary/5 font-semibold" : "hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
                        isToday ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayPubs.length > 0 && (
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {dayPubs.length} post(s)
                      </span>
                    )}
                  </div>

                  {/* Publications in this day */}
                  <div className="space-y-1 overflow-y-auto max-h-[85px] hide-scrollbar">
                    {dayPubs.map((pub) => {
                      const timeStr = pub.scheduled_at
                        ? new Date(pub.scheduled_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "";

                      return (
                        <div
                          key={pub.id}
                          onClick={() => handleOpenDetail(pub)}
                          className={`p-1 rounded border text-[10px] cursor-pointer flex items-center justify-between gap-1 transition-all hover:scale-[1.02] ${
                            pub.status === "PUBLISHED"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                              : pub.status === "FAILED"
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                              : "bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300"
                          }`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            {pub.content?.media_type === "VIDEO" ? (
                              <Video className="w-2.5 h-2.5 flex-shrink-0" />
                            ) : (
                              <ImageIcon className="w-2.5 h-2.5 flex-shrink-0" />
                            )}
                            <span className="font-bold">{timeStr}</span>
                            <span className="truncate">{pub.publication_type}</span>
                          </div>

                          {pub.status === "PUBLISHED" ? (
                            <CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0 text-emerald-500" />
                          ) : pub.status === "FAILED" ? (
                            <AlertCircle className="w-2.5 h-2.5 flex-shrink-0 text-rose-500" />
                          ) : (
                            <Clock className="w-2.5 h-2.5 flex-shrink-0 text-sky-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Post Detail & Audit Log Modal */}
      <Dialog open={!!selectedPub} onOpenChange={(open) => !open && setSelectedPub(null)}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          {selectedPub && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-500" />
                    Publicação @{selectedPub.account?.username}
                  </DialogTitle>
                  <Badge variant="outline" className="text-xs uppercase font-bold">
                    {selectedPub.publication_type}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Agendado para:{" "}
                  {selectedPub.scheduled_at
                    ? new Date(selectedPub.scheduled_at).toLocaleString("pt-BR")
                    : "Pendente"}
                </DialogDescription>
              </DialogHeader>

              {/* Media preview */}
              {selectedPub.content?.media_url && (
                <div className="relative aspect-video rounded-xl bg-black/5 overflow-hidden border border-muted">
                  {selectedPub.content.media_type === "VIDEO" ? (
                    <video
                      src={selectedPub.content.media_url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={selectedPub.content.media_url}
                      alt="Mídia"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              )}

              {/* Caption */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">Legenda</span>
                <p className="text-xs bg-muted/30 p-3 rounded-lg border border-muted whitespace-pre-line leading-relaxed">
                  {selectedPub.caption || "Sem legenda associada"}
                </p>
              </div>

              {/* Instagram link if published */}
              {selectedPub.ig_permalink && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    Publicado com sucesso no Instagram
                  </span>
                  <a
                    href={selectedPub.ig_permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                  >
                    Abrir no Instagram <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Audit logs / Attempts */}
              <div className="space-y-2 pt-2 border-t border-muted">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  Histórico de Execuções & Tentativas (Auditoria Técnica)
                </span>

                {loadingAttempts ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : attempts.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">
                    Nenhuma tentativa de disparo registrada ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {attempts.map((att) => (
                      <div
                        key={att.id}
                        className="p-2.5 rounded-lg border border-muted bg-muted/20 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[11px]">
                            Tentativa #{att.attempt_number}
                          </span>
                          <Badge
                            variant={att.status === "SUCCESS" ? "default" : "destructive"}
                            className="text-[10px]"
                          >
                            {att.status}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(att.attempted_at).toLocaleString("pt-BR")}
                        </p>
                        {att.error_message && (
                          <p className="text-[11px] text-rose-500 font-mono">
                            {att.error_message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
