import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconAction {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
}

interface CommandHeaderProps {
  name?: string;
  context?: string;
  actions?: IconAction[];
}

/**
 * Operator's header strip. First name large, one line of context,
 * and a tight cluster of icon buttons. No card. No background. Pure typography.
 */
export const CommandHeader = ({ name, context, actions = [] }: CommandHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
      <div className="min-w-0">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground truncate"
        >
          {name ? `Good day, ${name}.` : 'Welcome back.'}
        </motion.h1>
        {context && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="mt-1.5 text-sm text-muted-foreground"
          >
            {context}
          </motion.p>
        )}
      </div>

      {actions.length > 0 && (
        <div className="flex items-center gap-1.5 shrink-0">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                to={a.href}
                aria-label={a.label}
                title={a.label}
                className={cn(
                  'relative h-10 w-10 rounded-lg border border-border bg-card flex items-center justify-center',
                  'text-muted-foreground hover:text-foreground hover:border-foreground/20',
                  'transition-all duration-150 hover:-translate-y-px',
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {a.badge != null && a.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-4 text-center tabular-nums">
                    {a.badge > 99 ? '99+' : a.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommandHeader;
