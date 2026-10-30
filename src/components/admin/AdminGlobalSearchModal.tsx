import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Building2,
  Users,
  Sparkles,
  Layers,
  Settings,
  Activity,
  AlertTriangle,
  Radio,
  FileCode,
  LayoutDashboard,
  CreditCard,
  ShieldCheck,
  Gauge,
  Workflow,
  Cpu,
} from "lucide-react";
import { useAdminCompanies, useAdminUsers } from "@/hooks/useAdmin";
import { AIExecutionService } from "@/services/ai/aiExecutionService";
import { useQuery } from "@tanstack/react-query";

interface AdminGlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminGlobalSearchModal({ open, onOpenChange }: AdminGlobalSearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const { data: companies = [] } = useAdminCompanies();
  const { data: users = [] } = useAdminUsers();

  const { data: executions = [] } = useQuery({
    queryKey: ["admin", "ai", "search-executions"],
    queryFn: () => AIExecutionService.listExecutions({ limit: 30 }),
    enabled: open,
    staleTime: 60_000,
  });

  // Atalho de teclado Ctrl+K ou Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = (callback: () => void) => {
    onOpenChange(false);
    callback();
  };

  const filteredCompanies = companies.slice(0, 8);
  const filteredUsers = users.slice(0, 8);
  const filteredExecutions = executions.slice(0, 6);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar empresas, usuários, execuções de IA, logs ou atalhos..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado para a busca.</CommandEmpty>

        {/* Navegação Rápida */}
        <CommandGroup heading="Navegação Rápida">
          <CommandItem onSelect={() => handleSelect(() => navigate("/admin"))}>
            <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
            <span>Dashboard Geral</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/admin/empresas"))}>
            <Building2 className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Empresas</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/admin/usuarios"))}>
            <Users className="mr-2 h-4 w-4 text-blue-500" />
            <span>Usuários da Plataforma</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/admin/ia/skills"))}>
            <Layers className="mr-2 h-4 w-4 text-purple-500" />
            <span>IA &gt; Skills Globais</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/admin/ia/modelos"))}>
            <Cpu className="mr-2 h-4 w-4 text-amber-500" />
            <span>IA &gt; Perfis de Modelos</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/admin/ia/execucoes"))}>
            <Activity className="mr-2 h-4 w-4 text-rose-500" />
            <span>IA &gt; Rastreabilidade de Execuções</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/admin/integracoes/whatsapp"))}>
            <Radio className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Integrações &gt; WhatsApp</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/admin/integracoes/meta"))}>
            <Workflow className="mr-2 h-4 w-4 text-indigo-500" />
            <span>Integrações &gt; Meta / Instagram (Criafy)</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/admin/sistema/logs"))}>
            <Activity className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Sistema &gt; Central de Logs</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/admin/sistema/erros"))}>
            <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
            <span>Sistema &gt; Diagnóstico de Erros</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Empresas */}
        {filteredCompanies.length > 0 && (
          <CommandGroup heading="Empresas">
            {filteredCompanies.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.name} ${c.owner_email || ""}`}
                onSelect={() => handleSelect(() => navigate(`/admin/empresas/${c.id}`))}
              >
                <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{c.owner_email}</span>
                <span
                  className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
                    c.is_active
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {c.is_active ? "Ativa" : "Inativa"}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Usuários */}
        {filteredUsers.length > 0 && (
          <CommandGroup heading="Usuários">
            {filteredUsers.map((u) => (
              <CommandItem
                key={u.id}
                value={`${u.full_name || ""} ${u.email}`}
                onSelect={() => handleSelect(() => navigate(`/admin/usuarios?search=${encodeURIComponent(u.email)}`))}
              >
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{u.full_name || u.email}</span>
                <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>
                {u.is_superadmin && (
                  <span className="ml-auto text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-medium">
                    Superadmin
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Execuções de IA */}
        {filteredExecutions.length > 0 && (
          <CommandGroup heading="Execuções Recentes de IA">
            {filteredExecutions.map((ex) => (
              <CommandItem
                key={ex.id}
                value={`${ex.id} ${ex.action} ${ex.skill_name || ""}`}
                onSelect={() => handleSelect(() => navigate(`/admin/ia/execucoes?id=${ex.id}`))}
              >
                <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                <span className="font-medium">{ex.skill_name || ex.action}</span>
                <span className="ml-2 text-xs text-muted-foreground font-mono">
                  {ex.id.substring(0, 8)}...
                </span>
                <span
                  className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
                    ex.status === "COMPLETED"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : ex.status === "FAILED"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  {ex.status}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
