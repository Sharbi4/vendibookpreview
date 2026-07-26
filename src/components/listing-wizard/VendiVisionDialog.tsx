import { useState, useRef, useCallback } from 'react';
import { Camera, Loader2, Wand2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface VisionResult {
  category: string;
  mode_suggestion: 'rent' | 'sale';
  condition: string;
  suggested_title: string;
  suggested_description: string;
  estimated_value_min: number;
  estimated_value_max: number;
  amenities: string[];
  confidence: number;
  notes?: string;
}

interface VendiVisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (result: VisionResult, dataUrl: string) => void;
}

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });

export const VendiVisionDialog = ({ open, onOpenChange, onApply }: VendiVisionDialogProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reset = () => {
    setPreview(null);
    setResult(null);
    setAnalyzing(false);
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please choose an image', variant: 'destructive' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Max 8MB', variant: 'destructive' });
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    setResult(null);
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('vendi-vision', {
        body: { imageUrl: dataUrl }});
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as VisionResult);
    } catch (e: any) {
      toast({
        title: 'Vision failed',
        description: e?.message || 'Could not analyze image',
        variant: 'destructive'});
      setPreview(null);
    } finally {
      setAnalyzing(false);
    }
  }, [toast]);

  const apply = () => {
    if (!result || !preview) return;
    onApply(result, preview);
    onOpenChange(false);
    reset();
    toast({ title: 'Applied to listing', description: 'Review and tweak before publishing.' });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Vendi Vision
            <Badge variant="secondary" className="text-[10px] gap-1">AI</Badge>
          </DialogTitle>
          <DialogDescription>
            Snap or upload one photo. AI identifies category, condition, value & auto-fills your listing.
          </DialogDescription>
        </DialogHeader>

        {!preview && (
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary rounded-2xl p-10 text-center cursor-pointer transition-all hover:bg-primary/5"
          >
            <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="font-semibold text-foreground mb-1">Take or choose a photo</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP · up to 8MB</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        )}

        {preview && (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
              <button
                onClick={reset}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {analyzing && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Vendi is analyzing your photo…</p>
                  <p className="text-xs text-muted-foreground">Identifying category, condition & value</p>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <div className="text-[10px] uppercase text-muted-foreground tracking-wide mb-1">Category</div>
                    <div className="font-semibold text-foreground capitalize">{result.category.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <div className="text-[10px] uppercase text-muted-foreground tracking-wide mb-1">Condition</div>
                    <div className="font-semibold text-foreground capitalize">{result.condition.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 col-span-2">
                    <div className="text-[10px] uppercase text-emerald-700 dark:text-emerald-400 tracking-wide mb-1">
                      Estimated {result.mode_suggestion === 'rent' ? 'daily rental' : 'sale value'}
                    </div>
                    <div className="font-bold text-foreground text-lg">
                      ${result.estimated_value_min.toLocaleString()} – ${result.estimated_value_max.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wide mb-1">Suggested title</div>
                  <p className="text-sm font-semibold text-foreground">{result.suggested_title}</p>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wide mb-1">Description preview</div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{result.suggested_description}</p>
                </div>
                {result.amenities?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.amenities.slice(0, 5).map((a) => (
                      <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>
                    ))}
                  </div>
                )}
                <div className={cn(
                  "text-[11px] flex items-center gap-1.5",
                  result.confidence > 0.7 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                )}>
                  
                  {Math.round(result.confidence * 100)}% confidence
                  {result.notes && <span className="text-muted-foreground">· {result.notes}</span>}
                </div>
                <Button onClick={apply} variant="dark-shine" className="w-full rounded-xl">
                  <Check className="h-4 w-4 mr-2" />
                  Apply to listing
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
