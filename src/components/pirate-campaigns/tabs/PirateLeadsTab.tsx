import { useState } from "react";
import { usePirateLeads, PirateLead } from "@/hooks/usePirateLeads";
import { PirateGroup } from "@/hooks/usePirateGroups";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, BarChart3, Check, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PirateLeadsTabProps {
  campaignId: string;
  groups: PirateGroup[];
}

export function PirateLeadsTab({ campaignId, groups }: PirateLeadsTabProps) {
  const { leads, isLoading } = usePirateLeads(campaignId);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");

  const filtered = leads.filter((lead) => {
    const matchesSearch = lead.phone.includes(search);
    const matchesGroup = groupFilter === "all" || lead.groupJid === groupFilter;
    return matchesSearch && matchesGroup;
  });

  const getGroupName = (jid: string) => {
    const group = groups.find((g) => g.groupJid === jid);
    return group?.groupName || jid;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Leads Capturados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todos os grupos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.groupJid} value={g.groupJid}>
                  {g.groupName || g.groupJid}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum lead capturado ainda</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Entrou em</TableHead>
                  <TableHead>Webhook</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-mono">{lead.phone}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{getGroupName(lead.groupJid)}</TableCell>
                    <TableCell>
                      {format(new Date(lead.joinedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {lead.webhookSent ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <Check className="h-3 w-3 mr-1" />
                          Enviado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <X className="h-3 w-3 mr-1" />
                          Não enviado
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
