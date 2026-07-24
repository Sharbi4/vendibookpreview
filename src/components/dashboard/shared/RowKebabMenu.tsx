import { MoreVertical, type LucideIcon } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface KebabAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  separatorBefore?: boolean;
}

interface Props {
  actions: KebabAction[];
  ariaLabel?: string;
  className?: string;
}

/**
 * One-tap row menu for archive / report / mark read / delete / etc.
 * Every action produces a toast, confirm dialog, or navigation — no silent taps.
 */
const RowKebabMenu = ({ actions, ariaLabel = 'More actions', className }: Props) => {
  if (!actions.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition',
          className,
        )}
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {actions.map((action, i) => {
          const Icon = action.icon;
          const item = (
            <DropdownMenuItem
              key={action.id}
              onSelect={(e) => { e.preventDefault(); action.onSelect(); }}
              className={cn('gap-2 text-sm', action.destructive && 'text-destructive focus:text-destructive')}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {action.label}
            </DropdownMenuItem>
          );
          if (action.separatorBefore && i > 0) {
            return (
              <div key={`${action.id}-sep`}>
                <DropdownMenuSeparator />
                {item}
              </div>
            );
          }
          return item;
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RowKebabMenu;
