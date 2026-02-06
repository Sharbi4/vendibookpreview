import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Store, ChefHat, MapPin, Wrench, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ListingCategory } from '@/types/listing';

export interface CategoryDefinition {
  key: string;
  label: string;
  icon: typeof Truck;
  definition: string;
  bestFor: string[];
  example: string;
  browseHref?: string;
  listHref?: string;
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    key: 'food_truck',
    label: 'Food Truck',
    icon: Truck,
    definition: 'A self-contained mobile kitchen built into a vehicle, ready to operate at events, streets, and lots.',
    bestFor: ['Events and catering', 'Daily street vending', 'Pop-ups and festivals'],
    example: 'Book a truck for a weekend event, or list your truck to earn on off-days.',
    browseHref: '/search?category=food_truck',
    listHref: '/list',
  },
  {
    key: 'food_trailer',
    label: 'Food Trailer',
    icon: Store,
    definition: 'A towable kitchen trailer pulled by a vehicle, often lower cost and highly customizable.',
    bestFor: ['New operators starting out', 'Long-term lot setups', 'Seasonal operations'],
    example: 'Rent a trailer for a month, or sell a used trailer when upgrading.',
    browseHref: '/search?category=food_trailer',
    listHref: '/list',
  },
  {
    key: 'ghost_kitchen',
    label: 'Shared Kitchen',
    icon: ChefHat,
    definition: 'A licensed commercial kitchen for prep and delivery-only brands, without a storefront.',
    bestFor: ['Delivery-only concepts', 'Catering prep', 'Commissary needs'],
    example: 'Rent prep time in a kitchen for your delivery brand.',
    browseHref: '/search?category=ghost_kitchen',
    listHref: '/list',
  },
  {
    key: 'vendor_lot',
    label: 'Vendor Space',
    icon: MapPin,
    definition: 'A designated parking or operating location where mobile vendors can set up and sell.',
    bestFor: ['Consistent daily locations', 'Vendor events and markets', 'Food truck parks'],
    example: 'Book a vendor spot for the weekend, or list your space to host vendors.',
    browseHref: '/search?category=vendor_lot',
    listHref: '/list',
  },
];

interface CategoryGuideProps {
  variant?: 'cards' | 'accordion' | 'compact';
  showActions?: boolean;
  citySlug?: string;
  mode?: 'browse' | 'list' | 'both';
  className?: string;
}

export function CategoryGuide({ 
  variant = 'cards', 
  showActions = true, 
  citySlug,
  mode = 'both',
  className 
}: CategoryGuideProps) {
  
  const getLinks = (category: CategoryDefinition) => {
    const browseHref = citySlug 
      ? `/search?category=${category.key}&location=${citySlug}` 
      : category.browseHref;
    const listHref = '/list';
    return { browseHref, listHref };
  };

  if (variant === 'accordion') {
    return (
      <Accordion type="single" collapsible className={cn("w-full", className)}>
        {CATEGORY_DEFINITIONS.map((cat, i) => (
          <AccordionItem key={cat.key} value={`cat-${i}`}>
            <AccordionTrigger className="text-left hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <cat.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">{cat.label}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-11 space-y-3">
                <p className="text-muted-foreground text-sm">{cat.definition}</p>
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Best for:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {cat.bestFor.map((item, j) => (
                      <li key={j} className="flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground italic">"{cat.example}"</p>
                {showActions && (
                  <div className="flex gap-2 pt-2">
                    {(mode === 'browse' || mode === 'both') && (
                      <Button asChild size="sm" variant="default">
                        <Link to={getLinks(cat).browseHref || '#'}>Browse</Link>
                      </Button>
                    )}
                    {(mode === 'list' || mode === 'both') && (
                      <Button asChild size="sm" variant="outline">
                        <Link to={getLinks(cat).listHref || '#'}>List</Link>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", className)}>
        {CATEGORY_DEFINITIONS.map((cat) => (
          <div key={cat.key} className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <cat.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-foreground text-sm">{cat.label}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">{cat.definition}</p>
              {showActions && (
                <div className="flex gap-2 mt-2">
                  {(mode === 'browse' || mode === 'both') && (
                    <Link 
                      to={getLinks(cat).browseHref || '#'} 
                      className="text-xs text-primary hover:underline"
                    >
                      Browse →
                    </Link>
                  )}
                  {(mode === 'list' || mode === 'both') && (
                    <Link 
                      to={getLinks(cat).listHref || '#'} 
                      className="text-xs text-primary hover:underline"
                    >
                      List →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: cards
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {CATEGORY_DEFINITIONS.map((cat) => (
        <Card key={cat.key} className="h-full">
          <CardContent className="p-5 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <cat.icon className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground">{cat.label}</h4>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">{cat.definition}</p>
            
            <div className="mb-3">
              <p className="text-xs font-medium text-foreground mb-1.5">Best for:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {cat.bestFor.map((item, j) => (
                  <li key={j} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <p className="text-xs text-muted-foreground italic mb-4">"{cat.example}"</p>
            
            {showActions && (
              <div className="flex gap-2 mt-auto">
                {(mode === 'browse' || mode === 'both') && (
                  <Button asChild size="sm" className="flex-1">
                    <Link to={getLinks(cat).browseHref || '#'}>Browse</Link>
                  </Button>
                )}
                {(mode === 'list' || mode === 'both') && (
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to={getLinks(cat).listHref || '#'}>List</Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Info button modal for Search page filter
export function CategoryInfoModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Category info</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Understanding categories</DialogTitle>
        </DialogHeader>
        <CategoryGuide variant="accordion" showActions={false} />
      </DialogContent>
    </Dialog>
  );
}

// Helper to get category definition by key
export function getCategoryDefinition(categoryKey: string): CategoryDefinition | undefined {
  return CATEGORY_DEFINITIONS.find(cat => cat.key === categoryKey);
}

// Tooltip wrapper for category badges
interface CategoryTooltipProps {
  category: ListingCategory | string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export const CategoryTooltip = forwardRef<HTMLDivElement, CategoryTooltipProps>(
  function CategoryTooltip({ category, children, side = 'bottom' }, ref) {
    const definition = getCategoryDefinition(category);
    
    if (!definition) {
      return <>{children}</>;
    }

    const Icon = definition.icon;

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span ref={ref} className="inline-flex">
              {children}
            </span>
          </TooltipTrigger>
          <TooltipContent 
            side={side} 
            className="max-w-[280px] p-3"
            sideOffset={5}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="font-semibold text-sm">{definition.label}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {definition.definition}
              </p>
              <div className="pt-1 border-t border-border">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Best for</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {definition.bestFor.slice(0, 3).map((item, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

export default CategoryGuide;
