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
      highlight && "border-primary/30 bg-primary/5"
    )}>
      <div className={cn(
        "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
        highlight ? "bg-primary/15" : "bg-muted"
      )}>
        <Icon className={cn(
          "h-4 w-4",
          highlight ? "text-primary" : "text-muted-foreground"
        )} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {subtext && (
          <p className="text-xs text-muted-foreground/70">{subtext}</p>
        )}
      </div>
    </div>
  );
};

export default CompactStatCard;
