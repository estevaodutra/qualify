import React, { useState, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Plus,
  RefreshCw,
  Layers,
  Sparkles,
} from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import {
  CriafyPublication,
  CriafyInstagramAccount,
  CriafyPublicationAttempt,
} from "@/types/criafy";
import { SchedulePublicationModal } from "@/components/criafy/SchedulePublicationModal";

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

  // View Mode: Month vs Week (Google Calendar style)
  const [viewMode, setViewMode] = useState<"MONTH" | "WEEK">("WEEK");

  // Navigation state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Post Detail Modal & Attempts state
  const [selectedPub, setSelectedPub] = useState<CriafyPublication | null>(null);
  const [attempts, setAttempts] = useState<CriafyPublicationAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Schedule Modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleModalDate, setScheduleModalDate] = useState<Date | null>(null);

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

  const handleOpenSchedule = (date?: Date) => {
    setScheduleModalDate(date || new Date());
    setScheduleModalOpen(true);
  };

  // Navigation handlers
  const handleNext = () => {
    if (viewMode === "MONTH") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    }
  };

  const handlePrev = () => {
    if (viewMode === "MONTH") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 7);
      setCurrentDate(prev);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

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

  // Sort each day's pubs by time ascending
  pubsByDate.forEach((dayPubs) => {
    dayPubs.sort((a, b) => {
      const tA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const tB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return tA - tB;
    });
  });

  // Month computations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Week computations (Google Calendar Week starts on Sunday)
  const currentDayOfWeek = currentDate.getDay();
  const weekStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDayOfWeek);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const weekEnd = weekDays[6];

  // Title string depending on view mode
  let headerTitle = "";
  if (viewMode === "MONTH") {
    headerTitle = `${monthNames[month]} de ${year}`;
  } else {
    const startStr = `${weekStart.getDate()} de ${monthNames[weekStart.getMonth()]}`;
    const endStr = `${weekEnd.getDate()} de ${monthNames[weekEnd.getMonth()]}`;
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      headerTitle = `${weekStart.getDate()} a ${weekEnd.getDate()} de ${monthNames[weekStart.getMonth()]} de ${year}`;
    } else {
      headerTitle = `${startStr} - ${endStr} de ${year}`;
    }
  }

  const todayIso = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      {/* Google Calendar Style Header Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-2xl border border-muted/80 backdrop-blur-sm">
        {/* Left: Quick Create + Today + Navigation + Title */}
        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            onClick={() => handleOpenSchedule()}
            size="sm"
            className="h-9 px-4 gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-bold text-xs hover:opacity-90 shadow-md transition-all rounded-xl border-0"
          >
            <Plus className="w-4 h-4" /> Programar Publicação
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-9 text-xs font-semibold rounded-xl"
          >
            Hoje
          </Button>

          <div className="flex items-center border border-muted rounded-xl bg-background shadow-xs overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="h-9 w-9 rounded-none hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="h-9 w-9 rounded-none hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <h2 className="text-base sm:text-lg font-bold tracking-tight capitalize pl-1">
            {headerTitle}
          </h2>
        </div>

        {/* Right: View Mode (Mês / Semana) + Account Filter */}
        <div className="flex items-center gap-2">
          {/* View switcher: Month vs Week */}
          <div className="flex bg-background border border-muted rounded-xl p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("MONTH")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === "MONTH"
                  ? "bg-muted text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setViewMode("WEEK")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === "WEEK"
                  ? "bg-muted text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semana
            </button>
          </div>

          {/* Account Filter */}
          <div className="w-44 sm:w-48">
            <Select value={selectedAccountId} onValueChange={onSelectAccountFilter}>
              <SelectTrigger className="h-9 text-xs bg-background rounded-xl">
                <SelectValue placeholder="Todas as contas" />
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

          <Button
            variant="outline"
            size="icon"
            onClick={loadPublications}
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground shrink-0"
            title="Recarregar eventos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Main Calendar Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-3 border rounded-2xl bg-card">
          <Loader2 className="w-7 h-7 animate-spin text-pink-500" />
          <p className="text-xs text-muted-foreground">Carregando cronograma editorial...</p>
        </div>
      ) : viewMode === "MONTH" ? (
        /* ======================================================== */
        /* MONTH VIEW (GOOGLE CALENDAR STYLE)                       */
        /* ======================================================== */
        <div className="border border-muted rounded-2xl bg-card overflow-hidden shadow-xs">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-muted bg-muted/40 text-center font-bold text-xs py-2.5 text-muted-foreground">
            {weekDayNames.map((day, idx) => (
              <div key={idx} className="uppercase tracking-wider text-[11px]">
                {day}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-muted">
            {/* Blank leading days from previous month */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} className="min-h-[120px] bg-muted/10 p-1.5 opacity-40" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const formattedDateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const dayPubs = pubsByDate.get(formattedDateKey) || [];
              const isToday = todayIso === formattedDateKey;
              const cellDate = new Date(year, month, dayNum);

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => handleOpenSchedule(cellDate)}
                  className={`min-h-[120px] p-2 space-y-1.5 transition-all cursor-pointer group flex flex-col justify-between ${
                    isToday ? "bg-primary/5 font-semibold" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs transition-colors ${
                        isToday
                          ? "bg-pink-600 text-white font-bold shadow-sm"
                          : "text-muted-foreground group-hover:text-foreground group-hover:bg-muted font-medium"
                      }`}
                    >
                      {dayNum}
                    </span>

                    {dayPubs.length > 0 && (
                      <span className="text-[10px] text-muted-foreground font-semibold px-1 rounded bg-muted/40">
                        {dayPubs.length} post(s)
                      </span>
                    )}
                  </div>

                  {/* Publications chips inside the day cell */}
                  <div
                    className="space-y-1 flex-1 overflow-y-auto max-h-[90px] hide-scrollbar"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {dayPubs.map((pub) => {
                      const timeStr = pub.scheduled_at
                        ? new Date(pub.scheduled_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "";

                      const isStorySeq = !!pub.story_sequence_id || (pub.sequence_total && pub.sequence_total > 1);
                      const isReel = pub.publication_type === "REEL";
                      const isFeed = pub.publication_type === "FEED";

                      return (
                        <div
                          key={pub.id}
                          onClick={() => handleOpenDetail(pub)}
                          className={`px-1.5 py-1 rounded-md border text-[10px] cursor-pointer flex items-center justify-between gap-1 transition-all hover:scale-[1.02] shadow-xs ${
                            pub.status === "PUBLISHED"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                              : pub.status === "FAILED"
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                              : "bg-sky-500/10 border-sky-500/30 text-sky-800 dark:text-sky-300"
                          }`}
                          title={`@${pub.account?.username} • ${pub.publication_type} (${timeStr})`}
                        >
                          <div className="flex items-center gap-1 truncate min-w-0">
                            {isReel ? (
                              <Video className="w-2.5 h-2.5 flex-shrink-0 text-purple-500" />
                            ) : isFeed ? (
                              <ImageIcon className="w-2.5 h-2.5 flex-shrink-0 text-sky-500" />
                            ) : isStorySeq ? (
                              <Layers className="w-2.5 h-2.5 flex-shrink-0 text-pink-500" />
                            ) : (
                              <Sparkles className="w-2.5 h-2.5 flex-shrink-0 text-amber-500" />
                            )}
                            <span className="font-bold">{timeStr}</span>
                            <span className="truncate">
                              {isStorySeq
                                ? `Story ${pub.sequence_order || 1}/${pub.sequence_total || 1}`
                                : pub.publication_type === "REEL"
                                ? "Reel"
                                : pub.publication_type === "FEED"
                                ? "Feed"
                                : "Story"}
                            </span>
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

                  {/* Subtle click prompt on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground flex items-center justify-center pt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Plus className="w-2.5 h-2.5" /> Agendar
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* WEEK VIEW (GOOGLE CALENDAR STYLE)                        */
        /* ======================================================== */
        <div className="border border-muted rounded-2xl bg-card overflow-hidden shadow-xs">
          {/* Weekday Columns Headers */}
          <div className="grid grid-cols-7 border-b border-muted bg-muted/40 divide-x divide-muted">
            {weekDays.map((d, idx) => {
              const formattedDateKey = d.toISOString().split("T")[0];
              const isToday = todayIso === formattedDateKey;
              const dayPubs = pubsByDate.get(formattedDateKey) || [];

              return (
                <div
                  key={`week-head-${idx}`}
                  className={`py-3 px-2 text-center transition-colors ${
                    isToday ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {weekDayNames[d.getDay()]}
                  </div>
                  <div className="mt-1 flex items-center justify-center">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                        isToday
                          ? "bg-pink-600 text-white shadow-sm"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-medium">
                    {dayPubs.length} publicação(ões)
                  </div>
                </div>
              );
            })}
          </div>

          {/* 7 Columns for the week contents */}
          <div className="grid grid-cols-7 divide-x divide-muted min-h-[500px] auto-rows-fr">
            {weekDays.map((d, colIdx) => {
              const formattedDateKey = d.toISOString().split("T")[0];
              const isToday = todayIso === formattedDateKey;
              const dayPubs = pubsByDate.get(formattedDateKey) || [];

              return (
                <div
                  key={`week-col-${colIdx}`}
                  className={`p-2 space-y-2 flex flex-col justify-between ${
                    isToday ? "bg-primary/5" : "bg-card hover:bg-muted/10 transition-colors"
                  }`}
                >
                  {/* List of contents for this day */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-0.5">
                    {dayPubs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-3 text-center text-muted-foreground/60 min-h-[140px]">
                        <p className="text-[11px]">Nenhum post</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenSchedule(d)}
                          className="text-[10px] h-7 mt-2 text-pink-600 hover:text-pink-700 hover:bg-pink-500/10 gap-1"
                        >
                          <Plus className="w-3 h-3" /> Agendar
                        </Button>
                      </div>
                    ) : (
                      dayPubs.map((pub) => {
                        const timeStr = pub.scheduled_at
                          ? new Date(pub.scheduled_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "";

                        const isStorySeq =
                          !!pub.story_sequence_id || (pub.sequence_total && pub.sequence_total > 1);
                        const isReel = pub.publication_type === "REEL";
                        const isFeed = pub.publication_type === "FEED";

                        return (
                          <div
                            key={`week-card-${pub.id}`}
                            onClick={() => handleOpenDetail(pub)}
                            className="group p-2.5 rounded-xl border border-muted bg-background hover:border-pink-500/40 hover:shadow-md transition-all cursor-pointer space-y-2"
                          >
                            {/* Card Media Preview Thumbnail */}
                            {pub.content?.media_url && (
                              <div className="relative aspect-[9/16] max-h-36 w-full rounded-lg overflow-hidden bg-black/10 border border-muted">
                                {pub.content.media_type === "VIDEO" ? (
                                  <video
                                    src={pub.content.media_url}
                                    className="w-full h-full object-cover pointer-events-none"
                                    muted
                                  />
                                ) : (
                                  <img
                                    src={pub.content.media_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                )}

                                {/* Media type & duration badge */}
                                <div className="absolute top-1 left-1">
                                  <Badge className="bg-black/70 text-white text-[9px] px-1 py-0 h-4 border-0">
                                    {pub.content.media_type === "VIDEO" ? (
                                      <Video className="w-2.5 h-2.5 mr-0.5 text-sky-400" />
                                    ) : (
                                      <ImageIcon className="w-2.5 h-2.5 mr-0.5 text-emerald-400" />
                                    )}
                                    {pub.content.duration_seconds
                                      ? `${Math.round(pub.content.duration_seconds)}s`
                                      : pub.content.media_type}
                                  </Badge>
                                </div>

                                {/* Status badge top right */}
                                <div className="absolute top-1 right-1">
                                  {pub.status === "PUBLISHED" ? (
                                    <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4 border-0 shadow-sm flex items-center gap-0.5">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Postado
                                    </Badge>
                                  ) : pub.status === "FAILED" ? (
                                    <Badge className="bg-rose-600 text-white text-[9px] px-1 py-0 h-4 border-0 shadow-sm flex items-center gap-0.5">
                                      <AlertCircle className="w-2.5 h-2.5" /> Falha
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-sky-600 text-white text-[9px] px-1 py-0 h-4 border-0 shadow-sm flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" /> Agendado
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Card Info Details */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1 text-[11px]">
                                <span className="font-bold text-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-pink-500" /> {timeStr}
                                </span>

                                {isStorySeq ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-gradient-to-r from-pink-500/10 to-amber-500/10 text-pink-600 border-pink-500/30 text-[9px] px-1 py-0 font-bold"
                                  >
                                    Story {pub.sequence_order || 1}/{pub.sequence_total || 1}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1 py-0 font-bold ${
                                      isReel
                                        ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                                        : isFeed
                                        ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                        : "bg-pink-500/10 text-pink-600 border-pink-500/30"
                                    }`}
                                  >
                                    {pub.publication_type}
                                  </Badge>
                                )}
                              </div>

                              {/* Account handle */}
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate font-medium">
                                <Avatar className="w-3.5 h-3.5">
                                  <AvatarImage src={pub.account?.profile_picture_url || undefined} />
                                  <AvatarFallback className="text-[7px]">@</AvatarFallback>
                                </Avatar>
                                <span className="truncate">@{pub.account?.username}</span>
                              </div>

                              {/* Caption snippet */}
                              {pub.caption && (
                                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight italic pt-0.5">
                                  "{pub.caption}"
                                </p>
                              )}

                              {/* Link to Instagram if published */}
                              {pub.ig_permalink && (
                                <a
                                  href={pub.ig_permalink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[10px] text-pink-600 hover:text-pink-700 font-semibold hover:underline pt-0.5"
                                >
                                  Ver no Instagram <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add button at bottom of day column */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenSchedule(d)}
                    className="w-full text-[11px] h-7 border border-dashed border-muted hover:border-pink-500/40 hover:bg-pink-500/5 text-muted-foreground hover:text-foreground gap-1 rounded-lg"
                  >
                    <Plus className="w-3 h-3" /> Novo Post
                  </Button>
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

              {/* Story Sequence Info Banner if applicable */}
              {selectedPub.story_sequence_id && (
                <div className="p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-between text-xs text-pink-700 dark:text-pink-300">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Layers className="w-4 h-4" />
                    Parte de uma Sequência de Stories
                  </span>
                  <Badge variant="outline" className="border-pink-500/40 text-[10px]">
                    Story {selectedPub.sequence_order || 1} de {selectedPub.sequence_total || 1}
                  </Badge>
                </div>
              )}

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
                      alt={selectedPub.content.title}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              )}

              {/* Details & Caption */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Status Atual:</span>
                  <Badge
                    variant="outline"
                    className={`font-bold ${
                      selectedPub.status === "PUBLISHED"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : selectedPub.status === "FAILED"
                        ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                        : "bg-sky-500/10 text-sky-600 border-sky-500/20"
                    }`}
                  >
                    {selectedPub.status}
                  </Badge>
                </div>

                {selectedPub.ig_permalink && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Link no Instagram:</span>
                    <a
                      href={selectedPub.ig_permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      Abrir Post <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {selectedPub.caption && (
                  <div className="space-y-1 pt-1">
                    <span className="text-xs font-semibold text-muted-foreground">Legenda:</span>
                    <div className="p-3 rounded-lg bg-muted/40 text-xs text-foreground whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {selectedPub.caption}
                    </div>
                  </div>
                )}
              </div>

              {/* Audit Log / Publication Attempts */}
              <div className="space-y-2 pt-2 border-t border-muted">
                <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Histórico de Disparos e Auditoria Meta
                </h4>

                {loadingAttempts ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : attempts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhuma tentativa registrada para este post.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {attempts.map((att) => (
                      <div
                        key={att.id}
                        className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                          att.status === "SUCCESS"
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-rose-500/5 border-rose-500/20"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1">
                            {att.status === "SUCCESS" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            )}
                            Tentativa #{att.attempt_number} ({att.status})
                          </span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {new Date(att.attempted_at).toLocaleString("pt-BR")}
                          </span>
                        </div>

                        {att.error_message && (
                          <p className="text-rose-600 text-[11px] leading-tight">
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

      {/* Schedule / Sequence Publication Modal */}
      <SchedulePublicationModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        initialDate={scheduleModalDate}
        onSuccess={() => {
          loadPublications();
        }}
      />
    </div>
  );
}
