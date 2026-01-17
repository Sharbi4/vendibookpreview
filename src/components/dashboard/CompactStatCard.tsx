import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactStatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  subtext?: string;
  highlight?: boolean;
}

export const CompactStatCard = ({ icon: Icon, label, value, subtext, highlight }: CompactStatCardProps) => {
  return (
    <div className={cn(
      "flex items-center gap-3 p-4 rounded-xl border bg-card",
      "border-border shadow-[var(--shadow-card)]",
      highlight && "ring-1 ring-primary/20"
    )}>
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
        highlight ? "bg-primary/10" : "bg-muted"
      )}>
        <Icon className={cn(
          "h-5 w-5",
          highlight ? "text-primary" : "text-muted-foreground"
        )} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-foreground leading-none tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
};

export default CompactStatCard;
