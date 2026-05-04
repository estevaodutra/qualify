import { Endpoint } from "@/data/api-endpoints";
import { AttributesTable } from "./AttributesTable";
import { CodeTabs } from "./CodeTabs";
import { ResponseBlock } from "./ResponseBlock";
import { cn } from "@/lib/utils";

interface EndpointSectionProps {
  endpoint: Endpoint;
}

const methodColors = {
  GET: "bg-[#22DD4F]/12 text-[#22DD4F] border-[#22DD4F]/25 font-['JetBrains_Mono']",
  POST: "bg-[#8A3CFF]/15 text-[#B87FFF] border-[#8A3CFF]/30 font-['JetBrains_Mono']",
  PUT: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-['JetBrains_Mono']",
  DELETE: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-['JetBrains_Mono']",
};

export function EndpointSection({ endpoint }: EndpointSectionProps) {
  return (
    <section id={endpoint.id} className="scroll-mt-20">
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        {/* Header */}
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn(
              "font-mono text-sm font-bold px-3 py-1.5 rounded-md border",
              methodColors[endpoint.method]
            )}>
              {endpoint.method}
            </span>
            <code className={cn(
              "font-['JetBrains_Mono'] text-sm font-semibold",
              endpoint.path.includes("/call-dial") ? "text-[#8A3CFF]" : "text-foreground"
            )}>
              {endpoint.path}
            </code>
          </div>
          <p className="mt-3 text-muted-foreground">
            {endpoint.description}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Attributes */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Atributos
            </h3>
            <AttributesTable attributes={endpoint.attributes} />
          </div>

          {/* Status Codes */}
          {endpoint.statusCodes && endpoint.statusCodes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
                Códigos Principais
              </h3>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Código</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.statusCodes.map((sc, index) => (
                      <tr key={sc.code} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <td className="py-3 px-4">
                          <code className="font-mono text-xs bg-muted px-2 py-1 rounded text-primary">{sc.code}</code>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">{sc.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Request Examples */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Requisição
            </h3>
            <CodeTabs examples={endpoint.examples} />
          </div>

          {/* Responses */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Respostas
            </h3>
            <ResponseBlock responses={endpoint.responses} />
          </div>
        </div>
      </div>
    </section>
  );
}
