import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { VersionUpdateBalloon } from "@/components/version/VersionUpdateBalloon";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/i18n";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Groups from "./pages/Groups";
import Disparos from "./pages/Disparos";
import Pipelines from "./pages/Pipelines";
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
import ProspectingCampaigns from "./pages/prospecting/ProspectingCampaigns";
import ProspectingCampaignLeads from "./pages/prospecting/ProspectingCampaignLeads";
import GroupSequenceBuilderPage from "./pages/campaigns/GroupSequenceBuilderPage";
import DispatchSequenceBuilderPage from "./pages/campaigns/DispatchSequenceBuilderPage";
import WorkflowLibrary from "./pages/workflows/WorkflowLibrary";
import WorkflowBuilderPage from "./pages/workflows/WorkflowBuilderPage";
import Logs from "./pages/Logs";
import Instances from "./pages/Instances";
import Alerts from "./pages/Alerts";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import ApiDocs from "./pages/ApiDocs";
import WebhookDocs from "./pages/WebhookDocs";
import WebhookEvents from "./pages/WebhookEvents";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
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
import CriafyHub from "./pages/criafy/CriafyHub";
import AccountStrategyPage from "./pages/criafy/AccountStrategyPage";
import SprintOSPage from "./features/sprint-os/ui/SprintOSPage";
import SprintAppPage from "./features/sprint/SprintAppPage";
import SprintOSSharedPage from "./features/sprint-os/ui/SprintOSSharedPage";
import CriafyPublicBriefingPage from "./features/sprint-os/ui/CriafyPublicBriefingPage";

// Super Admin Core
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminCompanyDetail from "./pages/admin/AdminCompanyDetail";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import { AdminPlansLayout } from "./components/admin/plans/AdminPlansLayout";
import AdminPlanOverview from "./pages/admin/plans/AdminPlanOverview";
import AdminPlanLimits from "./pages/admin/plans/AdminPlanLimits";
import AdminPlanCredits from "./pages/admin/plans/AdminPlanCredits";
import AdminPlanBonus from "./pages/admin/plans/AdminPlanBonus";
import AdminPlanTrial from "./pages/admin/plans/AdminPlanTrial";
import AdminPlanSignupOffers from "./pages/admin/plans/AdminPlanSignupOffers";
import AdminPlanSubscriptions from "./pages/admin/plans/AdminPlanSubscriptions";
import AdminPlanHistory from "./pages/admin/plans/AdminPlanHistory";
import AdminPermissions from "./pages/admin/AdminPermissions";
import AdminUsage from "./pages/admin/AdminUsage";

// Super Admin - IA
import { AdminAiLayout } from "./components/admin/ai/AdminAiLayout";
import AdminAiOverview from "./pages/admin/ai/AdminAiOverview";
import AdminAiSkills from "./pages/admin/ai/AdminAiSkills";
import AdminAiSkillDetail from "./pages/admin/ai/AdminAiSkillDetail";
import AdminAiModels from "./pages/admin/ai/AdminAiModels";
import AdminAiPlayground from "./pages/admin/ai/AdminAiPlayground";
import AdminAiExecutions from "./pages/admin/ai/AdminAiExecutions";
import AdminAiSettings from "./pages/admin/ai/AdminAiSettings";

// Super Admin - Integrações
import { AdminIntegrationsLayout } from "./components/admin/integrations/AdminIntegrationsLayout";
import AdminOpenAiIntegration from "./pages/admin/integrations/AdminOpenAiIntegration";
import AdminMetaIntegration from "./pages/admin/integrations/AdminMetaIntegration";
import AdminWhatsAppIntegration from "./pages/admin/integrations/AdminWhatsAppIntegration";
import AdminWebhooksIntegration from "./pages/admin/integrations/AdminWebhooksIntegration";
import AdminOtherIntegrations from "./pages/admin/integrations/AdminOtherIntegrations";
import AdminApifyIntegration from "./pages/admin/integrations/AdminApifyIntegration";

// Super Admin - Conteúdo & Operação
import { AdminContentLayout } from "./components/admin/content/AdminContentLayout";
import AdminGlobalTemplates from "./pages/admin/content/AdminGlobalTemplates";
import AdminCategories from "./pages/admin/content/AdminCategories";
import AdminGlobalAssets from "./pages/admin/content/AdminGlobalAssets";
import AdminPlatformRules from "./pages/admin/content/AdminPlatformRules";

// Super Admin - Sistema
import { AdminSystemLayout } from "./components/admin/system/AdminSystemLayout";
import AdminSystemLogs from "./pages/admin/system/AdminSystemLogs";
import AdminSystemErrors from "./pages/admin/system/AdminSystemErrors";
import AdminSystemJobs from "./pages/admin/system/AdminSystemJobs";
import AdminSystemAudit from "./pages/admin/system/AdminSystemAudit";
import AdminSystemFeatureFlags from "./pages/admin/system/AdminSystemFeatureFlags";
import AdminSystemSettings from "./pages/admin/system/AdminSystemSettings";

