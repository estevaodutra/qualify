import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NodeJsonViewer } from "./NodeJsonViewer";
import { NodeTableViewer } from "./NodeTableViewer";
import { NodeSchemaViewer } from "./NodeSchemaViewer";
import { Code, Database, ListCollapse, Play, Edit2, Check } from "lucide-react";
import { toast } from "sonner";

interface NodeInputPanelProps {
  inputData: any;
  onRunPrevious: () => void;
  mockData: any;
  onMockDataChange: (data: any) => void;
}

export function NodeInputPanel({ inputData, onRunPrevious, mockData, onMockDataChange }: NodeInputPanelProps) {
  const [activeTab, setActiveTab] = useState<"json" | "table" | "schema" | "mock">("json");
  const [mockInputText, setMockInputText] = useState(JSON.stringify(mockData || {}, null, 2));
  const [isEditingMock, setIsEditingMock] = useState(false);

  const handleSaveMock = () => {
    try {
      const parsed = JSON.parse(mockInputText);
      onMockDataChange(parsed);
      setIsEditingMock(false);
      toast.success("Dados de teste atualizados!");
    } catch (e) {
      toast.error("JSON inválido. Por favor, verifique a sintaxe.");
    }
  };

  const displayData = inputData || (Object.keys(mockData || {}).length > 0 ? mockData : null);

  return (
    <div className="flex-1 flex flex-col min-h-0 border rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Database className="h-4 w-4 text-[#8A3CFF]" /> Entrada (Input)
        </h3>
        
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-auto">
          <TabsList className="h-7 p-0.5 rounded-lg bg-slate-100/80 border">
            <TabsTrigger value="json" className="h-6 text-[10px] rounded-md px-2.5">JSON</TabsTrigger>
            <TabsTrigger value="table" className="h-6 text-[10px] rounded-md px-2.5">Tabela</TabsTrigger>
            <TabsTrigger value="schema" className="h-6 text-[10px] rounded-md px-2.5">Schema</TabsTrigger>
            <TabsTrigger value="mock" className="h-6 text-[10px] rounded-md px-2.5">Test Mock</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col justify-stretch">
        {!displayData && activeTab !== "mock" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-dashed rounded-xl gap-3">
            <Database className="h-8 w-8 text-slate-300 stroke-[1.5]" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">Nenhum input disponível</p>
              <p className="text-[10px] text-muted-foreground max-w-[200px] leading-normal mx-auto">
                Execute os nodes anteriores ou defina dados mockados para popular esta entrada.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 w-full max-w-[180px]">
              <Button type="button" size="sm" onClick={onRunPrevious} className="text-xs rounded-xl h-8">
                <Play className="h-3 w-3 mr-1" /> Executar anteriores
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveTab("mock")} 
                className="text-xs rounded-xl h-8 border-slate-200"
              >
                Definir mock data
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {activeTab === "json" && <NodeJsonViewer data={displayData} />}
            {activeTab === "table" && <NodeTableViewer data={displayData} />}
            {activeTab === "schema" && <NodeSchemaViewer data={displayData} />}
            {activeTab === "mock" && (
              <div className="flex-1 flex flex-col gap-2 min-h-0">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payload de Mock (Webhook)</Label>
                  {isEditingMock ? (
                    <Button type="button" size="sm" onClick={handleSaveMock} className="h-7 text-[10px] px-2.5 rounded-lg">
                      <Check className="h-3 w-3 mr-1" /> Salvar Mock
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingMock(true)} className="h-7 text-[10px] px-2.5 rounded-lg border-slate-200">
                      <Edit2 className="h-3 w-3 mr-1" /> Editar
                    </Button>
                  )}
                </div>
                <div className="flex-1 min-h-0">
                  <Textarea
                    disabled={!isEditingMock}
                    value={mockInputText}
                    onChange={(e) => setMockInputText(e.target.value)}
                    className="font-mono text-[10px] h-full min-h-[300px] bg-slate-50 rounded-xl leading-normal resize-none focus-visible:ring-1"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
