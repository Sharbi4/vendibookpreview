import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AirbnbMenuItemProps {
  icon: LucideIcon;
  label: string;
  to?: string;
  onClick?: () => void;
  badge?: number;
  subtext?: string;
  className?: string;
  highlight?: boolean;
}

const AirbnbMenuItem = ({ 
  icon: Icon, 
  label, 
  to, 
  onClick, 
  badge, 
  subtext,
  className,
  highlight
}: AirbnbMenuItemProps) => {
  const content = (
    <div className={cn(
      "flex items-center justify-between w-full px-4 py-3 min-h-[48px] hover:bg-muted/50 active:bg-muted transition-colors cursor-pointer",
      highlight && "bg-gradient-to-r from-primary/5 to-transparent",
      className
    )}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-foreground shrink-0" />
        <div className="flex flex-col">
          <span className="text-sm font-normal text-foreground">{label}</span>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>
          )}
        </div>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="h-5 min-w-5 flex items-center justify-center bg-rose-500 text-white text-xs font-medium rounded-full px-1.5">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
  );
  
  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    );
  }
  
  return (
    <button onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
};

export default AirbnbMenuItem;
