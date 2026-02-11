import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  name?: string | null;
}

const TypingIndicator = ({ name }: TypingIndicatorProps) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center gap-1 bg-muted rounded-2xl px-4 py-2.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-muted-foreground/60 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      {name && (
        <span className="text-xs text-muted-foreground">typing...</span>
      )}
    </div>
  );
};

export default TypingIndicator;
