import React, { useState } from 'react';
import { Sparkles, Loader2, Check, RotateCcw, Type } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface StepHeadlineDescriptionProps {
  title: string;
  description: string;
  category: string | null;
  mode: 'rent' | 'sale';
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export const StepHeadlineDescription: React.FC<StepHeadlineDescriptionProps> = ({
  title,
  description,
  category,
  mode,
  onTitleChange,
  onDescriptionChange,
}) => {
  const { toast } = useToast();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [originalDescription, setOriginalDescription] = useState<string | null>(null);
  const [showOptimized, setShowOptimized] = useState(false);

  const optimizeDescription = async () => {
    if (!description || description.trim().length < 10) {
      toast({
        title: 'Description too short',
        description: 'Please write at least 10 characters to optimize.',
        variant: 'destructive',
      });
      return;
    }

    setIsOptimizing(true);
    setOriginalDescription(description);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-description', {
        body: {
          rawDescription: description,
          category,
          mode,
          title,
        },
      });

      if (error) throw error;

      if (data?.optimizedDescription) {
        onDescriptionChange(data.optimizedDescription);
        setShowOptimized(true);
        toast({
          title: 'Description optimized!',
          description: 'Your listing description has been professionally rewritten.',
        });
      }
    } catch (error) {
      console.error('Error optimizing description:', error);
      toast({
        title: 'Optimization failed',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const revertDescription = () => {
    if (originalDescription) {
      onDescriptionChange(originalDescription);
      setOriginalDescription(null);
      setShowOptimized(false);
      toast({
        title: 'Description reverted',
        description: 'Your original description has been restored.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-3 pb-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
          <Type className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Create your listing</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Start with a catchy headline and detailed description.
        </p>
      </div>

      {/* Title Input */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label htmlFor="title" className="text-sm font-semibold text-foreground">Listing Headline</Label>
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full transition-colors",
            title.length >= 5 
              ? "bg-primary/10 text-primary" 
              : "bg-muted text-muted-foreground"
          )}>
            {title.length}/80
          </span>
        </div>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value.slice(0, 80))}
          placeholder="e.g., 2022 Fully Equipped Taco Truck - Ready to Roll"
          className="h-12 text-base bg-background"
        />
        <p className="text-xs text-muted-foreground">
          Include key details like year, type, specialty, or unique features.
        </p>
      </div>

      {/* Description */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label htmlFor="description" className="text-sm font-semibold text-foreground">Description</Label>
          {showOptimized && originalDescription && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={revertDescription}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Revert
            </Button>
          )}
        </div>
        
        <Textarea
          id="description"
          value={description}
          onChange={(e) => {
            onDescriptionChange(e.target.value);
            if (showOptimized) setShowOptimized(false);
          }}
          placeholder="Describe your listing in detail. What makes it special? What equipment is included?"
          rows={6}
          className="resize-none text-sm bg-background"
        />
        
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Be detailed! {mode === 'rent' ? 'Renters' : 'Buyers'} want to know everything.
          </p>
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full transition-colors",
            description.length >= 50 
              ? "bg-primary/10 text-primary" 
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          )}>
            {description.length < 50 ? `${50 - description.length} more` : '✓ Good'}
          </span>
        </div>

        {/* AI Optimize Card */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-foreground">AI Writing Assistant</h4>
              <p className="text-xs text-muted-foreground">
                Polish your description into professional copy.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={optimizeDescription}
            disabled={isOptimizing || !description || description.length < 10}
            className="w-full"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : showOptimized ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Optimized!
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Optimize with AI
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
