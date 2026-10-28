import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  CalendarDays,
  Clock,
  Sparkles,
  Loader2,
  Trash2,
  Shuffle,
  Sun,
  Sunset,
  Moon,
  CheckCircle2,
  Layers,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import {
  CriafyInstagramAccount,
  CriafyContent,
  CriafyPublication,
  CriafyPublicationType,
} from "@/types/criafy";
import { extractAndValidateMedia } from "@/utils/criafyMediaValidator";

interface PendingUploadItem {
  tempId: string;
  file: File;
  previewUrl: string;
  mediaType: "VIDEO" | "IMAGE";
  title: string;
  durationSeconds?: number;
}

interface UnifiedScheduleItem {
  key: string;
  source: "UPLOAD" | "LIBRARY";
  title: string;
  previewUrl: string;
  mediaType: "VIDEO" | "IMAGE";
  durationSeconds?: number;
  file?: File;
  contentId?: string;
}

interface PlannedSlot {
  item: UnifiedScheduleItem;
  scheduledAt: Date;
  shift: "MANHA" | "TARDE" | "NOITE";
  publicationTypes: CriafyPublicationType[];
}

interface BulkScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: CriafyInstagramAccount[];
  selectedAccountId?: string;
  initialFiles?: File[];
  initialLibraryContentIds?: string[];
  onSuccess?: () => void;
}

