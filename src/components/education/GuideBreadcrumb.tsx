import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

export interface GuideBreadcrumbItem {
  label: string;
  to?: string;
}

interface GuideBreadcrumbProps {
  items: GuideBreadcrumbItem[];
  className?: string;
  containerClassName?: string;
}

export function GuideBreadcrumb({
  items,
  className,
  containerClassName = 'max-w-6xl',
}: GuideBreadcrumbProps) {
  return (
    <div
      className={cn(
        'w-full',
        className,
      )}
    >
      <div className={cn('container mx-auto px-4', containerClassName)}>
        <div className="inline-flex items-center rounded-full border border-border bg-card/60 backdrop-blur-sm px-3 py-1.5 shadow-sm">
          <Breadcrumb>
            <BreadcrumbList className="text-xs sm:text-sm text-muted-foreground">
              {items.map((item, index) => {
                const isLast = index === items.length - 1;
                return (
                  <BreadcrumbItem key={`${item.label}-${index}`}>
                    {isLast ? (
                      <BreadcrumbPage className="text-foreground font-medium">
                        {item.label}
                      </BreadcrumbPage>
                    ) : item.to ? (
                      <BreadcrumbLink asChild>
                        <Link
                          to={item.to}
                          className="hover:text-foreground transition-colors"
                        >
                          {item.label}
                        </Link>
                      </BreadcrumbLink>
                    ) : (
                      <span className="text-muted-foreground">{item.label}</span>
                    )}
                  </BreadcrumbItem>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>
    </div>
  );
}
