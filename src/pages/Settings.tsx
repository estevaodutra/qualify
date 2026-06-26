import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Save, Globe, Bell, Shield, Palette, Loader2, Check, Copy, Plus, 
  Trash2, Eye, EyeOff, AlertTriangle, Key, User as UserIcon, Building2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { useLanguage } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { ImageUpload } from "@/components/settings/ImageUpload";
import { CompanyLogsTab } from "@/components/settings/CompanyLogsTab";
import { useLocation, useNavigate } from "react-router-dom";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_four: string;
  environment: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export default function Settings() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const { activeCompany, refetch: refreshCompanies } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [showNewKeyResultDialog, setShowNewKeyResultDialog] = useState(false);
  
  // Tab handling
  const getTabFromPath = () => {
    const path = location.pathname;
    if (path.includes("/settings/profile")) return "profile";
    if (path.includes("/settings/account")) return "security";
    if (path.includes("/settings/logs")) return "logs";
    return "company";
  };
  
  const [activeTab, setActiveTab] = useState(getTabFromPath());

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "profile") navigate("/settings/profile");
    else if (value === "security") navigate("/settings/account");
    else if (value === "logs") navigate("/settings/logs");
    else navigate("/settings");
  };

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnvironment, setNewKeyEnvironment] = useState<"production" | "test">("production");
  const [generatedKey, setGeneratedKey] = useState("");
  const [showGeneratedKey, setShowGeneratedKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  
  // Form state
  const [settings, setSettings] = useState({
    companyName: "",
    logoUrl: "",
    fullName: "",
    avatarUrl: "",
    timezone: "america_sao_paulo",
    emailNotifications: true,
    webhookNotifications: false,
    highFailureAlerts: true,
    providerOutageAlerts: true,
    sessionTimeout: "60",
    compactMode: false,
  });

  // Load initial data
  useEffect(() => {
    if (user) {
      setSettings(prev => ({
        ...prev,
        fullName: user.user_metadata?.full_name || "",
        avatarUrl: user.user_metadata?.avatar_url || "",
      }));
      
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url, full_name')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setSettings(prev => ({
            ...prev,
            fullName: data.full_name || prev.fullName,
            avatarUrl: data.avatar_url || prev.avatarUrl,
          }));
        }
      };
      fetchProfile();
    }
    
    if (activeCompany) {
      setSettings(prev => ({
        ...prev,
        companyName: activeCompany.name || "",
        logoUrl: activeCompany.logo_url || "",
      }));
    }
  }, [user, activeCompany]);

  // Fetch API keys
  const fetchApiKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-api-key', {
        method: 'GET',
      });

      if (error) throw error;
      setApiKeys(data.keys || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast({
        title: t("common.error"),
        description: t("settings.errorLoadingKeys"),
        variant: "destructive",
      });
    } finally {
      setIsLoadingKeys(false);
    }
  };

  useEffect(() => {
    if (showApiKeyDialog) {
      fetchApiKeys();
    }
  }, [showApiKeyDialog]);

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: t("common.error"),
        description: t("settings.keyNameRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingKey(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-api-key', {
        method: 'POST',
        body: { 
          name: newKeyName.trim(), 
          environment: newKeyEnvironment 
        },
      });

      if (error) throw error;

      setGeneratedKey(data.key);
      setShowNewKeyDialog(false);
      setShowNewKeyResultDialog(true);
      setNewKeyName("");
      fetchApiKeys();
      
      toast({
        title: t("common.success"),
        description: t("settings.keyGenerated"),
      });
    } catch (error) {
      console.error('Error generating API key:', error);
      toast({
        title: t("common.error"),
        description: t("settings.errorGeneratingKey"),
        variant: "destructive",
      });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    setRevokingKeyId(keyId);
    try {
      const { error } = await supabase.functions.invoke('generate-api-key', {
        method: 'DELETE',
        body: { id: keyId },
      });

      if (error) throw error;

      fetchApiKeys();
      toast({
        title: t("common.success"),
        description: t("settings.keyRevoked"),
      });
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast({
        title: t("common.error"),
        description: t("settings.errorRevokingKey"),
        variant: "destructive",
      });
    } finally {
      setRevokingKeyId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t("apiDocs.copied"),
      description: t("settings.keyCopied"),
    });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: settings.fullName,
            avatar_url: settings.avatarUrl
          })
          .eq('id', user.id);
        
        if (profileError) throw profileError;

        await supabase.auth.updateUser({
          data: { 
            full_name: settings.fullName,
            avatar_url: settings.avatarUrl
          }
        });
      }

      if (activeCompany) {
        const { error: companyError } = await supabase
          .from('companies')
          .update({
            name: settings.companyName,
            logo_url: settings.logoUrl
          })
          .eq('id', activeCompany.id);
        
        if (companyError) throw companyError;
        refreshCompanies();
      }

      toast({
        title: "Configurações salvas",
        description: "Suas alterações foram aplicadas com sucesso.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnable2FA = () => {
    setShow2FADialog(true);
  };

  const confirm2FA = () => {
    setShow2FADialog(false);
    toast({
      title: t("settings.twoFactorEnabled"),
      description: t("settings.twoFactorEnabled"),
    });
  };

  const handleManageApiKeys = () => {
    setShowApiKeyDialog(true);
  };

  const handleToggleChange = (key: keyof typeof settings) => (checked: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: checked }));
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value as "en" | "pt" | "es");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getMaskedKey = (prefix: string, lastFour: string) => {
    return `${prefix}${'•'.repeat(28)}${lastFour}`;
  };

  return (
    <div className="space-y-10 pb-10">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
        actions={
          <Button className="h-10 px-6 gap-2.5 rounded-xl gradient-primary glow-primary font-['Sora'] font-semibold shadow-lg transition-all hover:opacity-90 active:scale-95" onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <Save className="h-4.5 w-4.5" />
            )}
            {isSaving ? t("settings.saving") : t("settings.saveChanges")}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start border-b border-border/20 bg-transparent rounded-none p-0 mb-8 overflow-x-auto flex-nowrap hide-scrollbar">
          <TabsTrigger value="company" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8A3CFF] data-[state=active]:text-[#8A3CFF] data-[state=active]:font-semibold text-muted-foreground hover:text-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 transition-colors">Empresa</TabsTrigger>
          <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8A3CFF] data-[state=active]:text-[#8A3CFF] data-[state=active]:font-semibold text-muted-foreground hover:text-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 transition-colors">Perfil</TabsTrigger>
          <TabsTrigger value="security" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8A3CFF] data-[state=active]:text-[#8A3CFF] data-[state=active]:font-semibold text-muted-foreground hover:text-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 transition-colors">Segurança</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8A3CFF] data-[state=active]:text-[#8A3CFF] data-[state=active]:font-semibold text-muted-foreground hover:text-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 transition-colors">Notificações</TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8A3CFF] data-[state=active]:text-[#8A3CFF] data-[state=active]:font-semibold text-muted-foreground hover:text-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 transition-colors">Aparência</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8A3CFF] data-[state=active]:text-[#8A3CFF] data-[state=active]:font-semibold text-muted-foreground hover:text-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 transition-colors">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-8 outline-none animate-fade-in">
          <Card className="border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden transition-colors hover:border-[#8A3CFF]/20">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold tracking-tight">Dados da Empresa</CardTitle>
                  <CardDescription className="text-xs font-medium text-muted-foreground/60">Gerencie a identidade e configurações da sua organização.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Logo da Empresa</Label>
                  <ImageUpload 
                    currentUrl={settings.logoUrl} 
                    onUploadSuccess={(url) => setSettings(prev => ({ ...prev, logoUrl: url }))}
                    type="company"
                    name={settings.companyName}
                  />
                </div>

                <div className="flex-1 w-full space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2.5">
                      <Label htmlFor="company" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">{t("settings.companyName")}</Label>
                      <Input
                        id="company"
                        value={settings.companyName}
                        onChange={(e) => setSettings((prev) => ({ ...prev, companyName: e.target.value }))}
                        placeholder={t("settings.companyNamePlaceholder")}
                        className="h-11 rounded-xl border-border/40 bg-background/40 transition-all focus:bg-background"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <Label htmlFor="timezone" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">{t("settings.timezone")}</Label>
                      <Select
                        value={settings.timezone}
                        onValueChange={(value) => setSettings((prev) => ({ ...prev, timezone: value }))}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-border/40 bg-background/40 transition-all">
                          <SelectValue placeholder={t("settings.selectTimezone")} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="america_sao_paulo">America/Sao_Paulo (BRT)</SelectItem>
                          <SelectItem value="america_new_york">America/New_York (EST)</SelectItem>
                          <SelectItem value="europe_london">Europe/London (GMT)</SelectItem>
                          <SelectItem value="asia_tokyo">Asia/Tokyo (JST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="language" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">{t("settings.language")}</Label>
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="h-11 w-full md:w-[240px] rounded-xl border-border/40 bg-background/40 transition-all">
                        <SelectValue placeholder={t("settings.selectLanguage")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="en">English (US)</SelectItem>
                        <SelectItem value="pt">Português (BR)</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-8 outline-none animate-fade-in">
          <Card className="border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden transition-colors hover:border-[#8A3CFF]/20">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <UserIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold tracking-tight">Meu Perfil</CardTitle>
                  <CardDescription className="text-xs font-medium text-muted-foreground/60">Atualize suas informações pessoais e foto de perfil.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Foto de Perfil</Label>
                  <ImageUpload 
                    currentUrl={settings.avatarUrl} 
                    onUploadSuccess={(url) => setSettings(prev => ({ ...prev, avatarUrl: url }))}
                    type="profile"
                    name={settings.fullName}
                  />
                </div>

                <div className="flex-1 w-full space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2.5">
                      <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Nome Completo</Label>
                      <Input
                        id="fullName"
                        value={settings.fullName}
                        onChange={(e) => setSettings((prev) => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Seu nome"
                        className="h-11 rounded-xl border-border/40 bg-background/40 transition-all focus:bg-background"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Email</Label>
                      <Input
                        value={user?.email || ""}
                        disabled
                        className="h-11 rounded-xl border-border/40 bg-muted/20 opacity-60 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-8 outline-none animate-fade-in">
          <Card className="border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden transition-colors hover:border-[#8A3CFF]/20">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold tracking-tight">{t("settings.notifications")}</CardTitle>
                <CardDescription className="text-xs font-medium text-muted-foreground/60">{t("settings.notificationsDescription")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/10 transition-colors hover:bg-muted/30">
              <div className="space-y-1">
                <Label className="text-sm font-bold text-foreground">{t("settings.emailNotifications")}</Label>
                <p className="text-xs font-medium text-muted-foreground/60 max-w-md">
                  {t("settings.emailNotificationsDescription")}
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={handleToggleChange("emailNotifications")}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/10 transition-colors hover:bg-muted/30">
              <div className="space-y-1">
                <Label className="text-sm font-bold text-foreground">{t("settings.smsAlerts")}</Label>
                <p className="text-xs font-medium text-muted-foreground/60 max-w-md">
                  {t("settings.smsAlertsDescription")}
                </p>
              </div>
              <Switch
                checked={settings.webhookNotifications}
                onCheckedChange={handleToggleChange("webhookNotifications")}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/10 transition-colors hover:bg-muted/30">
              <div className="space-y-1">
                <Label className="text-sm font-bold text-foreground">{t("settings.slackIntegration")}</Label>
                <p className="text-xs font-medium text-muted-foreground/60 max-w-md">
                  {t("settings.slackIntegrationDescription")}
                </p>
              </div>
              <Switch
                checked={settings.highFailureAlerts}
                onCheckedChange={handleToggleChange("highFailureAlerts")}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-8 outline-none animate-fade-in">
          <Card className="border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden transition-colors hover:border-[#8A3CFF]/20">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold tracking-tight">{t("settings.security")}</CardTitle>
                <CardDescription className="text-xs font-medium text-muted-foreground/60">{t("settings.securityDescription")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/20 border border-border/10 transition-all hover:bg-muted/30">
              <div className="space-y-1">
                <Label className="text-sm font-bold text-foreground">{t("settings.twoFactorAuth")}</Label>
                <p className="text-xs font-medium text-muted-foreground/60 max-w-md">
                  {t("settings.twoFactorDescription")}
                </p>
              </div>
              <Button variant="outline" className="h-10 rounded-xl px-5 font-bold border-border/40 bg-background/50 hover:bg-background transition-all" onClick={handleEnable2FA}>
                {t("settings.enable2FA")}
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/20 border border-border/10 transition-all hover:bg-muted/30">
              <div className="space-y-1">
                <Label className="text-sm font-bold text-foreground">{t("settings.apiKeys")}</Label>
                <p className="text-xs font-medium text-muted-foreground/60 max-w-md">
                  {t("settings.apiKeysDescription")}
                </p>
              </div>
              <Button variant="outline" className="h-10 rounded-xl px-5 font-bold border-border/40 bg-background/50 hover:bg-background transition-all" onClick={handleManageApiKeys}>
                {t("settings.manageKeys")}
              </Button>
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-8 outline-none animate-fade-in">
          <Card className="border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden transition-colors hover:border-[#8A3CFF]/20">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold tracking-tight">{t("settings.appearance")}</CardTitle>
                <CardDescription className="text-xs font-medium text-muted-foreground/60">{t("settings.appearanceDescription")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/10">
              <div className="space-y-1">
                <Label className="text-sm font-bold text-foreground">{t("settings.darkMode")}</Label>
                <p className="text-xs font-medium text-muted-foreground/60">
                  {t("settings.darkModeDescription")}
                </p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => {
                  setTheme(checked ? "dark" : "light");
                }}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-8 outline-none animate-fade-in">
          <CompanyLogsTab companyId={activeCompany?.id} />
        </TabsContent>
      </Tabs>

      {/* 2FA Dialog */}
      {show2FADialog && (
        <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
          <DialogContent className="max-w-md rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{t("settings.enable2FATitle")}</DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground/70">
                {t("settings.scanQRCode")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-8">
              <div className="h-52 w-52 rounded-2xl bg-white p-4 shadow-inner border-2 border-primary/20">
                <div className="h-full w-full bg-muted/20 rounded-lg flex items-center justify-center border-dashed border-2 border-border/40">
                  <span className="text-muted-foreground/40 text-[10px] font-bold uppercase tracking-widest">QR Code Placeholder</span>
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="verify-code" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">{t("settings.verificationCode")}</Label>
              <Input id="verify-code" placeholder="000 000" className="h-12 text-center text-lg font-mono tracking-[0.5em] rounded-xl border-border/40" />
            </div>
            <DialogFooter className="pt-4 gap-3">
              <Button variant="outline" className="rounded-xl font-semibold border-border/40" onClick={() => setShow2FADialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={confirm2FA} className="rounded-xl font-['Sora'] font-semibold gradient-primary glow-primary px-8">
                <Check className="mr-2 h-4.5 w-4.5" />
                {t("settings.verify")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* API Keys List Dialog */}
      {showApiKeyDialog && (
        <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
          <DialogContent className="max-w-2xl rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl font-bold">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                {t("settings.manageAPIKeys")}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground/70">
                {t("settings.apiKeysListDescription")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-6 max-h-[440px] overflow-y-auto px-1">
              {isLoadingKeys ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Carregando chaves...</p>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-20 bg-muted/10 rounded-2xl border border-dashed border-border/40">
                  <Key className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
                  <p className="font-bold text-foreground mb-1">{t("settings.noKeysYet")}</p>
                  <p className="text-sm font-medium text-muted-foreground/60">{t("settings.createFirstKey")}</p>
                </div>
              ) : (
                apiKeys.map((key) => (
                  <div 
                    key={key.id} 
                    className={cn(
                      "group rounded-2xl border border-border/20 p-5 transition-all hover:bg-muted/30 hover:border-border/60",
                      key.revoked_at ? 'opacity-50 bg-muted/20 grayscale' : 'bg-muted/10'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-foreground truncate">{key.name}</p>
                          <Badge className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border-none",
                            key.environment === 'production' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          )}>
                            {key.environment === 'production' ? 'Production' : 'Test'}
                          </Badge>
                          {key.revoked_at && (
                            <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-widest border-none">{t("settings.revoked")}</Badge>
                          )}
                        </div>
                        <div className="relative group/key">
                          <p className="font-mono text-sm font-bold text-muted-foreground/70 bg-background/50 rounded-lg px-3 py-2 border border-border/10">
                            {getMaskedKey(key.key_prefix, key.last_four)}
                          </p>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md opacity-0 group-hover/key:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(getMaskedKey(key.key_prefix, key.last_four))}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-[11px] font-medium text-muted-foreground/50">
                          Criada em {formatDate(key.created_at)}
                          {key.last_used_at && ` • Último uso: ${formatDate(key.last_used_at)}`}
                        </p>
                      </div>
                      {!key.revoked_at && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-10 w-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRevokeKey(key.id)}
                          disabled={revokingKeyId === key.id}
                        >
                          {revokingKeyId === key.id ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-4.5 w-4.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter className="pt-4 gap-3">
              <Button variant="ghost" className="rounded-xl font-semibold text-muted-foreground hover:bg-muted/10" onClick={() => setShowApiKeyDialog(false)}>
                {t("common.close")}
              </Button>
              <Button onClick={() => setShowNewKeyDialog(true)} className="rounded-xl font-['Sora'] font-semibold gradient-primary glow-primary px-6 gap-2">
                <Plus className="h-4.5 w-4.5" />
                {t("settings.generateNewKey")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Generate New Key Dialog */}
      {showNewKeyDialog && (
        <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
          <DialogContent className="max-w-md rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{t("settings.generateNewKey")}</DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground/70">
                {t("settings.newKeyDescription")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-6">
              <div className="space-y-2.5">
                <Label htmlFor="key-name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">{t("settings.keyName")}</Label>
                <Input
                  id="key-name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={t("settings.keyNamePlaceholder")}
                  className="h-11 rounded-xl border-border/40 bg-background/40"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">{t("settings.environment")}</Label>
                <Select 
                  value={newKeyEnvironment} 
                  onValueChange={(v) => setNewKeyEnvironment(v as "production" | "test")}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border/40 bg-background/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-3">
              <Button variant="ghost" className="rounded-xl font-semibold text-muted-foreground" onClick={() => setShowNewKeyDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleGenerateKey} disabled={isGeneratingKey} className="rounded-xl font-['Sora'] font-semibold gradient-primary glow-primary px-8 gap-2">
                {isGeneratingKey ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <Key className="h-4.5 w-4.5" />
                )}
                {isGeneratingKey ? t("settings.generating") : t("settings.generate")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* New Key Result Dialog */}
      {showNewKeyResultDialog && (
        <Dialog open={showNewKeyResultDialog} onOpenChange={setShowNewKeyResultDialog}>
          <DialogContent className="max-w-md rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl font-bold text-success">
                <div className="p-1.5 rounded-lg bg-success/10">
                  <Check className="h-5 w-5" />
                </div>
                {t("settings.keyCreatedTitle")}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground/70 pt-1">
                {t("settings.keyCreatedDescription")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-6">
              <div className="rounded-2xl border border-warning/20 bg-warning/5 p-5 animate-pulse-subtle">
                <div className="flex items-start gap-4">
                  <div className="p-1.5 rounded-lg bg-warning/20">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <div className="text-sm space-y-1.5">
                    <p className="font-bold text-warning-foreground">
                      {t("settings.saveKeyWarning")}
                    </p>
                    <p className="text-muted-foreground leading-relaxed font-medium">
                      {t("settings.saveKeyWarningDescription")}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">{t("settings.yourApiKey")}</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative group">
                    <Input
                      readOnly
                      value={showGeneratedKey ? generatedKey : '•'.repeat(generatedKey.length)}
                      className="h-12 font-mono font-bold text-primary pr-12 rounded-xl border-primary/20 bg-primary/5 tracking-wider"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg hover:bg-primary/10 transition-colors"
                      onClick={() => setShowGeneratedKey(!showGeneratedKey)}
                    >
                      {showGeneratedKey ? <EyeOff className="h-4.5 w-4.5 text-primary/60" /> : <Eye className="h-4.5 w-4.5 text-primary/60" />}
                    </Button>
                  </div>
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border/40 hover:bg-muted/10 transition-all" onClick={() => copyToClipboard(generatedKey)}>
                    <Copy className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button 
                className="w-full h-12 rounded-xl font-['Sora'] font-semibold gradient-primary glow-primary shadow-lg"
                onClick={() => {
                  setShowNewKeyResultDialog(false);
                  setGeneratedKey("");
                  setShowGeneratedKey(false);
                }}
              >
                {t("settings.iSavedMyKey")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}