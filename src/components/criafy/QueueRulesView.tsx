import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  Clock,
  CalendarDays,
  Play,
  Pause,
  Plus,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { criafyService } from "@/services/criafy/criafyService";
import { CriafyInstagramAccount, CriafyQueueRule } from "@/types/criafy";

interface QueueRulesViewProps {
  accounts: CriafyInstagramAccount[];
  selectedAccountId: string;
  onSelectAccountFilter: (id: string) => void;
}

export function QueueRulesView({
  accounts,
  selectedAccountId,
  onSelectAccountFilter,
}: QueueRulesViewProps) {
  const [targetAccount, setTargetAccount] = useState<CriafyInstagramAccount | null>(null);
  const [rule, setRule] = useState<CriafyQueueRule | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [postsPerDay, setPostsPerDay] = useState(2);
  const [publicationTimes, setPublicationTimes] = useState<string[]>(["08:00", "18:00"]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [allowedDays, setAllowedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [isActive, setIsActive] = useState(true);
  const [timezone, setTimezone] = useState("America/Sao_Paulo");

  useEffect(() => {
    const activeAcc = accounts.find((a) => a.id === selectedAccountId) || accounts[0] || null;
    setTargetAccount(activeAcc);
    if (activeAcc) {
      loadRule(activeAcc.id);
    }
  }, [selectedAccountId, accounts]);

  const loadRule = async (accId: string) => {
    setLoading(true);
    try {
      const data = await criafyService.getQueueRule(accId);
      if (data) {
        setRule(data);
        setPostsPerDay(data.posts_per_day);
        setPublicationTimes(data.publication_times || ["08:00", "18:00"]);
        setStartDate(data.start_date);
        setAllowedDays(data.allowed_days || [1, 2, 3, 4, 5, 6, 7]);
        setIsActive(data.is_active);
        setTimezone(data.timezone || "America/Sao_Paulo");
      }
    } catch (err: any) {
      toast.error(`Erro ao carregar regra de fila: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTimeSlot = () => {
    setPublicationTimes([...publicationTimes, "12:00"]);
  };

  const handleRemoveTimeSlot = (index: number) => {
    setPublicationTimes(publicationTimes.filter((_, i) => i !== index));
  };

  const handleTimeSlotChange = (index: number, val: string) => {
    const updated = [...publicationTimes];
    updated[index] = val;
    setPublicationTimes(updated);
  };

  const toggleDay = (dayNum: number) => {
    if (allowedDays.includes(dayNum)) {
      setAllowedDays(allowedDays.filter((d) => d !== dayNum));
    } else {
      setAllowedDays([...allowedDays, dayNum].sort());
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAccount) return;

    setSaving(true);
    try {
      await criafyService.saveQueueRule({
        company_id: targetAccount.company_id,
        account_id: targetAccount.id,
        posts_per_day: postsPerDay,
        publication_times: publicationTimes,
        start_date: startDate,
        allowed_days: allowedDays,
        is_active: isActive,
        timezone,
      });

      toast.success(`Fila automática da conta @${targetAccount.username} configurada!`);
      loadRule(targetAccount.id);
    } catch (err: any) {
      toast.error(`Erro ao salvar fila: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const dayNames = [
    { num: 1, label: "Seg" },
    { num: 2, label: "Ter" },
    { num: 3, label: "Qua" },
    { num: 4, label: "Qui" },
    { num: 5, label: "Sex" },
    { num: 6, label: "Sáb" },
    { num: 7, label: "Dom" },
  ];

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 px-4 border border-dashed rounded-xl bg-card">
        <p className="text-xs text-muted-foreground">Conecte uma conta do Instagram primeiro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Account Selector */}
      <div className="flex items-center gap-3 bg-muted/30 p-4 rounded-xl border border-muted">
        <span className="text-xs font-semibold">Conta Selecionada:</span>
        <div className="w-60">
          <Select
            value={targetAccount?.id || ""}
            onValueChange={(val) => onSelectAccountFilter(val)}
          >
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue />
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
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form onSubmit={handleSaveRule} className="space-y-6 bg-card p-6 rounded-xl border border-muted">
          <div className="flex items-center justify-between pb-4 border-b border-muted">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Fila Automática & Cadência</h3>
                <p className="text-xs text-muted-foreground">
                  O Criafy distribuirá automaticamente os conteúdos da biblioteca nos horários configurados.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Fila Ativa:</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Quantidade de Publicações por Dia</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={postsPerDay}
                onChange={(e) => setPostsPerDay(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Data Inicial da Fila</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          {/* Time Slots */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Horários da Cadência Diária</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleAddTimeSlot}
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Horário
              </Button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {publicationTimes.map((time, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-muted/40 p-1.5 rounded-lg border border-muted">
                  <Input
                    type="time"
                    className="h-8 text-xs bg-background"
                    value={time}
                    onChange={(e) => handleTimeSlotChange(idx, e.target.value)}
                  />
                  {publicationTimes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTimeSlot(idx)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Allowed Days */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Dias da Semana Permitidos</Label>
            <div className="flex flex-wrap gap-2">
              {dayNames.map((d) => {
                const isSelected = allowedDays.includes(d.num);
                return (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => toggleDay(d.num)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 text-muted-foreground border-muted hover:bg-muted/60"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-muted flex justify-end">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar Regras de Cadência
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
