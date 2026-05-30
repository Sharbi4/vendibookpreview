import { useState, ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TellVendibookModal, type LeadIntent, type LeadCategory } from './TellVendibookModal';

interface TellVendibookButtonProps {
  variant?: 'dark-shine' | 'glass-cta' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  children?: ReactNode;
  /** Pre-fill modal */
  defaultIntent?: LeadIntent;
  defaultCategory?: LeadCategory;
  defaultCity?: string;
  listingId?: string;
  sourcePage?: string;
  showIcon?: boolean;
}

export const TellVendibookButton = ({
  variant = 'glass-cta',
  size = 'lg',
  className = '',
  children,
  defaultIntent,
  defaultCategory,
  defaultCity,
  listingId,
  sourcePage,
  showIcon = true,
}: TellVendibookButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        {showIcon && <Sparkles className="w-4 h-4" />}
        {children || 'Tell Vendibook what you need'}
      </Button>
      <TellVendibookModal
        open={open}
        onOpenChange={setOpen}
        defaultIntent={defaultIntent}
        defaultCategory={defaultCategory}
        defaultCity={defaultCity}
        listingId={listingId}
        sourcePage={sourcePage}
      />
    </>
  );
};

export default TellVendibookButton;
