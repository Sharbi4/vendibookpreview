import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  message?: string;
  onRetry: () => void;
}

export default function ResultsError({ message, onRetry }: Props) {
  return (
    <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/5 p-6 sm:p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">We couldn't build your checklist</h3>
      <p className="text-sm text-white/65 max-w-md mx-auto mb-5">
        {message || "Something went wrong reaching our compliance engine. Give it another try — it usually works on the second attempt."}
      </p>
      <Button
        onClick={onRetry}
        className="bg-[#FF5124] hover:bg-[#FF5124]/90 text-white font-medium"
      >
        <RefreshCw className="h-4 w-4 mr-2" /> Try again
      </Button>
    </div>
  );
}
