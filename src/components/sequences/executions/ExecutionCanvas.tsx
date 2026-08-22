import { useRef, useState } from "react";
import { LocalNode, LocalConnection, NodeCategory, RandomizerBranch } from "../shared-types";
import { WorkflowExecution, WorkflowNodeExecution } from "@/hooks/useWorkflowExecutions";
import { ZoomIn, ZoomOut, Maximize, Play, CheckCircle2, XCircle, Loader2, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExecutionCanvasProps {
  nodes: LocalNode[];
  connections: LocalConnection[];
  nodeCategories: NodeCategory[];
  execution: WorkflowExecution;
  nodeExecutions: WorkflowNodeExecution[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

const drawBezier = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
};

const RANDOMIZER_PORT_BASE_Y = 28;
const RANDOMIZER_PORT_SPACING = 22;

function getSortedRandomizerBranches(node: LocalNode): RandomizerBranch[] {
  return ((node.config.branches as RandomizerBranch[] | undefined) || [])
    .slice()
    .sort((a, b) => a.position - b.position);
}

const STATUS_STYLES: Record<string, { border: string; ring: string; icon: typeof CheckCircle2; iconColor: string }> = {
  success: { border: "border-emerald-400", ring: "ring-emerald-400/20", icon: CheckCircle2, iconColor: "text-emerald-500" },
  error: { border: "border-destructive", ring: "ring-destructive/20", icon: XCircle, iconColor: "text-destructive" },
  running: { border: "border-amber-400", ring: "ring-amber-400/20", icon: Loader2, iconColor: "text-amber-500" },
  not_executed: { border: "border-slate-200", ring: "ring-transparent", icon: CircleDashed, iconColor: "text-slate-300" },
};

export function ExecutionCanvas({
  nodes, connections, nodeCategories, execution, nodeExecutions, selectedNodeId, onSelectNode,
}: ExecutionCanvasProps) {
  const [panOffset, setPanOffset] = useState({ x: 80, y: 80 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const allNodeTypes = nodeCategories.flatMap(cat => cat.nodes);
  const getNodeInfo = (type: string) => {
    if (type === "trigger") return { type: "trigger", label: "Inicio", icon: Play, color: "bg-emerald-500" };
    return allNodeTypes.find(n => n.type === type) || allNodeTypes[0];
  };

  const getNodeExec = (nodeId: string) => {
    const directMatch = nodeExecutions.find(e => e.nodeId === nodeId);
    if (directMatch) return directMatch;

    const targetNode = nodes.find(localN => localN.id === nodeId);
    if (!targetNode) return undefined;

    if (targetNode.nodeType === "trigger" || targetNode.nodeType === "start" || targetNode.nodeType === "inicio") {
      return nodeExecutions.find(e => e.nodeType === "trigger" || e.nodeType === "start" || e.nodeType === "inicio");
    }

    const sameTypeExecs = nodeExecutions.filter(e => e.nodeType === targetNode.nodeType);
    const sameTypeNodes = nodes.filter(n => n.nodeType === targetNode.nodeType);
    if (sameTypeExecs.length === 1 && sameTypeNodes.length === 1) {
      return sameTypeExecs[0];
    }

    const nodeIdx = sameTypeNodes.findIndex(n => n.id === nodeId);
    if (nodeIdx >= 0 && nodeIdx < sameTypeExecs.length) {
      return sameTypeExecs[nodeIdx];
    }

    return undefined;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("canvas-grid")) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };
  const handleMouseUp = () => setIsPanning(false);
  const handleZoom = (factor: number) => setZoom(prev => Math.min(Math.max(prev + factor, 0.4), 1.8));
  const handleResetZoom = () => { setZoom(1); setPanOffset({ x: 80, y: 80 }); };

  return (
    <div className="flex-1 border border-slate-200/60 bg-[#F5F6FA] rounded-2xl overflow-hidden relative shadow-inner flex flex-col">
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
        <span className="text-[10px] font-bold text-slate-500">Modo de Diagnóstico de Execução — clique nos blocos destacados para ver os dados salvos</span>
      </div>

      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={cn("flex-1 relative overflow-hidden select-none", isPanning ? "cursor-grabbing" : "cursor-grab")}
        style={{
          backgroundColor: "#F8F9FC",
          backgroundImage: "radial-gradient(#CBD5E1 1.5px, transparent 0)",
          backgroundSize: "24px 24px",
          backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
        }}
      >
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <svg className="absolute overflow-visible top-0 left-0 w-full h-full pointer-events-none">
            <defs>
              <marker id="exec-arrow-success" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
              </marker>
              <marker id="exec-arrow-error" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
              </marker>
              <marker id="exec-arrow-gray" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#cbd5e1" />
              </marker>
            </defs>

            {connections.map((conn, idx) => {
              const srcNode = nodes.find(n => n.id === conn.sourceNodeId);
              const tgtNode = nodes.find(n => n.id === conn.targetNodeId);
              if (!srcNode || !tgtNode) return null;

              const srcExec = getNodeExec(conn.sourceNodeId);
              const tgtExec = getNodeExec(conn.targetNodeId);

              let colorKey: "success" | "error" | "gray" = "gray";
              let isAnimating = false;

              if (srcExec) {
                const srcOutput = srcExec.output as { branch?: string } | null;
                const takenBranch = srcOutput?.branch;

                let isTakenPath = false;
                if (!conn.conditionPath) {
                  isTakenPath = true;
                } else if (takenBranch) {
                  if (takenBranch === conn.conditionPath) {
                    isTakenPath = true;
                  } else if (takenBranch === "fallback" && (conn.conditionPath === "no" || conn.conditionPath === "not_found" || conn.conditionPath === "not_matched" || conn.conditionPath === "fallback")) {
                    isTakenPath = true;
                  }
                }

                if (isTakenPath) {
                  colorKey = tgtExec && tgtExec.status === "error" ? "error" : "success";
                  isAnimating = execution.status === "running" && tgtExec?.status === "running";
                }
              }

              const strokeColor = colorKey === "success" ? "#10b981" : colorKey === "error" ? "#ef4444" : "#cbd5e1";

              const srcWidth = 320;

              const sX = srcNode.positionX || 0, sY = srcNode.positionY || 0;
              const tX = tgtNode.positionX || 0, tY = tgtNode.positionY || 0;
              const portX1 = sX + srcWidth;
              let portY1 = sY + 45;
              if (conn.conditionPath === "yes") portY1 = sY + 35;
              if (conn.conditionPath === "no") portY1 = sY + 65;
              if (srcNode.nodeType === "randomizer") {
                const branches = getSortedRandomizerBranches(srcNode);
                const idx = branches.findIndex(b => b.id === conn.conditionPath);
                if (idx >= 0) portY1 = sY + RANDOMIZER_PORT_BASE_Y + idx * RANDOMIZER_PORT_SPACING;
              }
              if (srcNode.nodeType === "phone_call") {
                const actions = srcNode.config.actions || [
                  { id: "success", label: "Sucesso", type: "success", color: "green", output: "success", requiresNote: false, finalizesCall: true, scheduleRetry: false },
                  { id: "no_success", label: "Sem Sucesso", type: "no_success", color: "red", output: "no_success", requiresNote: true, finalizesCall: true, scheduleRetry: false }
                ];
                const phoneCallOutputs = [
                  ...actions.map((act: any) => act.output || act.id),
                  "no_answer",
                  "attempts_exhausted",
                  "error"
                ];
                const idx = phoneCallOutputs.indexOf(conn.conditionPath || "");
                if (idx >= 0) portY1 = sY + 140 + idx * 70 + 29;
              }
              if (srcNode.nodeType === "ura") {
                const actions = srcNode.config.dtmf?.actions || [];
                const systemOutputs = ["no_digit", "no_answer", "busy", "failed", "attempts_exhausted", "error"];
                const allOutputs = [...actions.map((act: any) => act.id), ...systemOutputs];
                const idx = allOutputs.indexOf(conn.conditionPath || "");
                if (idx >= 0) portY1 = sY + 145 + idx * 66 + 27;
              }
              const portX2 = tX;
              const portY2 = tY + 45;
              const d = drawBezier(portX1, portY1, portX2, portY2);

              return (
                <path
                  key={`${conn.sourceNodeId}-${conn.targetNodeId}-${idx}`}
                  d={d}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={colorKey === "gray" ? "1.5" : "3"}
                  strokeDasharray={colorKey === "gray" ? "4 4" : undefined}
                  markerEnd={`url(#exec-arrow-${colorKey})`}
                  className={isAnimating ? "animate-pulse" : undefined}
                  style={{ opacity: colorKey === "gray" ? 0.4 : 1 }}
                />
              );
            })}
          </svg>

          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {nodes.map(node => {
              const nodeInfo = getNodeInfo(node.nodeType);
              const NodeIcon = nodeInfo.icon;
              const nodeExec = getNodeExec(node.id);
              const status = nodeExec?.status || "not_executed";
              const style = STATUS_STYLES[status] || STATUS_STYLES.not_executed;
              const StatusIcon = style.icon;
              const isSelected = selectedNodeId === node.id;
              const posX = node.positionX || 0;
              const posY = node.positionY || 0;

              const outputObj = nodeExec?.output as { branch?: string; result?: boolean } | null;
              const conditionResult = outputObj?.result;
              const branchTaken = outputObj?.branch;

              // Check if execution stopped at this node (executed but branch taken has no target connection)
              let hasDisconnectedBranch = false;
              if (nodeExec && (node.nodeType === "condition" || node.nodeType === "condicao")) {
                const outgoingConns = connections.filter(c => c.sourceNodeId === node.id);
                if (branchTaken) {
                  const matchingConn = outgoingConns.find(c => 
                    c.conditionPath === branchTaken || 
                    (branchTaken === "fallback" && (c.conditionPath === "no" || c.conditionPath === "not_found" || c.conditionPath === "not_matched" || c.conditionPath === "fallback"))
                  );
                  if (!matchingConn) {
                    hasDisconnectedBranch = true;
                  }
                }
              }

              return (
                <div
                  key={node.id}
                  style={{ position: "absolute", left: posX, top: posY, width: node.nodeType === "trigger" || node.nodeType === "content" || node.nodeType === "phone_call" || node.nodeType === "ura" ? 320 : 220, pointerEvents: "auto" }}
                  onClick={() => nodeExec && onSelectNode(node.id)}
                  className={cn(
                    "rounded-xl border-2 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col p-3 transition-all duration-200",
                    style.border, style.ring, "ring-2",
                    nodeExec ? "cursor-pointer" : "cursor-default opacity-50 grayscale-[20%]",
                    isSelected && "shadow-xl ring-4 ring-primary/30"
                  )}
                >
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <div className={cn("p-1.5 rounded-lg text-white shrink-0 shadow-sm", nodeInfo.color)}>
                      <NodeIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-slate-800 truncate">
                        {node.nodeType === "trigger" ? "Inicio" : ((node.config.label as string) || nodeInfo.label)}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{nodeInfo.label}</p>
                    </div>
                    <StatusIcon className={cn("h-4 w-4 shrink-0", style.iconColor, status === "running" && "animate-spin")} />
                  </div>

                  {/* Condition Result Badge */}
                  {nodeExec && (node.nodeType === "condition" || node.nodeType === "condicao") && (
                    <div className="mt-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-medium">Resultado:</span>
                        {conditionResult === true ? (
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">VERDADEIRO</span>
                        ) : conditionResult === false ? (
                          <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">FALSO (Fallback)</span>
                        ) : (
                          <span className="font-mono text-slate-600">{branchTaken || "OK"}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {hasDisconnectedBranch && (
                    <div className="mt-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <span>⚠️ Parou aqui (saída desconectada)</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                    <span className={style.iconColor}>
                      {status === "success" ? "Executado" : status === "error" ? "Erro" : status === "running" ? "Executando" : "Não percorrido"}
                    </span>
                    {nodeExec?.durationMs != null && <span className="text-slate-400">{nodeExec.durationMs}ms</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
