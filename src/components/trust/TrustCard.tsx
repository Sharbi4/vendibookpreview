import { BrandIcon } from '@/components/brand/BrandIcon';
import { TrustTile } from './trustContent';

interface TrustCardProps {
  tile: TrustTile;
  onClick: () => void;
}

const TrustCard = ({ tile, onClick }: TrustCardProps) => {
  const Icon = tile.icon;
  
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center text-center p-6 bg-card rounded-xl border border-border 
                 transition-all duration-300 ease-out cursor-pointer card-glow
                 hover:shadow-card-hover hover:-translate-y-1 hover:border-primary
                 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      aria-label={`Learn more about ${tile.title}`}
    >
      <BrandIcon icon={Icon} size={48} className="mb-5"/>
      <h3 className="text-base font-semibold text-foreground mb-2">
        {tile.title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {tile.explainer}
      </p>
    </button>
  );
};

export default TrustCard;
