import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/i18n";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import {
  CampaignsHub,
  DispatchCampaigns,
  GroupCampaignsPage,
  PirateCampaigns,
  URACampaigns,
  CallCampaigns,
  ContextCampaigns,
  ContextCampaignLogs,
} from "./pages/campaigns";
import PhoneNumbers from "./pages/PhoneNumbers";
import Logs from "./pages/Logs";
import Instances from "./pages/Instances";
import Alerts from "./pages/Alerts";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import ApiDocs from "./pages/ApiDocs";
import WebhookEvents from "./pages/WebhookEvents";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import OperatorScript from "./pages/OperatorScript";
import CallPanel from "./pages/CallPanel";
import NotFound from "./pages/NotFound";
import SchedulingLayout from "./pages/scheduling/SchedulingLayout";
import CalendarsPage from "./pages/scheduling/CalendarsPage";
import AttendantsPage from "./pages/scheduling/AttendantsPage";
import AppointmentsPage from "./pages/scheduling/AppointmentsPage";
import AnalyticsPage from "./pages/scheduling/AnalyticsPage";
import SchedulingSettingsPage from "./pages/scheduling/SchedulingSettingsPage";
import WalletPage from "./pages/wallet/WalletPage";
import ExtratoPage from "./pages/wallet/ExtratoPage";
import WalletSettingsPage from "./pages/wallet/WalletSettingsPage";
import AwaitingAccess from "./pages/AwaitingAccess";
import MembersPage from "./pages/settings/MembersPage";
import QuizFunnelsPage from "./pages/quiz/QuizFunnelsPage";
import QuizEditorPage from "./pages/quiz/QuizEditorPage";
import QuizPublicPage from "./pages/public/QuizPublicPage";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminInstances from "./pages/admin/AdminInstances";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminEventDictionary from "./pages/admin/AdminEventDictionary";
import AdminPlaceholder from "./components/admin/AdminPlaceholder";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <LanguageProvider>
          <AuthProvider>
            <CompanyProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner position="top-right" expand={true} richColors />
                <BrowserRouter>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/q/:slug" element={<QuizPublicPage />} />

                    {/* Awaiting access — authenticated but no company */}
                    <Route
                      path="/aguardando-acesso"
                      element={
                        <ProtectedRoute requireCompany={false}>
                          <AwaitingAccess />
                        </ProtectedRoute>
                      }
                    />
                    {/* Authenticated routes with AppLayout */}
                    <Route
                      element={
                        <ProtectedRoute>
                          <AppLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/painel-ligacoes" element={<CallPanel />} />
                      <Route path="/leads" element={<Leads />} />
                      <Route path="/numbers" element={<PhoneNumbers />} />
                      <Route path="/instances" element={<Instances />} />
                      <Route path="/alerts" element={<Alerts />} />
                      <Route path="/billing" element={<Billing />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/settings/profile" element={<Settings />} />
                      <Route path="/settings/account" element={<Settings />} />
                      <Route path="/settings/logs" element={<Settings />} />

                      
                      {/* Wallet routes */}
                      <Route path="/carteira" element={<WalletPage />} />
                      <Route path="/carteira/extrato" element={<ExtratoPage />} />
                      <Route path="/carteira/configuracoes" element={<WalletSettingsPage />} />
                      
                      {/* Settings sub-routes */}
                      <Route path="/configuracoes/membros" element={<MembersPage />} />

                      {/* Quiz / Funnel routes */}
                      <Route path="/quiz" element={<QuizFunnelsPage />} />
                      <Route path="/quiz/:id" element={<QuizEditorPage />} />

                      {/* Campaigns routes */}
                      <Route path="/campaigns">
                        <Route index element={<CampaignsHub />} />
                        <Route path="whatsapp/despacho" element={<DispatchCampaigns />} />
                        <Route path="whatsapp/grupos" element={<GroupCampaignsPage />} />
                        <Route path="whatsapp/pirata" element={<PirateCampaigns />} />
                        <Route path="telefonia/ura" element={<URACampaigns />} />
                        <Route path="telefonia/ligacao" element={<CallCampaigns />} />
                        <Route path="whatsapp/contexto" element={<ContextCampaigns />} />
                        <Route path="whatsapp/contexto/logs" element={<ContextCampaignLogs />} />
                      </Route>

                      {/* Scheduling routes */}
                      <Route path="/agendamentos" element={<SchedulingLayout />}>
                        <Route index element={<CalendarsPage />} />
                        <Route path="calendarios" element={<CalendarsPage />} />
                        <Route path="lista" element={<AppointmentsPage />} />
                        <Route path="atendentes" element={<AttendantsPage />} />
                        <Route path="analytics" element={<AnalyticsPage />} />
                        <Route path="configuracoes" element={<SchedulingSettingsPage />} />
                      </Route>
                    </Route>

                    {/* Special Routes (No Sidebar or Admin) */}
                    <Route
                      path="/call/script/:campaignId/:leadId"
                      element={
                        <ProtectedRoute>
                          <OperatorScript />
                        </ProtectedRoute>
                      }
                    />

                    {/* Superadmin routes */}
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requireCompany={false}>
                          <AdminRoute>
                            <AdminLayout />
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<AdminDashboard />} />
                      <Route path="empresas" element={<AdminCompanies />} />
                      <Route path="usuarios" element={<AdminUsers />} />
                      <Route path="instancias" element={<AdminInstances />} />
                      <Route path="financeiro/transacoes" element={<AdminTransactions />} />
                      <Route path="financeiro/recargas" element={<AdminPlaceholder title="Recargas" description="Gerenciamento de recargas e faturas." />} />
                      <Route path="financeiro/consumo" element={<AdminPlaceholder title="Consumo" description="Análise detalhada de consumo por empresa." />} />
                      <Route path="precos" element={<AdminPlaceholder title="Tabela de Preços" description="Configuração de custos por serviço e provedor." />} />
                      <Route path="provedores" element={<AdminPlaceholder title="Provedores" description="Monitoramento e configuração de gateways externos." />} />
                      <Route path="relatorios" element={<AdminPlaceholder title="Relatórios" description="Extração de dados e BI administrativo." />} />
                      <Route path="api" element={<ApiDocs />} />
                      <Route path="logs" element={<Logs />} />
                      <Route path="events" element={<WebhookEvents />} />
                      <Route path="dicionario" element={<AdminEventDictionary />} />
                      <Route path="configuracoes" element={<AdminPlaceholder title="Configurações" description="Ajustes globais da plataforma Qualify." />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </CompanyProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
