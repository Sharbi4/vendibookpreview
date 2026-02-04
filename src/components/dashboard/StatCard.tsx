import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  subtext?: string;
  iconBgClass?: string;
  iconClass?: string;
}

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
}: StatCardProps) => {
  return (
    <div className="rounded-xl p-4 border border-border bg-card hover:border-foreground/30 transition-all duration-200 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
          <Icon className="h-5 w-5 text-background" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subtext && (
            <p className="text-[10px] text-muted-foreground/70">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
