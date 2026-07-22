import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuizFunnel } from "@/hooks/useQuizFunnels";
import { QuizStep } from "@/hooks/useQuizSteps";
import { QuizComponent } from "@/hooks/useQuizComponents";
import { QuizLeadsTable } from "./QuizLeadsTable";
import { QuizPerformanceTab } from "./QuizPerformanceTab";
import { QuizResultsTab } from "./QuizResultsTab";
import { useQuizLeads } from "@/hooks/quiz/useQuizLeads";
import { useQuizRealtimeLeads } from "@/hooks/quiz/useQuizRealtimeLeads";

interface Props {
  funnel: QuizFunnel;
  steps: QuizStep[];
  components: QuizComponent[];
}

export function QuizLeadsPage({ funnel, steps, components }: Props) {
  const [activeSubTab, setActiveSubTab] = useState("respostas");

  // Filters state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [utmSource, setUtmSource] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const pageSize = 20;

  // Realtime subscription (will invalidate React Query queries on update)
  useQuizRealtimeLeads(funnel.id, true);

  const { data, isLoading } = useQuizLeads({
    funnelId: funnel.id,
    page,
    pageSize,
    search,
    status,
    dateRange,
    utmSource,
    utmCampaign,
    deviceType
  });

  const leads = data?.leads || [];
  const totalCount = data?.totalCount || 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 p-6 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between border-b pb-2 shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Métricas & Leads</h2>
          <p className="text-xs text-slate-500">Rastreie e analise sessões, cliques e conversões de leads.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Ao Vivo
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="flex-1 flex flex-col min-h-0 space-y-4">
        <div className="shrink-0">
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="respostas" className="rounded-lg px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Respostas ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="resultados" className="rounded-lg px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Resultados
            </TabsTrigger>
            <TabsTrigger value="performance" className="rounded-lg px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Performance
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0">
          <TabsContent value="respostas" className="h-full m-0 outline-none">
            <QuizLeadsTable
              funnel={funnel}
              steps={steps}
              components={components}
              leads={leads}
              totalCount={totalCount}
              isLoading={isLoading}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              search={search}
              onSearchChange={setSearch}
              status={status}
              onStatusChange={setStatus}
              utmSource={utmSource}
              onUtmSourceChange={setUtmSource}
              utmCampaign={utmCampaign}
              onUtmCampaignChange={setUtmCampaign}
              deviceType={deviceType}
              onDeviceTypeChange={setDeviceType}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </TabsContent>

          <TabsContent value="resultados" className="h-full m-0 outline-none">
            <QuizResultsTab funnel={funnel} steps={steps} components={components} leads={leads} />
          </TabsContent>

          <TabsContent value="performance" className="h-full m-0 outline-none">
            <QuizPerformanceTab funnel={funnel} steps={steps} components={components} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
