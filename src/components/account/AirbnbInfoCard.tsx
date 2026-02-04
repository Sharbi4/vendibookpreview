import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AirbnbInfoCardProps {
  icon: LucideIcon;
  iconColor?: 'pink' | 'red' | 'orange' | 'blue' | 'green';
  title: string;
  description: string;
  className?: string;
}

export const AirbnbInfoCard = ({
  icon: Icon,
  iconColor = 'pink',
  title,
  description,
  className,
}: AirbnbInfoCardProps) => {
  const iconColorClasses = {
    pink: 'bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
    orange: 'bg-primary/10 text-primary',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  };

  return (
    <div className={cn(
      'flex gap-4 p-4 rounded-xl bg-muted/50 border border-border/50',
      className
    )}>
      <div className={cn(
        'shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
        iconColorClasses[iconColor]
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground mb-0.5">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

export default AirbnbInfoCard;
