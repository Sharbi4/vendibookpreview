import { useState } from 'react';
import { motion } from 'framer-motion';
import HeroSearchFirst from './hero/HeroSearchFirst';
import HeroValueProp from './hero/HeroValueProp';
import HeroVisualShowcase from './hero/HeroVisualShowcase';

const VARIANTS = [
  { key: 'search', label: 'A: Search-First', component: HeroSearchFirst },
  { key: 'value', label: 'B: Value Prop', component: HeroValueProp },
  { key: 'visual', label: 'C: Visual Showcase', component: HeroVisualShowcase },
] as const;

const Hero = () => {
  const [activeVariant, setActiveVariant] = useState(0);
  const ActiveHero = VARIANTS[activeVariant].component;

  return (
    <div className="relative">
      {/* Variant toggle — remove after selecting */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1 rounded-full bg-card/90 backdrop-blur-xl border border-border shadow-xl">
        {VARIANTS.map((v, i) => (
          <button
            key={v.key}
            onClick={() => setActiveVariant(i)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
              activeVariant === i
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <ActiveHero />
    </div>
  );
};

export default Hero;
