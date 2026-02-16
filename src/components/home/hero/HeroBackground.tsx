import heroImage from '@/assets/hero-food-truck.jpg';

const HeroBackground = () => (
  <>
    {/* Background image */}
    <img
      src={heroImage}
      alt=""
      aria-hidden
      className="absolute inset-0 w-full h-full object-cover"
    />
    {/* Dark overlay with gradient */}
    <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/80 to-background" />
  </>
);

export default HeroBackground;
