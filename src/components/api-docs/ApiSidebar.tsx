import { useState } from "react";
import { cn } from "@/lib/utils";
import { apiEndpoints, EndpointCategory } from "@/data/api-endpoints";
import { BookOpen, Key, Webhook, MessageSquare, Server, AlertTriangle, Settings, Vote, Radio, CheckCircle, Search, Phone, ChevronRight, Skull } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ApiSidebarProps {
  activeSection: string;
  activeCategory: string;
  onSectionClick: (sectionId: string) => void;
  onCategoryClick: (categoryId: string) => void;
  onEndpointClick?: (categoryId: string, endpointId: string) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  messages: <MessageSquare className="h-4 w-4" />,
  instance: <Server className="h-4 w-4" />,
  webhooks: <Webhook className="h-4 w-4" />,
  "poll-responses": <Vote className="h-4 w-4" />,
  "webhooks-inbound": <Radio className="h-4 w-4" />,
  validation: <CheckCircle className="h-4 w-4" />,
  queries: <Search className="h-4 w-4" />,
  calls: <Phone className="h-4 w-4" />,
  pirate: <Skull className="h-4 w-4" />,
};

const methodColors: Record<string, string> = {
  GET: "text-green-500",
  POST: "text-blue-500",
  PUT: "text-amber-500",
  DELETE: "text-red-500",
};

export function ApiSidebar({ activeSection, activeCategory, onSectionClick, onCategoryClick, onEndpointClick }: ApiSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleClick = (sectionId: string) => {
    onSectionClick(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    onCategoryClick(categoryId);
  };

  const handleEndpointClick = (categoryId: string, endpointId: string) => {
    onCategoryClick(categoryId);
    onEndpointClick?.(categoryId, endpointId);
  };

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="sticky top-20">
        <ScrollArea className="h-[calc(100vh-120px)]">
          <nav className="pr-4 space-y-1">
            {/* Introduction */}
            <button
              onClick={() => handleClick("introduction")}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left",
                activeSection === "introduction"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <BookOpen className="h-4 w-4" />
              Introdução
            </button>

            {/* Authentication */}
            <button
              onClick={() => handleClick("authentication")}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left",
                activeSection === "authentication"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Key className="h-4 w-4" />
              Autenticação
            </button>

            {/* Webhook Config */}
            <button
              onClick={() => handleClick("webhook-config")}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left",
                activeSection === "webhook-config"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
              Configurar Webhooks
            </button>

            {/* Divider */}
            <div className="pt-2 pb-1">
              <span className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Endpoints
              </span>
            </div>

            {/* Categories with collapsible endpoints */}
            {apiEndpoints.map((category) => (
              <Collapsible
                key={category.id}
                open={expandedCategories.includes(category.id)}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left group",
                      activeCategory === category.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <ChevronRight 
                      className={cn(
                        "h-3 w-3 transition-transform duration-200",
                        expandedCategories.includes(category.id) && "rotate-90"
                      )} 
                    />
                    {categoryIcons[category.id]}
                    <span className="flex-1">{category.name}</span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 pl-3 border-l border-border space-y-0.5 py-1">
                    {category.endpoints.map((endpoint) => (
                      <button
                        key={endpoint.id}
                        onClick={() => handleEndpointClick(category.id, endpoint.id)}
                        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors text-left"
                      >
                        <span className={cn("font-mono text-[10px] font-semibold", methodColors[endpoint.method])}>
                          {endpoint.method}
                        </span>
                        <span className="font-mono truncate">{endpoint.path}</span>
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}

            {/* Errors */}
            <button
              onClick={() => handleClick("errors")}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left",
                activeSection === "errors"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              Erros
            </button>
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
}
