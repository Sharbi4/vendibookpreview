import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedCounter } from './AnimatedCounter';
import { cn } from '@/lib/utils';

interface EnhancedStatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  subtext?: string;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  animate?: boolean;
}

const variantStyles = {
  default: {
    iconBg: 'bg-primary',
    iconColor: 'text-primary-foreground',
  },
  primary: {
    iconBg: 'bg-primary',
    iconColor: 'text-primary-foreground',
  },
  success: {
    iconBg: 'bg-emerald-500',
    iconColor: 'text-white',
  },
  warning: {
    iconBg: 'bg-amber-500',
    iconColor: 'text-white',
  },
  danger: {
    iconBg: 'bg-red-500',
    iconColor: 'text-white',
  },
  info: {
    iconBg: 'bg-blue-500',
    iconColor: 'text-white',
  },
};

const EnhancedStatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  trend,
  trendLabel,
  variant = 'default',
  animate = true,
}: EnhancedStatCardProps) => {
  const styles = variantStyles[variant];
  const numericValue = typeof value === 'number' ? value : parseInt(value.toString()) || 0;
  const isNumeric = typeof value === 'number' || !isNaN(parseInt(value.toString()));

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all group">
      <CardContent className="p-5">
        {/* Icon with container */}
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-lg",
            styles.iconBg
          )}>
            <Icon className={cn("h-6 w-6", styles.iconColor)} />
          </div>
          
          {/* Trend indicator */}
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend >= 0 
                ? "bg-emerald-500/10 text-emerald-600" 
                : "bg-red-500/10 text-red-600"
            )}>
              <span>{trend >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        
        {/* Value */}
        <div>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {animate && isNumeric ? (
              <AnimatedCounter value={numericValue} duration={1200} />
            ) : (
              value
            )}
          </p>
          <p className="text-sm font-medium text-muted-foreground mt-1">{label}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">{subtext}</p>
          )}
          {trendLabel && (
            <p className="text-xs text-muted-foreground mt-1">{trendLabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedStatCard;
