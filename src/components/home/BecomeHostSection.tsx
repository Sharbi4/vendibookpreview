import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, DollarSign, Shield, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import ownersFoodTruck from '@/assets/home/owners-food-truck.jpg';
import foodTruckCoffee from '@/assets/food-truck-coffee.jpg';
import foodTruckGrilledCheese from '@/assets/food-truck-grilled-cheese.jpg';

const carouselImages = [
  { src: ownersFoodTruck, alt: 'Food truck serving customers at golden hour' },
  { src: foodTruckCoffee, alt: 'Food truck serving fresh coffee' },
  { src: foodTruckGrilledCheese, alt: 'Food truck with grilled cheese menu' },
];

const benefits = [
  { icon: DollarSign, text: 'Built-in booking & calendar management' },
  { icon: Shield, text: 'Verified renters with ID checks' },
  { icon: Clock, text: 'List in under 10 minutes' },
];

const BecomeHostSection = () => {
  const [current, setCurrent] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);

  const next = () => setCurrent((p) => (p + 1) % carouselImages.length);
  const prev = () => setCurrent((p) => (p - 1 + carouselImages.length) % carouselImages.length);

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${current * 100}%)`;
    }
  }, [current]);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.changedTouches[0].screenX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].screenX - startX.current;
    if (dx < -40) next();
    if (dx > 40) prev();
    startX.current = null;
  };

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      {/* Subtle warm ambient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-[140px]" style={{ background: 'radial-gradient(ellipse, rgba(255,81,36,0.022) 0%, rgba(255,186,8,0.01) 40%, transparent 70%)' }} />

      <div className="container max-w-4xl mx-auto px-5 sm:px-6 relative z-10">
        {/* Photo carousel */}
        <motion.div
          className="glass-premium relative mx-auto mb-10 max-w-3xl overflow-hidden rounded-3xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div ref={trackRef} className="flex transition-transform duration-500 ease-out">
            {carouselImages.map((img, i) => (
              <div key={i} className="min-w-full">
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  width={1280}
                  height={896}
                  className="w-full h-[240px] sm:h-[320px] md:h-[380px] object-cover"
                  draggable={false}
                />
              </div>
            ))}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent pointer-events-none" />

          {/* Nav arrows */}
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/70 backdrop-blur-sm border border-border/60 flex items-center justify-center text-foreground/80 hover:bg-background/90 transition-colors z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/70 backdrop-blur-sm border border-border/60 flex items-center justify-center text-foreground/80 hover:bg-background/90 transition-colors z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {carouselImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-primary w-5' : 'bg-foreground/40 hover:bg-foreground/60'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] bg-foreground/[0.06] text-foreground/70 rounded-full mb-6 border border-foreground/[0.10]">
            For Owners
          </span>

          <h2 className="text-3xl sm:text-4xl md:text-[46px] font-semibold tracking-tight text-foreground mb-4 leading-[1.1]">
            Put your idle truck{' '}
            <span className="text-muted-foreground">back to work.</span>
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            List for free, set your own terms, and manage bookings, documents, and
            messaging in one place.
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {benefits.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2.5 rounded-full border border-foreground/[0.10] bg-foreground/[0.035] px-4 py-2.5 text-sm text-muted-foreground"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              >
                <item.icon className="w-4 h-4 text-foreground/50" />
                {item.text}
              </motion.div>
            ))}
          </div>


          <div>
            <Button 
              asChild 
              size="lg" 
              variant="glass-cta"
              className="rounded-full px-10"
            >
              <Link to="/list" className="flex items-center gap-2">
                List Your Asset
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BecomeHostSection;
