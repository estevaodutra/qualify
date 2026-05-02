import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronDown, ChevronUp, Vote, Users, Percent, Trophy, Download,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import type { PollAnalyticsData } from "@/hooks/usePollAnalytics";

const COLORS = ["hsl(var(--primary))", "hsl(142, 71%, 45%)", "hsl(45, 93%, 47%)", "hsl(var(--destructive))", "hsl(262, 83%, 58%)", "hsl(330, 81%, 60%)"];

interface PollAnalyticsCardProps {
  poll: PollAnalyticsData;
  totalMembers: number;
}

export function PollAnalyticsCard({ poll, totalMembers }: PollAnalyticsCardProps) {
  const [expanded, setExpanded] = useState(false);

  const topOption = poll.optionsStats.length > 0
    ? poll.optionsStats.reduce((a, b) => (a.votes > b.votes ? a : b))
    : null;

  const miniCards = [
    { icon: Vote, label: "Total de Votos", value: poll.totalVotes, sub: `de ${totalMembers} membros`, color: "text-primary" },
    { icon: Users, label: "Respondentes", value: poll.uniqueRespondents, sub: undefined, color: "text-blue-500" },
    { icon: Percent, label: "Taxa de Resposta", value: `${poll.responseRate}%`, sub: undefined, color: "text-green-500" },
    { icon: Trophy, label: "Mais Votada", value: topOption?.text?.slice(0, 20) || "—", sub: topOption ? `${topOption.votes} votos` : undefined, color: "text-yellow-500" },
  ];

  const handleExportVoters = () => {
    // Placeholder — would export from poll_responses
    console.log("Export voters for poll", poll.pollMessageId);
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Vote className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                {poll.questionText.length > 60 ? poll.questionText.slice(0, 60) + "..." : poll.questionText}
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Enviada: {format(new Date(poll.sentAt), "dd/MM/yyyy")}
            </p>
          </div>
          {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mini cards — always visible */}
        <div className="grid gap-3 md:grid-cols-4">
          {miniCards.map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="rounded-lg border bg-muted/30 p-3 text-center">
              <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
              <p className="text-lg font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
              {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </div>
          ))}
        </div>

        {expanded && (
          <>
            {/* Vote distribution bars */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Distribuição de Votos</h4>
              {poll.optionsStats.map((opt, idx) => (
                <div key={opt.index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{opt.text}</span>
                    <span className="text-muted-foreground">{opt.votes} ({opt.percentage}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="rounded-full h-2.5 transition-all"
                      style={{
                        width: `${opt.percentage}%`,
                        backgroundColor: COLORS[idx % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Pie chart */}
            {poll.optionsStats.length > 0 && (
              <div className="flex justify-center">
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    <Pie
                      data={poll.optionsStats}
                      dataKey="votes"
                      nameKey="text"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={85}
                      paddingAngle={3}
                      label={({ percentage }) => `${percentage}%`}
                    >
                      {poll.optionsStats.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportVoters}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Votantes
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
