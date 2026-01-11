import { Truck, ShoppingCart, Factory, MapPin } from 'lucide-react';
import { ListingCategory } from '@/types/listing';
import { cn } from '@/lib/utils';

interface CategoryPillsProps {
  selectedCategory: ListingCategory | null;
  onSelectCategory: (category: ListingCategory | null) => void;
}

const categories: { id: ListingCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'food_truck', label: 'Food Trucks', icon: <Truck className="h-4 w-4" /> },
  { id: 'food_trailer', label: 'Food Trailers', icon: <ShoppingCart className="h-4 w-4" /> },
  { id: 'ghost_kitchen', label: 'Ghost Kitchens', icon: <Factory className="h-4 w-4" /> },
  { id: 'vendor_lot', label: 'Vendor Lots', icon: <MapPin className="h-4 w-4" /> },
];

const CategoryPills = ({ selectedCategory, onSelectCategory }: CategoryPillsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => 
            onSelectCategory(selectedCategory === category.id ? null : category.id)
          }
          className={cn(
            "pill",
            selectedCategory === category.id ? "pill-active" : "pill-default"
          )}
        >
          {category.icon}
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );
};

export default CategoryPills;
