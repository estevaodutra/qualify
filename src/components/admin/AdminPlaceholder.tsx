import { PageHeader } from "@/components/dispatch";
import { Card, CardContent } from "@/components/ui/card";
import { HardHat } from "lucide-react";

interface AdminPlaceholderProps {
  title: string;
  description: string;
}

export default function AdminPlaceholder({ title, description }: AdminPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      
      <Card className="border-dashed border-2 bg-muted/5">
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <HardHat className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Página em Construção</h3>
          <p className="text-muted-foreground max-w-md">
            Esta funcionalidade do painel administrativo está sendo preparada para o próximo ciclo de atualização.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
