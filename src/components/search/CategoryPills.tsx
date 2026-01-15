import { Truck, ShoppingCart, Factory, MapPin, LucideIcon } from 'lucide-react';
import { ListingCategory } from '@/types/listing';
import { cn } from '@/lib/utils';

interface CategoryPillsProps {
  selectedCategory: ListingCategory | null;
  onSelectCategory: (category: ListingCategory | null) => void;
}

interface Category {
  id: ListingCategory;
  label: string;
  icon: LucideIcon;
}

const categories: Category[] = [
  { id: 'food_truck', label: 'Food Trucks', icon: Truck },
  { id: 'food_trailer', label: 'Food Trailers', icon: ShoppingCart },
  { id: 'ghost_kitchen', label: 'Ghost Kitchens', icon: Factory },
  { id: 'vendor_lot', label: 'Vendor Lots', icon: MapPin },
];

const CategoryPills = ({ selectedCategory, onSelectCategory }: CategoryPillsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const Icon = category.icon;
        const isActive = selectedCategory === category.id;
        
        return (
          <button
            key={category.id}
            onClick={() => 
              onSelectCategory(selectedCategory === category.id ? null : category.id)
            }
            className={cn(
              "group inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
              isActive 
                ? "bg-primary/10 text-primary border border-primary/20" 
                : "bg-secondary text-foreground hover:bg-muted border border-transparent"
            )}
          >
            <span className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
              isActive 
                ? "icon-gradient-container" 
                : "bg-muted-foreground/10 group-hover:bg-primary/10"
            )}>
              <span className={cn(isActive && "icon-gradient")}>
                <Icon className={cn(
                  "h-3.5 w-3.5 transition-all duration-300",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground group-hover:text-primary"
                )} strokeWidth={2} />
              </span>
            </span>
            <span>{category.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryPills;
