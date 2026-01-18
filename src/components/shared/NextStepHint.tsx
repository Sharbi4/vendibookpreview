import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NextStepHintProps {
  text: string;
  className?: string;
  variant?: 'default' | 'subtle';
}

const NextStepHint = ({ text, className, variant = 'default' }: NextStepHintProps) => {
  return (
    <div 
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg",
        variant === 'default' 
          ? "bg-primary/5 border border-primary/20" 
          : "bg-muted/50",
        className
      )}
    >
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <ArrowRight className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="flex-1">
        <span className="text-xs font-medium text-muted-foreground">Next:</span>
        <span className="text-sm text-foreground ml-1.5">{text}</span>
      </div>
    </div>
  );
};

export default NextStepHint;
