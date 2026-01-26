import { motion } from 'framer-motion';
import { Truck, Zap, Users, Clock, Package, Scale, Ruler, Check, Sparkles } from 'lucide-react';
import type { FulfillmentType, ListingCategory } from '@/types/listing';

interface EnhancedQuickHighlightsProps {
  fulfillmentType: FulfillmentType;
  category: ListingCategory;
  highlights?: string[] | null;
  instantBook?: boolean;
  deliveryFee?: number | null;
  hoursOfAccess?: string | null;
  weightLbs?: number | null;
  lengthInches?: number | null;
  widthInches?: number | null;
  heightInches?: number | null;
  isRental?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 15,
    }
  },
};

const EnhancedQuickHighlights = ({
  fulfillmentType,
  category,
  highlights,
  instantBook,
  deliveryFee,
  hoursOfAccess,
  weightLbs,
  lengthInches,
  widthInches,
  heightInches,
  isRental = true,
}: EnhancedQuickHighlightsProps) => {
  const items: { icon: React.ReactNode; title: string; description?: string; accent?: boolean }[] = [];

  // Instant book - highlight first for conversions
  if (instantBook) {
    items.push({
      icon: <Zap className="h-5 w-5" />,
      title: 'Instant Book',
      description: 'Book without waiting for approval',
      accent: true,
    });
  }

  // Add fulfillment type based on what's available
  if (fulfillmentType === 'on_site') {
    items.push({
      icon: <Users className="h-5 w-5" />,
      title: 'On-site access',
      description: 'Access at the location',
    });
  }

  if (fulfillmentType === 'delivery' || fulfillmentType === 'both') {
    items.push({
      icon: <Truck className="h-5 w-5" />,
      title: 'Delivery available',
      description: deliveryFee ? `Starting at $${deliveryFee}` : 'Free delivery',
    });
  }

  if (fulfillmentType === 'pickup' || fulfillmentType === 'both') {
    items.push({
      icon: <Package className="h-5 w-5" />,
      title: 'Pickup available',
      description: 'Pick up at host location',
    });
  }

  // Hours of access for static locations
  if ((category === 'ghost_kitchen' || category === 'vendor_lot') && hoursOfAccess) {
    items.push({
      icon: <Clock className="h-5 w-5" />,
      title: hoursOfAccess,
      description: 'Hours of access',
    });
  }

  // Add dimensions for sale listings
  if (!isRental && (category === 'food_truck' || category === 'food_trailer')) {
    if (weightLbs) {
      items.push({
        icon: <Scale className="h-5 w-5" />,
        title: `${weightLbs.toLocaleString()} lbs`,
        description: 'Total weight',
      });
    }

    if (lengthInches && widthInches && heightInches) {
      const lengthFt = Math.round(lengthInches / 12);
      const widthFt = Math.round(widthInches / 12);
      const heightFt = Math.round(heightInches / 12);
      items.push({
        icon: <Ruler className="h-5 w-5" />,
        title: `${lengthFt}' × ${widthFt}' × ${heightFt}'`,
        description: 'L × W × H',
      });
    } else if (lengthInches) {
      const lengthFt = Math.round(lengthInches / 12);
      items.push({
        icon: <Ruler className="h-5 w-5" />,
        title: `${lengthFt}' long`,
        description: 'Total length',
      });
    }
  }

  // Add highlights from listing
  if (highlights && highlights.length > 0) {
    highlights.slice(0, isRental ? 3 : 2).forEach((highlight) => {
      items.push({
        icon: <Check className="h-5 w-5" />,
        title: highlight,
      });
    });
  }

  const displayItems = items.slice(0, 6);

  if (displayItems.length === 0) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-30px" }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {displayItems.map((item, idx) => (
        <motion.div
          key={idx}
          variants={itemVariants}
          whileHover={{ 
            scale: 1.02, 
            y: -2,
            transition: { type: 'spring', stiffness: 400, damping: 20 }
          }}
          className={`
            group flex items-center gap-3 p-4 rounded-xl border transition-all cursor-default
            ${item.accent 
              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' 
              : 'bg-muted/30 border-border hover:bg-muted/50 hover:border-border/80'
            }
          `}
        >
          <motion.div 
            className={`
              flex-shrink-0 p-2.5 rounded-lg transition-colors
              ${item.accent 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' 
                : 'bg-background text-foreground group-hover:bg-primary/10 group-hover:text-primary'
              }
            `}
            whileHover={{ rotate: 5 }}
          >
            {item.accent ? <Sparkles className="h-5 w-5" /> : item.icon}
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className={`font-medium text-sm ${item.accent ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>
              {item.title}
            </p>
            {item.description && (
              <p className={`text-xs ${item.accent ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-muted-foreground'}`}>
                {item.description}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default EnhancedQuickHighlights;
