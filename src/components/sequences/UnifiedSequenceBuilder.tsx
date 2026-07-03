import { useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { LocalNode, LocalConnection, NodeCategory, NodeTypeInfo } from "./shared-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Save, Play, Pause, Trash2, HelpCircle, ZoomIn, ZoomOut, Maximize, 
  Plus, Check, Loader2, Info, GitBranch, ArrowRight, Eye, RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  onSave: (name: string, nodes: LocalNode[], connections: LocalConnection[]) => Promise<void>;
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
  const [panOffset, setPanOffset] = useState({ x: 100, y: 50 });
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

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isSendingManual, setIsSendingManual] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize and auto-position if nodes lack coordinates
  useEffect(() => {
    if (initialNodes.length > 0) {
      const positionedNodes = initialNodes.map((node, index) => {
        const hasPos = (node as any).positionX !== undefined && (node as any).positionY !== undefined && ((node as any).positionX !== 0 || (node as any).positionY !== 0);
        return {
          ...node,
          positionX: hasPos ? (node as any).positionX : 300,
          positionY: hasPos ? (node as any).positionY : 50 + index * 180,
        };
      });
      setLocalNodes(positionedNodes);
      
      // Auto-connect sequential nodes for legacy sequences without connections
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
  const getNodeInfo = (type: string) => allNodeTypes.find(n => n.type === type) || allNodeTypes[0];

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
      
      // Calculate mouse position inside canvas considering zoom and pan
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
    if (isPanning) {
      setIsPanning(false);
    } else if (draggedNodeId) {
      setDraggedNodeId(null);
      triggerAutosave(localNodes, localConnections, sequenceName);
    } else if (activePort) {
      setActivePort(null);
    }
  };

  // Node Drag Handlers
  const handleNodeMouseDown = (e: React.MouseEvent, node: LocalNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggedNodeId(node.id);
    
    // Drag start relative to node top-left
    const nodeX = (node as any).positionX || 0;
    const nodeY = (node as any).positionY || 0;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseCanvasX = (e.clientX - rect.left - panOffset.x) / zoom;
    const mouseCanvasY = (e.clientY - rect.top - panOffset.y) / zoom;
    
    setNodeDragOffset({
      x: mouseCanvasX - nodeX,
      y: mouseCanvasY - nodeY
    });
  };

  // Adding nodes from palette or clicking Add
  const handleAddNode = (nodeType: string) => {
    const newNode: LocalNode = {
      id: generateNodeId(),
      nodeType,
      nodeOrder: localNodes.length,
      config: getDefaultConfig(nodeType),
      positionX: -panOffset.x / zoom + 300 + (Math.random() - 0.5) * 50,
      positionY: -panOffset.y / zoom + 200 + (Math.random() - 0.5) * 50
    } as any;
    
    updateNodesAndSave(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const handleDeleteNode = (nodeId: string) => {
    updateNodesAndSave(prev => prev.filter(n => n.id !== nodeId));
    updateConnectionsAndSave(prev => prev.filter(c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleDuplicateNode = (nodeId: string) => {
    const node = localNodes.find(n => n.id === nodeId);
    if (!node) return;
    const newNode: LocalNode = {
      id: generateNodeId(),
      nodeType: node.nodeType,
      nodeOrder: localNodes.length,
      config: JSON.parse(JSON.stringify(node.config)),
      positionX: ((node as any).positionX || 0) + 40,
      positionY: ((node as any).positionY || 0) + 40
    } as any;

    updateNodesAndSave(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  // Port connection logic
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portType: "in" | "out", conditionPath?: string) => {
    e.stopPropagation();
    const node = localNodes.find(n => n.id === nodeId);
    if (!node) return;

    const nX = (node as any).positionX || 0;
    const nY = (node as any).positionY || 0;

    // Approximated coordinate of ports based on card height/width
    const pX = portType === "out" ? nX + 220 : nX;
    let pY = nY + 45;
    if (conditionPath === "yes") pY = nY + 35;
    if (conditionPath === "no") pY = nY + 65;

    setActivePort({
      nodeId,
      portType,
      conditionPath,
      x: pX,
      y: pY
    });
    setMousePos({ x: pX, y: pY });
  };

  const handlePortMouseUp = (e: React.MouseEvent, targetNodeId: string, portType: "in" | "out") => {
    e.stopPropagation();
    if (activePort && activePort.nodeId !== targetNodeId && portType === "in" && activePort.portType === "out") {
      // Check if connection already exists
      const exists = localConnections.some(c => 
        c.sourceNodeId === activePort.nodeId && 
        c.targetNodeId === targetNodeId && 
        c.conditionPath === activePort.conditionPath
      );

      if (!exists) {
        const newConn: LocalConnection = {
          sourceNodeId: activePort.nodeId,
          targetNodeId,
          conditionPath: activePort.conditionPath
        };
        updateConnectionsAndSave(prev => [...prev, newConn]);
      }
    }
    setActivePort(null);
  };

  const handleDeleteConnection = (sourceId: string, targetId: string, cond?: string) => {
    updateConnectionsAndSave(prev => prev.filter(c => 
      !(c.sourceNodeId === sourceId && c.targetNodeId === targetId && c.conditionPath === cond)
    ));
  };

  const handleSaveAll = async () => {
    await onSave(sequenceName, localNodes, localConnections);
    toast({ title: "Workflow salvo com sucesso!" });
  };

  // Zoom controls
  const handleZoom = (amount: number) => {
    setZoom(prev => Math.min(Math.max(prev + amount, 0.4), 1.8));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 100, y: 50 });
  };

  const selectedNode = localNodes.find(n => n.id === selectedNodeId);

  // SVG Line helper drawing smooth Bezier curves
  const drawBezier = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/20 pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl border border-border/40 hover:bg-muted/30">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
          <div className="flex flex-col gap-0.5">
            <Input
              value={sequenceName}
              onChange={e => {
                setSequenceName(e.target.value);
                triggerAutosave(localNodes, localConnections, e.target.value);
              }}
              className="text-lg font-bold w-64 h-8 bg-transparent border-none focus-visible:ring-0 p-0"
            />
            <span className="text-[10px] text-muted-foreground">Workflow ID: {sequenceId}</span>
          </div>
          <Badge variant={isActive ? "default" : "secondary"} className="rounded-full px-2.5 py-0.5 font-semibold text-[10px]">
            {isActive ? "Ativo" : "Inativo"}
          </Badge>
          
          {autoSaveStatus === "saving" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8A3CFF]" />
              Salvando alterações...
            </div>
          )}
          {autoSaveStatus === "saved" && (
            <div className="flex items-center gap-1 text-xs text-emerald-500 font-semibold">
              <Check className="h-3.5 w-3.5" />
              Workflow salvo
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onToggleActive} className="rounded-xl border-border/40 gap-2 h-9 px-4 font-semibold cursor-pointer">
            {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isActive ? "Pausar" : "Ativar"}
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving} className="bg-[#8A3CFF] hover:bg-[#7830E3] text-white rounded-xl gap-2 h-9 px-5 font-semibold cursor-pointer">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Trigger selection/config */}
      {renderTrigger()}

      {/* Canvas Layout */}
      <div className="flex-1 flex gap-4 h-[calc(100vh-280px)] min-h-[450px] overflow-hidden">
        {/* Palette (Menu Lateral de Blocos) */}
        <Card className="w-56 shrink-0 flex flex-col border-white/20 bg-card/40 backdrop-blur-md rounded-2xl overflow-y-auto">
          <div className="p-4 border-b border-border/20">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-[#8A3CFF]" />
              Blocos Básicos
            </h4>
          </div>
          <div className="p-3 space-y-4">
            {nodeCategories.map(category => (
              <div key={category.id} className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground/60 px-1">{category.label}</span>
                <div className="space-y-1">
                  {category.nodes.map(node => {
                    const NodeIcon = node.icon;
                    return (
                      <button
                        key={node.type}
                        onClick={() => handleAddNode(node.type)}
                        className="flex items-center gap-2.5 w-full p-2 text-left rounded-xl border border-border/30 bg-background/30 hover:bg-[#8A3CFF]/10 hover:border-[#8A3CFF]/30 transition-all cursor-pointer group"
                      >
                        <div className={`p-1.5 rounded-lg ${node.color} text-white shrink-0 group-hover:scale-105 transition-transform`}>
                          <NodeIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-card-foreground">{node.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Builder Canvas Area */}
        <div className="flex-1 border border-white/20 bg-[#0E0E12] rounded-2xl overflow-hidden relative shadow-inner flex flex-col">
          {/* Canvas Toolbar (Zoom & Controls) */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-card/80 backdrop-blur-md p-1 border border-border/40 rounded-xl shadow-md">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleZoom(0.1)} title="Aproximar">
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleZoom(-0.1)} title="Afastar">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handleResetZoom} title="Resetar Visualização">
              <Maximize className="h-4 w-4 text-muted-foreground" />
            </Button>
            <div className="h-4 w-[1px] bg-border/40 mx-1" />
            <span className="text-[10px] font-mono text-muted-foreground pr-2">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-card/85 backdrop-blur-md px-3 py-1.5 border border-border/40 rounded-xl shadow-sm">
            <Info className="h-3.5 w-3.5 text-[#8A3CFF]" />
            <span className="text-[10px] font-semibold text-muted-foreground">Arraste e conecte os blocos de esquerda para a direita.</span>
          </div>

          {/* Interactive Canvas Wrapper */}
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`flex-1 relative overflow-hidden select-none ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
            style={{
              backgroundImage: "radial-gradient(#ffffff15 1px, transparent 0)",
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
                        strokeWidth="2.5"
                        markerEnd="url(#arrow)"
                        className="hover:stroke-sky-400 hover:stroke-[3.5px] cursor-pointer transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConnection(conn.sourceNodeId, conn.targetNodeId, conn.conditionPath || undefined);
                        }}
                      />
                      {/* Delete button indicator on path center */}
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
                    strokeWidth="2.5"
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
                        "rounded-xl border border-white/20 bg-card/85 backdrop-blur-xl shadow-lg flex flex-col p-3 transition-all cursor-grab active:cursor-grabbing",
                        isSelected && "border-[#8A3CFF] ring-2 ring-[#8A3CFF]/20"
                      )}
                    >
                      {/* Node Connection Ports */}
                      {/* Input Port (Left Handle) */}
                      <div
                        onMouseUp={(e) => handlePortMouseUp(e, node.id, "in")}
                        className="absolute -left-1.5 top-[38px] h-3.5 w-3.5 rounded-full border-2 border-border bg-background hover:bg-[#8A3CFF] cursor-crosshair z-25 flex items-center justify-center transition-colors"
                        title="Entrada do fluxo"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 hover:bg-white" />
                      </div>

                      {/* Output Port(s) (Right Handles) */}
                      {!isCondition ? (
                        <div
                          onMouseDown={(e) => handlePortMouseDown(e, node.id, "out")}
                          className="absolute -right-1.5 top-[38px] h-3.5 w-3.5 rounded-full border-2 border-[#8A3CFF] bg-background hover:bg-[#8A3CFF] cursor-crosshair z-25 flex items-center justify-center transition-colors"
                          title="Saída do fluxo"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-[#8A3CFF]" />
                        </div>
                      ) : (
                        <>
                          {/* "Sim" (True) output handle */}
                          <div
                            onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", "yes")}
                            className="absolute -right-1.5 top-[28px] h-3.5 w-3.5 rounded-full border-2 border-emerald-500 bg-background hover:bg-emerald-500 cursor-crosshair z-25 flex items-center justify-center transition-colors"
                            title="Verdadeiro (Sim)"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          </div>
                          <span className="absolute right-2 top-[24px] text-[8px] font-bold text-emerald-500 select-none">Sim</span>

                          {/* "Não" (False) output handle */}
                          <div
                            onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", "no")}
                            className="absolute -right-1.5 top-[58px] h-3.5 w-3.5 rounded-full border-2 border-destructive bg-background hover:bg-destructive cursor-crosshair z-25 flex items-center justify-center transition-colors"
                            title="Falso (Não)"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                          </div>
                          <span className="absolute right-2 top-[54px] text-[8px] font-bold text-destructive select-none">Não</span>
                        </>
                      )}

                      {/* Header/Title */}
                      <div className="flex items-center gap-2 border-b border-border/20 pb-2">
                        <div className={cn("p-1.5 rounded-lg text-white shrink-0", nodeInfo.color)}>
                          <NodeIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs text-card-foreground truncate">
                            {(node.config.label as string) || nodeInfo.label}
                          </p>
                          <p className="text-[9px] text-muted-foreground font-medium">{nodeInfo.label}</p>
                        </div>
                      </div>

                      {/* Card Content / Description */}
                      <div className="pt-2 text-[10px] text-muted-foreground line-clamp-2 min-h-[30px]">
                        {node.config.content ? (node.config.content as string) : 
                         node.config.question ? (node.config.question as string) :
                         node.config.url ? (node.config.url as string) :
                         node.config.seconds || node.config.minutes || node.config.hours || node.config.days ? 
                         `Aguardar ${node.config.days || 0}d ${node.config.hours || 0}h ${node.config.minutes || 0}m` :
                         "Configuração vazia..."}
                      </div>

                      {/* Card Actions Footer */}
                      <div className="flex items-center justify-between border-t border-border/20 pt-2 mt-2">
                        <span className="text-[8px] font-semibold text-muted-foreground/60">Order: {node.nodeOrder}</span>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 rounded hover:bg-muted/40" 
                            title="Editar Configuração"
                            onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                          >
                            <Settings2 className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 rounded text-destructive hover:bg-destructive/10" 
                            title="Excluir"
                            onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
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

// Inline custom settings icon
function Settings2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </svg>
  );
}
