import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Shield,
  UserCheck,
  ShieldOff,
} from "lucide-react";
import { useAdminUsers, useToggleSuperadmin } from "@/hooks/useAdmin";
import { useSuperadmin } from "@/hooks/useSuperadmin";

// Matriz de permissões por perfil
const roleMatrix = [
  {
    module: "Acesso Global ao Super Admin (/admin/*)",
    superadmin: true,
    owner: false,
    admin: false,
    member: false,
  },
  {
    module: "Gestão Global de Empresas & Tenants",
    superadmin: true,
    owner: false,
    admin: false,
    member: false,
  },
  {
    module: "Gestão Global de Skills & Modelos de IA",
    superadmin: true,
    owner: false,
    admin: false,
    member: false,
  },
  {
    module: "Ajuste Manual de Saldo de Carteira",
    superadmin: true,
    owner: false,
    admin: false,
    member: false,
  },
  {
    module: "Configurações do Próprio Tenant / Empresa",
    superadmin: true,
    owner: true,
    admin: true,
    member: false,
  },
  {
    module: "Adicionar / Remover Membros da Empresa",
    superadmin: true,
    owner: true,
    admin: true,
    member: false,
  },
  {
    module: "Conectar WhatsApp & Contas Meta da Empresa",
    superadmin: true,
    owner: true,
    admin: true,
    member: false,
  },
  {
    module: "Disparar Campanhas & Atendimento Chat",
    superadmin: true,
    owner: true,
    admin: true,
    member: true,
  },
  {
    module: "Visualizar Logs do Sistema & Auditoria",
    superadmin: true,
    owner: false,
    admin: false,
    member: false,
  },
];

export default function AdminPermissions() {
  const { data: users = [], isLoading } = useAdminUsers();
  const { isSuperadmin } = useSuperadmin();
  const toggleSuperadmin = useToggleSuperadmin();

  const superadmins = users.filter((u) => u.is_superadmin);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Permissões &amp; Controle de Acesso (RBAC)</h1>
            <Badge variant="outline" className="text-xs">
              Políticas Globais
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Mapeamento unificado de funções (roles), privilégios de plataforma e lista de superadministradores.
          </p>
        </div>
      </div>

      {/* Superadmins Ativos */}
      <Card>
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-destructive" />
              Superadministradores da Plataforma ({superadmins.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Usuários com privilégio irrestrito de gestão, suporte, auditoria e motor de IA.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y text-xs">
            {superadmins.map((u) => (
              <div key={u.id} className="p-3 flex items-center justify-between hover:bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold">
                    {(u.full_name || u.email || "S").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{u.full_name || "Super Admin"}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="destructive" className="text-[10px]">
                    Superadmin
                  </Badge>

                  {isSuperadmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => toggleSuperadmin.mutate({ user_id: u.id, make: false })}
                    >
                      <ShieldOff className="h-3.5 w-3.5 mr-1" />
                      Revogar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Matriz de Permissões */}
      <Card>
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Matriz de Autorizações por Perfil
          </CardTitle>
          <CardDescription className="text-xs">
            Visão consolidada das capacidades por nível de acesso no sistema Qualify / Criafy.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs bg-muted/40">
                  <TableHead className="font-semibold">Recurso / Capacidade</TableHead>
                  <TableHead className="font-semibold text-center">Superadmin</TableHead>
                  <TableHead className="font-semibold text-center">Proprietário (Owner)</TableHead>
                  <TableHead className="font-semibold text-center">Administrador da Empresa</TableHead>
                  <TableHead className="font-semibold text-center">Operador / Membro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {roleMatrix.map((r, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-foreground">{r.module}</TableCell>
                    <TableCell className="text-center">
                      {r.superadmin ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.owner ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.admin ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.member ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
