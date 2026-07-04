import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TriggerConfigComponentProps } from "../types";

export function ScheduledTriggerConfig({ config, onChange }: TriggerConfigComponentProps) {
  return (
    <div className="space-y-3 p-3 rounded-lg bg-background border">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Data</Label>
          <Input
            type="date"
            value={(config.scheduledDate as string) || ""}
            onChange={(e) => onChange({ ...config, scheduledDate: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hora</Label>
          <Input
            type="time"
            value={(config.scheduledTime as string) || ""}
            onChange={(e) => onChange({ ...config, scheduledTime: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
