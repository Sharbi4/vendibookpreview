import vendibookLogo from '@/assets/vendibook-logo.png';

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-b from-vendibook-cream to-background pt-4 pb-4">
      <div className="container max-w-5xl mx-auto px-4">
        {/* Hero Content */}
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center animate-fade-in">
            <img 
              src={vendibookLogo} 
              alt="Vendibook" 
              className="h-64 md:h-80 w-auto mix-blend-multiply transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
