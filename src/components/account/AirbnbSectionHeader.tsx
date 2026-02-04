import { cn } from '@/lib/utils';

interface AirbnbSectionHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export const AirbnbSectionHeader = ({
  title,
  description,
  className,
}: AirbnbSectionHeaderProps) => {
  return (
    <div className={cn('mb-6', className)}>
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      )}
    </div>
  );
};

export default AirbnbSectionHeader;
