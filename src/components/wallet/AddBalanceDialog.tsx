import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Copy, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCreatePixPayment, usePaymentStatus } from "@/hooks/useWallet";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialAmount?: number;
}

const PRESETS = [250, 500, 1000, 2000];
const MIN = 250;

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AddBalanceDialog({ open, onOpenChange, initialAmount }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState<number>(initialAmount ?? 250);
  const [customStr, setCustomStr] = useState<string>("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ qr: string | null; qrB64: string | null; expiresAt: string } | null>(null);

  const createMutation = useCreatePixPayment();
  const statusQuery = usePaymentStatus(paymentId);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setAmount(initialAmount ?? 250);
        setCustomStr("");
        setPaymentId(null);
        setPixData(null);
      }, 250);
    }
  }, [open, initialAmount]);

  // Auto-advance to step 3 on approval
  useEffect(() => {
    if (statusQuery.data?.status === "approved" && step === 2) {
      setStep(3);
    }
  }, [statusQuery.data?.status, step]);

  const finalAmount = customStr ? Number(customStr.replace(",", ".")) : amount;
  const validAmount = !isNaN(finalAmount) && finalAmount >= MIN;

  async function handleGenerate() {
    if (!validAmount) {
      toast({ title: "Valor inválido", description: `Valor mínimo é ${fmt(MIN)}.`, variant: "destructive" });
      return;
    }
    try {
      const res = await createMutation.mutateAsync(finalAmount);
      setPaymentId(res.payment_id);
      setPixData({ qr: res.qr_code, qrB64: res.qr_code_base64, expiresAt: res.expires_at });
      setStep(2);
    } catch (e) {
      toast({ title: "Erro ao gerar PIX", description: (e as Error).message, variant: "destructive" });
    }
  }

  function copyPix() {
    if (!pixData?.qr) return;
    navigator.clipboard.writeText(pixData.qr);
    toast({ title: "Código copiado!", description: "Cole no app do seu banco." });
  }

  // Countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (step !== 2) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);
  const expMs = pixData?.expiresAt ? new Date(pixData.expiresAt).getTime() - now : 0;
  const expMin = Math.max(0, Math.floor(expMs / 60000));
  const expSec = Math.max(0, Math.floor((expMs % 60000) / 1000));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Adicionar saldo"}
            {step === 2 && "Pague com PIX"}
            {step === 3 && "Pagamento confirmado"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Escolha o valor da recarga (mínimo R$ 250)."}
            {step === 2 && "Escaneie o QR ou copie o código PIX no app do seu banco."}
            {step === 3 && "Saldo creditado com sucesso."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant={!customStr && amount === v ? "default" : "outline"}
                  onClick={() => { setAmount(v); setCustomStr(""); }}
                >
                  {fmt(v)}
                </Button>
              ))}
            </div>
            <div className="space-y-1">
              <Label htmlFor="custom">Valor personalizado (mínimo {fmt(MIN)})</Label>
              <Input
                id="custom"
                type="number"
                min={MIN}
                step="50"
                placeholder="Ex.: 350"
                value={customStr}
                onChange={(e) => setCustomStr(e.target.value)}
              />
            </div>
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valor a pagar:</span>
                <span className="text-lg font-semibold">{fmt(validAmount ? finalAmount : 0)}</span>
              </div>
            </div>
            <Button className="w-full" disabled={!validAmount || createMutation.isPending} onClick={handleGenerate}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar PIX
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {pixData?.qrB64 && (
              <div className="flex justify-center">
                <img
                  src={pixData.qrB64.startsWith("data:") ? pixData.qrB64 : `data:image/png;base64,${pixData.qrB64}`}
                  alt="QR Code PIX"
                  className="h-56 w-56 rounded-md border bg-white p-2"
                />
              </div>
            )}
            {pixData?.qr && (
              <div className="space-y-1">
                <Label>Código PIX (copia e cola)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={pixData.qr} className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={copyPix}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <Card className="flex items-center gap-2 bg-muted/40 p-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>PIX válido por mais {String(expMin).padStart(2, "0")}:{String(expSec).padStart(2, "0")}</span>
            </Card>
            <Card className="flex items-center gap-2 p-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Aguardando pagamento...</span>
            </Card>
            {statusQuery.data?.status === "expired" && (
              <Card className="flex items-center gap-2 border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Pagamento expirado. Gere um novo PIX.</span>
              </Card>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="h-16 w-16 text-success" />
            <div className="text-center">
              <p className="text-lg font-semibold">Pagamento confirmado!</p>
              <p className="text-sm text-muted-foreground">
                {fmt(Number(statusQuery.data?.amount || finalAmount))} adicionados à sua carteira.
              </p>
            </div>
            <Button className="w-full" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
