import { useState, useCallback, useEffect, useRef, ReactNode, Fragment } from "react";
import { LocalNode, LocalConnection, NodeCategory, RandomizerBranch, TriggerItem } from "./shared-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SequenceVersionsDialog } from "./SequenceVersionsDialog";
import { useSequences } from "@/hooks/useSequences";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Save, Play, Pause, Trash2, ZoomIn, ZoomOut, Maximize,
  Loader2, Info, GitBranch, Copy, PenLine, History, Sliders, ArrowRight, Plus, MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NodeEditorModal } from "../workflows/node-editor/NodeEditorModal";
import { cn } from "@/lib/utils";
import { ExecutionsPanel } from "./executions/ExecutionsPanel";
import { NodePalettePopover, NODE_PALETTE_DND_MIME } from "./NodePalettePopover";
import { FloatingNodePicker } from "./FloatingNodePicker";
import { buildTriggerSummary } from "./triggers/TriggerSummary";
import { validateWorkflowActivation } from "@/lib/workflows/validateActivation";
import { getNodeVisual, toNodeCategories } from "./nodeDefinitions";
import { TriggerTypeSelector } from "./triggers/TriggerTypeSelector";
import { getTriggerDefinition } from "./triggers/triggerDefinitions";

export interface UnifiedSequenceBuilderProps {
  sequenceName: string;
  isActive: boolean;
  sequenceId: string;
  campaignId?: string;
  nodeCategories: NodeCategory[];
  getDefaultConfig: (nodeType: string) => Record<string, unknown>;
  getNodePreview?: (node: LocalNode) => string;
  renderConfigPanel: (
    node: LocalNode,
    onUpdate: (config: Record<string, unknown>) => void,
    onClose: () => void,
    onManualSend?: () => void,
    isSendingManual?: boolean,
    isGroup?: boolean,
    nodes?: LocalNode[]
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
  isLoading?: boolean;
}

const RANDOMIZER_PORT_BASE_Y = 28;
const RANDOMIZER_PORT_SPACING = 22;

function getSortedRandomizerBranches(node: LocalNode): RandomizerBranch[] {
  return ((node.config.branches as RandomizerBranch[] | undefined) || [])
    .slice()
    .sort((a, b) => a.position - b.position);
}

export function UnifiedSequenceBuilder({
  sequenceName: initialName,
  isActive,
  sequenceId,
  campaignId,
  nodeCategories,
  getDefaultConfig,
  renderConfigPanel,
  onSave,
  onToggleActive,
  onManualSendNode,
  onBack,
  initialNodes,
  initialConnections,
  isSaving,
  isLoading = false
}: UnifiedSequenceBuilderProps) {
  const { toast } = useToast();
  const { saveVersion, isSavingVersion } = useSequences(sequenceId);
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
    branchId?: string;
    x: number;
    y: number;
  } | null>(null);

  // Trigger Selector Modal State
  const [triggerSelectorOpen, setTriggerSelectorOpen] = useState(false);

