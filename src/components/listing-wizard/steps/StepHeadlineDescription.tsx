import React, { useState } from 'react';
import { Sparkles, Loader2, Check, RotateCcw, Type, FileText } from 'lucide-react';
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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
          <Type className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Let's create your listing</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Start with a catchy headline and detailed description that will attract {mode === 'rent' ? 'renters' : 'buyers'}.
        </p>
      </div>

      {/* Title Input */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label htmlFor="title" className="text-lg font-semibold">Listing Headline</Label>
          <span className={cn(
            "text-sm font-medium px-2 py-0.5 rounded-full",
            title.length >= 5 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"
          )}>
            {title.length}/80
          </span>
        </div>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value.slice(0, 80))}
          placeholder="e.g., 2022 Fully Equipped Taco Truck - Ready to Roll"
          className="text-lg h-14"
        />
        <p className="text-sm text-muted-foreground">
          💡 Include key details like year, type, specialty, or unique features.
        </p>
      </div>

      {/* Description with AI Builder */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label htmlFor="description" className="text-lg font-semibold">Description</Label>
          <div className="flex items-center gap-2">
            {showOptimized && originalDescription && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={revertDescription}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Revert
              </Button>
            )}
          </div>
        </div>
        
        <div className="relative">
          <Textarea
            id="description"
            value={description}
            onChange={(e) => {
              onDescriptionChange(e.target.value);
              if (showOptimized) setShowOptimized(false);
            }}
            placeholder="Describe your listing in detail. What makes it special? What equipment is included? What's the condition?"
            rows={8}
            className="resize-none text-base"
          />
        </div>
        
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Be detailed! {mode === 'rent' ? 'Renters' : 'Buyers'} want to know everything about your asset.
          </p>
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
            description.length >= 50 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          )}>
            {description.length < 50 ? `${50 - description.length} more chars needed` : '✓ Good length'}
          </span>
        </div>

        {/* AI Optimize Card */}
        <div className="relative overflow-hidden rounded-xl p-4 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary to-amber-500 rounded-xl shadow-md shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground mb-1">AI Writing Assistant</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Let AI polish your description into professional, engaging copy.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={optimizeDescription}
                disabled={isOptimizing || !description || description.length < 10}
                className="bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0 shadow-md"
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
      </div>
    </div>
  );
};
