import { Attribute } from "@/data/api-endpoints";
import { Badge } from "@/components/ui/badge";

interface AttributesTableProps {
  attributes: Attribute[];
}

export function AttributesTable({ attributes }: AttributesTableProps) {
  if (attributes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Este endpoint não requer parâmetros.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-semibold text-foreground">Parâmetro</th>
            <th className="text-left py-3 px-4 font-semibold text-foreground">Tipo</th>
            <th className="text-left py-3 px-4 font-semibold text-foreground">Obrigatório?</th>
            <th className="text-left py-3 px-4 font-semibold text-foreground">Descrição</th>
          </tr>
        </thead>
        <tbody>
          {attributes.map((attr, index) => (
            <tr 
              key={attr.name} 
              className={index % 2 === 0 ? "bg-muted/30" : "bg-background"}
            >
              <td className="py-3 px-4">
                <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded text-primary">
                  {attr.name}
                </code>
              </td>
              <td className="py-3 px-4">
                <span className="text-muted-foreground font-mono text-xs">
                  {attr.type}
                </span>
              </td>
              <td className="py-3 px-4">
                {attr.required ? (
                  <Badge variant="default" className="bg-destructive/10 text-destructive border-destructive/20">
                    Sim
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    Não
                  </Badge>
                )}
              </td>
              <td className="py-3 px-4 text-muted-foreground">
                {attr.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
