const HeroBackground = () => (
  <>
    {/* Solid dark base */}
    <div className="absolute inset-0 bg-background" />

    {/* Subtle grid pattern */}
    <div
      className="absolute inset-0 opacity-[0.035]"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }}
    />

    {/* Radial fade so grid fades at edges */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse 70% 60% at 50% 45%, transparent 0%, hsl(var(--background)) 100%)',
      }}
    />

    {/*
      NOTE: Previously this layer used multiple motion.div elements with
      `filter: blur(60-80px)` animating x/y on infinite loops. Combined with
      page scroll, those blurred layers re-rasterized every frame and caused
      visible flicker / tearing on the homepage. Replaced with a single
      static warm-glow gradient promoted to its own GPU layer.
    */}
    <div
      className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(255,81,36,0.04) 0%, rgba(255,186,8,0.015) 40%, transparent 70%)',
        transform: 'translate3d(-50%, 0, 0)',
        willChange: 'transform',
      }}
    />
  </>
);

export default HeroBackground;
