import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CriafyInstagramAccount } from "@/types/criafy";
import { AccountInsightsCard } from "@/components/criafy/AccountInsightsCard";

interface AccountInsightsModalProps {
  account: CriafyInstagramAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "OVERVIEW" | "CONTENT" | "AUDIENCE";
  onOpenFeed: (account: CriafyInstagramAccount) => void;
  onOpenBriefing: (account: CriafyInstagramAccount) => void;
  onSyncProfile: (accountId: string) => void;
  onCheckHealth?: (accountId: string) => void;
  isSyncing?: boolean;
}

export function AccountInsightsModal({
  account,
  open,
  onOpenChange,
  initialTab = "OVERVIEW",
  onOpenFeed,
  onOpenBriefing,
  onSyncProfile,
  onCheckHealth,
  isSyncing = false,
}: AccountInsightsModalProps) {
  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[96vh] overflow-y-auto sm:overflow-hidden p-3.5 sm:p-4 bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Insights da Conta @{account.username}</DialogTitle>
        </DialogHeader>

        <AccountInsightsCard
          account={account}
          initialTab={initialTab}
          onOpenFeed={onOpenFeed}
          onOpenBriefing={onOpenBriefing}
          onSyncProfile={onSyncProfile}
          onCheckHealth={onCheckHealth}
          isSyncing={isSyncing}
        />
      </DialogContent>
    </Dialog>
  );
}
