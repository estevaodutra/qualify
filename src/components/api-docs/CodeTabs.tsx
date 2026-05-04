import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeTabsProps {
  examples: {
    curl: string;
    nodejs: string;
    python: string;
  };
}

export function CodeTabs({ examples }: CodeTabsProps) {
  const { toast } = useToast();
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const copyToClipboard = async (code: string, tab: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedTab(tab);
      toast({
        title: "Copiado!",
        description: "Código copiado para a área de transferência.",
      });
      setTimeout(() => setCopiedTab(null), 2000);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o código.",
        variant: "destructive",
      });
    }
  };

  const syntaxHighlight = (str: string) => {
    let highlighted = str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="text-[#22E6B5]">$&</span>');
    highlighted = highlighted.replace(/\b(POST|GET|PUT|DELETE)\b/g, '<span class="text-[#8A3CFF] font-semibold">$&</span>');
    
    return { __html: highlighted };
  };

  const CodeBlock = ({ code, language }: { code: string; language: string }) => (
    <div className="relative group">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background hover:text-[#8A3CFF]"
        onClick={() => copyToClipboard(code, language)}
      >
        {copiedTab === language ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
      <pre className="bg-[#0E1329] border border-white/10 text-[#B87FFF] font-['JetBrains_Mono'] p-4 rounded-lg overflow-x-auto text-sm leading-relaxed">
        <code dangerouslySetInnerHTML={syntaxHighlight(code)} />
      </pre>
    </div>
  );

  return (
    <Tabs defaultValue="curl" className="w-full">
      <TabsList className="bg-muted/50 border border-border">
        <TabsTrigger 
          value="curl" 
          className="data-[state=active]:bg-background data-[state=active]:text-foreground font-mono text-xs"
        >
          cURL
        </TabsTrigger>
        <TabsTrigger 
          value="nodejs"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground font-mono text-xs"
        >
          Node.js
        </TabsTrigger>
        <TabsTrigger 
          value="python"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground font-mono text-xs"
        >
          Python
        </TabsTrigger>
      </TabsList>
      <TabsContent value="curl" className="mt-3">
        <CodeBlock code={examples.curl} language="curl" />
      </TabsContent>
      <TabsContent value="nodejs" className="mt-3">
        <CodeBlock code={examples.nodejs} language="nodejs" />
      </TabsContent>
      <TabsContent value="python" className="mt-3">
        <CodeBlock code={examples.python} language="python" />
      </TabsContent>
    </Tabs>
  );
}
