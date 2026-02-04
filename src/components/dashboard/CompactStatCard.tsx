import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CompactStatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  subtext?: string;
  highlight?: boolean;
  href?: string;
}

export const CompactStatCard = ({ icon: Icon, label, value, subtext, highlight, href }: CompactStatCardProps) => {
  const content = (
    <Card className={cn(
      "rounded-2xl border border-border bg-card hover:border-foreground/30 transition-all duration-200 shadow-sm",
      highlight && "border-foreground/50 bg-foreground/5",
      href && "cursor-pointer hover:shadow-md"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
            highlight ? "bg-foreground text-background" : "bg-foreground text-background"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold text-foreground leading-none tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
            {subtext && <p className="text-[10px] text-muted-foreground/70">{subtext}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
};

export default CompactStatCard;
