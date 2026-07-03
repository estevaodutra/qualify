import { useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { LocalNode, LocalConnection, NodeCategory } from "./shared-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  ArrowLeft, Save, Play, Pause, Trash2, ZoomIn, ZoomOut, Maximize, 
  Plus, Loader2, Info, GitBranch, Settings2, Info as HelpIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface UnifiedSequenceBuilderProps {
  sequenceName: string;
  isActive: boolean;
  sequenceId: string;
  nodeCategories: NodeCategory[];
  getDefaultConfig: (nodeType: string) => Record<string, unknown>;
  getNodePreview?: (node: LocalNode) => string;
  renderTrigger: () => ReactNode;
  renderConfigPanel: (
    node: LocalNode, 
    onUpdate: (config: Record<string, unknown>) => void, 
    onClose: () => void, 
    onManualSend?: () => void, 
    isSendingManual?: boolean
  ) => ReactNode;
  onSave: (
    name: string, 
    nodes: LocalNode[], 
    connections: { sourceNodeId: string; targetNodeId: string; conditionPath?: string }[]
  ) => Promise<void>;
  onToggleActive: () => Promise<void>;
  onManualSendNode?: (node: LocalNode) => Promise<void>;
  onBack: () => void;
  initialNodes: LocalNode[];
  initialConnections: LocalConnection[];
  isSaving: boolean;
}

export function UnifiedSequenceBuilder({
  sequenceName: initialName,
  isActive,
  sequenceId,
  nodeCategories,
  getDefaultConfig,
  renderTrigger,
  renderConfigPanel,
  onSave,
  onToggleActive,
  onManualSendNode,
  onBack,
  initialNodes,
  initialConnections,
  isSaving,
}: UnifiedSequenceBuilderProps) {
  const { toast } = useToast();
  const [localNodes, setLocalNodes] = useState<LocalNode[]>([]);
  const [localConnections, setLocalConnections] = useState<LocalConnection[]>([]);
  const [sequenceName, setSequenceName] = useState(initialName);
  
  // Canvas State (Pan & Zoom)
  const [panOffset, setPanOffset] = useState({ x: 80, y: 80 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Dragging nodes
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 });
  
  // Active Connection line state
  const [activePort, setActivePort] = useState<{
    nodeId: string;
    portType: "in" | "out";
    conditionPath?: string;
    x: number;
    y: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Dialog & configuration states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isSendingManual, setIsSendingManual] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize and auto-position if nodes lack coordinates
  useEffect(() => {
    // Ensure we always have a trigger node as the entrypoint
    const hasTrigger = initialNodes.some(node => node.nodeType === "trigger");
    let preparedNodes = [...initialNodes];
    
    if (!hasTrigger) {
      preparedNodes.unshift({
        id: "trigger",
        nodeType: "trigger",
        nodeOrder: 0,
        positionX: 50,
        positionY: 150,
        config: { label: "Início", content: "O gatilho é responsável por acionar a automação." }
      });
    }

    const positionedNodes = preparedNodes.map((node, index) => {
      const hasPos = (node as any).positionX !== undefined && (node as any).positionY !== undefined && ((node as any).positionX !== 0 || (node as any).positionY !== 0);
      return {
        ...node,
        positionX: hasPos ? (node as any).positionX : (node.nodeType === "trigger" ? 50 : 320 + (index - 1) * 260),
        positionY: hasPos ? (node as any).positionY : (node.nodeType === "trigger" ? 150 : 150),
      };
    });
    setLocalNodes(positionedNodes);
    
    // Auto-connect trigger to first step if no connections exist
    if (initialConnections.length === 0 && positionedNodes.length > 1) {
      const autoConns: LocalConnection[] = [];
      for (let i = 0; i < positionedNodes.length - 1; i++) {
        autoConns.push({
          sourceNodeId: positionedNodes[i].id,
          targetNodeId: positionedNodes[i + 1].id,
        });
      }
      setLocalConnections(autoConns);
    } else {
      setLocalConnections(initialConnections);
    }
  }, [initialNodes, initialConnections]);

  // Debounced Autosave
  const triggerAutosave = useCallback((nodesToSave: LocalNode[], connsToSave: LocalConnection[], nameToSave: string) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
      try {
        await onSave(nameToSave, nodesToSave, connsToSave);
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } catch {
        setAutoSaveStatus("idle");
      }
    }, 1500);
  }, [onSave]);

  const updateNodesAndSave = (updater: (prev: LocalNode[]) => LocalNode[]) => {
    setLocalNodes(prev => {
      const next = updater(prev);
      triggerAutosave(next, localConnections, sequenceName);
      return next;
    });
  };

  const updateConnectionsAndSave = (updater: (prev: LocalConnection[]) => LocalConnection[]) => {
    setLocalConnections(prev => {
      const next = updater(prev);
      triggerAutosave(localNodes, next, sequenceName);
      return next;
    });
  };

  const allNodeTypes = nodeCategories.flatMap(cat => cat.nodes);
  const getNodeInfo = (type: string) => {
    if (type === "trigger") {
      return { type: "trigger", label: "Inicio", icon: Play, color: "bg-emerald-500" };
    }
    return allNodeTypes.find(n => n.type === type) || allNodeTypes[0];
  };

  const generateNodeId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Canvas Panning Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("canvas-grid")) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else if (draggedNodeId) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = (e.clientX - rect.left - panOffset.x) / zoom - nodeDragOffset.x;
      const y = (e.clientY - rect.top - panOffset.y) / zoom - nodeDragOffset.y;
      
      setLocalNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, positionX: Math.round(x), positionY: Math.round(y) } : n));
    } else if (activePort) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - panOffset.x) / zoom;
      const y = (e.clientY - rect.top - panOffset.y) / zoom;
      setMousePos({ x, y });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    if (draggedNodeId) {
      setDraggedNodeId(null);
      triggerAutosave(localNodes, localConnections, sequenceName);
    }
    setActivePort(null);
  };

  // Node drag start
  const handleNodeMouseDown = (e: React.MouseEvent, node: LocalNode) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest(".h-3.5")) return;
    
    e.stopPropagation();
    setDraggedNodeId(node.id);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const nodeX = node.positionX || 0;
    const nodeY = node.positionY || 0;
    
    const mouseCanvasX = (e.clientX - rect.left - panOffset.x) / zoom;
    const mouseCanvasY = (e.clientY - rect.top - panOffset.y) / zoom;
    
    setNodeDragOffset({
      x: mouseCanvasX - nodeX,
      y: mouseCanvasY - nodeY
    });
  };

  // Add Node from Palette
  const handleAddNode = (type: string) => {
    const id = generateNodeId();
    const config = getDefaultConfig(type);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    const canvasCenterX = rect ? (rect.width / 2 - panOffset.x) / zoom : 300;
    const canvasCenterY = rect ? (rect.height / 2 - panOffset.y) / zoom : 150;

    const newNode: LocalNode = {
      id,
      nodeType: type,
      nodeOrder: localNodes.length,
      config,
      positionX: Math.round(canvasCenterX + (Math.random() - 0.5) * 50),
      positionY: Math.round(canvasCenterY + (Math.random() - 0.5) * 50),
    };

    updateNodesAndSave(prev => [...prev, newNode]);
    setSelectedNodeId(id);
    toast({ title: "Bloco adicionado", description: "Posicione o bloco e puxe os cabos para conectar." });
  };

  // Delete Node
  const handleDeleteNode = (id: string) => {
    if (id === "trigger") {
      toast({ title: "Ação não permitida", description: "O bloco de início não pode ser removido.", variant: "destructive" });
      return;
    }
    updateNodesAndSave(prev => prev.filter(n => n.id !== id));
    updateConnectionsAndSave(prev => prev.filter(c => c.sourceNodeId !== id && c.targetNodeId !== id));
    setSelectedNodeId(null);
  };

  // Port mouse handlers (connecting nodes)
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portType: "in" | "out", conditionPath?: string) => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;
    
    setActivePort({ nodeId, portType, conditionPath, x, y });
    setMousePos({ x, y });
  };

  const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, portType: "in" | "out") => {
    e.stopPropagation();
    if (!activePort) return;
    
    // Connect output to input
    if (activePort.portType === "out" && portType === "in" && activePort.nodeId !== nodeId) {
      const exists = localConnections.some(c => c.sourceNodeId === activePort.nodeId && c.targetNodeId === nodeId && c.conditionPath === activePort.conditionPath);
      
      if (!exists) {
        updateConnectionsAndSave(prev => [
          ...prev, 
          { 
            sourceNodeId: activePort.nodeId, 
            targetNodeId: nodeId,
            conditionPath: activePort.conditionPath
          }
        ]);
        toast({ title: "Conexão criada" });
      }
    }
    setActivePort(null);
  };

  const handleDeleteConnection = (sourceNodeId: string, targetNodeId: string, conditionPath?: string) => {
    updateConnectionsAndSave(prev => prev.filter(c => !(c.sourceNodeId === sourceNodeId && c.targetNodeId === targetNodeId && c.conditionPath === conditionPath)));
    toast({ title: "Conexão removida" });
  };

  // Zoom management
  const handleZoom = (factor: number) => {
    setZoom(prev => Math.min(Math.max(prev + factor, 0.4), 1.8));
  };
  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 80, y: 80 });
  };

  // Save Name change
  const handleSaveAll = async () => {
    try {
      await onSave(sequenceName, localNodes, localConnections);
      toast({ title: "Workflow salvo com sucesso!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  // Draw Bezier Curves between nodes
  const drawBezier = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  const selectedNode = localNodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-[#F8F9FC] gap-5">
      
      {/* Header bar */}
      <div className="flex justify-between items-center bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col gap-0.5">
            <Input 
              value={sequenceName} 
              onChange={e => { setSequenceName(e.target.value); triggerAutosave(localNodes, localConnections, e.target.value); }}
              className="font-bold text-base h-8 border-transparent focus-visible:border-slate-200 focus-visible:ring-0 p-0 w-64 shadow-none bg-transparent hover:bg-slate-50 rounded-lg px-2"
            />
            <div className="flex items-center gap-2 px-2">
              <span className="text-[10px] text-slate-400 font-mono">Workflow ID: {sequenceId}</span>
              {autoSaveStatus === "saving" && <span className="text-[10px] text-amber-500 font-semibold animate-pulse">Autosalvando...</span>}
              {autoSaveStatus === "saved" && <span className="text-[10px] text-emerald-500 font-semibold">Salvo</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onToggleActive} className="rounded-xl border-slate-200 hover:bg-slate-50 gap-2 h-9 px-4 font-semibold text-slate-700">
            {isActive ? <Pause className="h-4 w-4 text-amber-500" /> : <Play className="h-4 w-4 text-emerald-500" />}
            {isActive ? "Pausar" : "Ativar"}
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving} className="bg-[#8A3CFF] hover:bg-[#7830E3] text-white rounded-xl gap-2 h-9 px-5 font-semibold">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Canvas Layout */}
      <div className="flex-1 flex gap-4 h-[calc(100vh-280px)] min-h-[480px] overflow-hidden">
        
        {/* Palette (Menu Lateral de Blocos) */}
        <Card className="w-56 shrink-0 flex flex-col border-slate-200/60 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-[#8A3CFF]" />
              Blocos Básicos
            </h4>
          </div>
          <div className="p-3 space-y-4 overflow-y-auto flex-1">
            {nodeCategories.map(category => (
              <div key={category.id} className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">{category.label}</span>
                <div className="space-y-1">
                  {category.nodes.map(node => {
                    const NodeIcon = node.icon;
                    return (
                      <button
                        key={node.type}
                        onClick={() => handleAddNode(node.type)}
                        className="flex items-center gap-2.5 w-full p-2 text-left rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-200 transition-all cursor-pointer group"
                      >
                        <div className={cn("p-1.5 rounded-lg text-white shrink-0 group-hover:scale-105 transition-transform", node.color)}>
                          <NodeIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{node.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Builder Canvas Area */}
        <div className="flex-1 border border-slate-200/60 bg-[#F5F6FA] rounded-2xl overflow-hidden relative shadow-inner flex flex-col">
          
          {/* Canvas Toolbar (Zoom & Controls) */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-white p-1 border border-slate-200/80 rounded-xl shadow-sm">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-slate-50" onClick={() => handleZoom(0.1)} title="Aproximar">
              <ZoomIn className="h-3.5 w-3.5 text-slate-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-slate-50" onClick={() => handleZoom(-0.1)} title="Afastar">
              <ZoomOut className="h-3.5 w-3.5 text-slate-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-slate-50" onClick={handleResetZoom} title="Resetar Visualização">
              <Maximize className="h-3.5 w-3.5 text-slate-500" />
            </Button>
            <div className="h-3.5 w-[1px] bg-slate-200 mx-1" />
            <span className="text-[10px] font-mono text-slate-500 pr-2 font-bold">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200/80 rounded-xl shadow-sm">
            <HelpIcon className="h-3.5 w-3.5 text-[#8A3CFF]" />
            <span className="text-[10px] font-bold text-slate-500">Arraste e conecte os blocos de esquerda para a direita.</span>
          </div>

          {/* Interactive Canvas Wrapper */}
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={cn("flex-1 relative overflow-hidden select-none", isPanning ? "cursor-grabbing" : "cursor-grab")}
            style={{
              backgroundColor: "#F8F9FC",
              backgroundImage: "radial-gradient(#CBD5E1 1.5px, transparent 0)",
              backgroundSize: "24px 24px",
              backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
            }}
          >
            {/* Transform Canvas Content */}
            <div
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
                position: "absolute",
                width: "100%",
                height: "100%",
                pointerEvents: "none"
              }}
            >
              {/* SVG Connections Container */}
              <svg className="absolute overflow-visible top-0 left-0 w-full h-full pointer-events-auto">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#8A3CFF" />
                  </marker>
                </defs>

                {/* Draw saved connections */}
                {localConnections.map((conn, idx) => {
                  const srcNode = localNodes.find(n => n.id === conn.sourceNodeId);
                  const tgtNode = localNodes.find(n => n.id === conn.targetNodeId);
                  if (!srcNode || !tgtNode) return null;

                  const sX = (srcNode as any).positionX || 0;
                  const sY = (srcNode as any).positionY || 0;
                  const tX = (tgtNode as any).positionX || 0;
                  const tY = (tgtNode as any).positionY || 0;

                  // Output port on the right side of the card
                  const portX1 = sX + 220;
                  let portY1 = sY + 45;
                  if (conn.conditionPath === "yes") portY1 = sY + 35;
                  if (conn.conditionPath === "no") portY1 = sY + 65;

                  // Input port on the left side of target
                  const portX2 = tX;
                  const portY2 = tY + 45;

                  const d = drawBezier(portX1, portY1, portX2, portY2);
                  const midX = (portX1 + portX2) / 2;
                  const midY = (portY1 + portY2) / 2;

                  return (
                    <g key={`${conn.sourceNodeId}-${conn.targetNodeId}-${idx}`} className="group">
                      <path
                        d={d}
                        fill="none"
                        stroke="#8A3CFF"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        markerEnd="url(#arrow)"
                        className="hover:stroke-sky-400 hover:stroke-[3px] cursor-pointer transition-all duration-300 animate-[dash_15s_linear_infinite]"
                      />
                      <circle
                        cx={midX}
                        cy={midY}
                        r="8"
                        fill="#ef4444"
                        className="opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConnection(conn.sourceNodeId, conn.targetNodeId, conn.conditionPath || undefined);
                        }}
                      />
                      <path
                        d={`M ${midX - 3} ${midY - 3} L ${midX + 3} ${midY + 3} M ${midX + 3} ${midY - 3} L ${midX - 3} ${midY + 3}`}
                        stroke="white"
                        strokeWidth="1.5"
                        className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200"
                      />
                    </g>
                  );
                })}

                {/* Active dragging connection line */}
                {activePort && (
                  <path
                    d={drawBezier(activePort.x, activePort.y, mousePos.x, mousePos.y)}
                    fill="none"
                    stroke="#8A3CFF"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    pointerEvents="none"
                  />
                )}
              </svg>

              {/* Render Workflow Nodes (Cards) */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                {localNodes.map(node => {
                  const nodeInfo = getNodeInfo(node.nodeType);
                  const NodeIcon = nodeInfo.icon;
                  const isSelected = selectedNodeId === node.id;
                  
                  const posX = (node as any).positionX || 0;
                  const posY = (node as any).positionY || 0;

                  const isCondition = node.nodeType === "condition";
                  const isTrigger = node.nodeType === "trigger";

                  return (
                    <div
                      key={node.id}
                      style={{
                        position: "absolute",
                        left: posX,
                        top: posY,
                        width: 220,
                        pointerEvents: "auto"
                      }}
                      onMouseDown={(e) => handleNodeMouseDown(e, node)}
                      className={cn(
                        "rounded-xl border border-slate-200 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col p-3 transition-all cursor-grab active:cursor-grabbing",
                        isSelected && "border-[#8A3CFF] ring-2 ring-[#8A3CFF]/10"
                      )}
                    >
                      {/* Node Connection Ports */}
                      {/* Input Port (Left Handle) - Excluded for trigger node */}
                      {!isTrigger && (
                        <div
                          onMouseUp={(e) => handlePortMouseUp(e, node.id, "in")}
                          className="absolute -left-1.5 top-[38px] h-3.5 w-3.5 rounded-full border-2 border-slate-300 bg-white hover:bg-[#8A3CFF] cursor-crosshair z-25 flex items-center justify-center transition-colors shadow-sm"
                          title="Entrada do fluxo"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 hover:bg-white" />
                        </div>
                      )}

                      {/* Output Port(s) (Right Handles) */}
                      {!isCondition ? (
                        <div
                          onMouseDown={(e) => handlePortMouseDown(e, node.id, "out")}
                          className="absolute -right-1.5 top-[38px] h-3.5 w-3.5 rounded-full border-2 border-[#8A3CFF] bg-background hover:bg-[#8A3CFF] cursor-crosshair z-25 flex items-center justify-center transition-colors shadow-sm"
                          title="Saída do fluxo"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-[#8A3CFF]" />
                        </div>
                      ) : (
                        <>
                          {/* "Sim" (True) output handle */}
                          <div
                            onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", "yes")}
                            className="absolute -right-1.5 top-[28px] h-3.5 w-3.5 rounded-full border-2 border-emerald-500 bg-background hover:bg-emerald-500 cursor-crosshair z-25 flex items-center justify-center transition-colors shadow-sm"
                            title="Verdadeiro (Sim)"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          </div>
                          <span className="absolute right-2 top-[24px] text-[8px] font-bold text-emerald-500 select-none">Sim</span>

                          {/* "Não" (False) output handle */}
                          <div
                            onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", "no")}
                            className="absolute -right-1.5 top-[58px] h-3.5 w-3.5 rounded-full border-2 border-destructive bg-background hover:bg-destructive cursor-crosshair z-25 flex items-center justify-center transition-colors shadow-sm"
                            title="Falso (Não)"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                          </div>
                          <span className="absolute right-2 top-[54px] text-[8px] font-bold text-destructive select-none">Não</span>
                        </>
                      )}

                      {/* Header/Title */}
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <div className={cn("p-1.5 rounded-lg text-white shrink-0 shadow-sm", nodeInfo.color)}>
                          <NodeIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-slate-800 truncate">
                            {isTrigger ? "Inicio" : ((node.config.label as string) || nodeInfo.label)}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{isTrigger ? "Gatilho" : nodeInfo.label}</p>
                        </div>
                      </div>

                      {/* Card Content / Description */}
                      <div className="pt-2 text-[10px] text-slate-500 font-medium line-clamp-2 min-h-[30px]">
                        {isTrigger ? "O gatilho é responsável por acionar a automação." : (
                          node.config.content ? (node.config.content as string) : 
                          node.config.question ? (node.config.question as string) :
                          node.config.url ? (node.config.url as string) :
                          node.config.seconds || node.config.minutes || node.config.hours || node.config.days ? 
                          `Aguardar ${node.config.days || 0}d ${node.config.hours || 0}h ${node.config.minutes || 0}m` :
                          "Clique para configurar o bloco..."
                        )}
                      </div>

                      {/* Mock Stats (DataCray aesthetic) */}
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400/80 border-t border-slate-100 pt-2 mt-2 select-none">
                        <span className="flex items-center gap-0.5">🟢 0</span>
                        <span className="flex items-center gap-0.5">🟡 0</span>
                        <span className="flex items-center gap-0.5">🔴 0</span>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
                        <span className="text-[8px] font-bold text-slate-400/60 font-mono">NODE #{node.nodeOrder + 1}</span>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 rounded hover:bg-slate-100 text-slate-500" 
                            title="Editar Configuração"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (isTrigger) {
                                setShowTriggerDialog(true);
                              } else {
                                setSelectedNodeId(node.id); 
                              }
                            }}
                          >
                            <Settings2 className="h-3 w-3" />
                          </Button>
                          {!isTrigger && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 rounded text-destructive hover:bg-destructive/10" 
                              title="Excluir"
                              onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Trigger selection/config Dialog */}
      <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl bg-white border border-slate-200/60 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Configuração do Gatilho (Início)</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {renderTrigger ? renderTrigger() : (
              <p className="text-sm text-slate-500">Este fluxo de automação é acionado conforme a entrada na campanha.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTriggerDialog(false)} className="bg-[#8A3CFF] hover:bg-[#7830E3] text-white rounded-xl h-9 px-5">
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Panel Dialog */}
      {selectedNode && renderConfigPanel(
        selectedNode,
        (config) => {
          updateNodesAndSave(prev => prev.map(n => n.id === selectedNode.id ? { ...n, config } : n));
        },
        () => setSelectedNodeId(null),
        onManualSendNode ? async () => {
          setIsSendingManual(true);
          try {
            await onManualSendNode(selectedNode);
          } finally {
            setIsSendingManual(false);
          }
        } : undefined,
        isSendingManual
      )}
    </div>
  );
}
