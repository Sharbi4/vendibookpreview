import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface Props {
  location: string;
  totalCost: string;
}

export default function RoadmapSuccess({ location, totalCost }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl border border-[#FF5124]/30 bg-gradient-to-br from-[#FF5124]/15 via-[#08080a] to-[#08080a] p-6 sm:p-8 text-center"
    >
      <div className="pointer-events-none absolute inset-0 opacity-30"
           style={{ background: 'radial-gradient(60% 60% at 50% 0%, rgba(255,81,36,0.35), transparent 70%)' }} />
      <div className="relative">
        <div className="mx-auto h-14 w-14 rounded-full bg-[#FF5124] flex items-center justify-center mb-4 shadow-[0_8px_30px_-4px_rgba(255,81,36,0.7)]">
          <CheckCircle2 className="h-7 w-7 text-white" />
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase text-[#FF5124] mb-2">
          <Award className="h-3 w-3" /> Cleared to roll
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          You're permit-ready in {location}
        </h3>
        <p className="text-white/70 mb-6 max-w-md mx-auto">
          You've completed every required step{totalCost ? ` (about ${totalCost} all in)` : ''}.
          The next move is getting in front of customers.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild className="bg-[#FF5124] hover:bg-[#FF5124]/90 text-white h-11 px-5 font-semibold">
            <Link to="/list">
              Create your Vendibook listing <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 h-11 px-5">
            <Link to="/search?type=kitchen">Find a commissary near you</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
