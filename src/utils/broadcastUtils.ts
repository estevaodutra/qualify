import { BatchPlanItem, BroadcastScheduleCalculation } from "@/types/broadcast.types";

/**
 * Calculates the schedule, batch division, and estimated completion date
 * based on total leads, daily limit, start date, delay intervals and workdays configuration.
 */
export function calculateBroadcastSchedule({
  totalLeads,
  dailyLimit,
  startDate = new Date(),
  workdaysOnly = false,
  sendTimeStart = "09:00",
  sendTimeEnd = "18:00",
  minDelaySeconds = 180,
  maxDelaySeconds = 300,
}: {
  totalLeads: number;
  dailyLimit: number;
  startDate?: Date;
  workdaysOnly?: boolean;
  sendTimeStart?: string;
  sendTimeEnd?: string;
  minDelaySeconds?: number;
  maxDelaySeconds?: number;
}): BroadcastScheduleCalculation {
  const safeLimit = Math.max(1, dailyLimit);
  const totalBatches = Math.max(1, Math.ceil(totalLeads / safeLimit));

  const batches: BatchPlanItem[] = [];
  let currentDate = new Date(startDate.getTime());

  // Function to advance to next valid day
  const advanceToNextValidDay = (date: Date): Date => {
    const next = new Date(date.getTime());
    next.setDate(next.getDate() + 1);
    if (workdaysOnly) {
      // 0 = Sunday, 6 = Saturday
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
      }
    }
    return next;
  };

  // If start date falls on weekend and workdaysOnly is active, jump to next Monday
  if (workdaysOnly && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  let remaining = totalLeads;
  for (let i = 0; i < totalBatches; i++) {
    const batchCount = Math.min(safeLimit, remaining);
    remaining -= batchCount;

    const dateCopy = new Date(currentDate.getTime());
    const dateFormatted = dateCopy.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    batches.push({
      batchIndex: i + 1,
      date: dateCopy,
      dateFormatted,
      count: batchCount,
    });

    if (i < totalBatches - 1) {
      currentDate = advanceToNextValidDay(currentDate);
    }
  }

  const finalDate = batches.length > 0 ? new Date(batches[batches.length - 1].date) : new Date(startDate);
  
  // Estimate time of day for final completion based on average delay
  const lastBatchCount = batches.length > 0 ? batches[batches.length - 1].count : 1;
  const avgDelaySec = (Math.max(1, minDelaySeconds) + Math.max(minDelaySeconds, maxDelaySeconds)) / 2;
  const totalSecondsInLastBatch = Math.max(0, lastBatchCount - 1) * avgDelaySec;

  const [startHour, startMin] = sendTimeStart.split(":").map(Number);
  const [endHour, endMin] = sendTimeEnd.split(":").map(Number);

  finalDate.setHours(isNaN(startHour) ? 9 : startHour, isNaN(startMin) ? 0 : startMin, 0, 0);
  finalDate.setSeconds(finalDate.getSeconds() + Math.round(totalSecondsInLastBatch));

  // If calculated time exceeds sendTimeEnd, cap at sendTimeEnd
  const maxEndMinutes = (isNaN(endHour) ? 18 : endHour) * 60 + (isNaN(endMin) ? 0 : endMin);
  const finalMinutes = finalDate.getHours() * 60 + finalDate.getMinutes();
  if (finalMinutes > maxEndMinutes) {
    finalDate.setHours(isNaN(endHour) ? 18 : endHour, isNaN(endMin) ? 0 : endMin, 0, 0);
  }

  const estimatedCompletionFormatted = finalDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    totalLeads,
    dailyLimit: safeLimit,
    totalBatches,
    totalDays: batches.length,
    startDate,
    estimatedCompletionDate: finalDate,
    estimatedCompletionFormatted,
    batches,
  };
}

/**
 * Helper to generate individual scheduled_for timestamps per lead respecting:
 * - random delay between minDelaySeconds and maxDelaySeconds (disparo 1 por vez)
 * - send window (sendTimeStart ~ sendTimeEnd)
 * - workdays restriction
 */
export function generateRecipientsWithSchedule({
  broadcastId,
  companyId,
  leadIds,
  batches,
  startDate = new Date(),
  minDelaySeconds = 180,
  maxDelaySeconds = 300,
  sendTimeStart = "09:00",
  sendTimeEnd = "18:00",
  workdaysOnly = false,
}: {
  broadcastId: string;
  companyId?: string | null;
  leadIds: string[];
  batches: BatchPlanItem[];
  startDate?: Date;
  minDelaySeconds?: number;
  maxDelaySeconds?: number;
  sendTimeStart?: string;
  sendTimeEnd?: string;
  workdaysOnly?: boolean;
}) {
  const safeMin = Math.max(10, minDelaySeconds);
  const safeMax = Math.max(safeMin, maxDelaySeconds);

  const [startHour, startMin] = sendTimeStart.split(":").map(Number);
  const [endHour, endMin] = sendTimeEnd.split(":").map(Number);

  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  const advanceDay = (d: Date): Date => {
    const next = new Date(d.getTime());
    next.setDate(next.getDate() + 1);
    if (workdaysOnly) {
      while (isWeekend(next)) {
        next.setDate(next.getDate() + 1);
      }
    }
    next.setHours(isNaN(startHour) ? 9 : startHour, isNaN(startMin) ? 0 : startMin, 0, 0);
    return next;
  };

  const recipientRows: any[] = [];
  let leadIndex = 0;

  for (const batch of batches) {
    const batchLeads = leadIds.slice(leadIndex, leadIndex + batch.count);
    leadIndex += batch.count;

    const dateStr = batch.date.toISOString().split("T")[0];

    // Determine initial dispatch time for this batch
    let currentDispatchTime = new Date(batch.date.getTime());
    currentDispatchTime.setHours(isNaN(startHour) ? 9 : startHour, isNaN(startMin) ? 0 : startMin, 0, 0);

    // If batch is for today, but now is later than start time, start from now
    const now = new Date();
    if (batch.batchIndex === 1 && currentDispatchTime < now) {
      currentDispatchTime = new Date(now.getTime() + 5000); // 5s from now for first lead
    }

    for (let bIndex = 0; bIndex < batchLeads.length; bIndex++) {
      const leadId = batchLeads[bIndex];

      // Check if currentDispatchTime exceeds sendTimeEnd
      const currentMinuteOfDay = currentDispatchTime.getHours() * 60 + currentDispatchTime.getMinutes();
      const endMinuteOfDay = (isNaN(endHour) ? 18 : endHour) * 60 + (isNaN(endMin) ? 0 : endMin);

      if (currentMinuteOfDay > endMinuteOfDay) {
        currentDispatchTime = advanceDay(currentDispatchTime);
      }

      recipientRows.push({
        broadcast_id: broadcastId,
        company_id: companyId || null,
        lead_id: leadId,
        batch_index: batch.batchIndex,
        scheduled_date: currentDispatchTime.toISOString().split("T")[0] || dateStr,
        scheduled_for: currentDispatchTime.toISOString(),
        status: "pending",
      });

      // Advance by random delay for NEXT lead
      const delaySeconds = Math.floor(safeMin + Math.random() * (safeMax - safeMin + 1));
      currentDispatchTime = new Date(currentDispatchTime.getTime() + delaySeconds * 1000);
    }
  }

  return recipientRows;
}
