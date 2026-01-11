import { ListingMode } from '@/types/listing';
import { cn } from '@/lib/utils';

interface ModeToggleProps {
  mode: ListingMode | null;
  onModeChange: (mode: ListingMode | null) => void;
}

const ModeToggle = ({ mode, onModeChange }: ModeToggleProps) => {
  return (
    <div className="inline-flex items-center bg-secondary rounded-full p-1">
      <button
        onClick={() => onModeChange(mode === 'rent' ? null : 'rent')}
        className={cn(
          "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200",
          mode === 'rent' 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        For Rent
      </button>
      <button
        onClick={() => onModeChange(mode === 'sale' ? null : 'sale')}
        className={cn(
          "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200",
          mode === 'sale' 
            ? "bg-emerald-500 text-white shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        For Sale
      </button>
    </div>
  );
};

export default ModeToggle;
