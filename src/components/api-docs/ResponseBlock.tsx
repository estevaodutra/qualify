import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ResponseBlockProps {
  responses: {
    success: {
      code: number;
      body: object;
    };
    error: {
      code: number;
      body: object;
    };
  };
}

export function ResponseBlock({ responses }: ResponseBlockProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<{ success: boolean; error: boolean }>({
    success: true,
    error: false,
  });

  const copyToClipboard = async (code: string, type: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(type);
      toast({
        title: "Copiado!",
        description: "Resposta copiada para a área de transferência.",
      });
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar.",
        variant: "destructive",
      });
    }
  };

  const formatJson = (obj: object) => JSON.stringify(obj, null, 2);

  const ResponseSection = ({ 
    type, 
    code, 
    body, 
    isSuccess 
  }: { 
    type: "success" | "error"; 
    code: number; 
    body: object; 
    isSuccess: boolean;
  }) => {
    const isExpanded = expanded[type];
    const formattedBody = formatJson(body);

    return (
      <div className={cn(
        "border rounded-lg overflow-hidden",
        isSuccess ? "border-green-500/30" : "border-destructive/30"
      )}>
        <button
          onClick={() => setExpanded(prev => ({ ...prev, [type]: !prev[type] }))}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
            isSuccess 
              ? "bg-green-500/10 hover:bg-green-500/15" 
              : "bg-destructive/10 hover:bg-destructive/15"
          )}
        >
          <div className="flex items-center gap-3">
            <span className={cn(
              "font-mono text-sm font-bold px-2 py-0.5 rounded",
              isSuccess 
                ? "bg-green-500/20 text-green-600 dark:text-green-400" 
                : "bg-destructive/20 text-destructive"
            )}>
              {code}
            </span>
            <span className="text-sm font-medium text-foreground">
              {isSuccess ? "Sucesso" : "Erro"}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        
        {isExpanded && (
          <div className="relative group">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background z-10"
              onClick={() => copyToClipboard(formattedBody, type)}
            >
              {copied === type ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <pre className="bg-[#1e1e1e] dark:bg-[#0d0d0d] text-[#d4d4d4] p-4 overflow-x-auto text-sm font-mono leading-relaxed">
              <code>{formattedBody}</code>
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <ResponseSection 
        type="success" 
        code={responses.success.code} 
        body={responses.success.body} 
        isSuccess={true} 
      />
      <ResponseSection 
        type="error" 
        code={responses.error.code} 
        body={responses.error.body} 
        isSuccess={false} 
      />
    </div>
  );
}
