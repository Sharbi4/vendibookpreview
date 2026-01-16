import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Copy, 
  Check, 
  Sparkles, 
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
  Printer
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutputCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  gradient?: string;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const OutputCard = ({
  title,
  subtitle,
  icon,
  children,
  className,
  gradient = 'from-primary/5 to-primary/10',
  actions,
  collapsible = false,
  defaultExpanded = true,
}: OutputCardProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card className={cn(
        'overflow-hidden border-0 shadow-lg',
        `bg-gradient-to-br ${gradient}`,
        className
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {icon && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md"
                >
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </motion.div>
              )}
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {title}
                  <Badge variant="secondary" className="text-xs font-normal">
                    AI Generated
                  </Badge>
                </CardTitle>
                {subtitle && <CardDescription>{subtitle}</CardDescription>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {actions}
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="pt-4">{children}</CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

interface OutputMetricProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: 'default' | 'highlight' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  prefix?: string;
  suffix?: string;
}

export const OutputMetric = ({
  label,
  value,
  icon,
  variant = 'default',
  size = 'md',
  prefix = '',
  suffix = '',
}: OutputMetricProps) => {
  const variantStyles = {
    default: 'bg-muted/50',
    highlight: 'bg-primary/10 border border-primary/20',
    success: 'bg-green-500/10 border border-green-500/20',
    warning: 'bg-amber-500/10 border border-amber-500/20',
  };

  const valueStyles = {
    default: 'text-foreground',
    highlight: 'text-primary',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
  };

  const sizeStyles = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  const valueSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('rounded-xl', variantStyles[variant], sizeStyles[size])}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className={cn('font-bold', valueSizes[size], valueStyles[variant])}>
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>
    </motion.div>
  );
};

interface CopyableTextProps {
  text: string;
  label: string;
  variant?: 'inline' | 'block';
  className?: string;
}

export const CopyableText = ({ text, label, variant = 'block', className }: CopyableTextProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: `${label} copied to clipboard!` });
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="text-sm">{text}</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn('space-y-2', className)}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 gap-1.5">
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs text-green-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>
      <div className="p-4 bg-muted/50 rounded-lg border">
        <p className="text-sm whitespace-pre-wrap">{text}</p>
      </div>
    </motion.div>
  );
};

interface OutputListProps {
  items: string[];
  icon?: React.ReactNode;
  variant?: 'check' | 'number' | 'bullet';
  columns?: 1 | 2 | 3;
  className?: string;
}

export const OutputList = ({
  items,
  icon,
  variant = 'check',
  columns = 1,
  className,
}: OutputListProps) => {
  const columnStyles = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <ul className={cn('grid gap-2', columnStyles[columns], className)}>
      {items.map((item, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-start gap-2 text-sm"
        >
          {variant === 'check' && (
            <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
          )}
          {variant === 'number' && (
            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
          )}
          {variant === 'bullet' && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />
          )}
          {icon && !['check', 'number', 'bullet'].includes(variant) && (
            <span className="shrink-0 mt-0.5">{icon}</span>
          )}
          <span>{item}</span>
        </motion.li>
      ))}
    </ul>
  );
};

interface OutputSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
}

export const OutputSection = ({
  title,
  description,
  children,
  className,
  collapsible = false,
}: OutputSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-3', className)}
    >
      <div 
        className={cn(
          'flex items-center justify-between',
          collapsible && 'cursor-pointer hover:opacity-80'
        )}
        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div>
          <h4 className="font-semibold text-sm">{title}</h4>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {collapsible && (
          <ChevronDown className={cn(
            'h-4 w-4 transition-transform',
            isExpanded && 'rotate-180'
          )} />
        )}
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface OutputActionsProps {
  onCopy?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  className?: string;
}

export const OutputActions = ({
  onCopy,
  onDownload,
  onShare,
  onPrint,
  className,
}: OutputActionsProps) => {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {onCopy && (
        <Button variant="ghost" size="sm" onClick={onCopy}>
          <Copy className="h-4 w-4" />
        </Button>
      )}
      {onDownload && (
        <Button variant="ghost" size="sm" onClick={onDownload}>
          <Download className="h-4 w-4" />
        </Button>
      )}
      {onShare && (
        <Button variant="ghost" size="sm" onClick={onShare}>
          <Share2 className="h-4 w-4" />
        </Button>
      )}
      {onPrint && (
        <Button variant="ghost" size="sm" onClick={onPrint}>
          <Printer className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

interface EmptyOutputProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const EmptyOutput = ({ icon, title, description }: EmptyOutputProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <motion.div
        animate={{ 
          scale: [1, 1.05, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ 
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="mb-4 opacity-30"
      >
        {icon}
      </motion.div>
      <h3 className="font-medium text-muted-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground/70">{description}</p>
    </div>
  );
};

interface OutputHighlightBadgesProps {
  items: string[];
  variant?: 'default' | 'secondary' | 'outline';
  className?: string;
}

export const OutputHighlightBadges = ({
  items,
  variant = 'secondary',
  className,
}: OutputHighlightBadgesProps) => {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <Badge variant={variant} className="text-xs font-normal py-1 px-2.5">
            {item}
          </Badge>
        </motion.div>
      ))}
    </div>
  );
};
