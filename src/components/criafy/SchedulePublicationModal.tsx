import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CalendarDays,
  Clock,
  Sparkles,
  Send,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Upload,
  Shuffle,
  Sun,
  Sunset,
  Moon,
  FolderOpen,
  Film,
  BookOpen,
  AlertTriangle,
  ShieldCheck,
  Plus,
  FileText,
  Edit3,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import {
  CriafyInstagramAccount,
  CriafyContent,
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
  globalIndex: number;
  item: UnifiedScheduleItem;
  scheduledAt: Date;
  shift: "MANHA" | "TARDE" | "NOITE";
  publicationTypes: CriafyPublicationType[];
  isTooLongForStory: boolean;
}

const SHIFT_CONFIG = {
  MANHA: {
    label: "Manhã",
    rangeLabel: "08:00 – 11:50",
    startMinutes: 8 * 60,
    endMinutes: 11 * 60 + 50,
    icon: Sun,
    badgeClass:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  TARDE: {
    label: "Tarde",
    rangeLabel: "13:00 – 17:50",
    startMinutes: 13 * 60,
    endMinutes: 17 * 60 + 50,
    icon: Sunset,
    badgeClass:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  NOITE: {
    label: "Noite",
    rangeLabel: "18:30 – 21:50",
    startMinutes: 18 * 60 + 30,
    endMinutes: 21 * 60 + 50,
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

export function isEligibleForStories(
  mediaType: "VIDEO" | "IMAGE",
  durationSeconds?: number
): boolean {
  if (mediaType === "IMAGE") return true;
  if (!durationSeconds || durationSeconds <= 0) return true;
  return durationSeconds <= 60;
}

export function formatDurationCompact(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const rounded = Math.round(seconds);
  if (rounded <= 60) return `${rounded}s`;
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return secs > 0 ? `${mins}m${secs}s` : `${mins}m`;
}

/**
 * Intercala de forma inteligente vídeos curtos (≤ 60s, Reels + Stories) e vídeos longos (> 60s, Só Reels)
 * para garantir que todos os dias tenham Stories ativos e que vídeos longos não fiquem todos agrupados no mesmo dia.
 */
function smartInterleaveItems(
  items: UnifiedScheduleItem[],
  shouldShuffle: boolean
): UnifiedScheduleItem[] {
  if (!shouldShuffle) return [...items];

  const shortOrImage = shuffleArray(
    items.filter((i) => isEligibleForStories(i.mediaType, i.durationSeconds))
  );
  const longVideos = shuffleArray(
    items.filter((i) => !isEligibleForStories(i.mediaType, i.durationSeconds))
  );

  if (longVideos.length === 0) return shortOrImage;
  if (shortOrImage.length === 0) return longVideos;

  const total = items.length;
  const result: UnifiedScheduleItem[] = [];
  let sIdx = 0;
  let lIdx = 0;

  for (let i = 0; i < total; i++) {
    const remainingTotal = total - i;
    const remainingLong = longVideos.length - lIdx;
    const remainingShort = shortOrImage.length - sIdx;

    if (remainingLong === 0) {
      result.push(shortOrImage[sIdx++]);
    } else if (remainingShort === 0) {
      result.push(longVideos[lIdx++]);
    } else {
      // Proporção equilibrada: coloca os vídeos curtos distribuídos regularmente com os longos
      const idealLongRatio = remainingLong / remainingTotal;
      if ((i + 1) % Math.max(2, Math.round(1 / idealLongRatio)) === 0) {
        result.push(longVideos[lIdx++]);
      } else {
        result.push(shortOrImage[sIdx++]);
      }
    }
  }

  return result;
}

interface SchedulePublicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: CriafyInstagramAccount[];
  selectedAccountId?: string;
  initialDate?: Date | string | null;
  initialContentId?: string;
  initialPublicationType?: CriafyPublicationType;
  initialMode?: "SINGLE" | "BULK" | "STORY_SEQUENCE";
  initialBulkLibraryIds?: string[];
  onSuccess?: () => void;
}

export function SchedulePublicationModal({
  open,
  onOpenChange,
  accounts,
  selectedAccountId,
  initialDate,
  initialContentId,
  initialPublicationType,
  initialMode,
  initialBulkLibraryIds,
  onSuccess,
}: SchedulePublicationModalProps) {
  const { activeCompanyId } = useCompany();
  const [contents, setContents] = useState<CriafyContent[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Durações lidas automaticamente via metadado de vídeo no navegador para mídias da biblioteca sem duration_seconds
  const [probedDurations, setProbedDurations] = useState<
    Record<string, number>
  >({});

  // Form Mode: Single post vs Bulk Schedule vs Story Sequence
  const [mode, setMode] = useState<"SINGLE" | "BULK" | "STORY_SEQUENCE">(
    initialMode || "SINGLE"
  );

  // Common fields
  const [targetAccountId, setTargetAccountId] = useState<string>("");
  const [isPublishNow, setIsPublishNow] = useState<boolean>(false);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Single post fields (supports BOTH Reel + Story simultaneously when <= 60s)
  const [selectedContentId, setSelectedContentId] = useState<string>("");
  const [selectedSingleFormats, setSelectedSingleFormats] = useState<
    CriafyPublicationType[]
  >(["REEL", "STORY_VIDEO"]);
  const [caption, setCaption] = useState<string>("");
  const [generatingAi, setGeneratingAi] = useState(false);

  // Story Sequence fields
  const [sequenceContentIds, setSequenceContentIds] = useState<string[]>([]);
  const [sequenceIntervalMinutes, setSequenceIntervalMinutes] =
    useState<number>(1);

  // =========================================================
  // BULK SCHEDULE STATE (Embedded directly inside this modal)
  // =========================================================
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);
  const [bulkSourceTab, setBulkSourceTab] = useState<"UPLOAD" | "LIBRARY">(
    "UPLOAD"
  );
  const [bulkLibraryFilter, setBulkLibraryFilter] = useState<
    "UNPUBLISHED" | "ALL" | "PUBLISHED"
  >("UNPUBLISHED");
  const [pendingFiles, setPendingFiles] = useState<PendingUploadItem[]>([]);
  const [selectedBulkLibraryIds, setSelectedBulkLibraryIds] = useState<
    string[]
  >([]);
  // Ordem customizada quando o usuário reordena manualmente (↑ / ↓) na prévia
  const [customOrderedKeys, setCustomOrderedKeys] = useState<string[] | null>(
    null
  );
  // Override opcional de formato por item (ex.: se o usuário quiser alternar um item ≤ 60s entre REEL+STORY e SÓ REEL)
  const [slotFormatOverrides, setSlotFormatOverrides] = useState<
    Record<string, CriafyPublicationType[]>
  >({});

  const [postsPerDay, setPostsPerDay] = useState<number>(3);
  const [bulkStartDate, setBulkStartDate] = useState<string>(() => {
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
  // Format selection for Bulk: BOTH (Reels + Stories when <= 60s) is the default!
  const [bulkPostReelsFeed, setBulkPostReelsFeed] = useState<boolean>(true);
  const [bulkPostStories, setBulkPostStories] = useState<boolean>(true);
  const [shuffleSeed, setShuffleSeed] = useState<number>(1);
  const [bulkProgressText, setBulkProgressText] = useState<string>("");
  const uploadedContentMapRef = useRef<Map<string, string>>(new Map());

  // Variações de Legenda / Copy para os Reels no Bulk
  const [bulkCaptionVariations, setBulkCaptionVariations] = useState<string[]>([
    "",
  ]);
  // Legendas específicas por item.key (caso o usuário queira customizar um Reel específico)
  const [specificItemCaptions, setSpecificItemCaptions] = useState<
    Record<string, string>
  >({});
  // Item sendo editado no modal de legenda específica
  const [editingCaptionSlotKey, setEditingCaptionSlotKey] = useState<string | null>(
    null
  );
  const [generatingBulkAiIdx, setGeneratingBulkAiIdx] = useState<number | null>(
    null
  );

  const handleAddCaptionVariation = () => {
    setBulkCaptionVariations((prev) => [...prev, ""]);
  };

  const handleUpdateCaptionVariation = (index: number, text: string) => {
    setBulkCaptionVariations((prev) => {
      const next = [...prev];
      next[index] = text;
      return next;
    });
  };

  const handleRemoveCaptionVariation = (index: number) => {
    setBulkCaptionVariations((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleGenerateBulkAi = async (index: number) => {
    if (!activeCompanyId || !targetAccountId) {
      toast.error("Selecione uma conta do Instagram primeiro.");
      return;
    }
    setGeneratingBulkAiIdx(index);
    try {
      const currentText = bulkCaptionVariations[index]?.trim();
      const generated = await criafyService.generateAiCopy({
        companyId: activeCompanyId,
        accountId: targetAccountId,
        promptType: "CAPTION",
        publicationType: "REEL",
        customInstruction: currentText || undefined,
      });
      handleUpdateCaptionVariation(index, generated);
      toast.success(`Copy gerada para a Variação #${index + 1}!`);
    } catch (err: any) {
      toast.error(`Falha ao gerar copy com a IA: ${err.message}`);
    } finally {
      setGeneratingBulkAiIdx(null);
    }
  };

  const getMediaDuration = (content?: CriafyContent): number | undefined => {
    if (!content) return undefined;
    return content.duration_seconds || probedDurations[content.id];
  };

  const handleVideoMetadataLoaded = (
    contentId: string,
    e: React.SyntheticEvent<HTMLVideoElement>
  ) => {
    const dur = e.currentTarget.duration;
    if (dur && isFinite(dur) && dur > 0) {
      const rounded = Math.round(dur * 10) / 10;
      setProbedDurations((prev) =>
        prev[contentId] === rounded ? prev : { ...prev, [contentId]: rounded }
      );
    }
  };

  // Load contents when modal opens
  useEffect(() => {
    if (open && activeCompanyId) {
      loadContents();
    }
  }, [open, activeCompanyId]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const applyDefaultFormatsForMedia = (media?: CriafyContent) => {
    if (!media) return;
    const dur = getMediaDuration(media);
    const canStory = isEligibleForStories(
      media.media_type === "VIDEO" ? "VIDEO" : "IMAGE",
      dur
    );
    if (media.media_type === "VIDEO") {
      if (canStory) {
        setSelectedSingleFormats(["REEL", "STORY_VIDEO"]);
      } else {
        setSelectedSingleFormats(["REEL"]);
      }
    } else {
      setSelectedSingleFormats(["FEED", "STORY_IMAGE"]);
    }
  };

  // Set initial values
  useEffect(() => {
    if (open) {
      if (initialMode) {
        setMode(initialMode);
      }
      if (initialBulkLibraryIds && initialBulkLibraryIds.length > 0) {
        setMode("BULK");
        setBulkSourceTab("LIBRARY");
        setSelectedBulkLibraryIds(initialBulkLibraryIds);
        setCustomOrderedKeys(null);
      }
      // Target account
      if (selectedAccountId && selectedAccountId !== "all") {
        setTargetAccountId(selectedAccountId);
      } else if (accounts.length > 0) {
        setTargetAccountId(accounts[0].id);
      }

      // Initial Date formatting (YYYY-MM-DDTHH:MM)
      if (initialDate) {
        const d = new Date(initialDate);
        if (!isNaN(d.getTime())) {
          if (d.getHours() === 0 && d.getMinutes() === 0) {
            d.setHours(18, 0, 0, 0);
          }
          const tzOffset = d.getTimezoneOffset() * 60000;
          const localISOTime = new Date(d.getTime() - tzOffset)
            .toISOString()
            .slice(0, 16);
          setScheduledAt(localISOTime);
          setBulkStartDate(localISOTime.split("T")[0]);
          setIsPublishNow(false);
        }
      } else {
        const d = new Date();
        d.setHours(d.getHours() + 1, 0, 0, 0);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - tzOffset)
          .toISOString()
          .slice(0, 16);
        setScheduledAt(localISOTime);
        setIsPublishNow(false);
      }

      if (initialContentId) {
        setSelectedContentId(initialContentId);
        setSequenceContentIds([initialContentId]);
      }
      if (initialPublicationType) {
        setSelectedSingleFormats([initialPublicationType]);
      }
    }
  }, [
    open,
    selectedAccountId,
    accounts,
    initialDate,
    initialContentId,
    initialPublicationType,
    initialMode,
    initialBulkLibraryIds,
  ]);

  const loadContents = async () => {
    if (!activeCompanyId) return;
    setLoadingMedia(true);
    try {
      const data = await criafyService.getContents(activeCompanyId);
      setContents(data);
      if (!selectedContentId && data.length > 0) {
        setSelectedContentId(data[0].id);
        applyDefaultFormatsForMedia(data[0]);
      } else if (selectedContentId) {
        const found = data.find((c) => c.id === selectedContentId);
        if (found && !initialPublicationType) {
          applyDefaultFormatsForMedia(found);
        }
      }
    } catch (err: any) {
      toast.error(`Erro ao carregar mídias da biblioteca: ${err.message}`);
    } finally {
      setLoadingMedia(false);
    }
  };

  // Mídias da biblioteca que nunca foram postadas nem agendadas
  const unpublishedLibraryContents = useMemo(() => {
    return contents.filter((c) => !c.is_published && !c.is_scheduled);
  }, [contents]);

  const filteredBulkLibraryContents = useMemo(() => {
    if (bulkLibraryFilter === "UNPUBLISHED") {
      return contents.filter((c) => !c.is_published && !c.is_scheduled);
    }
    if (bulkLibraryFilter === "PUBLISHED") {
      return contents.filter((c) => !!c.is_published);
    }
    return contents;
  }, [contents, bulkLibraryFilter]);

  // =========================================================
  // BULK HELPERS & PLANNED SLOTS COMPUTATION
  // =========================================================
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
    setCustomOrderedKeys(null);
    setShuffleSeed((s) => s + 1);
  };

  const handleBulkFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      await addFilesToPending(e.target.files);
      e.target.value = "";
    }
  };

  const handleBulkDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
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
    setCustomOrderedKeys(null);
  };

  const toggleBulkLibraryItem = (id: string) => {
    setSelectedBulkLibraryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    setCustomOrderedKeys(null);
    setShuffleSeed((s) => s + 1);
  };

  const handleLoadAllUnpublishedFromLibrary = () => {
    const unpub = contents
      .filter((c) => !c.is_published && !c.is_scheduled)
      .map((c) => c.id);
    if (unpub.length === 0) {
      toast.info(
        "Todas as mídias da biblioteca já foram publicadas ou agendadas."
      );
      return;
    }
    setBulkSourceTab("LIBRARY");
    setBulkLibraryFilter("UNPUBLISHED");
    setSelectedBulkLibraryIds(unpub);
    setCustomOrderedKeys(null);
    setShuffleSeed((s) => s + 1);
    toast.success(
      `${unpub.length} mídia(s) nunca postada(s) carregada(s) da biblioteca para o Bulk!`
    );
  };

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

  const unifiedBulkItems = useMemo<UnifiedScheduleItem[]>(() => {
    const fromUploads: UnifiedScheduleItem[] = pendingFiles.map((pf) => ({
      key: `upload_${pf.tempId}`,
      source: "UPLOAD",
      title: pf.title,
      previewUrl: pf.previewUrl,
      mediaType: pf.mediaType,
      durationSeconds: pf.durationSeconds,
      file: pf.file,
    }));

    const fromLibrary: UnifiedScheduleItem[] = selectedBulkLibraryIds
      .map((id) => contents.find((c) => c.id === id))
      .filter((c): c is CriafyContent => !!c)
      .map((c) => ({
        key: `lib_${c.id}`,
        source: "LIBRARY",
        title: c.title || "Mídia da Biblioteca",
        previewUrl: c.media_url,
        mediaType: c.media_type === "VIDEO" ? "VIDEO" : "IMAGE",
        durationSeconds: c.duration_seconds || probedDurations[c.id],
        contentId: c.id,
      }));

    return [...fromUploads, ...fromLibrary];
  }, [pendingFiles, selectedBulkLibraryIds, contents, probedDurations]);

  const plannedBulkSlots = useMemo<PlannedSlot[]>(() => {
    if (unifiedBulkItems.length === 0) return [];

    const activeShifts = (["MANHA", "TARDE", "NOITE"] as const).filter(
      (s) => enabledShifts[s]
    );
    const effectiveShifts: Array<"MANHA" | "TARDE" | "NOITE"> =
      activeShifts.length > 0 ? activeShifts : ["MANHA", "TARDE", "NOITE"];

    // 1. Order items: use custom manual order if user clicked ↑/↓, otherwise smart interleave (short Reels+Story balanced with >60s Reels-only)
    let orderedItems: UnifiedScheduleItem[] = [];
    if (customOrderedKeys && customOrderedKeys.length > 0) {
      const byKey = new Map(unifiedBulkItems.map((i) => [i.key, i]));
      orderedItems = customOrderedKeys
        .map((k) => byKey.get(k))
        .filter((i): i is UnifiedScheduleItem => !!i);
      // Append any newly added items not yet in customOrderedKeys
      unifiedBulkItems.forEach((i) => {
        if (!customOrderedKeys.includes(i.key)) {
          orderedItems.push(i);
        }
      });
    } else {
      orderedItems = smartInterleaveItems(
        unifiedBulkItems,
        randomizeContentOrder
      );
    }

    const [y, m, d] = bulkStartDate.split("-").map(Number);
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

        const canStory = isEligibleForStories(
          item.mediaType,
          item.durationSeconds
        );
        const isTooLongForStory = item.mediaType === "VIDEO" && !canStory;

        // Check if user manually toggled format for this item, otherwise apply global rule with >60s safety guard
        const manualOverride = slotFormatOverrides[item.key];
        let pubTypes: CriafyPublicationType[] = [];

        if (manualOverride && manualOverride.length > 0) {
          // Enforce safety guard even on manual overrides: never allow STORY_VIDEO if > 60s
          pubTypes = manualOverride.filter((t) =>
            isTooLongForStory ? t !== "STORY_VIDEO" : true
          );
        }

        if (pubTypes.length === 0) {
          if (bulkPostReelsFeed) {
            pubTypes.push(item.mediaType === "VIDEO" ? "REEL" : "FEED");
          }
          if (bulkPostStories && canStory) {
            pubTypes.push(
              item.mediaType === "VIDEO" ? "STORY_VIDEO" : "STORY_IMAGE"
            );
          }
          // Safety Guard: if video is > 60s (too long for Stories), ALWAYS fall back to REEL only so it never errors
          if (pubTypes.length === 0) {
            pubTypes.push(item.mediaType === "VIDEO" ? "REEL" : "FEED");
          }
        }

        result.push({
          globalIndex: itemIdx,
          item,
          scheduledAt: scheduledDate,
          shift: shiftKey,
          publicationTypes: pubTypes,
          isTooLongForStory,
        });

        itemIdx++;
      }

      dayOffset++;
    }

    return result;
  }, [
    unifiedBulkItems,
    customOrderedKeys,
    slotFormatOverrides,
    postsPerDay,
    bulkStartDate,
    enabledShifts,
    randomizeContentOrder,
    randomizeTimesInShift,
    bulkPostReelsFeed,
    bulkPostStories,
    shuffleSeed,
  ]);

  const handleMovePlannedSlot = (
    globalIndex: number,
    direction: "UP" | "DOWN"
  ) => {
    const currentKeys = plannedBulkSlots.map((s) => s.item.key);
    const targetIndex = direction === "UP" ? globalIndex - 1 : globalIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentKeys.length) return;

    const nextKeys = [...currentKeys];
    const tmp = nextKeys[globalIndex];
    nextKeys[globalIndex] = nextKeys[targetIndex];
    nextKeys[targetIndex] = tmp;
    setCustomOrderedKeys(nextKeys);
  };

  const handleToggleSlotFormat = (slot: PlannedSlot) => {
    if (slot.isTooLongForStory) {
      toast.info(
        `Este vídeo tem ${formatDurationCompact(
          slot.item.durationSeconds
        )} (> 60s). Por segurança, ele será postado apenas no Reels para evitar erro nos Stories.`
      );
      return;
    }
    const primaryType: CriafyPublicationType =
      slot.item.mediaType === "VIDEO" ? "REEL" : "FEED";
    const storyType: CriafyPublicationType =
      slot.item.mediaType === "VIDEO" ? "STORY_VIDEO" : "STORY_IMAGE";

    const hasBoth = slot.publicationTypes.length > 1;
    const hasOnlyPrimary =
      slot.publicationTypes.length === 1 &&
      slot.publicationTypes[0] === primaryType;

    let nextTypes: CriafyPublicationType[];
    if (hasBoth) {
      nextTypes = [primaryType];
    } else if (hasOnlyPrimary) {
      nextTypes = [storyType];
    } else {
      nextTypes = [primaryType, storyType];
    }

    setSlotFormatOverrides((prev) => ({
      ...prev,
      [slot.item.key]: nextTypes,
    }));
  };

  const bulkSummaryStats = useMemo(() => {
    let bothCount = 0;
    let onlyReelsLongCount = 0;
    let onlyReelsNormalCount = 0;
    let onlyStoryCount = 0;

    plannedBulkSlots.forEach((slot) => {
      if (slot.publicationTypes.length > 1) {
        bothCount++;
      } else if (slot.isTooLongForStory) {
        onlyReelsLongCount++;
      } else if (
        slot.publicationTypes[0] === "STORY_VIDEO" ||
        slot.publicationTypes[0] === "STORY_IMAGE"
      ) {
        onlyStoryCount++;
      } else {
        onlyReelsNormalCount++;
      }
    });

    return {
      bothCount,
      onlyReelsLongCount,
      onlyReelsNormalCount,
      onlyStoryCount,
      totalPublications: plannedBulkSlots.reduce(
        (acc, s) => acc + s.publicationTypes.length,
        0
      ),
    };
  }, [plannedBulkSlots]);

  const groupedPreviewByDay = useMemo(() => {
    const map = new Map<string, PlannedSlot[]>();
    plannedBulkSlots.forEach((slot) => {
      const y = slot.scheduledAt.getFullYear();
      const m = String(slot.scheduledAt.getMonth() + 1).padStart(2, "0");
      const d = String(slot.scheduledAt.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;
      const list = map.get(key) || [];
      list.push(slot);
      map.set(key, list);
    });
    return Array.from(map.entries());
  }, [plannedBulkSlots]);

  const validBulkCaptionVariationsCount = useMemo(() => {
    return bulkCaptionVariations.map((c) => c.trim()).filter(Boolean).length;
  }, [bulkCaptionVariations]);

  const editingCaptionSlot = useMemo(() => {
    if (!editingCaptionSlotKey) return null;
    return (
      plannedBulkSlots.find((s) => s.item.key === editingCaptionSlotKey) || null
    );
  }, [editingCaptionSlotKey, plannedBulkSlots]);

  // =========================================================
  // SINGLE & STORY SEQUENCE HANDLERS
  // =========================================================
  const handleSingleContentSelect = (contentId: string) => {
    setSelectedContentId(contentId);
    const media = contents.find((c) => c.id === contentId);
    if (!media) return;
    applyDefaultFormatsForMedia(media);
  };

  const toggleSingleFormat = (fmt: "REEL" | "FEED" | "STORY") => {
    const media = contents.find((c) => c.id === selectedContentId);
    const isVideo = !media || media.media_type === "VIDEO";
    const dur = getMediaDuration(media);
    const isOver60s = isVideo && dur && dur > 60;

    if (fmt === "REEL") {
      if (!isVideo) {
        toast.info("Imagens são publicadas no Feed e/ou Stories.");
        return;
      }
      setSelectedSingleFormats((prev) => {
        const has = prev.includes("REEL");
        if (has) {
          const next = prev.filter((p) => p !== "REEL");
          return next.length > 0
            ? next
            : isOver60s
            ? ["REEL"]
            : ["STORY_VIDEO"];
        }
        return [...prev.filter((p) => p !== "FEED"), "REEL"];
      });
    } else if (fmt === "FEED") {
      setSelectedSingleFormats((prev) => {
        const has = prev.includes("FEED");
        if (has) {
          const next = prev.filter((p) => p !== "FEED");
          return next.length > 0
            ? next
            : isVideo
            ? ["REEL"]
            : ["STORY_IMAGE"];
        }
        return [...prev.filter((p) => p !== "REEL"), "FEED"];
      });
    } else if (fmt === "STORY") {
      if (isOver60s) {
        toast.error(
          `Vídeo com ${formatDurationCompact(
            dur
          )} ultrapassa o limite de 60s da Meta para Stories. Será postado apenas no Reels.`
        );
        return;
      }
      const storyType: CriafyPublicationType = isVideo
        ? "STORY_VIDEO"
        : "STORY_IMAGE";
      setSelectedSingleFormats((prev) => {
        const hasStory =
          prev.includes("STORY_VIDEO") || prev.includes("STORY_IMAGE");
        if (hasStory) {
          const next = prev.filter(
            (p) => p !== "STORY_VIDEO" && p !== "STORY_IMAGE"
          );
          return next.length > 0 ? next : [isVideo ? "REEL" : "FEED"];
        }
        return [
          ...prev.filter((p) => p !== "STORY_VIDEO" && p !== "STORY_IMAGE"),
          storyType,
        ];
      });
    }
  };

  const selectBothReelAndStory = () => {
    const media = contents.find((c) => c.id === selectedContentId);
    const isVideo = !media || media.media_type === "VIDEO";
    const dur = getMediaDuration(media);
    if (isVideo && dur && dur > 60) {
      toast.error(
        `Este vídeo possui ${formatDurationCompact(
          dur
        )} (acima do limite de 60s para Stories). Ele será postado apenas no Reels.`
      );
      return;
    }
    if (isVideo) {
      setSelectedSingleFormats(["REEL", "STORY_VIDEO"]);
    } else {
      setSelectedSingleFormats(["FEED", "STORY_IMAGE"]);
    }
  };

  const handleToggleSequenceItem = (contentId: string) => {
    const media = contents.find((c) => c.id === contentId);
    const dur = getMediaDuration(media);
    if (media?.media_type === "VIDEO" && dur && dur > 60) {
      toast.error(
        `O Instagram não aceita vídeos em Stories acima de 60s (este vídeo possui ${formatDurationCompact(
          dur
        )}). Utilize vídeos de até 60s para sequências de Stories.`
      );
      return;
    }

    if (sequenceContentIds.includes(contentId)) {
      setSequenceContentIds(sequenceContentIds.filter((id) => id !== contentId));
    } else {
      setSequenceContentIds([...sequenceContentIds, contentId]);
    }
  };

  const handleMoveSequenceItem = (index: number, direction: "UP" | "DOWN") => {
    const nextList = [...sequenceContentIds];
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextList.length) return;
    const temp = nextList[index];
    nextList[index] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setSequenceContentIds(nextList);
  };

  const handleRemoveSequenceItem = (index: number) => {
    const nextList = [...sequenceContentIds];
    nextList.splice(index, 1);
    setSequenceContentIds(nextList);
  };

  const handleGenerateAiCopy = async () => {
    if (!activeCompanyId || !targetAccountId) {
      toast.error("Selecione uma conta do Instagram primeiro.");
      return;
    }

    setGeneratingAi(true);
    try {
      const primaryFmt = selectedSingleFormats[0] || "REEL";
      const generated = await criafyService.generateAiCopy({
        companyId: activeCompanyId,
        accountId: targetAccountId,
        contentId: selectedContentId || undefined,
        promptType: "CAPTION",
        publicationType: primaryFmt,
        customInstruction: caption.trim() || undefined,
      });

      setCaption(generated);
      toast.success("Copy gerada com sucesso pela IA!");
    } catch (err: any) {
      toast.error(`Falha ao gerar copy com a IA: ${err.message}`);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId || !targetAccountId) {
      toast.error("Selecione uma conta do Instagram.");
      return;
    }

    // =========================================================
    // BULK MODE SUBMISSION
    // =========================================================
    if (mode === "BULK") {
      if (plannedBulkSlots.length === 0) {
        toast.error(
          "Suba arquivos ou selecione mídias da biblioteca para programar em Bulk."
        );
        return;
      }

      setSubmitting(true);
      try {
        const uploadedContentIdMap = uploadedContentMapRef.current;
        const uploadSlots = plannedBulkSlots.filter(
          (s) => s.item.source === "UPLOAD" && s.item.file
        );
        const failedUploadItems: string[] = [];

        for (let i = 0; i < uploadSlots.length; i++) {
          const slot = uploadSlots[i];
          const file = slot.item.file!;

          // Se já foi enviado com sucesso nesta sessão, reutiliza diretamente sem re-upload
          if (uploadedContentIdMap.has(slot.item.key)) {
            continue;
          }

          // Se já existe na biblioteca com o mesmo nome e tamanho de arquivo, reutiliza
          const existingInLib = contents.find(
            (c) => c.title === file.name && Number(c.file_size_bytes) === file.size
          );
          if (existingInLib) {
            uploadedContentIdMap.set(slot.item.key, existingInLib.id);
            continue;
          }

          const durStr = formatDurationCompact(slot.item.durationSeconds);
          const sizeStr = `${Math.round((file.size / (1024 * 1024)) * 10) / 10}MB`;
          setBulkProgressText(
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
            console.error(`Erro no upload do arquivo ${file.name}:`, fileErr);
            failedUploadItems.push(file.name);
          }
        }

        // Filtra apenas os slots cujo conteúdo foi obtido com sucesso
        const validSlots = plannedBulkSlots.filter((slot) => {
          if (slot.item.source === "LIBRARY") return !!slot.item.contentId;
          return uploadedContentIdMap.has(slot.item.key);
        });

        if (validSlots.length === 0) {
          throw new Error("Nenhum arquivo pôde ser enviado para o agendamento. Verifique sua conexão e tente novamente.");
        }

        setBulkProgressText(
          `Agendando publicações de ${validSlots.length} mídias no calendário...`
        );

        const pubPayloads: Array<any> = [];
        let reelCounter = 0;
        const validVariations = bulkCaptionVariations
          .map((c) => c.trim())
          .filter(Boolean);

        validSlots.forEach((slot) => {
          const contentId =
            slot.item.source === "LIBRARY"
              ? slot.item.contentId!
              : uploadedContentIdMap.get(slot.item.key)!;

          // Safety guard final: nunca enviar STORY_VIDEO se o vídeo tiver > 60s
          const safeTypes = slot.publicationTypes.filter((t) =>
            slot.isTooLongForStory ? t !== "STORY_VIDEO" : true
          );
          const finalTypes: CriafyPublicationType[] =
            safeTypes.length > 0
              ? safeTypes
              : [slot.item.mediaType === "VIDEO" ? "REEL" : "FEED"];

          finalTypes.forEach((pubType, idx) => {
            const scheduledDate = new Date(
              slot.scheduledAt.getTime() + idx * 60000
            );

            let resolvedCaption: string | undefined = undefined;

            // Legenda apenas para REEL / FEED (Stories não suportam legendas na Graph API da Meta)
            if (pubType === "REEL" || pubType === "FEED") {
              const specific = specificItemCaptions[slot.item.key]?.trim();
              if (specific) {
                resolvedCaption = specific;
              } else if (validVariations.length > 0) {
                // Se tiver só 1 variação, usa ela mesma. Se tiver várias, rotaciona entre os posts!
                resolvedCaption =
                  validVariations[reelCounter % validVariations.length];
              }
              reelCounter++;
            }

            pubPayloads.push({
              company_id: activeCompanyId,
              account_id: targetAccountId,
              content_id: contentId,
              publication_type: pubType,
              caption: resolvedCaption,
              scheduled_at: scheduledDate.toISOString(),
              status: "SCHEDULED" as const,
              is_auto_queued: true,
            });
          });
        });

        await criafyService.createPublicationSequence(pubPayloads);

        if (failedUploadItems.length > 0) {
          toast.warning(
            `${failedUploadItems.length} arquivo(s) não puderam ser enviados (${failedUploadItems.slice(0, 2).join(", ")}...), mas os outros ${validSlots.length} foram agendados com sucesso!`,
            { duration: 8000 }
          );
        } else {
          toast.success(
            `${validSlots.length} mídias (${pubPayloads.length} publicações no total) programadas em Bulk com sucesso!`,
            {
              description:
                bulkSummaryStats.onlyReelsLongCount > 0
                  ? `${bulkSummaryStats.bothCount} em Reels+Stories (≤60s) e ${bulkSummaryStats.onlyReelsLongCount} apenas em Reels (>60s, protegidos contra erro).`
                  : `Distribuídas em ${groupedPreviewByDay.length} dia(s) (${postsPerDay} por dia — Manhã, Tarde e Noite).`,
              duration: 6000,
            }
          );
        }

        pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        setPendingFiles([]);
        setSelectedBulkLibraryIds([]);
        setCustomOrderedKeys(null);
        setSlotFormatOverrides({});
        setBulkCaptionVariations([""]);
        setSpecificItemCaptions({});
        setEditingCaptionSlotKey(null);
        uploadedContentMapRef.current.clear();
        setBulkProgressText("");
        onOpenChange(false);
        onSuccess?.();
      } catch (err: any) {
        toast.error(`Erro ao programar em Bulk: ${err.message}`);
      } finally {
        setSubmitting(false);
        setBulkProgressText("");
      }
      return;
    }

    // =========================================================
    // SINGLE & STORY_SEQUENCE SUBMISSION
    // =========================================================
    if (!isPublishNow && !scheduledAt) {
      toast.error("Informe a data e o horário do agendamento.");
      return;
    }

    const baseScheduledDate = isPublishNow ? new Date() : new Date(scheduledAt);
    if (isNaN(baseScheduledDate.getTime())) {
      toast.error("Data e horário inválidos.");
    }

    setSubmitting(true);

    try {
      if (mode === "SINGLE") {
        if (!selectedContentId) {
          toast.error("Selecione uma mídia para publicar.");
          setSubmitting(false);
          return;
        }

        const selectedContent = contents.find(
          (c) => c.id === selectedContentId
        );
        const dur = getMediaDuration(selectedContent);
        const isTooLong =
          selectedContent?.media_type === "VIDEO" && dur && dur > 60;

        // Filtra automaticamente STORY_VIDEO caso o vídeo tenha > 60s para evitar qualquer erro
        let formatsToCreate =
          selectedSingleFormats.length > 0 ? selectedSingleFormats : ["REEL"];
        if (isTooLong) {
          formatsToCreate = formatsToCreate.filter((f) => f !== "STORY_VIDEO");
          if (formatsToCreate.length === 0) formatsToCreate = ["REEL"];
        }

        const pubStatus = isPublishNow ? "PUBLISHING" : "SCHEDULED";
        const createdPubs = [];

        for (let i = 0; i < formatsToCreate.length; i++) {
          const fmt = formatsToCreate[i];
          const itemScheduled = new Date(
            baseScheduledDate.getTime() + i * 60000
          );
          const isStory = fmt === "STORY_VIDEO" || fmt === "STORY_IMAGE";

          const pub = await criafyService.createPublication({
            company_id: activeCompanyId,
            account_id: targetAccountId,
            content_id: selectedContentId,
            publication_type: fmt,
            caption: isStory ? undefined : caption.trim() || undefined,
            scheduled_at: itemScheduled.toISOString(),
            status: pubStatus,
          });
          createdPubs.push(pub);
        }

        if (isPublishNow) {
          onOpenChange(false);
          toast.info(
            `Publicação (${formatsToCreate.join(
              " + "
            )}) iniciada em segundo plano!`,
            {
              id: `pub-${createdPubs[0].id}`,
              duration: 4000,
            }
          );

          Promise.all(createdPubs.map((p) => criafyService.publishNow(p.id)))
            .then((results) => {
              const firstRes = results[0];
              toast.success(
                formatsToCreate.length > 1
                  ? "Publicado como Reels e Stories com sucesso no Instagram!"
                  : "Publicação realizada com sucesso no Instagram!",
                {
                  id: `pub-${createdPubs[0].id}`,
                  duration: 8000,
                  action: firstRes?.igPermalink
                    ? {
                        label: "Ver no Instagram",
                        onClick: () =>
                          window.open(firstRes.igPermalink, "_blank"),
                      }
                    : undefined,
                }
              );
              onSuccess?.();
            })
            .catch((err: any) => {
              toast.error(`Falha ao publicar na Meta: ${err.message}`, {
                id: `pub-${createdPubs[0].id}`,
                duration: 10000,
              });
              onSuccess?.();
            });
        } else {
          toast.success(
            formatsToCreate.length > 1
              ? "Agendado como Reels e Stories (os dois) no calendário!"
              : "Publicação agendada no calendário com sucesso!"
          );
          onOpenChange(false);
          onSuccess?.();
        }
      } else {
        // STORY SEQUENCE MODE
        if (sequenceContentIds.length < 2) {
          toast.error(
            "Uma sequência de stories precisa de no mínimo 2 conteúdos selecionados."
          );
          setSubmitting(false);
          return;
        }

        const sequenceId = crypto.randomUUID();
        const total = sequenceContentIds.length;
        const pubItems = sequenceContentIds.map((cId, idx) => {
          const itemMedia = contents.find((c) => c.id === cId);
          const isVid = itemMedia?.media_type === "VIDEO";
          const pType: CriafyPublicationType = isVid
            ? "STORY_VIDEO"
            : "STORY_IMAGE";

          const itemDate = new Date(
            baseScheduledDate.getTime() + idx * sequenceIntervalMinutes * 60000
          );

          return {
            company_id: activeCompanyId,
            account_id: targetAccountId,
            content_id: cId,
            publication_type: pType,
            caption: undefined,
            scheduled_at: itemDate.toISOString(),
            status: (isPublishNow && idx === 0
              ? "PUBLISHING"
              : "SCHEDULED") as any,
            story_sequence_id: sequenceId,
            sequence_order: idx + 1,
            sequence_total: total,
          };
        });

        const createdPubs = await criafyService.createPublicationSequence(
          pubItems
        );
        toast.success(`Sequência de ${total} stories programada com sucesso!`);
        onOpenChange(false);

        if (isPublishNow && createdPubs.length > 0) {
          const firstPub = createdPubs[0];
          toast.info("Iniciando publicação do 1º Story da sequência...", {
            id: `seq-${firstPub.id}`,
            duration: 4000,
          });

          criafyService
            .publishNow(firstPub.id)
            .then(() => {
              toast.success(
                "1º Story publicado! Os próximos serão disparados em sequência.",
                {
                  id: `seq-${firstPub.id}`,
                  duration: 8000,
                }
              );
              onSuccess?.();
            })
            .catch((err: any) => {
              toast.error(`Falha no Story da sequência: ${err.message}`, {
                id: `seq-${firstPub.id}`,
                duration: 10000,
              });
              onSuccess?.();
            });
        }

        onSuccess?.();
      }
    } catch (err: any) {
      toast.error(`Erro ao salvar programação: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSingleMedia = contents.find((c) => c.id === selectedContentId);
  const selectedSingleDuration = getMediaDuration(selectedSingleMedia);
  const isSingleMediaEligibleForStory = selectedSingleMedia
    ? isEligibleForStories(
        selectedSingleMedia.media_type === "VIDEO" ? "VIDEO" : "IMAGE",
        selectedSingleDuration
      )
    : true;
  const hasSingleReel = selectedSingleFormats.includes("REEL");
  const hasSingleFeed = selectedSingleFormats.includes("FEED");
  const hasSingleStory =
    selectedSingleFormats.includes("STORY_VIDEO") ||
    selectedSingleFormats.includes("STORY_IMAGE");
  const isSingleBothSelected =
    (hasSingleReel || hasSingleFeed) && hasSingleStory;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${
          mode === "BULK" ? "sm:max-w-[940px]" : "sm:max-w-[720px]"
        } max-h-[92vh] overflow-y-auto transition-all`}
      >
        <DialogHeader className="pb-2 border-b border-muted">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-pink-500" />
              Programar Publicação no Instagram
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Vídeos com ≤ 60s recebem o ícone <strong>🎬+📖 Reels &amp; Stories</strong>{" "}
            (publica nos dois). Vídeos &gt; 60s recebem{" "}
            <strong>🎬⏱️ Só Reels</strong> automaticamente para evitar erros.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Top Toggle: Post Individual vs Programação em Bulk vs Sequência de Stories */}
          <div className="grid grid-cols-1 sm:grid-cols-3 bg-muted/60 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setMode("SINGLE")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === "SINGLE"
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Send className="w-3.5 h-3.5 text-sky-500" />
              Post Individual
            </button>

            <button
              type="button"
              onClick={() => setMode("BULK")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === "BULK"
                  ? "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Programar em Bulk ({plannedBulkSlots.length || "3/dia"})
            </button>

            <button
              type="button"
              onClick={() => setMode("STORY_SEQUENCE")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === "STORY_SEQUENCE"
                  ? "bg-gradient-to-r from-pink-500 to-amber-500 text-white shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Sequência de Stories ({sequenceContentIds.length})
            </button>
          </div>

          {/* Account Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Conta de Destino do Instagram
            </Label>
            <Select value={targetAccountId} onValueChange={setTargetAccountId}>
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage
                          src={acc.profile_picture_url || undefined}
                        />
                        <AvatarFallback className="text-[9px]">
                          @{acc.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold">@{acc.username}</span>
                      <span className="text-muted-foreground text-[10px]">
                        ({acc.name || "Instagram"})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* =========================================================
              MODE 1: SINGLE POST CONFIGURATION
             ========================================================= */}
          {mode === "SINGLE" && (
            <div className="space-y-4">
              {/* Publication Format Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <Label className="text-xs font-semibold">
                    Formato no Instagram (selecione um ou os dois)
                  </Label>
                  {isSingleMediaEligibleForStory ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold flex items-center gap-1"
                    >
                      <Film className="w-3 h-3" /> +{" "}
                      <BookOpen className="w-3 h-3" /> ≤ 60s: publica no Reels e
                      Stories!
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold flex items-center gap-1"
                    >
                      <Film className="w-3 h-3" />{" "}
                      <AlertTriangle className="w-3 h-3" /> Vídeo longo (
                      {formatDurationCompact(selectedSingleDuration)} &gt; 60s):
                      postará Só no Reels
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Card 1: Reel + Story (Os Dois) */}
                  <div
                    onClick={selectBothReelAndStory}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                      isSingleBothSelected
                        ? "border-purple-500 bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-amber-500/15 text-purple-700 dark:text-purple-300 font-bold shadow-sm ring-1 ring-purple-500/30"
                        : !isSingleMediaEligibleForStory
                        ? "border-muted opacity-40 cursor-not-allowed"
                        : "border-muted hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-center gap-1">
                      🔥 Reels + Stories
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Postar os dois (≤ 60s)
                    </div>
                  </div>

                  {/* Card 2: Reel */}
                  <div
                    onClick={() => toggleSingleFormat("REEL")}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                      hasSingleReel
                        ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold shadow-sm"
                        : "border-muted hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-center gap-1">
                      🎬 Reel {hasSingleReel && "✓"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Vídeo 9:16 até 15min
                    </div>
                  </div>

                  {/* Card 3: Story */}
                  <div
                    onClick={() => toggleSingleFormat("STORY")}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                      hasSingleStory
                        ? "border-pink-500 bg-pink-500/10 text-pink-700 dark:text-pink-300 font-bold shadow-sm"
                        : !isSingleMediaEligibleForStory
                        ? "border-muted opacity-40 cursor-not-allowed"
                        : "border-muted hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-center gap-1">
                      📖 Story {hasSingleStory && "✓"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {!isSingleMediaEligibleForStory
                        ? "Bloqueado (> 60s)"
                        : "9:16 (vídeo até 60s)"}
                    </div>
                  </div>

                  {/* Card 4: Feed */}
                  <div
                    onClick={() => toggleSingleFormat("FEED")}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                      hasSingleFeed
                        ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold shadow-sm"
                        : "border-muted hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-center gap-1">
                      🖼️ Feed {hasSingleFeed && "✓"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Imagem ou Vídeo
                    </div>
                  </div>
                </div>
              </div>

              {/* Single Media Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Selecione a Mídia da Biblioteca
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {contents.length} arquivo(s) disponível(is)
                  </span>
                </div>

                {loadingMedia ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : contents.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 bg-muted/20 rounded-lg text-center">
                    Nenhuma mídia encontrada na biblioteca. Use a aba "Programar
                    em Bulk" acima para subir novos arquivos agora.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-52 overflow-y-auto p-1.5 border border-muted rounded-xl bg-card">
                    {contents.map((item) => {
                      const isSelected = selectedContentId === item.id;
                      const dur = getMediaDuration(item);
                      const storyOk = isEligibleForStories(
                        item.media_type === "VIDEO" ? "VIDEO" : "IMAGE",
                        dur
                      );

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSingleContentSelect(item.id)}
                          className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 cursor-pointer transition-all group ${
                            isSelected
                              ? "border-pink-500 ring-2 ring-pink-500/30 scale-[0.98]"
                              : "border-transparent hover:border-muted-foreground/30 opacity-85 hover:opacity-100"
                          }`}
                        >
                          {item.media_type === "VIDEO" ? (
                            <video
                              src={item.media_url}
                              className="w-full h-full object-cover pointer-events-none"
                              muted
                              preload="metadata"
                              onLoadedMetadata={(e) =>
                                handleVideoMetadataLoaded(item.id, e)
                              }
                            />
                          ) : (
                            <img
                              src={item.media_url}
                              alt={item.title || ""}
                              className="w-full h-full object-cover"
                            />
                          )}

                          {/* Top-left duration badge */}
                          <div className="absolute top-1 left-1">
                            <Badge className="bg-black/75 text-white text-[9px] px-1 py-0 h-4 border-0 flex items-center gap-0.5">
                              {item.media_type === "VIDEO" ? (
                                <Video className="w-2.5 h-2.5 text-sky-400" />
                              ) : (
                                <ImageIcon className="w-2.5 h-2.5 text-emerald-400" />
                              )}
                              {dur ? formatDurationCompact(dur) : ""}
                            </Badge>
                          </div>

                          {/* Top-right never-posted or published count */}
                          <div className="absolute top-1 right-1">
                            {item.is_published ? (
                              <Badge className="bg-emerald-600 text-white text-[8px] px-1 py-0 h-4 border-0">
                                {item.publish_count}x
                              </Badge>
                            ) : !item.is_scheduled ? (
                              <Badge className="bg-amber-500/90 text-white text-[8px] px-1 py-0 h-4 border-0">
                                Inédito
                              </Badge>
                            ) : null}
                          </div>

                          {/* Bottom visual icon indicator: Reels+Stories vs Só Reels (>60s) */}
                          <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/85 via-black/60 to-transparent">
                            {storyOk ? (
                              <div className="flex items-center justify-center gap-1 rounded bg-purple-600/90 text-white text-[8px] font-bold py-0.5 px-1 shadow-xs">
                                <Film className="w-2.5 h-2.5 shrink-0" />
                                <span>+</span>
                                <BookOpen className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">Reels+Story</span>
                              </div>
                            ) : (
                              <div
                                className="flex items-center justify-center gap-1 rounded bg-amber-600/95 text-white text-[8px] font-bold py-0.5 px-1 shadow-xs"
                                title="Vídeo > 60s: será postado apenas no Reels"
                              >
                                <Film className="w-2.5 h-2.5 shrink-0" />
                                <Clock className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">Só Reels &gt;60s</span>
                              </div>
                            )}
                          </div>

                          {isSelected && (
                            <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-pink-600 text-white flex items-center justify-center shadow-md">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Caption & IA Assistant (for Feed/Reels) */}
              {(hasSingleReel || hasSingleFeed) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Legenda / Copy do Post (Reel / Feed)
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateAiCopy}
                      disabled={generatingAi}
                      className="h-7 text-[11px] gap-1.5 border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
                    >
                      {generatingAi ? (
                        <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-purple-600" />
                      )}
                      Gerar Legenda com IA
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Escreva a legenda do Instagram ou use o assistente de IA..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              MODE 2: BULK UPLOAD & LIBRARY UNPUBLISHED DISTRIBUTION
             ========================================================= */}
          {mode === "BULK" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
              {/* Left 7 cols: Settings + Upload/Library Picker */}
              <div className="lg:col-span-7 space-y-3.5">
                {/* Cadence & Start Date */}
                <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-xl border border-border/60">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Quantidade por Dia
                    </Label>
                    <Select
                      value={String(postsPerDay)}
                      onValueChange={(v) => setPostsPerDay(Number(v) || 3)}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background rounded-lg font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 por dia</SelectItem>
                        <SelectItem value="2">2 por dia</SelectItem>
                        <SelectItem value="3">
                          3 por dia (Manhã, Tarde e Noite)
                        </SelectItem>
                        <SelectItem value="4">4 por dia</SelectItem>
                        <SelectItem value="5">5 por dia</SelectItem>
                        <SelectItem value="6">6 por dia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Data de Início
                    </Label>
                    <Input
                      type="date"
                      value={bulkStartDate}
                      onChange={(e) => setBulkStartDate(e.target.value)}
                      className="h-9 text-xs bg-background rounded-lg"
                    />
                  </div>
                </div>

                {/* Shifts: Manhã, Tarde e Noite */}
                <div className="space-y-2.5 bg-card p-3 rounded-xl border border-border/70">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-pink-500" />
                      Turnos do Horário Normal
                    </Label>
                    <span className="text-[10px] text-muted-foreground">
                      Manhã, Tarde e Noite
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
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                            active
                              ? "bg-primary/5 border-primary/40 shadow-2xs"
                              : "bg-muted/20 border-border/50 opacity-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1">
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

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={randomizeContentOrder}
                        onCheckedChange={(checked) => {
                          setRandomizeContentOrder(checked);
                          setCustomOrderedKeys(null);
                        }}
                        id="bulk-shuffle-contents"
                      />
                      <Label
                        htmlFor="bulk-shuffle-contents"
                        className="text-xs font-medium cursor-pointer flex items-center gap-1"
                      >
                        <Shuffle className="w-3.5 h-3.5 text-purple-500" />
                        Ordem aleatória balanceada
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={randomizeTimesInShift}
                        onCheckedChange={setRandomizeTimesInShift}
                        id="bulk-random-times"
                      />
                      <Label
                        htmlFor="bulk-random-times"
                        className="text-xs font-medium cursor-pointer"
                      >
                        Horários aleatórios
                      </Label>
                    </div>
                  </div>

                  {/* Format Multi-Select: Reels + Stories (Os Dois!) */}
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <Label className="text-xs font-bold text-foreground">
                        Onde publicar (Reels e Stories):
                      </Label>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> ≤ 60s vai nos dois •
                        &gt; 60s vai só no Reels (sem erro)
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setBulkPostReelsFeed(true);
                          setBulkPostStories(true);
                          setSlotFormatOverrides({});
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          bulkPostReelsFeed && bulkPostStories
                            ? "bg-gradient-to-r from-purple-500/15 to-pink-500/15 border-purple-500 text-purple-700 dark:text-purple-300 shadow-2xs"
                            : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        🔥 Reels + Stories (Os dois)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBulkPostReelsFeed(true);
                          setBulkPostStories(false);
                          setSlotFormatOverrides({});
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          bulkPostReelsFeed && !bulkPostStories
                            ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300 font-bold"
                            : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        🎬 Apenas Reels / Feed
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBulkPostReelsFeed(false);
                          setBulkPostStories(true);
                          setSlotFormatOverrides({});
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          !bulkPostReelsFeed && bulkPostStories
                            ? "bg-pink-500/10 border-pink-500 text-pink-700 dark:text-pink-300 font-bold"
                            : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        📖 Apenas Stories (≤ 60s)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upload or Library Selector + 1-Click Bulk from Never Posted Library */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setBulkSourceTab("UPLOAD")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          bulkSourceTab === "UPLOAD"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5 text-purple-500" />
                        Subir Mídias ({pendingFiles.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkSourceTab("LIBRARY")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          bulkSourceTab === "LIBRARY"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-pink-500" />
                        Da Biblioteca ({selectedBulkLibraryIds.length})
                      </button>
                    </div>

                    {/* Botão direto sempre visível para fazer Bulk de todas as mídias nunca postadas da biblioteca */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleLoadAllUnpublishedFromLibrary}
                      className="h-8 text-[11px] font-bold gap-1.5 rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Bulk das Nunca Postadas da Biblioteca (
                      {unpublishedLibraryContents.length})
                    </Button>
                  </div>

                  {bulkSourceTab === "UPLOAD" ? (
                    <div className="space-y-2.5">
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleBulkDropFiles}
                        onClick={() => bulkFileInputRef.current?.click()}
                        className="border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 bg-purple-500/[0.02] hover:bg-purple-500/[0.05] transition-all rounded-xl p-4 text-center cursor-pointer"
                      >
                        <input
                          ref={bulkFileInputRef}
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={handleBulkFileInputChange}
                          className="hidden"
                        />
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto mb-1">
                          <Upload className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-foreground">
                          Clique para selecionar ou arraste vários vídeos e
                          imagens
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Ou clique em{" "}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoadAllUnpublishedFromLibrary();
                            }}
                            className="text-amber-600 dark:text-amber-400 font-bold underline"
                          >
                            Bulk das Nunca Postadas da Biblioteca (
                            {unpublishedLibraryContents.length})
                          </span>{" "}
                          acima
                        </p>
                      </div>

                      {pendingFiles.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 max-h-[175px] overflow-y-auto p-1">
                          {pendingFiles.map((pf) => {
                            const storyOk = isEligibleForStories(
                              pf.mediaType,
                              pf.durationSeconds
                            );
                            return (
                              <div
                                key={pf.tempId}
                                className="relative group rounded-lg overflow-hidden border border-border bg-muted/40 aspect-square"
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
                                <div className="absolute top-1 left-1">
                                  <Badge className="bg-black/75 text-white border-0 text-[8px] px-1 py-0">
                                    {pf.durationSeconds
                                      ? formatDurationCompact(
                                          pf.durationSeconds
                                        )
                                      : pf.mediaType === "VIDEO"
                                      ? "Vídeo"
                                      : "Img"}
                                  </Badge>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removePendingFile(pf.tempId);
                                  }}
                                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white hover:bg-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>

                                {/* Visual Icon Indicator on each Upload Card */}
                                <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                                  {storyOk ? (
                                    <div className="flex items-center justify-center gap-1 rounded bg-purple-600/95 text-white text-[8px] font-bold py-0.5 px-1">
                                      <Film className="w-2.5 h-2.5 shrink-0" />
                                      <span>+</span>
                                      <BookOpen className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">
                                        Reels + Story
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1 rounded bg-amber-600/95 text-white text-[8px] font-bold py-0.5 px-1">
                                      <Film className="w-2.5 h-2.5 shrink-0" />
                                      <Clock className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">
                                        Só Reels (&gt;60s)
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Seleção da Biblioteca com filtro de Nunca Postadas (Inéditas) */
                    <div className="border border-border/70 rounded-xl p-2.5 bg-muted/10 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/50 pb-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setBulkLibraryFilter("UNPUBLISHED")}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              bulkLibraryFilter === "UNPUBLISHED"
                                ? "bg-amber-500 text-white shadow-2xs"
                                : "bg-background text-muted-foreground hover:text-foreground border border-border/60"
                            }`}
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            Nunca Postadas ({unpublishedLibraryContents.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkLibraryFilter("ALL")}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                              bulkLibraryFilter === "ALL"
                                ? "bg-foreground text-background shadow-2xs"
                                : "bg-background text-muted-foreground hover:text-foreground border border-border/60"
                            }`}
                          >
                            Todas ({contents.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkLibraryFilter("PUBLISHED")}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                              bulkLibraryFilter === "PUBLISHED"
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : "bg-background text-muted-foreground hover:text-foreground border border-border/60"
                            }`}
                          >
                            Já Postadas (
                            {contents.filter((c) => !!c.is_published).length})
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const ids = filteredBulkLibraryContents.map(
                                (c) => c.id
                              );
                              setSelectedBulkLibraryIds(ids);
                              setCustomOrderedKeys(null);
                              setShuffleSeed((s) => s + 1);
                            }}
                            className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                          >
                            Selecionar todas ({filteredBulkLibraryContents.length}
                            )
                          </button>
                          {selectedBulkLibraryIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBulkLibraryIds([]);
                                setCustomOrderedKeys(null);
                              }}
                              className="text-[10px] text-muted-foreground hover:text-destructive underline cursor-pointer"
                            >
                              Limpar
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-[185px] overflow-y-auto pr-1">
                        {loadingMedia ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : filteredBulkLibraryContents.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">
                            Nenhuma mídia encontrada neste filtro.
                          </p>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            {filteredBulkLibraryContents.map((content) => {
                              const isSelected =
                                selectedBulkLibraryIds.includes(content.id);
                              const dur = getMediaDuration(content);
                              const storyOk = isEligibleForStories(
                                content.media_type === "VIDEO"
                                  ? "VIDEO"
                                  : "IMAGE",
                                dur
                              );

                              return (
                                <div
                                  key={content.id}
                                  onClick={() =>
                                    toggleBulkLibraryItem(content.id)
                                  }
                                  className={`relative rounded-lg overflow-hidden border aspect-square cursor-pointer transition-all ${
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
                                      preload="metadata"
                                      onLoadedMetadata={(e) =>
                                        handleVideoMetadataLoaded(content.id, e)
                                      }
                                    />
                                  ) : (
                                    <img
                                      src={content.media_url}
                                      alt={content.title}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                  <div className="absolute top-1 left-1">
                                    <Badge className="bg-black/75 text-white border-0 text-[8px] px-1 py-0">
                                      {dur
                                        ? formatDurationCompact(dur)
                                        : content.media_type === "VIDEO"
                                        ? "Vídeo"
                                        : "Img"}
                                    </Badge>
                                  </div>
                                  <div className="absolute top-1 right-1">
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

                                  {/* Visual Icon Indicator on each Library Card */}
                                  <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                                    {storyOk ? (
                                      <div className="flex items-center justify-center gap-1 rounded bg-purple-600/95 text-white text-[8px] font-bold py-0.5 px-1">
                                        <Film className="w-2.5 h-2.5 shrink-0" />
                                        <span>+</span>
                                        <BookOpen className="w-2.5 h-2.5 shrink-0" />
                                        <span className="truncate">
                                          Reels + Story
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1 rounded bg-amber-600/95 text-white text-[8px] font-bold py-0.5 px-1">
                                        <Film className="w-2.5 h-2.5 shrink-0" />
                                        <Clock className="w-2.5 h-2.5 shrink-0" />
                                        <span className="truncate">
                                          Só Reels (&gt;60s)
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Variações de Descrição / Copy dos Reels */}
                <div className="space-y-2 bg-card p-3 rounded-xl border border-border/80 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        Variações de Descrição / Legenda ({bulkCaptionVariations.length})
                      </Label>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {bulkCaptionVariations.length <= 1
                          ? "1 descrição cadastrada: usada em todos os Reels agendados."
                          : `${bulkCaptionVariations.length} versões cadastradas: alternadas entre os posts para não sobrepor nem ficar tudo igual.`}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCaptionVariation}
                      className="h-7 text-[10px] font-bold gap-1 border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar Variação
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin">
                    {bulkCaptionVariations.map((val, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-border/70 bg-muted/20 p-2 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-foreground flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-purple-600/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[9px] font-mono font-bold">
                              {idx + 1}
                            </span>
                            {idx === 0 ? "Variação Principal (Padrão)" : `Variação #${idx + 1}`}
                          </span>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={generatingBulkAiIdx === idx}
                              onClick={() => handleGenerateBulkAi(idx)}
                              className="h-6 text-[10px] gap-1 px-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                            >
                              {generatingBulkAiIdx === idx ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3 text-purple-500" />
                              )}
                              IA Copy
                            </Button>

                            {bulkCaptionVariations.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCaptionVariation(idx)}
                                title="Remover variação"
                                className="p-1 text-muted-foreground hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <Textarea
                          placeholder={`Escreva o texto do post #${idx + 1}, chamadas e hashtags (#empreendedorismo, etc.)...`}
                          value={val}
                          onChange={(e) =>
                            handleUpdateCaptionVariation(idx, e.target.value)
                          }
                          rows={2}
                          className="text-xs bg-background resize-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right 5 cols: Live Preview of Scheduled Days, Visual Icons & Reordering */}
              <div className="lg:col-span-5 bg-muted/20 border border-border/70 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
                        Distribuição ({plannedBulkSlots.length} mídias)
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        {plannedBulkSlots.length > 0
                          ? `${bulkSummaryStats.totalPublications} envio(s) em ${groupedPreviewByDay.length} dia(s)`
                          : "Suba arquivos ou puxe as inéditas da biblioteca"}
                      </p>
                    </div>

                    {plannedBulkSlots.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomOrderedKeys(null);
                          setShuffleSeed((s) => s + 1);
                        }}
                        className="h-7 text-[11px] gap-1 rounded-lg cursor-pointer"
                        title="Sortear e balancear novamente entre os turnos"
                      >
                        <Shuffle className="w-3 h-3 text-purple-600" />
                        Balancear
                      </Button>
                    )}
                  </div>

                  {/* Summary Legend / Placar de Ícones (Reels+Stories vs Só Reels >60s) */}
                  {plannedBulkSlots.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-background/90 border border-border/70">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <div className="flex items-center gap-0.5 text-purple-600 dark:text-purple-400 shrink-0">
                          <Film className="w-3 h-3" />
                          <span className="text-[9px] font-bold">+</span>
                          <BookOpen className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-purple-700 dark:text-purple-300 leading-tight">
                            {bulkSummaryStats.bothCount} Reels + Stories
                          </div>
                          <div className="text-[9px] text-muted-foreground truncate">
                            Vídeos ≤ 60s / Imagens
                          </div>
                        </div>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                          bulkSummaryStats.onlyReelsLongCount > 0
                            ? "bg-amber-500/15 border-amber-500/30"
                            : "bg-muted/40 border-border/50"
                        }`}
                      >
                        <div className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 shrink-0">
                          <Film className="w-3 h-3" />
                          <Clock className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 leading-tight">
                            {bulkSummaryStats.onlyReelsLongCount} Só no Reels
                            (&gt;60s)
                          </div>
                          <div className="text-[9px] text-muted-foreground truncate">
                            Protegidos s/ erro Story
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {plannedBulkSlots.length === 0 ? (
                    <div className="border border-dashed border-border rounded-xl p-6 text-center my-4 space-y-2">
                      <CalendarDays className="w-7 h-7 text-muted-foreground/50 mx-auto" />
                      <p className="text-xs font-medium text-muted-foreground">
                        Nenhuma mídia selecionada
                      </p>
                      <p className="text-[10px] text-muted-foreground/80">
                        Suba mídias ou clique no botão abaixo para carregar
                        todas as mídias inéditas da biblioteca:
                      </p>
                      {unpublishedLibraryContents.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleLoadAllUnpublishedFromLibrary}
                          className="h-7 text-[10px] font-bold gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Carregar {unpublishedLibraryContents.length} Nunca
                          Postadas da Biblioteca
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                      {groupedPreviewByDay.map(([dateKey, daySlots]) => {
                        const [yy, mm, dd] = dateKey.split("-").map(Number);
                        const dateObj = new Date(yy, mm - 1, dd);
                        const formattedDate = dateObj.toLocaleDateString(
                          "pt-BR",
                          {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                          }
                        );

                        return (
                          <div
                            key={dateKey}
                            className="rounded-xl border border-border/80 bg-card p-2.5 space-y-1.5 shadow-2xs"
                          >
                            <div className="flex items-center justify-between border-b border-border/50 pb-1">
                              <span className="text-[11px] font-bold capitalize text-foreground">
                                {formattedDate}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0"
                              >
                                {daySlots.length} horário(s)
                              </Badge>
                            </div>

                            <div className="space-y-1.5">
                              {daySlots.map((slot) => {
                                const shiftCfg = SHIFT_CONFIG[slot.shift];
                                const ShiftIcon = shiftCfg.icon;
                                const timeStr =
                                  slot.scheduledAt.toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  });
                                const isBoth =
                                  slot.publicationTypes.length > 1;
                                const durLabel = formatDurationCompact(
                                  slot.item.durationSeconds
                                );

                                return (
                                  <div
                                    key={`${slot.item.key}_${slot.globalIndex}`}
                                    className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-8 h-8 rounded overflow-hidden bg-muted shrink-0 border border-border/60 relative">
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
                                        <div className="font-semibold text-[11px] truncate max-w-[115px]">
                                          {slot.item.title}
                                        </div>

                                        {/* Ícone Visual Claro: Reels+Stories vs Só Reels (>60s) */}
                                        <div className="flex items-center gap-1 mt-0.5">
                                          {isBoth ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleToggleSlotFormat(slot)
                                              }
                                              title="Clique para alternar formato deste item"
                                              className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[9px] px-1.5 py-0.5 font-bold cursor-pointer hover:opacity-90"
                                            >
                                              <Film className="w-2.5 h-2.5" />
                                              <span>+</span>
                                              <BookOpen className="w-2.5 h-2.5" />
                                              <span>
                                                Reels + Story
                                                {durLabel
                                                  ? ` (${durLabel})`
                                                  : ""}
                                              </span>
                                            </button>
                                          ) : slot.isTooLongForStory ? (
                                            <span
                                              title="Vídeo acima de 60s: agendado automaticamente apenas no Reels para evitar erro nos Stories"
                                              className="inline-flex items-center gap-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[9px] px-1.5 py-0.5 font-bold"
                                            >
                                              <Film className="w-2.5 h-2.5" />
                                              <Clock className="w-2.5 h-2.5" />
                                              <span>
                                                Só Reels &gt;60s
                                                {durLabel
                                                  ? ` (${durLabel})`
                                                  : ""}
                                              </span>
                                            </span>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleToggleSlotFormat(slot)
                                              }
                                              title="Clique para incluir Stories também"
                                              className="inline-flex items-center gap-1 rounded bg-background border border-border text-foreground text-[9px] px-1.5 py-0.5 font-semibold cursor-pointer hover:bg-muted"
                                            >
                                              <Film className="w-2.5 h-2.5 text-purple-500" />
                                              <span>
                                                {slot.publicationTypes[0]}
                                                {durLabel
                                                  ? ` (${durLabel})`
                                                  : ""}
                                              </span>
                                            </button>
                                          )}
                                        </div>

                                        {/* Botão de Legenda Específica para este Reel / Variação Atribuída */}
                                        {slot.publicationTypes.some(
                                          (t) => t === "REEL" || t === "FEED"
                                        ) && (
                                          <div className="mt-1">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setEditingCaptionSlotKey(
                                                  slot.item.key
                                                )
                                              }
                                              title="Clique para adicionar ou editar uma descrição específica para este Reel"
                                              className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                                specificItemCaptions[
                                                  slot.item.key
                                                ]?.trim()
                                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold"
                                                  : "bg-muted/40 hover:bg-muted border-border/60 text-muted-foreground hover:text-foreground"
                                              }`}
                                            >
                                              {specificItemCaptions[
                                                slot.item.key
                                              ]?.trim() ? (
                                                <>
                                                  <Check className="w-2.5 h-2.5 text-emerald-500" />
                                                  <span className="truncate max-w-[110px]">
                                                    Legenda própria: "
                                                    {specificItemCaptions[
                                                      slot.item.key
                                                    ]
                                                      .trim()
                                                      .slice(0, 16)}
                                                    ..."
                                                  </span>
                                                </>
                                              ) : validBulkCaptionVariationsCount >
                                                1 ? (
                                                <>
                                                  <FileText className="w-2.5 h-2.5 text-purple-500" />
                                                  <span>
                                                    Variação #
                                                    {(slot.globalIndex %
                                                      validBulkCaptionVariationsCount) +
                                                      1}
                                                  </span>
                                                  <span className="text-[8px] text-purple-600 dark:text-purple-400 font-semibold underline ml-0.5">
                                                    (personalizar)
                                                  </span>
                                                </>
                                              ) : validBulkCaptionVariationsCount ===
                                                1 ? (
                                                <>
                                                  <FileText className="w-2.5 h-2.5 text-purple-500" />
                                                  <span>Variação Padrão</span>
                                                  <span className="text-[8px] text-purple-600 dark:text-purple-400 font-semibold underline ml-0.5">
                                                    (personalizar)
                                                  </span>
                                                </>
                                              ) : (
                                                <>
                                                  <Plus className="w-2.5 h-2.5 text-purple-500" />
                                                  <span>+ Legenda específica</span>
                                                </>
                                              )}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Right controls: Reorder ↑/↓ + Shift + Time */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <div className="flex flex-col">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleMovePlannedSlot(
                                              slot.globalIndex,
                                              "UP"
                                            )
                                          }
                                          disabled={slot.globalIndex === 0}
                                          title="Subir vídeo na fila"
                                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 cursor-pointer"
                                        >
                                          <ArrowUp className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleMovePlannedSlot(
                                              slot.globalIndex,
                                              "DOWN"
                                            )
                                          }
                                          disabled={
                                            slot.globalIndex ===
                                            plannedBulkSlots.length - 1
                                          }
                                          title="Descer vídeo na fila"
                                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 cursor-pointer"
                                        >
                                          <ArrowDown className="w-2.5 h-2.5" />
                                        </button>
                                      </div>

                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] px-1.5 py-0 font-semibold flex items-center gap-0.5 ${shiftCfg.badgeClass}`}
                                      >
                                        <ShiftIcon className="w-2.5 h-2.5" />
                                        {shiftCfg.label}
                                      </Badge>
                                      <span className="font-mono font-bold text-[11px] bg-background px-1.5 py-0.5 rounded border border-border">
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

                {bulkProgressText && (
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span className="truncate">{bulkProgressText}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================
              MODE 3: STORY SEQUENCE CONFIGURATION
             ========================================================= */}
          {mode === "STORY_SEQUENCE" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 border border-pink-500/20 space-y-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-pink-500" />
                  <span className="font-bold text-xs">
                    Criador de Sequência de Stories
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Selecione múltiplos stories para serem postados em sequência
                  encadeada no Instagram. O sistema publicará ou agendará cada
                  story na ordem definida com o intervalo de tempo escolhido.
                </p>
              </div>

              {/* Selected Sequence Order */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Ordem dos Stories na Sequência ({sequenceContentIds.length}{" "}
                    selecionados)
                  </Label>
                  {sequenceContentIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSequenceContentIds([])}
                      className="text-[10px] text-muted-foreground hover:text-destructive underline"
                    >
                      Limpar seleção
                    </button>
                  )}
                </div>

                {sequenceContentIds.length === 0 ? (
                  <div className="p-6 border border-dashed rounded-xl text-center space-y-1 text-muted-foreground bg-muted/10">
                    <Layers className="w-6 h-6 mx-auto text-muted-foreground/60" />
                    <p className="text-xs font-medium">
                      Nenhum story selecionado ainda
                    </p>
                    <p className="text-[11px]">
                      Clique nas mídias abaixo para adicionar à sequência na
                      ordem desejada.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {sequenceContentIds.map((cId, idx) => {
                      const item = contents.find((c) => c.id === cId);
                      if (!item) return null;
                      const dur = getMediaDuration(item);

                      return (
                        <div
                          key={`seq-item-${cId}-${idx}`}
                          className="flex items-center justify-between p-2 rounded-lg border border-muted bg-card hover:border-pink-500/30 transition-all text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-500 text-white font-bold text-[10px] shrink-0 shadow-sm">
                              {idx + 1}
                            </span>
                            <div className="w-8 h-12 rounded bg-black/10 overflow-hidden shrink-0 border border-muted">
                              {item.media_type === "VIDEO" ? (
                                <video
                                  src={item.media_url}
                                  className="w-full h-full object-cover"
                                  muted
                                />
                              ) : (
                                <img
                                  src={item.media_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate text-[11px]">
                                {item.title || `Story #${idx + 1}`}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <span>{item.media_type}</span>
                                {dur && (
                                  <span>• {formatDurationCompact(dur)}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMoveSequenceItem(idx, "UP")}
                              disabled={idx === 0}
                              className="w-6 h-6"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleMoveSequenceItem(idx, "DOWN")
                              }
                              disabled={idx === sequenceContentIds.length - 1}
                              className="w-6 h-6"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveSequenceItem(idx)}
                              className="w-6 h-6 text-muted-foreground hover:text-destructive"
                              title="Remover da sequência"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Interval / Cadence Between Stories */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-muted bg-muted/20">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    Intervalo entre cada Story
                  </Label>
                  <Select
                    value={String(sequenceIntervalMinutes)}
                    onValueChange={(val) =>
                      setSequenceIntervalMinutes(Number(val))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">
                        Simultâneo / Mesmo minuto (0 min)
                      </SelectItem>
                      <SelectItem value="1">1 minuto de intervalo</SelectItem>
                      <SelectItem value="2">2 minutos de intervalo</SelectItem>
                      <SelectItem value="5">5 minutos de intervalo</SelectItem>
                      <SelectItem value="10">10 minutos de intervalo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    Duração Total da Sequência
                  </Label>
                  <div className="h-9 rounded-md bg-background px-3 flex items-center border border-input text-xs text-muted-foreground font-medium">
                    {sequenceContentIds.length > 0
                      ? `${sequenceContentIds.length} stories (~${
                          (sequenceContentIds.length - 1) *
                          sequenceIntervalMinutes
                        } min)`
                      : "Selecione stories"}
                  </div>
                </div>
              </div>

              {/* Multi-Picker from Library */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Clique para adicionar ou remover da sequência
                </Label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1.5 border border-muted rounded-xl bg-card">
                  {contents.map((item) => {
                    const seqIndex = sequenceContentIds.indexOf(item.id);
                    const isSelected = seqIndex !== -1;
                    const dur = getMediaDuration(item);
                    const isOver60s =
                      item.media_type === "VIDEO" && dur && dur > 60;

                    return (
                      <div
                        key={`pick-${item.id}`}
                        onClick={() => handleToggleSequenceItem(item.id)}
                        className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelected
                            ? "border-pink-500 ring-2 ring-pink-500/30 scale-[0.98]"
                            : isOver60s
                            ? "border-amber-500/40 opacity-45 cursor-not-allowed"
                            : "border-transparent hover:border-muted-foreground/30 opacity-80 hover:opacity-100"
                        }`}
                        title={
                          isOver60s
                            ? "Vídeo com mais de 60s não pode ser Story (Só Reels)"
                            : item.title || "Clique para alternar na sequência"
                        }
                      >
                        {item.media_type === "VIDEO" ? (
                          <video
                            src={item.media_url}
                            className="w-full h-full object-cover pointer-events-none"
                            muted
                            preload="metadata"
                            onLoadedMetadata={(e) =>
                              handleVideoMetadataLoaded(item.id, e)
                            }
                          />
                        ) : (
                          <img
                            src={item.media_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}

                        <div className="absolute top-1 left-1">
                          <Badge className="bg-black/70 text-white text-[9px] px-1 py-0 h-4 border-0">
                            {dur ? formatDurationCompact(dur) : item.media_type}
                          </Badge>
                        </div>

                        {isOver60s && (
                          <div className="absolute bottom-0 inset-x-0 p-1 bg-amber-600/95 text-white text-[8px] font-bold text-center">
                            Só Reels (&gt;60s)
                          </div>
                        )}

                        {isSelected && (
                          <div className="absolute inset-0 bg-pink-500/30 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-pink-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                              {seqIndex + 1}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Timing & Schedule Options (Only for SINGLE and STORY_SEQUENCE) */}
          {mode !== "BULK" && (
            <div className="p-3.5 rounded-xl border border-muted bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-pink-500" />
                  Momento da Publicação
                </Label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsPublishNow(true)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      isPublishNow
                        ? "bg-pink-600 text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Publicar Imediatamente
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublishNow(false)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      !isPublishNow
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Agendar Data &amp; Hora
                  </button>
                </div>
              </div>

              {!isPublishNow && (
                <div className="space-y-1 pt-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Data e Horário de Início
                  </Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="h-9 text-xs bg-background"
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-muted">
            <div className="text-xs text-muted-foreground">
              {mode === "BULK" && plannedBulkSlots.length > 0 && (
                <span>
                  <strong>{plannedBulkSlots.length} mídias</strong> (
                  <strong>{bulkSummaryStats.totalPublications} envios</strong>)
                  • <strong>{postsPerDay}/dia</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-9"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  submitting ||
                  (mode === "BULK" && plannedBulkSlots.length === 0)
                }
                className="text-xs h-9 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white hover:opacity-90 transition-all font-semibold shadow-sm cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    {mode === "BULK"
                      ? "Subindo e Programando..."
                      : "Salvando Programação..."}
                  </>
                ) : mode === "BULK" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Programar Tudo em Bulk ({plannedBulkSlots.length} mídias)
                  </>
                ) : isPublishNow ? (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {mode === "STORY_SEQUENCE"
                      ? `Publicar Sequência Agora (${sequenceContentIds.length})`
                      : isSingleBothSelected
                      ? "Publicar Reels + Stories Agora"
                      : "Publicar Imediatamente"}
                  </>
                ) : (
                  <>
                    <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                    {mode === "STORY_SEQUENCE"
                      ? `Agendar Sequência (${sequenceContentIds.length} Stories)`
                      : isSingleBothSelected
                      ? "Agendar Reels + Stories (Os dois)"
                      : "Confirmar Agendamento"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Modal para Editar Legenda Específica de um Reel */}
    <Dialog
      open={!!editingCaptionSlotKey}
      onOpenChange={(open) => !open && setEditingCaptionSlotKey(null)}
    >
      <DialogContent className="sm:max-w-[500px]">
        {editingCaptionSlot && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Legenda Específica do Reel
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Defina uma legenda exclusiva com hashtags para este post. Se preenchida, ela substitui a rotação de variações apenas para este vídeo.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border/60">
              <div className="w-12 h-12 rounded bg-black/10 overflow-hidden shrink-0">
                {editingCaptionSlot.item.mediaType === "VIDEO" ? (
                  <video
                    src={editingCaptionSlot.item.previewUrl}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <img
                    src={editingCaptionSlot.item.previewUrl}
                    alt={editingCaptionSlot.item.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs truncate text-foreground">
                  {editingCaptionSlot.item.title}
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>
                    {editingCaptionSlot.scheduledAt.toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  {editingCaptionSlot.item.durationSeconds && (
                    <span>
                      • {formatDurationCompact(editingCaptionSlot.item.durationSeconds)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <Label className="font-semibold text-foreground">
                  Texto da Legenda / Copy com Hashtags:
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {(specificItemCaptions[editingCaptionSlot.item.key] || "").length} caracteres
                </span>
              </div>
              <Textarea
                placeholder="Digite a legenda específica para este post com hashtags (#exemplo #marketing)..."
                value={specificItemCaptions[editingCaptionSlot.item.key] || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSpecificItemCaptions((prev) => ({
                    ...prev,
                    [editingCaptionSlot.item.key]: val,
                  }));
                }}
                rows={5}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              {specificItemCaptions[editingCaptionSlot.item.key]?.trim() ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSpecificItemCaptions((prev) => {
                      const next = { ...prev };
                      delete next[editingCaptionSlot.item.key];
                      return next;
                    });
                    setEditingCaptionSlotKey(null);
                    toast.info(
                      "Legenda específica removida! O post voltará a usar as variações automáticas."
                    );
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 h-8"
                >
                  Remover (Voltar para Variação Geral)
                </Button>
              ) : (
                <div />
              )}

              <Button
                type="button"
                onClick={() => setEditingCaptionSlotKey(null)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-8 px-4"
              >
                Salvar Legenda Deste Post
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
