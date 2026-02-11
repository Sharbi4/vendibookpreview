import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Pencil, Quote, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface AboutSectionProps {
  bio: string | null;
  isOwnProfile?: boolean;
  displayName?: string;
}

const AboutSection = ({ bio, isOwnProfile, displayName }: AboutSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const CHAR_LIMIT = 150;
  const BIO_MAX = 500;
  const shouldTruncate = bio && bio.length > CHAR_LIMIT;

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: editValue.trim() || null })
        .eq('id', user.id);
      if (error) throw error;
      toast({ title: 'Bio updated' });
      queryClient.invalidateQueries({ queryKey: ['public-profile'] });
      setIsEditing(false);
    } catch {
      toast({ title: 'Failed to save bio', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!bio && !isOwnProfile) return null;

  // Inline editing mode
  if (isEditing && isOwnProfile) {
    return (
      <div className="space-y-2">
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.slice(0, BIO_MAX))}
          placeholder="Tell your story to connect with customers..."
          className="min-h-[100px] text-sm resize-none bg-white/40 dark:bg-white/[0.06] backdrop-blur-xl border-white/20 dark:border-white/10"
          autoFocus
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{editValue.length}/{BIO_MAX}</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setIsEditing(false); setEditValue(bio || ''); }} disabled={isSaving}>
              <X className="h-3 w-3 mr-1" /> Cancel
            </Button>
            <Button variant="dark-shine" size="sm" className="h-7 text-xs" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state for own profile
  if (!bio && isOwnProfile) {
    return (
      <div className="bg-white/30 dark:bg-white/[0.04] backdrop-blur-xl rounded-xl p-4 border border-dashed border-white/20 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Quote className="h-4 w-4" />
            <span className="text-sm">Tell your story to connect with customers</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(true)}>
            <Pencil className="h-3 w-3 mr-1" />
            Add bio
          </Button>
        </div>
      </div>
    );
  }

  const displayedText = shouldTruncate && !isExpanded
    ? bio!.slice(0, CHAR_LIMIT) + '...'
    : bio;

  return (
    <div className="relative">
      <div className="flex items-start gap-3">
        <Quote className="h-4 w-4 text-primary/50 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {displayedText}
          </p>
          {shouldTruncate && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-auto p-0 text-xs text-primary mt-1"
            >
              {isExpanded ? (
                <><ChevronUp className="h-3 w-3 mr-0.5" /> Read less</>
              ) : (
                <><ChevronDown className="h-3 w-3 mr-0.5" /> Read more</>
              )}
            </Button>
          )}
        </div>
        {isOwnProfile && (
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => { setEditValue(bio || ''); setIsEditing(true); }}>
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default AboutSection;
