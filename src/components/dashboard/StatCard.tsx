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
  iconBgClass = 'bg-primary/10',
  iconClass = 'text-primary'
}: StatCardProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full ${iconBgClass} flex items-center justify-center`}>
          <Icon className={`h-6 w-6 ${iconClass}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
