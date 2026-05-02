import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSchedulingSettings } from "@/hooks/useSchedulingSettings";

export default function BrandingCard() {
  const { data, upsert } = useSchedulingSettings();
  const hide = data?.hide_branding || false;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          <Checkbox id="hide-branding" checked={hide} onCheckedChange={(v) => upsert.mutate({ hide_branding: !!v })} />
          <div>
            <Label htmlFor="hide-branding" className="cursor-pointer">Remover "Powered by DispatchOne" das páginas</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Disponível apenas no plano Pro</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
