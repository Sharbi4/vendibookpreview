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
      "relative overflow-hidden flex items-center gap-3 p-4 rounded-xl border-2",
      highlight 
        ? "border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10" 
        : "border-border bg-card"
    )}>
      {/* Animated background for highlighted cards */}
      {highlight && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse" />
      )}
      
      <div className={cn(
        "relative flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
        highlight 
          ? "bg-gradient-to-br from-primary to-amber-500 shadow-md" 
          : "bg-muted"
      )}>
        <Icon className={cn(
          "h-5 w-5",
          highlight ? "text-white" : "text-muted-foreground"
        )} />
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="text-2xl font-bold text-foreground leading-none tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
};

export default CompactStatCard;
