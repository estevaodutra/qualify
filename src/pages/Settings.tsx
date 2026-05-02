import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  Trash2, Eye, EyeOff, AlertTriangle, Key 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { useLanguage } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";

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
  
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [showNewKeyResultDialog, setShowNewKeyResultDialog] = useState(false);
  
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
    companyName: "Acme Corp",
    timezone: "america_sao_paulo",
    emailNotifications: true,
    webhookNotifications: false,
    highFailureAlerts: true,
    providerOutageAlerts: true,
    sessionTimeout: "60",
    compactMode: false,
  });

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
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: t("settings.settingsSaved"),
      description: t("settings.settingsSaved"),
    });
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
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
        actions={
          <Button className="gap-2" onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? t("settings.saving") : t("settings.saveChanges")}
          </Button>
        }
      />

      <div className="grid gap-6">
        {/* General Settings */}
        <Card className="shadow-elevation-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t("settings.general")}</CardTitle>
            </div>
            <CardDescription>{t("settings.generalDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">{t("settings.companyName")}</Label>
                <Input
                  id="company"
                  value={settings.companyName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, companyName: e.target.value }))}
                  placeholder={t("settings.companyNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">{t("settings.timezone")}</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => setSettings((prev) => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("settings.selectTimezone")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="america_sao_paulo">America/Sao_Paulo (BRT)</SelectItem>
                    <SelectItem value="america_new_york">America/New_York (EST)</SelectItem>
                    <SelectItem value="europe_london">Europe/London (GMT)</SelectItem>
                    <SelectItem value="asia_tokyo">Asia/Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">{t("settings.language")}</Label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("settings.selectLanguage")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="shadow-elevation-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t("settings.notifications")}</CardTitle>
            </div>
            <CardDescription>{t("settings.notificationsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.emailNotifications")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.emailNotificationsDescription")}
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={handleToggleChange("emailNotifications")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.smsAlerts")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.smsAlertsDescription")}
                </p>
              </div>
              <Switch
                checked={settings.webhookNotifications}
                onCheckedChange={handleToggleChange("webhookNotifications")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.slackIntegration")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.slackIntegrationDescription")}
                </p>
              </div>
              <Switch
                checked={settings.highFailureAlerts}
                onCheckedChange={handleToggleChange("highFailureAlerts")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="shadow-elevation-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t("settings.security")}</CardTitle>
            </div>
            <CardDescription>{t("settings.securityDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.twoFactorAuth")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.twoFactorDescription")}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleEnable2FA}>
                {t("settings.enable2FA")}
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.apiKeys")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.apiKeysDescription")}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleManageApiKeys}>
                {t("settings.manageKeys")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="shadow-elevation-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t("settings.appearance")}</CardTitle>
            </div>
            <CardDescription>{t("settings.appearanceDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.darkMode")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.darkModeDescription")}
                </p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => {
                  setTheme(checked ? "dark" : "light");
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2FA Dialog - Conditionally rendered */}
      {show2FADialog && (
        <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("settings.enable2FATitle")}</DialogTitle>
              <DialogDescription>
                {t("settings.scanQRCode")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-6">
              <div className="h-48 w-48 rounded-lg bg-muted flex items-center justify-center">
                <span className="text-muted-foreground text-sm">QR Code</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verify-code">{t("settings.verificationCode")}</Label>
              <Input id="verify-code" placeholder={t("settings.verificationCodePlaceholder")} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShow2FADialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={confirm2FA} className="gap-2">
                <Check className="h-4 w-4" />
                {t("settings.verify")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* API Keys List Dialog - Conditionally rendered */}
      {showApiKeyDialog && (
        <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t("settings.manageAPIKeys")}
              </DialogTitle>
              <DialogDescription>
                {t("settings.apiKeysListDescription")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
              {isLoadingKeys ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t("settings.noKeysYet")}</p>
                  <p className="text-sm">{t("settings.createFirstKey")}</p>
                </div>
              ) : (
                apiKeys.map((key) => (
                  <div 
                    key={key.id} 
                    className={`rounded-lg border p-4 ${key.revoked_at ? 'opacity-60 bg-muted/50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{key.name}</p>
                          <Badge variant={key.environment === 'production' ? 'default' : 'secondary'}>
                            {key.environment === 'production' ? 'Production' : 'Test'}
                          </Badge>
                          {key.revoked_at && (
                            <Badge variant="destructive">{t("settings.revoked")}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          {getMaskedKey(key.key_prefix, key.last_four)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("settings.created")}: {formatDate(key.created_at)}
                          {key.last_used_at && ` • ${t("settings.lastUsed")}: ${formatDate(key.last_used_at)}`}
                        </p>
                      </div>
                      {!key.revoked_at && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRevokeKey(key.id)}
                          disabled={revokingKeyId === key.id}
                        >
                          {revokingKeyId === key.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
                {t("common.close")}
              </Button>
              <Button onClick={() => setShowNewKeyDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t("settings.generateNewKey")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Generate New Key Dialog - Conditionally rendered */}
      {showNewKeyDialog && (
        <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("settings.generateNewKey")}</DialogTitle>
              <DialogDescription>
                {t("settings.newKeyDescription")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">{t("settings.keyName")}</Label>
                <Input
                  id="key-name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={t("settings.keyNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("settings.environment")}</Label>
                <Select 
                  value={newKeyEnvironment} 
                  onValueChange={(v) => setNewKeyEnvironment(v as "production" | "test")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewKeyDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleGenerateKey} disabled={isGeneratingKey} className="gap-2">
                {isGeneratingKey ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Key className="h-4 w-4" />
                )}
                {isGeneratingKey ? t("settings.generating") : t("settings.generate")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* New Key Result Dialog - Conditionally rendered */}
      {showNewKeyResultDialog && (
        <Dialog open={showNewKeyResultDialog} onOpenChange={setShowNewKeyResultDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                {t("settings.keyCreatedTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("settings.keyCreatedDescription")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      {t("settings.saveKeyWarning")}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {t("settings.saveKeyWarningDescription")}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{t("settings.yourApiKey")}</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      readOnly
                      value={showGeneratedKey ? generatedKey : '•'.repeat(generatedKey.length)}
                      className="font-mono pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowGeneratedKey(!showGeneratedKey)}
                    >
                      {showGeneratedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedKey)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
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