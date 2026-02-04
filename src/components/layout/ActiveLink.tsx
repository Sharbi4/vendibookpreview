import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ActiveLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  exact?: boolean;
  onClick?: () => void;
}

export const ActiveLink = ({ 
  to, 
  children, 
  className, 
  activeClassName = "text-foreground font-semibold bg-secondary/50",
  exact = false,
  onClick
}: ActiveLinkProps) => {
  const location = useLocation();
  
  // Determine if active
  const isActive = exact 
    ? location.pathname === to 
    : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:bg-secondary/30 hover:text-foreground",
        isActive ? activeClassName : "text-muted-foreground",
        className
      )}
    >
      {children}
    </Link>
  );
};

export default ActiveLink;
