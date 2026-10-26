import { BatchPlanItem, BroadcastScheduleCalculation } from "@/types/broadcast.types";

/**
 * Calculates the schedule, batch division, and estimated completion date
 * based on total leads, daily limit, start date, and workdays configuration.
 */
export function calculateBroadcastSchedule({
  totalLeads,
  dailyLimit,
  startDate = new Date(),
  workdaysOnly = false,
  sendTimeEnd = "18:00",
}: {
  totalLeads: number;
  dailyLimit: number;
  startDate?: Date;
  workdaysOnly?: boolean;
  sendTimeEnd?: string;
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
  
  // Set the estimated completion time based on sendTimeEnd
  const [hours, minutes] = sendTimeEnd.split(":").map(Number);
  if (!isNaN(hours)) finalDate.setHours(hours, isNaN(minutes) ? 0 : minutes, 0, 0);

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
