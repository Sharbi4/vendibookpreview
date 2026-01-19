import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
    <Card className={cn(
      "border-0 shadow-lg hover:shadow-xl transition-all",
      highlight && "ring-2 ring-primary/30"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
            highlight ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              highlight ? "text-primary-foreground" : "text-muted-foreground"
            )} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold text-foreground leading-none tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompactStatCard;