  useEffect(() => {
    const handleOpenTriggerSelector = () => setTriggerSelectorOpen(true);
    document.addEventListener("open-trigger-selector", handleOpenTriggerSelector);
    return () => {
      document.removeEventListener("open-trigger-selector", handleOpenTriggerSelector);
    };
  }, []);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // A connection dragged from an output port and released over empty canvas
  // (not onto another node's input port) opens FloatingNodePicker at the drop
  // point instead of discarding the connection — picking a block there
  // creates the node and auto-connects it to sourceNodeId/conditionPath.
  const [pendingConnectionDrop, setPendingConnectionDrop] = useState<{
    sourceNodeId: string;
    conditionPath?: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Side panel & configuration states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isSendingManual, setIsSendingManual] = useState(false);
  const [nodeEditorOpen, setNodeEditorOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Hover toolbar & delete confirmation
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [nodeIdPendingDelete, setNodeIdPendingDelete] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const handleMouseEnterNode = (nodeId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredNodeId(nodeId);
  };

  const handleMouseLeaveNode = (nodeId: string) => {
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredNodeId(prev => (prev === nodeId ? null : prev));
    }, 200);
  };

  // Editor vs Execuções (read-only run history) mode
  const [mode, setMode] = useState<"editor" | "executions">("editor");
  const [editingTriggerId, setEditingTriggerId] = useState<string | undefined>(undefined);

  const canvasRef = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedSequenceId = useRef<string | null>(null);
  // Distinguishes a click from a drag without an artificial timeout: a real
  // pointer movement past this threshold marks the interaction as a drag, so
  // the node's onClick (fired right after mouseup) knows to skip opening the
  // edit panel.
  const dragMovedRef = useRef(false);
  const mouseDownPosRef = useRef({ x: 0, y: 0 });

  // Initialize and auto-position if nodes lack coordinates.
  // Runs only once per sequenceId — initialNodes/initialConnections are recreated
  // with new array references on every parent render (autosave flips isSaving,
  // query invalidation refetches, etc). Re-running this on every reference change
  // would stomp over in-progress edits (e.g. snap a node back mid-drag).
  useEffect(() => {
    if (isLoading) return;
    if (hydratedSequenceId.current === sequenceId) {
      const hasOnlyTriggerInState = localNodes.length <= 1;
      const hasStepsInProps = initialNodes.length > 1;
      if (!(hasOnlyTriggerInState && hasStepsInProps)) {
        return;
      }
    }
    hydratedSequenceId.current = sequenceId;

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
        config: { label: "Início" }
      });
    }

    const positionedNodes = preparedNodes.map((node, index) => {
      const hasPos = node.positionX !== undefined && node.positionY !== undefined && (node.positionX !== 0 || node.positionY !== 0);
      
      let migratedNode = { ...node };
      // Migrate trigger nodes from singular triggerType to triggers array
      if (node.nodeType === "trigger") {
        if (!node.config.triggers) {
           const triggers = [];
           if (node.config.triggerType) {
              triggers.push({
                 id: crypto.randomUUID(),
                 type: node.config.triggerType,
                 dataSource: node.config.triggerType === "webhook" ? "Webhook-1" : "Source-1",
                 config: node.config.triggerConfig || {}
              });
           }
           migratedNode = {
             ...node,
             config: { ...node.config, triggers }
           };
        }
      }

      return {
        ...migratedNode,
        positionX: hasPos ? node.positionX : (node.nodeType === "trigger" ? 50 : 320 + (index - 1) * 260),
        positionY: hasPos ? node.positionY : (node.nodeType === "trigger" ? 150 : 150),
      };
    });
    setLocalNodes(positionedNodes);

    const triggerNode = positionedNodes.find(n => n.nodeType === "trigger");
    const hasTriggerConnection = triggerNode
      ? initialConnections.some(c => c.sourceNodeId === triggerNode.id)
      : true;

    if (initialConnections.length === 0 && positionedNodes.length > 1) {
      // No connections saved yet: chain every node trigger -> 1 -> 2 -> ...
      const autoConns: LocalConnection[] = [];
      for (let i = 0; i < positionedNodes.length - 1; i++) {
        autoConns.push({
          sourceNodeId: positionedNodes[i].id,
          targetNodeId: positionedNodes[i + 1].id,
        });
      }
      setLocalConnections(autoConns);
    } else if (triggerNode && !hasTriggerConnection && positionedNodes.length > 1) {
      // Existing flow saved before the trigger node existed: wire the
      // newly-injected trigger into the first real step so it isn't orphaned.
      const firstStep = positionedNodes.find(n => n.id !== triggerNode.id);
      setLocalConnections(firstStep
        ? [...initialConnections, { sourceNodeId: triggerNode.id, targetNodeId: firstStep.id }]
        : initialConnections);
    } else {
      setLocalConnections(initialConnections);
    }
  }, [sequenceId, initialNodes, initialConnections, isLoading]);

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

  const triggerNode = localNodes.find(n => n.nodeType === "trigger");
  const isGroup = (triggerNode?.config?.triggerConfig as any)?.isGroup ?? true;
  const categories = toNodeCategories(isGroup);

  const allNodeTypes = categories.flatMap(cat => cat.nodes);
  const getNodeInfo = (node: LocalNode) => {
    if (node.nodeType === "trigger") {
      return { type: "trigger", label: "Inicio", icon: Play, color: "bg-emerald-500" };
    }
    // "content"/"action" nodes resolve their icon/label through the
    // registry's sub-type (contentType/actionType) so e.g. a content node
    // showing an image still gets the emerald image icon on its card, not
    // the generic "Conteúdo" tile.
    const visual = getNodeVisual(node.nodeType, node.config.contentType as string | undefined, node.config.actionType as string | undefined);
    if (visual) return { type: node.nodeType, ...visual };
    return allNodeTypes.find(n => n.type === node.nodeType) || allNodeTypes[0];
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

      if (!dragMovedRef.current) {
        const dx = e.clientX - mouseDownPosRef.current.x;
        const dy = e.clientY - mouseDownPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 3) {
          dragMovedRef.current = true;
        }
      }

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

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);
    if (draggedNodeId) {
      setDraggedNodeId(null);
      triggerAutosave(localNodes, localConnections, sequenceName);
    }

    // Dropping a dragged-out connection on the raw canvas background (not on
    // a node's input port, which is handled by handlePortMouseUp) opens the
    // floating node picker instead of discarding the connection. Keep
    // activePort set so the dashed preview line stays visible while the
    // picker is open; it's cleared when the picker closes (pick or cancel).
    if (activePort && activePort.portType === "out" && e.target === canvasRef.current) {
      setPendingConnectionDrop({
        sourceNodeId: activePort.nodeId,
        conditionPath: activePort.conditionPath,
        screenX: e.clientX,
        screenY: e.clientY,
      });
      setSelectedNodeId(null);
      return;
    }

    setActivePort(null);
  };

  const handleFloatingPickerPick = (type: string) => {
    if (!pendingConnectionDrop) return;
    const newNodeId = handleAddNode(type, { x: pendingConnectionDrop.screenX, y: pendingConnectionDrop.screenY });
    createConnection(pendingConnectionDrop.sourceNodeId, newNodeId, pendingConnectionDrop.conditionPath);
    setPendingConnectionDrop(null);
    setActivePort(null);
  };

  const handleFloatingPickerCancel = () => {
    setPendingConnectionDrop(null);
    setActivePort(null);
  };

  // Node drag start
  const handleNodeMouseDown = (e: React.MouseEvent, node: LocalNode) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("[data-node-port]")) return;

    e.stopPropagation();
    dragMovedRef.current = false;
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
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

  // Add Node from the floating palette — either at the canvas' current
  // viewport center (click-to-add) or at an explicit drop point (drag-and-drop
  // from the palette), converted from screen to flow coordinates the same way
  // node dragging does.
  const handleAddNode = (type: string, dropClientPos?: { x: number; y: number }): string => {
    const id = generateNodeId();
    const config = getDefaultConfig(type);

    const rect = canvasRef.current?.getBoundingClientRect();
    let positionX: number;
    let positionY: number;

    if (dropClientPos && rect) {
      positionX = Math.round((dropClientPos.x - rect.left - panOffset.x) / zoom);
      positionY = Math.round((dropClientPos.y - rect.top - panOffset.y) / zoom);
    } else {
      const canvasCenterX = rect ? (rect.width / 2 - panOffset.x) / zoom : 300;
      const canvasCenterY = rect ? (rect.height / 2 - panOffset.y) / zoom : 150;
      positionX = Math.round(canvasCenterX + (Math.random() - 0.5) * 50);
      positionY = Math.round(canvasCenterY + (Math.random() - 0.5) * 50);
    }

    const newNode: LocalNode = {
      id,
      nodeType: type,
      nodeOrder: localNodes.length,
      config,
      positionX,
      positionY,
    };

    updateNodesAndSave(prev => [...prev, newNode]);
    setSelectedNodeId(id);
    toast({ title: "Bloco adicionado", description: "Posicione o bloco e puxe os cabos para conectar." });
    return id;
  };

  // Shared by manual port-drag connect (handlePortMouseUp) and the floating
  // node picker's auto-connect, so the duplicate-connection guard and toast
  // stay in one place regardless of how the connection was created.
  const createConnection = (sourceNodeId: string, targetNodeId: string, conditionPath?: string) => {
    const exists = localConnections.some(c => c.sourceNodeId === sourceNodeId && c.targetNodeId === targetNodeId && c.conditionPath === conditionPath);
    if (exists) return;
    updateConnectionsAndSave(prev => [...prev, { sourceNodeId, targetNodeId, conditionPath }]);
    toast({ title: "Conexão criada" });
  };

  // Delete Node
  const handleDeleteNode = (id: string) => {
    const node = localNodes.find(n => n.id === id);
    if (node?.nodeType === "trigger") {
      toast({ title: "Ação não permitida", description: "O bloco de início não pode ser removido.", variant: "destructive" });
      return;
    }
    updateNodesAndSave(prev => prev.filter(n => n.id !== id));
    updateConnectionsAndSave(prev => prev.filter(c => c.sourceNodeId !== id && c.targetNodeId !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // Ask for confirmation before removing a node (it may have connections/config attached)
  const requestDeleteNode = (id: string) => {
    const node = localNodes.find(n => n.id === id);
    if (node?.nodeType === "trigger") {
      toast({ title: "Ação não permitida", description: "O bloco de início não pode ser removido.", variant: "destructive" });
      return;
    }
    setNodeIdPendingDelete(id);
  };

  const confirmDeleteNode = () => {
    if (nodeIdPendingDelete) handleDeleteNode(nodeIdPendingDelete);
    setNodeIdPendingDelete(null);
  };

  // Duplicate Node: new id, cloned type/config, offset position, no connections copied
  const handleDuplicateNode = (id: string) => {
    const source = localNodes.find(n => n.id === id);
    if (!source || source.nodeType === "trigger") return;

    const isOccupied = (x: number, y: number) =>
      localNodes.some(n => Math.abs((n.positionX || 0) - x) < 10 && Math.abs((n.positionY || 0) - y) < 10);

    let offsetX = (source.positionX || 0) + 40;
    let offsetY = (source.positionY || 0) + 40;
    let guard = 0;
    while (isOccupied(offsetX, offsetY) && guard < 20) {
      offsetX += 40;
      offsetY += 40;
      guard++;
    }

    const newNode: LocalNode = {
      id: generateNodeId(),
      nodeType: source.nodeType,
      nodeOrder: localNodes.length,
      config: JSON.parse(JSON.stringify(source.config)),
      positionX: offsetX,
      positionY: offsetY,
    };

    updateNodesAndSave(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    toast({ title: "Bloco duplicado" });
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
      createConnection(activePort.nodeId, nodeId, activePort.conditionPath);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("textarea, .scroll-area, .overflow-y-auto, .overflow-auto, [data-radix-scroll-area-viewport]")) {
        if (!e.ctrlKey && !e.metaKey) return;
      }

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); // Stop browser zoom
        const zoomFactor = e.deltaY > 0 ? -0.1 : 0.1;
        
        setZoom((prevZoom) => {
          const newZoom = Math.min(Math.max(prevZoom + zoomFactor, 0.4), 1.8);
          if (newZoom !== prevZoom) {
            setPanOffset(prevPan => {
              const rect = canvas.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              const mouseY = e.clientY - rect.top;
              
              const pointX = (mouseX - prevPan.x) / prevZoom;
              const pointY = (mouseY - prevPan.y) / prevZoom;
              
              return {
                x: mouseX - pointX * newZoom,
                y: mouseY - pointY * newZoom
              };
            });
          }
          return newZoom;
        });
      } else {
        // Standard Panning
        e.preventDefault();
        setPanOffset(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      }
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  // Activating requires a valid flow (configured Start, no isolated nodes,
  // no invalid cycles, etc). Deactivating is always allowed, unconditionally --
  // the "turn it off" path must never be blocked by validation.
  const handleToggleActiveClick = async () => {
    if (!isActive) {
      const result = validateWorkflowActivation(localNodes, localConnections);
      if (!result.valid) {
        toast({
          title: "Não é possível ativar esta automação",
          description: result.errors[0],
          variant: "destructive",
        });
        return;
      }
    }
    await onToggleActive();
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

  const handleSaveVersion = async (name: string) => {
    try {
      await saveVersion({
        name,
        nodes: localNodes,
        connections: localConnections
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRestoreVersion = (restoredNodes: any[], restoredConnections: any[]) => {
    setLocalNodes(restoredNodes);
    setLocalConnections(restoredConnections);
    toast({ title: "Versão restaurada", description: "O fluxo foi revertido para a versão selecionada." });
  };

  // Draw Bezier Curves between nodes
  const drawBezier = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  const selectedNode = localNodes.find(n => n.id === selectedNodeId);

  // Keyboard shortcuts: Ctrl/Cmd+D duplicates, Delete/Backspace removes the selected node
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditableTarget = !!target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      );
      if (isEditableTarget || !selectedNodeId) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDuplicateNode(selectedNodeId);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        requestDeleteNode(selectedNodeId);
      } else if (e.key === "Enter") {
        e.preventDefault();
        setEditingNodeId(selectedNodeId);
        setNodeEditorOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, localNodes]);

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
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setMode("editor")}
              className={cn(
                "flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold transition-colors",
                mode === "editor" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <PenLine className="h-3.5 w-3.5" />
              Editor
            </button>
            <button
              onClick={() => setMode("executions")}
              className={cn(
                "flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold transition-colors",
                mode === "executions" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <History className="h-3.5 w-3.5" />
              Execuções
            </button>
          </div>
          <Button variant="outline" onClick={handleToggleActiveClick} className="rounded-xl border-slate-200 hover:bg-slate-50 gap-2 h-9 px-4 font-semibold text-slate-700">
            {isActive ? <Pause className="h-4 w-4 text-amber-500" /> : <Play className="h-4 w-4 text-emerald-500" />}
            {isActive ? "Pausar" : "Ativar"}
          </Button>
          {mode === "editor" && (
            <>
              <SequenceVersionsDialog
                sequenceId={sequenceId}
                onSaveVersion={handleSaveVersion}
                onRestoreVersion={handleRestoreVersion}
                isSaving={isSavingVersion}
              />
              <Button onClick={handleSaveAll} disabled={isSaving} className="bg-[#8A3CFF] hover:bg-[#7830E3] text-white rounded-xl gap-2 h-9 px-5 font-semibold">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          )}
        </div>
      </div>

      {mode === "executions" ? (
        <ExecutionsPanel
          sequenceId={sequenceId}
          nodes={localNodes}
          connections={localConnections}
          nodeCategories={categories}
          onUpdateNodeConfig={(nodeId, config) => {
            setLocalNodes(prev => prev.map(n => n.id === nodeId ? { ...n, config } : n));
          }}
          onSwitchToEditor={() => setMode("editor")}
        />
      ) : (
      /* Canvas Layout — fills whatever height the page gives this component; the
          viewport-relative sizing lives one level up (see SequencesTab wrappers),
          so this stays correct regardless of chrome above it. */
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

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

          <NodePalettePopover nodeCategories={categories} onAddNode={handleAddNode} />

          <TriggerTypeSelector
            engine="group_sequence"
            open={triggerSelectorOpen}
            onOpenChange={setTriggerSelectorOpen}
            value={""} // Pass empty so no trigger is pre-selected
            onChange={(type) => {
              const triggerNode = localNodes.find(n => n.nodeType === "trigger");
              if (triggerNode) {
                const currentTriggers = (triggerNode.config.triggers as TriggerItem[]) || [];
                const newTrigger: TriggerItem = {
                  id: crypto.randomUUID(),
                  type,
                  dataSource: type === "webhook" ? `Webhook-${currentTriggers.filter(t => t.type === "webhook").length + 1}` : `Fonte-${currentTriggers.length + 1}`,
                  config: {}
                };
                updateNodesAndSave(prev => prev.map(n => 
                  n.id === triggerNode.id ? { 
                    ...n, 
                    config: { 
                      ...n.config, 
                      triggers: [...currentTriggers, newTrigger]
                    } 
                  } : n
                ));
              }
            }}
          />

          {/* Interactive Canvas Wrapper */}
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(NODE_PALETTE_DND_MIME)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }
            }}
            onDrop={(e) => {
              const type = e.dataTransfer.getData(NODE_PALETTE_DND_MIME);
              if (!type) return;
              e.preventDefault();
              handleAddNode(type, { x: e.clientX, y: e.clientY });
            }}
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

                  const sX = srcNode.positionX || 0;
                  const sY = srcNode.positionY || 0;
                  const tX = tgtNode.positionX || 0;
                  const tY = tgtNode.positionY || 0;

                  // Output port on the right side of the card
                  let portX1 = sX + 220;
                  let portY1 = sY + 45;
                  if (conn.conditionPath === "yes") portY1 = sY + 35;
                  if (conn.conditionPath === "no") portY1 = sY + 65;
                  if (srcNode.nodeType === "randomizer") {
                    const branches = getSortedRandomizerBranches(srcNode);
                    const idx = branches.findIndex(b => b.id === conn.conditionPath);
                    if (idx >= 0) portY1 = sY + RANDOMIZER_PORT_BASE_Y + idx * RANDOMIZER_PORT_SPACING;
                  }
                  if (srcNode.nodeType === "field_op") {
                    const mappingsCount = (srcNode.config.mappings as any[])?.length || 0;
                    if (conn.conditionPath === "error") {
                      portY1 = sY + 146 + (mappingsCount * 53);
                    } else {
                      // Default "Próximo passo" out port
                      portY1 = sY + 166 + (mappingsCount * 53);
                    }
                  }

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
                        className="hover:stroke-sky-400 hover:stroke-[3px] cursor-pointer transition-[stroke,stroke-width] duration-150"
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
                  const nodeInfo = getNodeInfo(node);
                  const NodeIcon = nodeInfo.icon;
                  const isSelected = selectedNodeId === node.id;
                  
                  const posX = node.positionX || 0;
                  const posY = node.positionY || 0;

                  const isCondition = node.nodeType === "condition";
                  const isRandomizer = node.nodeType === "randomizer";
                  const randomizerBranches = (node.config.branches as RandomizerBranch[]) || [];
                  const isFieldOp = node.nodeType === "field_op";
                  const fieldOpMappings = (node.config.mappings as any[]) || [];
                  const isTrigger = node.nodeType === "trigger";
                  const isContent = node.nodeType === "content";

                  const isHovered = hoveredNodeId === node.id;
                  const showHoverToolbar = isHovered && !draggedNodeId && !isTrigger;

                  return (
                    <div
                      key={node.id}
                      style={{
                        position: "absolute",
                        left: posX,
                        top: posY,
                        width: isTrigger || isContent ? 320 : 220,
                        minHeight: isRandomizer ? Math.max(140, 40 + randomizerBranches.length * RANDOMIZER_PORT_SPACING) : undefined,
                        pointerEvents: "auto"
                      }}
                      onMouseDown={(e) => handleNodeMouseDown(e, node)}
                      onMouseEnter={() => handleMouseEnterNode(node.id)}
                      onMouseLeave={() => handleMouseLeaveNode(node.id)}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("[data-node-port]")) return;
                        if (dragMovedRef.current) { dragMovedRef.current = false; return; }
                        setSelectedNodeId(node.id);
                        setEditingNodeId(node.id);
                        setNodeEditorOpen(true);
                      }}
                      onDoubleClick={(e) => {
                        if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("[data-node-port]")) return;
                        setEditingNodeId(node.id);
                        setNodeEditorOpen(true);
                      }}
                      className={cn(
                        "rounded-xl border border-slate-200 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col transition-[border-color,box-shadow] duration-150 cursor-grab active:cursor-grabbing select-none",
                        isTrigger || isContent ? "p-5" : "p-3",
                        isSelected && "border-[#8A3CFF] ring-2 ring-[#8A3CFF]/10"
                      )}
                    >
                      {/* Hover-only floating toolbar (n8n-style): duplicate/delete, hidden during drag and while selected node's dialog owns focus */}
                      {showHoverToolbar && (
                        <div
                          className="absolute -top-9 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg shadow-md p-0.5 animate-in fade-in duration-150"
                          onMouseDown={(e) => e.stopPropagation()}
                          onMouseEnter={() => {
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current);
                              hoverTimeoutRef.current = null;
                            }
                          }}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md hover:bg-slate-100 text-slate-500"
                            title="Configurar"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNodeId(node.id);
                              setNodeEditorOpen(true);
                            }}
                          >
                            <Sliders className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md hover:bg-slate-100 text-slate-500"
                            title="Duplicar"
                            onClick={(e) => { e.stopPropagation(); handleDuplicateNode(node.id); }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md text-destructive hover:bg-destructive/10"
                            title="Excluir"
                            onClick={(e) => { e.stopPropagation(); requestDeleteNode(node.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}

                      {/* Node Connection Ports */}
                      {/* Input Port (Left Handle) - Excluded for trigger node */}
                      {!isTrigger && (
                        <div
                          data-node-port="true"
                          onMouseUp={(e) => handlePortMouseUp(e, node.id, "in")}
                          className="absolute -left-1.5 top-[38px] h-3.5 w-3.5 rounded-full border-2 border-slate-300 bg-white hover:bg-[#8A3CFF] cursor-crosshair z-20 flex items-center justify-center transition-colors shadow-sm"
                          title="Entrada do fluxo"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 hover:bg-white" />
                        </div>
                      )}

                      {/* Output Port(s) (Right Handles) */}
                      {!isCondition && !isRandomizer && !isFieldOp ? (
                        <>
                          <div
                            data-node-port="true"
                            onMouseDown={(e) => handlePortMouseDown(e, node.id, "out")}
                            className="absolute -right-1.5 top-[38px] h-3.5 w-3.5 rounded-full border-2 border-[#8A3CFF] bg-background hover:bg-[#8A3CFF] cursor-crosshair z-20 flex items-center justify-center transition-colors shadow-sm"
                            title="Saída do fluxo"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-[#8A3CFF]" />
                          </div>
                          {isTrigger && (
                            <span className="absolute right-2 top-[34px] text-[8px] font-bold text-[#8A3CFF] select-none text-right">Quando o<br/>evento ocorrer, então</span>
                          )}
                        </>
                      ) : isCondition ? (
                        <>
                          {/* "Sim" (True) output handle */}
                          <div
                            data-node-port="true"
                            onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", "yes")}
                            className="absolute -right-1.5 top-[28px] h-3.5 w-3.5 rounded-full border-2 border-emerald-500 bg-background hover:bg-emerald-500 cursor-crosshair z-20 flex items-center justify-center transition-colors shadow-sm"
                            title="Verdadeiro (Sim)"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          </div>
                          <span className="absolute right-2 top-[24px] text-[8px] font-bold text-emerald-500 select-none">Sim</span>

                          {/* "Não" (False) output handle */}
                          <div
                            data-node-port="true"
                            onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", "no")}
                            className="absolute -right-1.5 top-[58px] h-3.5 w-3.5 rounded-full border-2 border-destructive bg-background hover:bg-destructive cursor-crosshair z-20 flex items-center justify-center transition-colors shadow-sm"
                            title="Falso (Não)"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                          </div>
                          <span className="absolute right-2 top-[54px] text-[8px] font-bold text-destructive select-none">Não</span>
                        </>
                      ) : isFieldOp ? (
                        <>{/* Handles moved to inline flow inside the node body to prevent overlapping */}</>
                      ) : (
                        randomizerBranches.map((branch, i) => {
                          const portY = RANDOMIZER_PORT_BASE_Y + i * RANDOMIZER_PORT_SPACING;
                          return (
                            <Fragment key={branch.id}>
                              <div
                                data-node-port="true"
                                onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", branch.id)}
                                style={{ top: portY }}
                                className="absolute -right-1.5 h-3.5 w-3.5 rounded-full border-2 border-fuchsia-500 bg-background hover:bg-fuchsia-500 cursor-crosshair z-20 flex items-center justify-center transition-colors shadow-sm"
                                title={branch.label}
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-fuchsia-500" />
                              </div>
                              <span
                                style={{ top: portY - 4 }}
                                className="absolute right-2 text-[8px] font-bold text-fuchsia-500 select-none truncate max-w-[130px]"
                                title={branch.label}
                              >
                                {branch.label}
                              </span>
                            </Fragment>
                          );
                        })
                      )}

                      {isTrigger ? (
                        <div className="flex flex-col w-full text-left">
                          <div className="flex items-center gap-2 mb-2">
                            <Play className="h-5 w-5 text-emerald-500 stroke-[1.5]" fill="currentColor" />
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Início</h2>
                          </div>
                          <p className="text-[11px] text-slate-500 mb-4 leading-relaxed font-medium">
                            O gatilho é responsável por acionar a automação. Clique para adicionar um gatilho:
                          </p>
                          
                          {(node.config.triggers as TriggerItem[] || []).map((trigger, idx) => {
                            const def = getTriggerDefinition(trigger.type);
                            return (
                              <div 
                                key={trigger.id} 
                                className="group relative flex flex-col gap-2 p-3 border border-slate-200 rounded-xl bg-white shadow-sm mb-3 cursor-pointer hover:border-[#8A3CFF]/50 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTriggerId(trigger.id);
                                  setEditingNodeId(node.id);
                                  setNodeEditorOpen(true);
                                }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <ArrowRight className="h-4 w-4 text-slate-600 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-800 truncate">{def?.label || trigger.type}</p>
                                      <p className="text-[10px] text-slate-500 truncate">{def?.description}</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateNodesAndSave(prev => prev.map(n => 
                                        n.id === node.id ? { 
                                          ...n, 
                                          config: { 
                                            ...n.config, 
                                            triggers: (n.config.triggers as TriggerItem[]).filter(t => t.id !== trigger.id) 
                                          } 
                                        } : n
                                      ));
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    title="Remover gatilho"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                {trigger.dataSource && (
                                  <div className="self-end mt-1">
                                    <Badge className="bg-blue-500 hover:bg-blue-600 text-[9px] px-2 py-0 rounded-md font-bold text-white">
                                      {trigger.dataSource}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          <button 
                             type="button"
                             onClick={(e) => { e.stopPropagation(); setTriggerSelectorOpen(true); }}
                             className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-[#8A3CFF]/30 rounded-xl text-[#8A3CFF] font-semibold hover:bg-[#8A3CFF]/5 transition-colors mb-4 text-xs"
                          >
                            <Plus className="h-3.5 w-3.5" /> Adicionar gatilho
                          </button>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-slate-100 px-2 mt-auto">
                            <div className="text-center">
                              <p className="text-base font-bold text-slate-800 leading-none mb-1">0</p>
                              <p className="text-[10px] font-semibold text-[#8A3CFF] leading-none">Sucessos</p>
                            </div>
                            <div className="text-center">
                              <p className="text-base font-bold text-slate-800 leading-none mb-1">0</p>
                              <p className="text-[10px] font-semibold text-[#8A3CFF] leading-none">Alertas</p>
                            </div>
                            <div className="text-center">
                              <p className="text-base font-bold text-slate-800 leading-none mb-1">0</p>
                              <p className="text-[10px] font-semibold text-[#8A3CFF] leading-none">Erros</p>
                            </div>
                          </div>
                        </div>
                      ) : isFieldOp ? (
                        <div className="flex flex-col w-full text-left h-full">
                          {/* Header/Title padrão */}
                          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                            <div className={cn("p-1.5 rounded-lg text-white shrink-0 shadow-sm bg-emerald-500")}>
                              <GitBranch className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs text-slate-800 truncate">Operações de campos</p>
                            </div>
                          </div>
                          
                          <p className="text-[9px] text-slate-500 mb-2 leading-tight">
                            Realize operações de mapeamento de campos (do sistema, fonte de dados,...)
                          </p>
                          
                          {fieldOpMappings.map((mapping, idx) => (
                            <div 
                              key={mapping.id || idx} 
                              className="group relative flex flex-col gap-1 p-2 border border-slate-200 rounded-lg bg-white shadow-sm mb-2 cursor-pointer hover:border-[#8A3CFF]/50 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTriggerId(mapping.id);
                                setEditingNodeId(node.id);
                                setNodeEditorOpen(true);
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <ArrowRight className="h-3 w-3 text-slate-600 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-slate-800 truncate">Mapeamento de campo</p>
                                    <p className="text-[8px] text-slate-500 truncate">
                                      {mapping.source ? `${mapping.source} → ${mapping.targetField || 'Destino'}` : "Realiza operações de mapeamento..."}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateNodesAndSave(prev => prev.map(n => 
                                      n.id === node.id ? { 
                                        ...n, 
                                        config: { 
                                          ...n.config, 
                                          mappings: (n.config.mappings as any[]).filter(m => m.id !== mapping.id) 
                                        } 
                                      } : n
                                    ));
                                  }}
                                  className="p-1 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  title="Remover mapeamento"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}

                          <button 
                             type="button"
                             onClick={(e) => {
                               e.stopPropagation();
                               const newMappingId = crypto.randomUUID();
                               updateNodesAndSave(prev => prev.map(n => 
                                 n.id === node.id ? { 
                                   ...n, 
                                   config: { 
                                     ...n.config, 
                                     mappings: [...((n.config.mappings as any[]) || []), { id: newMappingId }] 
                                   } 
                                 } : n
                               ));
                               setEditingTriggerId(newMappingId);
                               setEditingNodeId(node.id);
                               setNodeEditorOpen(true);
                             }}
                             className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-[#8A3CFF]/50 rounded-lg text-[#8A3CFF] font-semibold hover:bg-[#8A3CFF]/5 transition-colors mb-2 text-[9px]"
                          >
                            <Plus className="h-3 w-3" /> Adicionar mapeamento
                          </button>
                          
                          <button 
                             type="button"
                             onClick={(e) => e.stopPropagation()}
                             className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-[#8A3CFF]/50 rounded-lg text-[#8A3CFF] font-semibold hover:bg-[#8A3CFF]/5 transition-colors text-[9px]"
                          >
                            <Plus className="h-3 w-3" /> Adicionar outra operação
                          </button>
                          
                          <div className="flex flex-col mt-3 gap-2 w-full text-right relative">
                            <div className="relative flex items-center justify-end w-full">
                              <span className="text-[8px] font-bold text-slate-500 select-none mr-2">Caso ocorrer erro na operação de campo</span>
                              <div
                                data-node-port="true"
                                onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", "error")}
                                className="absolute -right-[19.5px] top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-destructive bg-background hover:bg-destructive cursor-crosshair z-20 flex items-center justify-center transition-colors shadow-sm"
                                title="Caso ocorrer erro"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                              </div>
                            </div>
                            <div className="relative flex items-center justify-end w-full">
                              <span className="text-[8px] font-bold text-slate-500 select-none mr-2">Próximo passo</span>
                              <div
                                data-node-port="true"
                                onMouseDown={(e) => handlePortMouseDown(e, node.id, "out")}
                                className="absolute -right-[19.5px] top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-blue-500 bg-background hover:bg-blue-500 cursor-crosshair z-20 flex items-center justify-center transition-colors shadow-sm"
                                title="Próximo passo"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : isContent ? (
                        <div className="flex flex-col w-full text-left h-full">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-5 w-5 text-blue-500 stroke-[1.5]" fill="currentColor" />
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">{(node.config.label as string) || "Mensagem"}</h2>
                          </div>
                          <p className="text-[11px] text-slate-500 mb-4 leading-relaxed font-medium">
                            Ações que serão executadas sequencialmente:
                          </p>
                          
                          {(((node.config.messages as any[]) || [])).map((msg, idx) => {
                            const msgDef = getNodeVisual("content", msg.type);
                            const Icon = msgDef?.icon || ArrowRight;
                            return (
                              <div 
                                key={msg.id || idx} 
                                className="group relative flex flex-col gap-2 p-3 border border-slate-200 rounded-xl bg-white shadow-sm mb-3 cursor-pointer hover:border-[#8A3CFF]/50 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedNodeId(node.id);
                                  setEditingNodeId(node.id);
                                  setNodeEditorOpen(true);
                                }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <Icon className={cn("h-4 w-4 shrink-0", msgDef?.color ? msgDef.color.replace("bg-", "text-") : "text-slate-600")} />
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-800 truncate">{msgDef?.label || msg.type}</p>
                                      <p className="text-[10px] text-slate-500 truncate">{msg.content || msg.url || msg.question || "Clique para configurar..."}</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateNodesAndSave(prev => prev.map(n => 
                                        n.id === node.id ? { 
                                          ...n, 
                                          config: { 
                                            ...n.config, 
                                            messages: (n.config.messages as any[]).filter(m => m.id !== msg.id) 
                                          } 
                                        } : n
                                      ));
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    title="Remover ação"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          <button 
                             type="button"
                             onClick={(e) => {
                               e.stopPropagation();
                               setSelectedNodeId(node.id);
                               setEditingNodeId(node.id);
                               setNodeEditorOpen(true);
                             }}
                             className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-[#8A3CFF]/30 rounded-xl text-[#8A3CFF] font-semibold hover:bg-[#8A3CFF]/5 transition-colors mb-4 text-xs"
                          >
                            <Plus className="h-3.5 w-3.5" /> Adicionar ação
                          </button>
                          
                          <div className="flex flex-col gap-2 w-full text-right relative mb-4">
                            {(((node.config.messages as any[]) || [])).some(m => m.type === "user_input") && (
                              <div className="relative flex items-center justify-end w-full">
                                <span className="text-[8px] font-bold text-slate-500 select-none mr-2">Caso o contato não responda</span>
                                <div
                                  data-node-port="true"
                                  onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", "timeout")}
                                  className="absolute -right-[27.5px] top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-amber-500 bg-background hover:bg-amber-500 cursor-crosshair z-20 flex items-center justify-center transition-colors shadow-sm"
                                  title="Caso o contato não responda"
                                >
                                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                </div>
                              </div>
                            )}
                            <div className="relative flex items-center justify-end w-full">
                              <span className="text-[8px] font-bold text-slate-500 select-none mr-2">Caso ocorrer erro no envio da mensagem</span>
                              <div
                                data-node-port="true"
                                onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", "error")}
                                className="absolute -right-[27.5px] top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-destructive bg-background hover:bg-destructive cursor-crosshair z-20 flex items-center justify-center transition-colors shadow-sm"
                                title="Caso ocorrer erro"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                              </div>
                            </div>
                            <div className="relative flex items-center justify-end w-full">
                              <span className="text-[8px] font-bold text-slate-500 select-none mr-2">Próximo passo</span>
                              <div
                                data-node-port="true"
                                onMouseDown={(e) => handlePortMouseDown(e, node.id, "out")}
                                className="absolute -right-[27.5px] top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-blue-500 bg-background hover:bg-blue-500 cursor-crosshair z-20 flex items-center justify-center transition-colors shadow-sm"
                                title="Próximo passo"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-slate-100 px-2 mt-auto">
                            <div className="text-center">
                              <p className="text-base font-bold text-slate-800 leading-none mb-1">0</p>
                              <p className="text-[10px] font-semibold text-[#8A3CFF] leading-none">Sucessos</p>
                            </div>
                            <div className="text-center">
                              <p className="text-base font-bold text-slate-800 leading-none mb-1">0</p>
                              <p className="text-[10px] font-semibold text-[#8A3CFF] leading-none">Alertas</p>
                            </div>
                            <div className="text-center">
                              <p className="text-base font-bold text-slate-800 leading-none mb-1">0</p>
                              <p className="text-[10px] font-semibold text-[#8A3CFF] leading-none">Erros</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Header/Title */}
                          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <div className={cn("p-1.5 rounded-lg text-white shrink-0 shadow-sm", nodeInfo.color)}>
                              <NodeIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs text-slate-800 truncate">
                                {(node.config.label as string) || nodeInfo.label}
                              </p>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                {nodeInfo.label}
                              </p>
                            </div>
                          </div>

                          {/* Card Content / Description */}
                          <div
                            className="pt-2 text-[10px] text-slate-500 font-medium line-clamp-2 min-h-[30px]"
                            title={isRandomizer ? randomizerBranches.map(b => b.label).join(node.config.mode === "round_robin" ? " → " : " · ") : undefined}
                          >
                            {isRandomizer ? (
                              randomizerBranches.length === 0 ? "Clique para configurar as ramificações..." :
                              node.config.mode === "round_robin"
                                ? randomizerBranches.map(b => b.label).join(" → ")
                                : randomizerBranches.map(b => `${b.label} — ${b.weight}%`).join(" · ")
                            ) : node.nodeType === "status" ? (
                              (() => {
                                const statusType = (node.config.statusType as string) || "text";
                                const isScheduled = node.config.scheduleType === "schedule";
                                const scheduleLabel = isScheduled ? " (Agendado)" : "";
                                if (statusType === "text") {
                                  return `[Texto] ${node.config.content || "Sem texto"}${scheduleLabel}`;
                                } else {
                                  const label = statusType === "image" ? "Imagem" : "Vídeo";
                                  return `[${label}] ${node.config.caption || node.config.url || "Sem mídia"}${scheduleLabel}`;
                                }
                              })()
                            ) : (
                              (() => {
                                if (node.nodeType === "content" && Array.isArray(node.config.messages) && node.config.messages.length > 0) {
                                  const msg = node.config.messages[0];
                                  const text = msg.content || msg.question || msg.url || msg.caption;
                                  if (text) {
                                    return `${node.config.messages.length} ação(ões): ${text}`;
                                  }
                                  return `${node.config.messages.length} ação(ões)`;
                                }
                                return node.config.content ? (node.config.content as string) :
                                node.config.question ? (node.config.question as string) :
                                node.config.url ? (node.config.url as string) :
                                node.config.seconds || node.config.minutes || node.config.hours || node.config.days ?
                                `Aguardar ${node.config.days || 0}d ${node.config.hours || 0}h ${node.config.minutes || 0}m` :
                                "Clique para configurar o bloco...";
                              })()
                            )}
                          </div>
                        </>
                      )}

                      {/* Mock Stats (DataCray aesthetic) */}
                      {!isTrigger && !isFieldOp && !isContent && (
                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400/80 border-t border-slate-100 pt-2 mt-2 select-none">
                          <span className="flex items-center gap-0.5">🟢 0</span>
                          <span className="flex items-center gap-0.5">🟡 0</span>
                          <span className="flex items-center gap-0.5">🔴 0</span>
                        </div>
                      )}
                      
                      {isFieldOp && (
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 px-2 mt-auto">
                          <div className="text-center">
                            <p className="text-base font-bold text-slate-800 leading-none mb-1">0</p>
                            <p className="text-[10px] font-semibold text-[#8A3CFF] leading-none">Sucessos</p>
                          </div>
                          <div className="text-center">
                            <p className="text-base font-bold text-slate-800 leading-none mb-1">0</p>
                            <p className="text-[10px] font-semibold text-[#8A3CFF] leading-none">Alertas</p>
                          </div>
                          <div className="text-center">
                            <p className="text-base font-bold text-slate-800 leading-none mb-1">0</p>
                            <p className="text-[10px] font-semibold text-[#8A3CFF] leading-none">Erros</p>
                          </div>
                        </div>
                      )}

                      {/* Card footer: node order only — editing is now a click on the card body, deletion lives in the hover toolbar */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
                        <span className="text-[8px] font-bold text-slate-400/60 font-mono">NODE #{node.nodeOrder + 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      </div>
      )}

      {pendingConnectionDrop && (
        <FloatingNodePicker
          nodeCategories={categories}
          anchorScreenPos={{ x: pendingConnectionDrop.screenX, y: pendingConnectionDrop.screenY }}
          onPick={handleFloatingPickerPick}
          onCancel={handleFloatingPickerCancel}
        />
      )}

      {/* The node editor is now a left-aligned Sheet handled by NodeEditorModal */}

      {/* Delete node confirmation */}
      <AlertDialog open={!!nodeIdPendingDelete} onOpenChange={(open) => { if (!open) setNodeIdPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este node?</AlertDialogTitle>
            <AlertDialogDescription>
              As conexões vinculadas também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteNode} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir node
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Central n8n-style Node Editor Modal */}
      {editingNodeId && (
        <NodeEditorModal
          isOpen={nodeEditorOpen}
          onClose={() => {
            setNodeEditorOpen(false);
            setEditingNodeId(null);
            setEditingTriggerId(undefined);
          }}
          nodeId={editingNodeId}
          activeTriggerId={editingTriggerId}
          nodes={localNodes}
          connections={localConnections}
          onUpdateNodeConfig={(id, config) => {
            updateNodesAndSave(prev => prev.map(n => n.id === id ? { ...n, config } : n));
          }}
          onSaveWorkflow={handleSaveAll}
          isSavingWorkflow={isSaving}
          isUnsavedWorkflow={autoSaveStatus === "idle"}
          mode={mode === "executions" ? "dispatch" : (localNodes.find(n => n.nodeType === "trigger")?.config.triggerConfig as any)?.isGroup ?? true ? "group" : "dispatch"}
          isGroup={(localNodes.find(n => n.nodeType === "trigger")?.config.triggerConfig as any)?.isGroup ?? true}
          sequenceId={sequenceId}
          campaignId={campaignId}
          onManualSendNode={onManualSendNode}
        />
      )}
    </div>
  );
}
