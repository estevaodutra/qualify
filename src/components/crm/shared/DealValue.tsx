import { cn } from "@/lib/utils";

interface DealValueProps {
  value: number | null;
  currency?: string;
  className?: string;
}

export function DealValue({ value, currency = 'BRL', className }: DealValueProps) {
  if (value === null || value === undefined) return null;

  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency || 'BRL',
  }).format(value);

  return (
    <span className={cn("text-xs font-semibold text-foreground", className)}>
      {formatted}
    </span>
  );
}
