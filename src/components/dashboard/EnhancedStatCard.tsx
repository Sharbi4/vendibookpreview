import { LucideIcon } from 'lucide-react';
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
    bg: 'bg-gradient-to-br from-card to-muted/30',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    glow: 'bg-primary/10',
  },
  primary: {
    bg: 'bg-gradient-to-br from-primary/10 to-primary/5',
    iconBg: 'bg-primary/20',
    iconColor: 'text-primary',
    glow: 'bg-primary/20',
  },
  success: {
    bg: 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-600',
    glow: 'bg-emerald-500/20',
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-500/10 to-amber-500/5',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-600',
    glow: 'bg-amber-500/20',
  },
  danger: {
    bg: 'bg-gradient-to-br from-red-500/10 to-red-500/5',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-600',
    glow: 'bg-red-500/20',
  },
  info: {
    bg: 'bg-gradient-to-br from-blue-500/10 to-blue-500/5',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-600',
    glow: 'bg-blue-500/20',
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
    <div className={cn(
      "relative overflow-hidden rounded-xl border border-border/50 p-5 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group",
      styles.bg
    )}>
      {/* Animated glow effect */}
      <div className={cn(
        "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        styles.glow
      )} />
      
      {/* Icon with gradient container */}
      <div className="relative flex items-start justify-between mb-3">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
          styles.iconBg
        )}>
          <div className="icon-gradient-container">
            <Icon className={cn("h-6 w-6 icon-gradient", styles.iconColor)} />
          </div>
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
      <div className="relative">
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
    </div>
  );
};

export default EnhancedStatCard;
