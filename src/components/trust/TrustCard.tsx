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
                 transition-all duration-300 ease-out cursor-pointer
                 hover:shadow-card-hover hover:-translate-y-1 hover:border-primary
                 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      aria-label={`Learn more about ${tile.title}`}
    >
      <div className="w-12 h-12 rounded-full icon-gradient-container icon-shimmer mb-4 
                      transition-transform duration-300 group-hover:scale-110">
        <div className="icon-gradient">
          <Icon className="w-6 h-6 text-primary" strokeWidth={1.5} />
        </div>
      </div>
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
