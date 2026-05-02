import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, Mail } from "lucide-react";

const PROVIDERS = [
  { id: "google_calendar", name: "Google Calendar", icon: Calendar, note: null },
  { id: "outlook", name: "Microsoft Outlook", icon: Mail, note: null },
  { id: "zoom", name: "Zoom", icon: Video, note: null },
  { id: "google_meet", name: "Google Meet", icon: Video, note: "Requer Google Calendar conectado" },
];

export default function GlobalIntegrationsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Integrações globais</CardTitle>
        <CardDescription>Conecte agendas e plataformas de reunião</CardDescription>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-3">
        {PROVIDERS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.id} className="border rounded-lg p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{p.name}</span>
                </div>
                <Badge variant="secondary">Em breve</Badge>
              </div>
              {p.note && <div className="text-xs text-muted-foreground">{p.note}</div>}
              <Button variant="outline" size="sm" disabled className="w-fit">Conectar</Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