const SHIFT_CONFIG = {
  MANHA: {
    label: "Manhã",
    rangeLabel: "08:00 – 11:50",
    startMinutes: 8 * 60, // 08:00
    endMinutes: 11 * 60 + 50, // 11:50
    icon: Sun,
    badgeClass:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  TARDE: {
    label: "Tarde",
    rangeLabel: "13:00 – 17:50",
    startMinutes: 13 * 60, // 13:00
    endMinutes: 17 * 60 + 50, // 17:50
    icon: Sunset,
    badgeClass:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  NOITE: {
    label: "Noite",
    rangeLabel: "18:30 – 21:50",
    startMinutes: 18 * 60 + 30, // 18:30
    endMinutes: 21 * 60 + 50, // 21:50
    icon: Moon,
    badgeClass:
      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
};

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function randomIntBetween(min: number, max: number): number {
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isEligibleForStories(
  mediaType: "VIDEO" | "IMAGE",
  durationSeconds?: number
): boolean {
  if (mediaType === "IMAGE") return true;
  if (!durationSeconds || durationSeconds <= 0) return true;
  return durationSeconds <= 60;
}

export function BulkScheduleModal({
  open,
  onOpenChange,
  accounts,
  selectedAccountId,
  initialFiles,
  initialLibraryContentIds,
  onSuccess,
}: BulkScheduleModalProps) {
  const { activeCompanyId } = useCompany();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Source tab: upload new files vs select from library
  const [sourceTab, setSourceTab] = useState<"UPLOAD" | "LIBRARY">("UPLOAD");

  // Pending local files to upload
  const [pendingFiles, setPendingFiles] = useState<PendingUploadItem[]>([]);

  // Existing library contents
  const [libraryContents, setLibraryContents] = useState<CriafyContent[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);

  // Bulk distribution settings
  const [targetAccountId, setTargetAccountId] = useState<string>("");
  const [postsPerDay, setPostsPerDay] = useState<number>(3);
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().split("T")[0];
  });
  const [enabledShifts, setEnabledShifts] = useState<{
    MANHA: boolean;
    TARDE: boolean;
    NOITE: boolean;
  }>({
    MANHA: true,
    TARDE: true,
    NOITE: true,
  });
  const [randomizeContentOrder, setRandomizeContentOrder] =
    useState<boolean>(true);
  const [randomizeTimesInShift, setRandomizeTimesInShift] =
    useState<boolean>(true);
  const [bulkPostReelsFeed, setBulkPostReelsFeed] = useState<boolean>(true);
  const [bulkPostStories, setBulkPostStories] = useState<boolean>(true);
  const [shuffleSeed, setShuffleSeed] = useState<number>(1);

  // Execution state
  const [submitting, setSubmitting] = useState(false);
  const [progressText, setProgressText] = useState<string>("");
  const uploadedContentMapRef = useRef<Map<string, string>>(new Map());

  // Initialize target account & initial items when modal opens
  useEffect(() => {
    if (!open) return;

    if (selectedAccountId && selectedAccountId !== "all") {
      setTargetAccountId(selectedAccountId);
    } else if (accounts.length > 0 && !targetAccountId) {
      setTargetAccountId(accounts[0].id);
    }

    if (activeCompanyId) {
      loadLibraryContents();
    }

    if (initialFiles && initialFiles.length > 0) {
      setSourceTab("UPLOAD");
      addFilesToPending(initialFiles);
    } else if (
      initialLibraryContentIds &&
      initialLibraryContentIds.length > 0
    ) {
      setSourceTab("LIBRARY");
      setSelectedLibraryIds(initialLibraryContentIds);
    }
  }, [open, selectedAccountId, accounts, activeCompanyId]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const loadLibraryContents = async () => {
    if (!activeCompanyId) return;
    setLoadingLibrary(true);
    try {
      const data = await criafyService.getContents(activeCompanyId);
      setLibraryContents(data);
    } catch (err: any) {
      console.error("Erro ao carregar biblioteca para bulk:", err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const addFilesToPending = async (filesList: FileList | File[]) => {
    const filesArray = Array.from(filesList);
    if (filesArray.length === 0) return;

    const newItems: PendingUploadItem[] = [];
    for (const file of filesArray) {
      const isVideo = file.type.startsWith("video/");
      const previewUrl = URL.createObjectURL(file);
      let durationSeconds: number | undefined = undefined;
      try {
        const meta = await extractAndValidateMedia(file);
        durationSeconds = meta.durationSeconds || undefined;
      } catch {
        // Ignore validation error on preview
      }

      newItems.push({
        tempId: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        file,
        previewUrl,
        mediaType: isVideo ? "VIDEO" : "IMAGE",
        title: file.name.replace(/\.[^/.]+$/, ""),
        durationSeconds,
      });
    }

    setPendingFiles((prev) => [...prev, ...newItems]);
    setShuffleSeed((s) => s + 1);
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      await addFilesToPending(e.target.files);
      e.target.value = "";
    }
  };

  const handleDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await addFilesToPending(e.dataTransfer.files);
    }
  };

  const removePendingFile = (tempId: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((p) => p.tempId === tempId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.tempId !== tempId);
    });
  };

  const toggleLibraryItem = (id: string) => {
    setSelectedLibraryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    setShuffleSeed((s) => s + 1);
  };

  const selectAllUnpublishedLibrary = () => {
    const unpub = libraryContents
      .filter((c) => !c.is_published && !c.is_scheduled)
      .map((c) => c.id);
    if (unpub.length === 0) {
      toast.info("Não há mídias inéditas disponíveis na biblioteca.");
      return;
    }
    setSelectedLibraryIds(unpub);
    setShuffleSeed((s) => s + 1);
    toast.success(`${unpub.length} mídia(s) inédita(s) selecionada(s)!`);
  };

  // Combine uploaded files + selected library items into a unified list
  const unifiedItems = useMemo<UnifiedScheduleItem[]>(() => {
    const fromUploads: UnifiedScheduleItem[] = pendingFiles.map((pf) => ({
      key: `upload_${pf.tempId}`,
      source: "UPLOAD",
      title: pf.title,
      previewUrl: pf.previewUrl,
      mediaType: pf.mediaType,
      durationSeconds: pf.durationSeconds,
      file: pf.file,
    }));

    const fromLibrary: UnifiedScheduleItem[] = selectedLibraryIds
      .map((id) => libraryContents.find((c) => c.id === id))
      .filter((c): c is CriafyContent => !!c)
      .map((c) => ({
        key: `lib_${c.id}`,
        source: "LIBRARY",
        title: c.title || "Mídia da Biblioteca",
        previewUrl: c.media_url,
        mediaType: c.media_type === "VIDEO" ? "VIDEO" : "IMAGE",
        durationSeconds: c.duration_seconds,
        contentId: c.id,
      }));

    return [...fromUploads, ...fromLibrary];
  }, [pendingFiles, selectedLibraryIds, libraryContents]);

  // Compute the planned distribution across days & shifts (Manhã, Tarde, Noite)
  const plannedSlots = useMemo<PlannedSlot[]>(() => {
    if (unifiedItems.length === 0) return [];

    const activeShifts = (["MANHA", "TARDE", "NOITE"] as const).filter(
      (s) => enabledShifts[s]
    );
    const effectiveShifts: Array<"MANHA" | "TARDE" | "NOITE"> =
      activeShifts.length > 0 ? activeShifts : ["MANHA", "TARDE", "NOITE"];

    // 1. Order items (random shuffle or original order)
    const orderedItems = randomizeContentOrder
      ? shuffleArray(unifiedItems)
      : [...unifiedItems];

    // 2. Parse startDate in local time
    const [y, m, d] = startDate.split("-").map(Number);
    const baseDay = new Date(
      y || new Date().getFullYear(),
      (m || 1) - 1,
      d || 1
    );
    const now = new Date();

    const isSameDay =
      baseDay.getFullYear() === now.getFullYear() &&
      baseDay.getMonth() === now.getMonth() &&
      baseDay.getDate() === now.getDate();

    const currentMinutesOfDay = now.getHours() * 60 + now.getMinutes();
    let dayOffset = 0;

    if (isSameDay && currentMinutesOfDay >= 21 * 60 + 30) {
      dayOffset = 1;
    }

    const result: PlannedSlot[] = [];
    let itemIdx = 0;

    while (itemIdx < orderedItems.length) {
      const slotDay = new Date(
        baseDay.getFullYear(),
        baseDay.getMonth(),
        baseDay.getDate() + dayOffset
      );

      const isSlotToday =
        slotDay.getFullYear() === now.getFullYear() &&
        slotDay.getMonth() === now.getMonth() &&
        slotDay.getDate() === now.getDate();

      const availableShiftsForDay = effectiveShifts.filter((shiftKey) => {
        if (!isSlotToday) return true;
        return SHIFT_CONFIG[shiftKey].endMinutes > currentMinutesOfDay + 15;
      });

      if (availableShiftsForDay.length === 0) {
        dayOffset++;
        continue;
      }

      const countForThisDay = Math.min(
        Math.max(1, postsPerDay),
        orderedItems.length - itemIdx
      );

      const dayShiftAssignments: Array<"MANHA" | "TARDE" | "NOITE"> = [];
      for (let s = 0; s < countForThisDay; s++) {
        dayShiftAssignments.push(
          availableShiftsForDay[s % availableShiftsForDay.length]
        );
      }

      const shiftOrder = { MANHA: 1, TARDE: 2, NOITE: 3 };
      dayShiftAssignments.sort((a, b) => shiftOrder[a] - shiftOrder[b]);

      const shiftCounts: Record<"MANHA" | "TARDE" | "NOITE", number> = {
        MANHA: 0,
        TARDE: 0,
        NOITE: 0,
      };
      dayShiftAssignments.forEach((sh) => {
        shiftCounts[sh]++;
      });

      const generatedMinutesByShift: Record<
        "MANHA" | "TARDE" | "NOITE",
        number[]
      > = {
        MANHA: [],
        TARDE: [],
        NOITE: [],
      };

      (["MANHA", "TARDE", "NOITE"] as const).forEach((sh) => {
        const totalInShift = shiftCounts[sh];
        if (totalInShift === 0) return;

        const cfg = SHIFT_CONFIG[sh];
        const minStart = isSlotToday
          ? Math.max(cfg.startMinutes, currentMinutesOfDay + 15)
          : cfg.startMinutes;
        const maxEnd = cfg.endMinutes;

        if (!randomizeTimesInShift) {
          const step = Math.max(
            15,
            Math.floor((maxEnd - minStart) / (totalInShift + 1))
          );
          for (let k = 0; k < totalInShift; k++) {
            generatedMinutesByShift[sh].push(minStart + step * (k + 1));
          }
        } else {
          const span = Math.max(10, maxEnd - minStart);
          const segmentLength = Math.floor(span / totalInShift);
          const mins: number[] = [];
          for (let k = 0; k < totalInShift; k++) {
            const segStart = minStart + k * segmentLength;
            const segEnd =
              k === totalInShift - 1
                ? maxEnd
                : minStart + (k + 1) * segmentLength - 5;
            mins.push(randomIntBetween(segStart, Math.max(segStart, segEnd)));
          }
          mins.sort((a, b) => a - b);
          generatedMinutesByShift[sh] = mins;
        }
      });

      const shiftUsedCursor: Record<"MANHA" | "TARDE" | "NOITE", number> = {
        MANHA: 0,
        TARDE: 0,
        NOITE: 0,
      };

      for (let s = 0; s < countForThisDay; s++) {
        const item = orderedItems[itemIdx];
        const shiftKey = dayShiftAssignments[s];
        const idxInShift = shiftUsedCursor[shiftKey]++;
        const totalMinutes =
          generatedMinutesByShift[shiftKey][idxInShift] ||
          SHIFT_CONFIG[shiftKey].startMinutes;

        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;

        const scheduledDate = new Date(
          slotDay.getFullYear(),
          slotDay.getMonth(),
          slotDay.getDate(),
          hours,
          mins,
          0,
          0
        );

        const canPostStory = isEligibleForStories(
          item.mediaType,
          item.durationSeconds
        );
        const pubTypes: CriafyPublicationType[] = [];

        if (bulkPostReelsFeed) {
          pubTypes.push(item.mediaType === "VIDEO" ? "REEL" : "FEED");
        }
        if (bulkPostStories && canPostStory) {
          pubTypes.push(
            item.mediaType === "VIDEO" ? "STORY_VIDEO" : "STORY_IMAGE"
          );
        }
        if (pubTypes.length === 0) {
          pubTypes.push(item.mediaType === "VIDEO" ? "REEL" : "FEED");
        }

        result.push({
          item,
          scheduledAt: scheduledDate,
          shift: shiftKey,
          publicationTypes: pubTypes,
        });

        itemIdx++;
      }

      dayOffset++;
    }

    return result;
  }, [
    unifiedItems,
    postsPerDay,
    startDate,
    enabledShifts,
    randomizeContentOrder,
    randomizeTimesInShift,
    bulkPostReelsFeed,
    bulkPostStories,
    shuffleSeed,
  ]);

  const totalBulkPublicationsCount = useMemo(() => {
    return plannedSlots.reduce(
      (acc, slot) => acc + slot.publicationTypes.length,
      0
    );
  }, [plannedSlots]);

  // Group plannedSlots by date key for clean preview
  const groupedPreviewByDay = useMemo(() => {
    const map = new Map<string, PlannedSlot[]>();
    plannedSlots.forEach((slot) => {
      const y = slot.scheduledAt.getFullYear();
      const m = String(slot.scheduledAt.getMonth() + 1).padStart(2, "0");
      const d = String(slot.scheduledAt.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;
      const list = map.get(key) || [];
      list.push(slot);
      map.set(key, list);
    });
    return Array.from(map.entries());
  }, [plannedSlots]);

  const toggleShift = (shiftKey: "MANHA" | "TARDE" | "NOITE") => {
    setEnabledShifts((prev) => {
      const next = { ...prev, [shiftKey]: !prev[shiftKey] };
      if (!next.MANHA && !next.TARDE && !next.NOITE) {
        toast.info("Pelo menos um turno do dia deve ficar ativo.");
        return prev;
      }
      return next;
    });
  };

  const handleBulkSubmit = async () => {
    if (!activeCompanyId) return;
    if (!targetAccountId) {
      toast.error("Selecione a conta do Instagram que receberá as publicações.");
      return;
    }
    if (plannedSlots.length === 0) {
      toast.error(
        "Adicione mídias pelo upload ou selecione conteúdos da biblioteca primeiro."
      );
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload any pending local files with caching and resilience
      const uploadedContentIdMap = uploadedContentMapRef.current;
      const uploadSlots = plannedSlots.filter(
        (s) => s.item.source === "UPLOAD" && s.item.file
      );
      const failedUploadItems: string[] = [];

      for (let i = 0; i < uploadSlots.length; i++) {
        const slot = uploadSlots[i];
        const file = slot.item.file!;

        if (uploadedContentIdMap.has(slot.item.key)) {
          continue;
        }

        const existingInLib = libraryContents.find(
          (c) => c.title === file.name && Number(c.file_size_bytes) === file.size
        );
        if (existingInLib) {
          uploadedContentIdMap.set(slot.item.key, existingInLib.id);
          continue;
        }

        const durStr = slot.item.durationSeconds ? `${Math.round(slot.item.durationSeconds)}s` : "";
        const sizeStr = `${Math.round((file.size / (1024 * 1024)) * 10) / 10}MB`;
        setProgressText(
          `Subindo mídia ${i + 1} de ${uploadSlots.length}: ${file.name} (${sizeStr}${durStr ? ` • ${durStr}` : ""})...`
        );

        try {
          const validation = await extractAndValidateMedia(file);
          const { mediaUrl, mediaType, mimeType } =
            await criafyService.uploadMediaFile(activeCompanyId, file);

          const createdContent = await criafyService.createContent(
            {
              company_id: activeCompanyId,
              title: file.name,
              media_url: mediaUrl,
              media_type: mediaType,
              mime_type: mimeType,
              file_size_bytes: file.size,
              width: validation.width || undefined,
              height: validation.height || undefined,
              duration_seconds: validation.durationSeconds || undefined,
              aspect_ratio: validation.aspectRatio,
              meta_validation_status: validation.isValid ? "VALID" : "INVALID",
              meta_validation_errors: validation.errors,
            },
            [targetAccountId]
          );

          uploadedContentIdMap.set(slot.item.key, createdContent.id);
        } catch (fileErr: any) {
          console.error(`Erro ao subir arquivo ${file.name}:`, fileErr);
          failedUploadItems.push(file.name);
        }
      }

      const validSlots = plannedSlots.filter((slot) => {
        if (slot.item.source === "LIBRARY") return !!slot.item.contentId;
        return uploadedContentIdMap.has(slot.item.key);
      });

      if (validSlots.length === 0) {
        throw new Error("Nenhum arquivo pôde ser enviado para o agendamento. Verifique sua conexão e tente novamente.");
      }

      // 2. Build all publication records (Reels + Stories simultaneously when <= 60s)
      setProgressText(
        `Agendando publicações de ${validSlots.length} mídias no calendário...`
      );

      const pubPayloads: Array<Partial<CriafyPublication>> = [];
      for (const slot of validSlots) {
        const contentId =
          slot.item.source === "LIBRARY"
            ? slot.item.contentId!
            : uploadedContentIdMap.get(slot.item.key)!;

        slot.publicationTypes.forEach((pubType, idx) => {
          const scheduledTime = new Date(
            slot.scheduledAt.getTime() + idx * 60000
          );
          pubPayloads.push({
            company_id: activeCompanyId,
            account_id: targetAccountId,
            content_id: contentId,
            publication_type: pubType,
            caption: undefined,
            scheduled_at: scheduledTime.toISOString(),
            status: "SCHEDULED" as const,
            is_auto_queued: true,
          });
        });
      }

      await criafyService.createPublicationSequence(pubPayloads);

      if (failedUploadItems.length > 0) {
        toast.warning(
          `${failedUploadItems.length} arquivo(s) não puderam ser enviados (${failedUploadItems.slice(0, 2).join(", ")}...), mas os outros ${validSlots.length} foram agendados com sucesso!`,
          { duration: 8000 }
        );
      } else {
        toast.success(
          `${pubPayloads.length} publicações (${validSlots.length} mídias) programadas em bulk com sucesso!`,
          {
            description: `Distribuídas em ${groupedPreviewByDay.length} dia(s) (${postsPerDay} horários/dia — Reels + Stories ≤ 60s).`,
            duration: 6000,
          }
        );
      }

      // Clear state
      pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPendingFiles([]);
      setSelectedLibraryIds([]);
      uploadedContentMapRef.current.clear();
      setProgressText("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Erro na programação em bulk:", err);
      toast.error(`Erro ao programar em bulk: ${err.message}`);
    } finally {
      setSubmitting(false);
      setProgressText("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-5 border-b border-border/70 bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Upload & Programação em Bulk
                  <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20 text-[10px]">
                    Distribuição Inteligente
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Suba várias mídias de uma vez e distribua automaticamente nos horários de manhã, tarde e noite (Reels + Stories ≤ 60s).
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/70">
          {/* =========================================================
              COLUNA ESQUERDA (7 cols): UPLOAD / SELEÇÃO + CONFIGURAÇÃO
             ========================================================= */}
          <div className="lg:col-span-7 p-5 space-y-5">
            {/* 1. Conta e Regras de Cadência */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/30 p-3.5 rounded-2xl border border-border/60">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Conta do Instagram
                </Label>
                <Select
                  value={targetAccountId}
                  onValueChange={setTargetAccountId}
                >
                  <SelectTrigger className="h-9 text-xs bg-background rounded-xl">
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        @{acc.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Posts por Dia
                </Label>
                <Select
                  value={String(postsPerDay)}
                  onValueChange={(v) => setPostsPerDay(Number(v) || 3)}
                >
                  <SelectTrigger className="h-9 text-xs bg-background rounded-xl font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 por dia</SelectItem>
                    <SelectItem value="2">2 por dia</SelectItem>
                    <SelectItem value="3">3 por dia (Manhã/Tarde/Noite)</SelectItem>
                    <SelectItem value="4">4 por dia</SelectItem>
                    <SelectItem value="5">5 por dia</SelectItem>
                    <SelectItem value="6">6 por dia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Iniciar em
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-xs bg-background rounded-xl"
                />
              </div>
            </div>

            {/* 2. Turnos (Manhã, Tarde e Noite) + Aleatoriedade */}
            <div className="space-y-3 bg-card p-3.5 rounded-2xl border border-border/70">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-pink-500" />
                  Turnos de Distribuição (Horário Normal)
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  Horários sorteados dentro de cada janela
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(["MANHA", "TARDE", "NOITE"] as const).map((shiftKey) => {
                  const cfg = SHIFT_CONFIG[shiftKey];
                  const Icon = cfg.icon;
                  const active = enabledShifts[shiftKey];
                  return (
                    <button
                      key={shiftKey}
                      type="button"
                      onClick={() => toggleShift(shiftKey)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        active
                          ? "bg-primary/5 border-primary/40 shadow-2xs"
                          : "bg-muted/20 border-border/50 opacity-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-amber-500" />
                          {cfg.label}
                        </span>
                        <Checkbox checked={active} />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {cfg.rangeLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={randomizeContentOrder}
                    onCheckedChange={setRandomizeContentOrder}
                    id="shuffle-contents"
                  />
                  <Label
                    htmlFor="shuffle-contents"
                    className="text-xs font-medium cursor-pointer flex items-center gap-1"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-purple-500" />
                    Ordem aleatória entre conteúdos
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={randomizeTimesInShift}
                    onCheckedChange={setRandomizeTimesInShift}
                    id="random-times"
                  />
                  <Label
                    htmlFor="random-times"
                    className="text-xs font-medium cursor-pointer"
                  >
                    Horário aleatório nos turnos
                  </Label>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    Formato das publicações (Reels & Stories):
                  </Label>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                    Vídeos ≤ 60s postam nos DOIS
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkPostReelsFeed(true);
                      setBulkPostStories(true);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      bulkPostReelsFeed && bulkPostStories
                        ? "bg-purple-500/10 border-purple-500/50 text-foreground ring-1 ring-purple-500/30"
                        : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>🔥 Reels + Stories (Os dois)</span>
                      {bulkPostReelsFeed && bulkPostStories && (
                        <span className="text-purple-600 font-bold">✓</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Se ≤ 60s, posta como Reels e também nos Stories
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBulkPostReelsFeed(true);
                      setBulkPostStories(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      bulkPostReelsFeed && !bulkPostStories
                        ? "bg-primary/10 border-primary/50 text-foreground ring-1 ring-primary/30"
                        : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>🎬 Apenas Reels / Feed</span>
                      {bulkPostReelsFeed && !bulkPostStories && (
                        <span className="text-primary font-bold">✓</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Publica somente no Feed/Reels
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBulkPostReelsFeed(false);
                      setBulkPostStories(true);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      !bulkPostReelsFeed && bulkPostStories
                        ? "bg-pink-500/10 border-pink-500/50 text-foreground ring-1 ring-pink-500/30"
                        : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>📖 Apenas Stories (≤ 60s)</span>
                      {!bulkPostReelsFeed && bulkPostStories && (
                        <span className="text-pink-600 font-bold">✓</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Publica nos Stories (se &gt; 60s, vai p/ Reels)
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Seleção de Mídias: Upload Direto ou Biblioteca */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSourceTab("UPLOAD")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      sourceTab === "UPLOAD"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-purple-500" />
                    Subir Arquivos ({pendingFiles.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceTab("LIBRARY")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      sourceTab === "LIBRARY"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-pink-500" />
                    Da Biblioteca ({selectedLibraryIds.length})
                  </button>
                </div>

                {sourceTab === "LIBRARY" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllUnpublishedLibrary}
                    className="h-7 text-[11px] gap-1 rounded-lg cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Selecionar Inéditos
                  </Button>
                )}
              </div>

              {sourceTab === "UPLOAD" ? (
                <div className="space-y-3">
                  {/* Dropzone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDropFiles}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 bg-purple-500/[0.02] hover:bg-purple-500/[0.05] transition-all rounded-2xl p-6 text-center cursor-pointer"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      Clique para selecionar ou arraste vários vídeos e imagens aqui
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Suporta múltiplos arquivos simultâneos (MP4, MOV, JPG, PNG)
                    </p>
                  </div>

                  {/* Lista de arquivos prontos para subir */}
                  {pendingFiles.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[210px] overflow-y-auto p-1">
                      {pendingFiles.map((pf) => {
                        const storyOk = isEligibleForStories(
                          pf.mediaType,
                          pf.durationSeconds
                        );
                        return (
                          <div
                            key={pf.tempId}
                            className="relative group rounded-xl overflow-hidden border border-border bg-muted/40 aspect-square"
                          >
                            {pf.mediaType === "VIDEO" ? (
                              <video
                                src={pf.previewUrl}
                                className="w-full h-full object-cover"
                                muted
                              />
                            ) : (
                              <img
                                src={pf.previewUrl}
                                alt={pf.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
                              <Badge className="bg-black/70 text-white border-0 text-[9px] px-1.5 py-0">
                                {pf.mediaType === "VIDEO"
                                  ? pf.durationSeconds
                                    ? `${Math.round(pf.durationSeconds)}s`
                                    : "Vídeo"
                                  : "Img"}
                              </Badge>
                              {storyOk && (
                                <Badge className="bg-purple-600/90 text-white border-0 text-[8px] px-1 py-0">
                                  Reels + Story
                                </Badge>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removePendingFile(pf.tempId);
                              }}
                              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 text-white hover:bg-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="Remover arquivo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] px-1.5 py-1 truncate">
                              {pf.title}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Seleção da Biblioteca Existente */
                <div className="border border-border/70 rounded-2xl p-3 bg-muted/10 max-h-[250px] overflow-y-auto">
                  {loadingLibrary ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : libraryContents.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Nenhuma mídia na biblioteca. Use a aba "Subir Arquivos" ao lado.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {libraryContents.map((content) => {
                        const isSelected = selectedLibraryIds.includes(
                          content.id
                        );
                        return (
                          <div
                            key={content.id}
                            onClick={() => toggleLibraryItem(content.id)}
                            className={`relative rounded-xl overflow-hidden border aspect-square cursor-pointer transition-all ${
                              isSelected
                                ? "ring-2 ring-purple-600 border-purple-600 scale-[0.98]"
                                : "border-border/60 opacity-85 hover:opacity-100"
                            }`}
                          >
                            {content.media_type === "VIDEO" ? (
                              <video
                                src={content.media_url}
                                className="w-full h-full object-cover"
                                muted
                              />
                            ) : (
                              <img
                                src={content.media_url}
                                alt={content.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute top-1.5 left-1.5">
                              <Badge className="bg-black/70 text-white border-0 text-[9px] px-1.5 py-0">
                                {content.media_type === "VIDEO"
                                  ? content.duration_seconds
                                    ? `${Math.round(content.duration_seconds)}s`
                                    : "Vídeo"
                                  : "Img"}
                              </Badge>
                            </div>
                            <div className="absolute top-1.5 right-1.5">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  isSelected
                                    ? "bg-purple-600 text-white"
                                    : "bg-black/50 text-white/70 border border-white/40"
                                }`}
                              >
                                {isSelected ? "✓" : ""}
                              </div>
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] px-1.5 py-1 truncate">
                              {content.title || "Sem título"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* =========================================================
              COLUNA DIREITA (5 cols): PRÉVIA DA DISTRIBUIÇÃO POR DIA
             ========================================================= */}
          <div className="lg:col-span-5 p-5 bg-muted/10 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
                    Prévia da Distribuição ({plannedSlots.length} mídias •{" "}
                    {totalBulkPublicationsCount} posts)
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {plannedSlots.length > 0
                      ? `${plannedSlots.length} mídia(s) em ${groupedPreviewByDay.length} dia(s) (${totalBulkPublicationsCount} publicações com Reels + Stories)`
                      : "Adicione mídias para visualizar o cronograma automático"}
                  </p>
                </div>

                {plannedSlots.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShuffleSeed((s) => s + 1)}
                    className="h-7 text-[11px] gap-1 rounded-lg cursor-pointer"
                    title="Sortear novamente a ordem dos conteúdos e os horários"
                  >
                    <Shuffle className="w-3 h-3 text-purple-600" />
                    Sortear
                  </Button>
                )}
              </div>

              {plannedSlots.length === 0 ? (
                <div className="border border-dashed border-border rounded-2xl p-8 text-center my-6 space-y-2">
                  <CalendarDays className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Nenhum conteúdo selecionado ainda.
                  </p>
                  <p className="text-[11px] text-muted-foreground/80">
                    Assim que você subir os arquivos ao lado, verá aqui os dias e horários sorteados (Manhã, Tarde e Noite).
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                  {groupedPreviewByDay.map(([dateKey, daySlots]) => {
                    const [yy, mm, dd] = dateKey.split("-").map(Number);
                    const dateObj = new Date(yy, mm - 1, dd);
                    const formattedDate = dateObj.toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    });

                    return (
                      <div
                        key={dateKey}
                        className="rounded-xl border border-border/80 bg-card p-3 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                          <span className="text-xs font-bold capitalize text-foreground">
                            {formattedDate}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {daySlots.length} horário(s)
                          </Badge>
                        </div>

                        <div className="space-y-1.5">
                          {daySlots.map((slot, idx) => {
                            const shiftCfg = SHIFT_CONFIG[slot.shift];
                            const ShiftIcon = shiftCfg.icon;
                            const timeStr = slot.scheduledAt.toLocaleTimeString(
                              "pt-BR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            );
                            const hasBoth = slot.publicationTypes.length > 1;
                            const formatLabel = slot.publicationTypes
                              .map((t) =>
                                t === "REEL"
                                  ? "REEL"
                                  : t === "FEED"
                                  ? "FEED"
                                  : "STORY"
                              )
                              .join(" + ");

                            return (
                              <div
                                key={`${slot.item.key}_${idx}`}
                                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-muted/40 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-md overflow-hidden bg-muted shrink-0 border border-border/60">
                                    {slot.item.mediaType === "VIDEO" ? (
                                      <video
                                        src={slot.item.previewUrl}
                                        className="w-full h-full object-cover"
                                        muted
                                      />
                                    ) : (
                                      <img
                                        src={slot.item.previewUrl}
                                        alt={slot.item.title}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-[11px] truncate max-w-[140px]">
                                      {slot.item.title}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <span
                                        className={
                                          hasBoth
                                            ? "font-bold text-purple-600 dark:text-purple-400"
                                            : ""
                                        }
                                      >
                                        {formatLabel}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0.5 font-semibold flex items-center gap-1 ${shiftCfg.badgeClass}`}
                                  >
                                    <ShiftIcon className="w-2.5 h-2.5" />
                                    {shiftCfg.label}
                                  </Badge>
                                  <span className="font-mono font-bold text-xs bg-background px-2 py-0.5 rounded border border-border">
                                    {timeStr}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {progressText && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300 font-medium">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">{progressText}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border/70 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {plannedSlots.length > 0 ? (
              <span>
                Total: <strong>{plannedSlots.length} mídias</strong> (
                <strong>{totalBulkPublicationsCount} publicações</strong>) •{" "}
                <strong>{postsPerDay} por dia</strong> (Manhã, Tarde e Noite)
              </span>
            ) : (
              <span>
                Selecione ou suba múltiplos arquivos para agendar de uma vez.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleBulkSubmit}
              disabled={submitting || plannedSlots.length === 0}
              className="gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-bold text-xs hover:opacity-90 border-0 shadow-md rounded-xl cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Programando em Bulk...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Subir e Programar Tudo ({totalBulkPublicationsCount} posts)
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
