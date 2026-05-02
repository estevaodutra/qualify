import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/i18n";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout";

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
import OperatorScript from "./pages/OperatorScript";
import CallPanel from "./pages/CallPanel";
import NotFound from "./pages/NotFound";
import SchedulingLayout from "./pages/scheduling/SchedulingLayout";
import CalendarsPage from "./pages/scheduling/CalendarsPage";
import AttendantsPage from "./pages/scheduling/AttendantsPage";
import AppointmentsPage from "./pages/scheduling/AppointmentsPage";
import AnalyticsPage from "./pages/scheduling/AnalyticsPage";
import SchedulingSettingsPage from "./pages/scheduling/SchedulingSettingsPage";
import BookingSelectAttendant from "./pages/public/BookingSelectAttendant";
import BookingSelectSlot from "./pages/public/BookingSelectSlot";
import BookingQualification from "./pages/public/BookingQualification";
import BookingDetails from "./pages/public/BookingDetails";
import BookingSuccess from "./pages/public/BookingSuccess";
import BookingManage from "./pages/public/BookingManage";
import BookingCancel from "./pages/public/BookingCancel";
import BookingReschedule from "./pages/public/BookingReschedule";
import WalletPage from "./pages/wallet/WalletPage";
import ExtratoPage from "./pages/wallet/ExtratoPage";
import WalletSettingsPage from "./pages/wallet/WalletSettingsPage";
import AwaitingAccess from "./pages/AwaitingAccess";
import MembersPage from "./pages/settings/MembersPage";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTransactions from "./pages/admin/AdminTransactions";

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
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Public route */}
                  <Route path="/auth" element={<Auth />} />

                  {/* Awaiting access — authenticated but no company */}
                  <Route
                    path="/aguardando-acesso"
                    element={
                      <ProtectedRoute requireCompany={false}>
                        <AwaitingAccess />
                      </ProtectedRoute>
                    }
                  />

                  {/* Protected routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Dashboard />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  
                  <Route
                    path="/painel-ligacoes"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <CallPanel />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Campaigns routes */}
                  <Route
                    path="/campaigns"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Outlet />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<CampaignsHub />} />
                    {/* WhatsApp */}
                    <Route path="whatsapp/despacho" element={<DispatchCampaigns />} />
                    <Route path="whatsapp/grupos" element={<GroupCampaignsPage />} />
                    <Route path="whatsapp/pirata" element={<PirateCampaigns />} />
                    {/* Telefonia */}
                    <Route path="telefonia/ura" element={<URACampaigns />} />
                    <Route path="telefonia/ligacao" element={<CallCampaigns />} />
                  </Route>

                  {/* Scheduling routes */}
                  <Route
                    path="/agendamentos"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <SchedulingLayout />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<CalendarsPage />} />
                    <Route path="calendarios" element={<CalendarsPage />} />
                    <Route path="lista" element={<AppointmentsPage />} />
                    <Route path="atendentes" element={<AttendantsPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="configuracoes" element={<SchedulingSettingsPage />} />
                  </Route>

                  {/* Operator Call Script Route (minimal UI, no sidebar) */}
                  <Route
                    path="/call/script/:campaignId/:leadId"
                    element={
                      <ProtectedRoute>
                        <OperatorScript />
                      </ProtectedRoute>
                    }
                  />
                  
                  <Route
                    path="/leads"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Leads />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/numbers"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <PhoneNumbers />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/logs"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Logs />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instances"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Instances />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/events"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <WebhookEvents />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/alerts"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Alerts />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/billing"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Billing />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Settings />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/carteira"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <WalletPage />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/carteira/extrato"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <ExtratoPage />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/carteira/configuracoes"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <WalletSettingsPage />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/configuracoes/membros"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <MembersPage />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/api-docs"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <ApiDocs />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Superadmin routes */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requireCompany={false}>
                        <AdminRoute>
                          <AdminLayout>
                            <Outlet />
                          </AdminLayout>
                        </AdminRoute>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<AdminDashboard />} />
                    <Route path="empresas" element={<AdminCompanies />} />
                    <Route path="usuarios" element={<AdminUsers />} />
                    <Route path="financeiro/transacoes" element={<AdminTransactions />} />
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