// Legacy components / Aliases
import AdminInstances from "./pages/admin/AdminInstances";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminEventDictionary from "./pages/admin/AdminEventDictionary";
import AdminPlaceholder from "./components/admin/AdminPlaceholder";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSystemWebhooks from "./pages/admin/AdminSystemWebhooks";
import AdminUras from "./pages/admin/AdminUras";
import AdminCriafy from "./pages/admin/AdminCriafy";

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
                <VersionUpdateBalloon />
                <BrowserRouter>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/redefinir-senha" element={<ResetPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/webhook-docs" element={<WebhookDocs />} />
                    <Route path="/q/:slug" element={<QuizPublicPage />} />
                    <Route path="/sprint-os/shared/:token" element={<SprintOSSharedPage />} />
                    <Route path="/briefing/:token" element={<CriafyPublicBriefingPage />} />
                    <Route path="/criafy/briefing/:token" element={<CriafyPublicBriefingPage />} />

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
                      <Route path="/chat/:conversationId" element={<Chat />} />
                      <Route path="/painel-ligacoes" element={<CallPanel />} />
                      <Route path="/leads" element={<Leads />} />
                      <Route path="/groups" element={<Groups />} />
                      <Route path="/disparos" element={<Disparos />} />
                      <Route path="/pipelines" element={<Pipelines />} />
                      <Route path="/instances" element={<Instances />} />
                      <Route path="/alerts" element={<Navigate to="/" replace />} />
                      <Route path="/billing" element={<Billing />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/settings/profile" element={<Settings />} />
                      <Route path="/settings/account" element={<Settings />} />
                      <Route path="/settings/members" element={<Settings />} />
                      <Route path="/settings/connections" element={<Settings />} />
                      <Route path="/settings/custom-fields" element={<Settings />} />
                      <Route path="/settings/tags" element={<Settings />} />
                      <Route path="/settings/cleanup" element={<Settings />} />
                      <Route path="/settings/logs" element={<Settings />} />
                      <Route path="/settings/fields" element={<Settings />} />
                      <Route path="/settings/credentials" element={<Settings />} />

                      {/* Wallet routes */}
                      <Route path="/carteira" element={<WalletPage />} />
                      <Route path="/carteira/extrato" element={<ExtratoPage />} />
                      <Route path="/carteira/configuracoes" element={<WalletSettingsPage />} />

                      {/* Settings sub-routes */}
                      <Route path="/configuracoes/membros" element={<Settings />} />

                      {/* Quiz / Funnel routes */}
                      <Route path="/sprint" element={<SprintAppPage />} />
                      <Route path="/sprint/b/:boardId" element={<SprintAppPage />} />
                      <Route path="/sprint-os" element={<SprintOSPage />} />
                      <Route path="/sprint-os/:workspaceId" element={<SprintOSPage />} />
                      <Route path="/cronogramas" element={<SprintOSPage />} />
                      <Route path="/cronogramas/:workspaceId" element={<SprintOSPage />} />
                      <Route path="/criafy" element={<CriafyHub />} />
                      <Route path="/criafy/estrategia/:accountId" element={<AccountStrategyPage />} />
                      <Route path="/criafy/manual-da-marca" element={<Navigate to="/criafy?tab=manual-marca" replace />} />
                      <Route path="/criafy/manual-da-marca/:workspaceId" element={<Navigate to="/criafy?tab=manual-marca" replace />} />
                      <Route path="/manual-da-marca" element={<Navigate to="/criafy?tab=manual-marca" replace />} />
                      <Route path="/manual-da-marca/:workspaceId" element={<Navigate to="/criafy?tab=manual-marca" replace />} />
                      <Route path="/quiz" element={<QuizFunnelsPage />} />
                      <Route path="/quiz/:id" element={<QuizEditorPage />} />

                      {/* Prospecting routes */}
                      <Route path="/prospeccao" element={<ProspectingCampaigns />} />
                      <Route path="/prospeccao/:id" element={<ProspectingCampaignLeads />} />

                      {/* Campaigns / Workflows routes */}
                      <Route path="/workflows" element={<WorkflowLibrary />} />
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

                    {/* Special Routes */}
                    <Route
                      path="/call/script/:campaignId/:leadId"
                      element={
                        <ProtectedRoute>
                          <OperatorScript />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/campaigns/whatsapp/grupos/:campaignId/sequences/:sequenceId/builder"
                      element={
                        <ProtectedRoute>
                          <GroupSequenceBuilderPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/campaigns/whatsapp/despacho/:campaignId/sequences/:sequenceId/builder"
                      element={
                        <ProtectedRoute>
                          <DispatchSequenceBuilderPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/workflows/:workflowId/builder"
                      element={
                        <ProtectedRoute>
                          <WorkflowBuilderPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* ============================================================ */}
                    {/* SUPER ADMIN — CENTRO DE CONTROLE QUALIFY / CRIAFY */}
                    {/* ============================================================ */}
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
                      {/* 1. VISÃO GERAL */}
                      <Route index element={<AdminDashboard />} />
                      <Route path="dashboard" element={<Navigate to="/admin" replace />} />

                      {/* 2. PLATAFORMA */}
                      <Route path="empresas" element={<AdminCompanies />} />
                      <Route path="empresas/:id" element={<AdminCompanyDetail />} />
                      <Route path="usuarios" element={<AdminUsers />} />
                      {/* Sub-módulo Planos & Assinaturas com Subsidebar Contextual */}
                      <Route path="planos" element={<AdminPlansLayout />}>
                        <Route index element={<AdminPlanOverview />} />
                        <Route path="limites" element={<AdminPlanLimits />} />
                        <Route path="creditos" element={<AdminPlanCredits />} />
                        <Route path="bonus" element={<AdminPlanBonus />} />
                        <Route path="trial" element={<AdminPlanTrial />} />
                        <Route path="links" element={<AdminPlanSignupOffers />} />
                        <Route path="assinaturas" element={<AdminPlanSubscriptions />} />
                        <Route path="historico" element={<AdminPlanHistory />} />
                      </Route>
                      <Route path="permissoes" element={<AdminPermissions />} />
                      <Route path="uso" element={<AdminUsage />} />

                      {/* 3. IA */}
                      <Route path="ia" element={<AdminAiLayout />}>
                        <Route index element={<AdminAiOverview />} />
                        <Route path="skills" element={<AdminAiSkills />} />
                        <Route path="skills/:id" element={<AdminAiSkillDetail />} />
                        <Route path="modelos" element={<AdminAiModels />} />
                        <Route path="playground" element={<AdminAiPlayground />} />
                        <Route path="execucoes" element={<AdminAiExecutions />} />
                        <Route path="configuracoes" element={<AdminAiSettings />} />
                      </Route>
                      <Route path="ai" element={<Navigate to="/admin/ia" replace />} />
                      <Route path="ai/*" element={<Navigate to="/admin/ia" replace />} />

                      {/* 4. INTEGRAÇÕES */}
                      <Route path="integracoes" element={<AdminIntegrationsLayout />}>
                        <Route index element={<Navigate to="/admin/integracoes/openai" replace />} />
                        <Route path="openai" element={<AdminOpenAiIntegration />} />
                        <Route path="meta" element={<AdminMetaIntegration />} />
                        <Route path="whatsapp" element={<AdminWhatsAppIntegration />} />
                        <Route path="webhooks" element={<AdminWebhooksIntegration />} />
                        <Route path="apify" element={<AdminApifyIntegration />} />
                        <Route path="outras" element={<AdminOtherIntegrations />} />
                      </Route>

                      {/* 5. CONTEÚDO & OPERAÇÃO */}
                      <Route path="conteudo" element={<AdminContentLayout />}>
                        <Route index element={<Navigate to="/admin/conteudo/templates" replace />} />
                        <Route path="templates" element={<AdminGlobalTemplates />} />
                        <Route path="categorias" element={<AdminCategories />} />
                        <Route path="assets" element={<AdminGlobalAssets />} />
                        <Route path="regras" element={<AdminPlatformRules />} />
                      </Route>

                      {/* 6. SISTEMA */}
                      <Route path="sistema" element={<AdminSystemLayout />}>
                        <Route index element={<Navigate to="/admin/sistema/logs" replace />} />
                        <Route path="logs" element={<AdminSystemLogs />} />
                        <Route path="erros" element={<AdminSystemErrors />} />
                        <Route path="jobs" element={<AdminSystemJobs />} />
                        <Route path="auditoria" element={<AdminSystemAudit />} />
                        <Route path="feature-flags" element={<AdminSystemFeatureFlags />} />
                        <Route path="configuracoes" element={<AdminSystemSettings />} />
                      </Route>

                      {/* ALIASES / MIGRATION REDIRECTS PARA PRESERVAÇÃO DE ROTAS ANTIGAS */}
                      <Route path="instancias" element={<Navigate to="/admin/integracoes/whatsapp" replace />} />
                      <Route path="criafy" element={<Navigate to="/admin/integracoes/meta" replace />} />
                      <Route path="logs" element={<Navigate to="/admin/sistema/logs" replace />} />
                      <Route path="events" element={<Navigate to="/admin/integracoes/webhooks" replace />} />
                      <Route path="dicionario" element={<AdminEventDictionary />} />
                      <Route path="configuracoes" element={<Navigate to="/admin/sistema/configuracoes" replace />} />
                      <Route path="notificacoes" element={<Navigate to="/admin/integracoes/webhooks" replace />} />
                      <Route path="uras" element={<Navigate to="/admin/integracoes/outras" replace />} />
                      <Route path="financeiro/transacoes" element={<AdminTransactions />} />
                      <Route path="financeiro/recargas" element={<Navigate to="/admin/planos" replace />} />
                      <Route path="financeiro/consumo" element={<Navigate to="/admin/uso" replace />} />
                      <Route path="precos" element={<Navigate to="/admin/planos" replace />} />
                      <Route path="provedores" element={<Navigate to="/admin/integracoes/outras" replace />} />
                      <Route path="relatorios" element={<Navigate to="/admin" replace />} />
                      <Route path="api" element={<ApiDocs />} />
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
