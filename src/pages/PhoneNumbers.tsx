import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  PageHeader,
  StatusBadge,
  DataTable,
  HealthBar,
  EmptyState,
  type Column,
} from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Phone, Plus, Search, MoreHorizontal, RefreshCw, Pause, Play, Loader2, Pencil, Trash2, Wifi, WifiOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePhoneNumbers, type PhoneNumber, type PhoneNumberType } from "@/hooks/usePhoneNumbers";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PhoneNumbers() {
  const { toast } = useToast();
  const { 
    phoneNumbers, 
    isLoading,
    refetch,
    syncFromInstances,
    createPhoneNumber, 
    updatePhoneNumber, 
    deletePhoneNumber,
    resetCycle,
    isCreating,
    isUpdating,
    isDeleting,
  } = usePhoneNumbers();
  
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [newNumber, setNewNumber] = useState({
    number: "",
    type: "whatsapp_business" as PhoneNumberType,
    provider: "Z-API",
  });
  const [editData, setEditData] = useState({
    number: "",
    type: "whatsapp_business" as PhoneNumberType,
    provider: "Z-API",
  });

  const filteredNumbers = phoneNumbers.filter((num) => {
    const matchesSearch = num.number.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || num.status === statusFilter;
    const matchesProvider = providerFilter === "all" || num.provider === providerFilter;
    return matchesSearch && matchesStatus && matchesProvider;
  });

  const handleAddNumber = async () => {
    if (!newNumber.number) {
      toast({
        title: "Error",
        description: "Phone number is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createPhoneNumber({
        number: newNumber.number,
        type: newNumber.type,
        provider: newNumber.provider,
        status: "warming",
        connected: false,
        health: 50,
      });

      setShowAddDialog(false);
      setNewNumber({ number: "", type: "whatsapp_business", provider: "Z-API" });

      toast({
        title: "Number added",
        description: `${newNumber.number} has been added and is warming up.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add phone number.",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (num: PhoneNumber) => {
    const newStatus = num.status === "active" ? "paused" : "active";
    try {
      await updatePhoneNumber({
        id: num.id,
        updates: { status: newStatus },
      });
      toast({
        title: newStatus === "active" ? "Number activated" : "Number paused",
        description: `${num.number} is now ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    }
  };

  const handleResetCycle = async (num: PhoneNumber) => {
    try {
      await resetCycle(num.id);
      toast({
        title: "Cycle reset",
        description: `Cycle counter for ${num.number} has been reset.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset cycle.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (num: PhoneNumber) => {
    setSelectedNumber(num);
    setEditData({
      number: num.number,
      type: num.type,
      provider: num.provider,
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedNumber) return;

    try {
      await updatePhoneNumber({
        id: selectedNumber.id,
        updates: {
          number: editData.number,
          type: editData.type,
          provider: editData.provider,
        },
      });

      setShowEditDialog(false);
      setSelectedNumber(null);
      toast({
        title: "Number updated",
        description: `${editData.number} has been updated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update phone number.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (num: PhoneNumber) => {
    setSelectedNumber(num);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedNumber) return;

    try {
      await deletePhoneNumber(selectedNumber.id);
      setShowDeleteDialog(false);

      toast({
        title: "Number deleted",
        description: `${selectedNumber.number} has been removed.`,
      });
      setSelectedNumber(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete phone number.",
        variant: "destructive",
      });
    }
  };

  const formatLastUsed = (lastUsedAt: string | null) => {
    if (!lastUsedAt) return "Never";
    try {
      return formatDistanceToNow(new Date(lastUsedAt), { addSuffix: true, locale: ptBR });
    } catch {
      return "Never";
    }
  };

  const columns: Column<PhoneNumber>[] = [
    {
      key: "number",
      header: "Number",
      render: (num) => (
        <div className="flex flex-col">
          <span className="font-mono font-medium">{num.number}</span>
          <span className="text-xs text-muted-foreground">
            {num.type === "whatsapp_business" ? "Business" : "Normal"}
          </span>
        </div>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      render: (num) => (
        <Badge variant="secondary" className="font-normal">
          {num.provider}
        </Badge>
      ),
    },
    {
      key: "connected",
      header: "Connected",
      render: (num) => (
        <div className="flex items-center gap-2">
          {num.connected ? (
            <>
              <Wifi className="h-4 w-4 text-success" />
              <span className="text-sm text-success">Yes</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">No</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (num) => <StatusBadge status={num.status} />,
    },
    {
      key: "health",
      header: "Health",
      render: (num) => (
        <div className="w-24">
          <HealthBar value={num.health} size="sm" />
        </div>
      ),
    },
    {
      key: "cycleUsage",
      header: "Cycle Usage",
      render: (num) => (
        <div className="font-mono text-sm">
          {num.cycleTotal > 0
            ? `${num.cycleUsed} / ${num.cycleTotal}`
            : "—"}
        </div>
      ),
    },
    {
      key: "lastUsed",
      header: "Last Used",
      render: (num) => <span className="text-sm text-muted-foreground">{formatLastUsed(num.lastUsedAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (num) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => handleEdit(num)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            {num.status === "active" ? (
              <DropdownMenuItem onClick={() => handleToggleStatus(num)}>
                <Pause className="mr-2 h-4 w-4" /> Pause
              </DropdownMenuItem>
            ) : num.status === "paused" ? (
              <DropdownMenuItem onClick={() => handleToggleStatus(num)}>
                <Play className="mr-2 h-4 w-4" /> Activate
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => handleResetCycle(num)}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reset Cycle
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(num)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  const stats = {
    total: phoneNumbers.length,
    active: phoneNumbers.filter((n) => n.status === "active").length,
    warming: phoneNumbers.filter((n) => n.status === "warming").length,
    banned: phoneNumbers.filter((n) => n.status === "banned").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader
          title="Phone Numbers"
          description="Manage your phone number registry and rotation cycles"
        />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-elevation-sm">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Phone Numbers"
        description="Manage your phone number registry and rotation cycles"
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={async () => {
                setIsSyncing(true);
                try {
                  const result = await syncFromInstances();
                  await refetch();
                  toast({
                    title: "Synchronized",
                    description: result.synced > 0 
                      ? `${result.synced} number(s) imported from connected instances.`
                      : "Phone numbers data has been refreshed.",
                  });
                } catch (error) {
                  toast({
                    title: "Sync failed",
                    description: "Could not refresh phone numbers.",
                    variant: "destructive",
                  });
                } finally {
                  setIsSyncing(false);
                }
              }}
              disabled={isSyncing}
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              Sync
            </Button>
            <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4" />
              Add Number
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-value">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-value text-success">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warming</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-value text-warning">{stats.warming}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Banned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-value text-error">{stats.banned}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="warming">Warming</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="Z-API">Z-API</SelectItem>
            <SelectItem value="Evolution API">Evolution API</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      {filteredNumbers.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredNumbers}
          keyExtractor={(num) => num.id}
        />
      ) : (
        <EmptyState
          icon={Phone}
          title="No numbers found"
          description={phoneNumbers.length === 0 
            ? "Numbers are automatically registered when instances connect. You can also add them manually."
            : "No numbers match your current filters"
          }
          action={
            <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4" />
              Add Number
            </Button>
          }
        />
      )}

      {/* Add Number Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Phone Number</DialogTitle>
            <DialogDescription>
              Register a new phone number for dispatching messages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+55 11 99999-9999"
                value={newNumber.number}
                onChange={(e) => setNewNumber((prev) => ({ ...prev, number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={newNumber.type}
                onValueChange={(value: PhoneNumberType) =>
                  setNewNumber((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp_business">WhatsApp Business</SelectItem>
                  <SelectItem value="whatsapp_normal">WhatsApp Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={newNumber.provider}
                onValueChange={(value) => setNewNumber((prev) => ({ ...prev, provider: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Z-API">Z-API</SelectItem>
                  <SelectItem value="Evolution API">Evolution API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNumber} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Number Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Phone Number</DialogTitle>
            <DialogDescription>
              Update phone number details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                placeholder="+55 11 99999-9999"
                value={editData.number}
                onChange={(e) => setEditData((prev) => ({ ...prev, number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={editData.type}
                onValueChange={(value: PhoneNumberType) =>
                  setEditData((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp_business">WhatsApp Business</SelectItem>
                  <SelectItem value="whatsapp_normal">WhatsApp Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-provider">Provider</Label>
              <Select
                value={editData.provider}
                onValueChange={(value) => setEditData((prev) => ({ ...prev, provider: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Z-API">Z-API</SelectItem>
                  <SelectItem value="Evolution API">Evolution API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Phone Number</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedNumber?.number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
