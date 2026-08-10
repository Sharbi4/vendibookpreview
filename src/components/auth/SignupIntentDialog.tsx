import { Bell, Heart, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { trackEvent } from '@/lib/analytics';

export type SignupIntent = 'favorite' | 'save_search' | 'alerts';

const COPY: Record<SignupIntent, { title: string; description: string; icon: typeof Heart }> = {
  favorite: {
    title: 'Save this listing to your account',
    description:
      'Create a free account to keep your saved listings in one place and pick up where you left off.',
    icon: Heart,
  },
  save_search: {
    title: 'Save this search',
    description:
      'Create a free account so we can store this search and notify you when new matches are posted.',
    icon: Search,
  },
  alerts: {
    title: 'Get alerts for new matches',
    description:
      'Create a free account to receive an email when new listings match what you are looking for.',
    icon: Bell,
  },
};

interface SignupIntentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: SignupIntent;
  /** Where to return after auth. Defaults to the current URL. */
  returnTo?: string;
}

/**
 * Intent-triggered signup nudge. Only rendered after a visitor takes an
 * action that genuinely requires an account (favorite, save search, alerts).
 * Browsing is never gated.
 */
export const SignupIntentDialog = ({
  open,
  onOpenChange,
  intent,
  returnTo,
}: SignupIntentDialogProps) => {
  const navigate = useNavigate();
  const { title, description, icon: Icon } = COPY[intent];

  const target = returnTo ?? `${window.location.pathname}${window.location.search}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              trackEvent({ category: 'Activation', action: 'signup_intent_dismissed', label: intent });
              onOpenChange(false);
            }}
          >
            Keep browsing
          </Button>
          <Button
            variant="dark-shine"
            className="flex-1"
            onClick={() => {
              trackEvent({ category: 'Activation', action: 'signup_intent_accepted', label: intent });
              onOpenChange(false);
              navigate(`/auth?redirect=${encodeURIComponent(target)}`);
            }}
          >
            Create free account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignupIntentDialog;
