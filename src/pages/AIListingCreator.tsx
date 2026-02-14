import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, ImagePlus, Loader2, Sparkles, X, Check, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import vendibookFavicon from '@/assets/vendibook-favicon.png';

type Msg = { role: 'user' | 'assistant'; content: string };

interface ListingPreview {
  title: string;
  description: string;
  category: string;
  mode: string;
  address?: string;
  city?: string;
  state?: string;
  price_daily?: number | null;
  price_weekly?: number | null;
  price_monthly?: number | null;
  price_sale?: number | null;
  amenities?: string[];
  fulfillment_type?: string;
  length_inches?: number | null;
  width_inches?: number | null;
  weight_lbs?: number | null;
  highlights?: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  food_truck: 'Food Truck',
  food_trailer: 'Food Trailer',
  ghost_kitchen: 'Commercial Kitchen',
  vendor_lot: 'Vendor Lot',
  vendor_space: 'Vendor Space',
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-listing-creator`;

function extractPreview(text: string): ListingPreview | null {
  const match = text.match(/```listing-preview\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.ready && parsed.listing) return parsed.listing;
  } catch { /* ignore */ }
  return null;
}

function extractConfirmed(text: string): boolean {
  const match = text.match(/```listing-preview\s*([\s\S]*?)```/);
  if (!match) return false;
  try {
    const parsed = JSON.parse(match[1]);
    return parsed.confirmed === true;
  } catch { return false; }
}

function cleanMessageForDisplay(text: string): string {
  return text.replace(/```listing-preview[\s\S]*?```/g, '').trim();
}

const ListingPreviewCard: React.FC<{ preview: ListingPreview; images: string[] }> = ({ preview, images }) => {
  const price = preview.mode === 'sale'
    ? preview.price_sale ? `$${preview.price_sale.toLocaleString()}` : null
    : preview.price_daily ? `$${preview.price_daily}/day` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden max-w-md mx-auto"
    >
      {/* Image carousel placeholder */}
      {images.length > 0 ? (
        <div className="h-48 overflow-hidden flex">
          <img src={images[0]} alt="Listing" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-48 bg-muted flex items-center justify-center">
          <ImagePlus className="h-12 w-12 text-muted-foreground/40" />
        </div>
      )}
      
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-medium text-primary uppercase tracking-wide">
              {CATEGORY_LABELS[preview.category] || preview.category} • {preview.mode === 'sale' ? 'For Sale' : 'For Rent'}
            </span>
            <h3 className="text-lg font-bold text-foreground mt-1 leading-tight">{preview.title}</h3>
          </div>
          {price && (
            <span className="text-lg font-bold text-foreground whitespace-nowrap">{price}</span>
          )}
        </div>

        {preview.city && (
          <p className="text-sm text-muted-foreground">📍 {preview.city}{preview.state ? `, ${preview.state}` : ''}</p>
        )}

        <p className="text-sm text-muted-foreground line-clamp-3">{preview.description}</p>

        {preview.highlights && preview.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {preview.highlights.map((h, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {h}
              </span>
            ))}
          </div>
        )}

        {preview.amenities && preview.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {preview.amenities.slice(0, 6).map((a, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {a}
              </span>
            ))}
            {preview.amenities.length > 6 && (
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                +{preview.amenities.length - 6} more
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const AIListingCreator: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [preview, setPreview] = useState<ListingPreview | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth?redirect=/list/ai');
      return;
    }
    // Start conversation
    streamChat([{ role: 'user', content: 'Hi, I want to create a listing.' }], true);
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const streamChat = useCallback(async (msgs: Msg[], isInitial = false) => {
    setIsLoading(true);
    let assistantSoFar = '';

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: msgs }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast.error('Rate limited. Please wait a moment and try again.');
        } else if (resp.status === 402) {
          toast.error('AI credits exhausted.');
        } else {
          toast.error('Failed to connect to AI assistant.');
        }
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Check for preview in final message
      const previewData = extractPreview(assistantSoFar);
      if (previewData) setPreview(previewData);

      const confirmed = extractConfirmed(assistantSoFar);
      if (confirmed && preview) {
        await saveListing(preview);
      }
    } catch (e) {
      console.error(e);
      toast.error('Connection error. Please try again.');
    }
    setIsLoading(false);
  }, [preview]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    // Filter out the initial "Hi" message for context
    const contextMsgs = messages.length === 0 
      ? [{ role: 'user' as const, content: 'Hi, I want to create a listing.' }, userMsg]
      : [...messages, userMsg];

    await streamChat(contextMsgs);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploadingImage(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 10MB.`);
        continue;
      }

      const ext = file.name.split('.').pop();
      const path = `${user.id}/ai-create/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from('listing-images')
        .upload(path, file, { contentType: file.type });

      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('listing-images')
        .getPublicUrl(path);

      newUrls.push(urlData.publicUrl);
    }

    setUploadedImages(prev => [...prev, ...newUrls]);
    if (newUrls.length > 0) {
      toast.success(`${newUrls.length} photo${newUrls.length > 1 ? 's' : ''} uploaded!`);
      // Let AI know photos were uploaded
      const photoMsg: Msg = { role: 'user', content: `I just uploaded ${newUrls.length} photo${newUrls.length > 1 ? 's' : ''}.` };
      const newMsgs = [...messages, photoMsg];
      setMessages(prev => [...prev, photoMsg]);
      await streamChat(newMsgs);
    }
    setUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveListing = async (listingData: ListingPreview) => {
    if (!user || isSaving) return;
    setIsSaving(true);

    try {
      const categoryMap: Record<string, string> = {
        food_truck: 'food_truck',
        food_trailer: 'food_trailer',
        ghost_kitchen: 'ghost_kitchen',
        commercial_kitchen: 'ghost_kitchen',
        vendor_lot: 'vendor_lot',
        vendor_space: 'vendor_space',
      };

      const fulfillmentMap: Record<string, string> = {
        pickup: 'pickup',
        delivery: 'delivery',
        both: 'both',
        on_site: 'on_site',
      };

      const insertData: any = {
        host_id: user.id,
        title: listingData.title,
        description: listingData.description,
        category: categoryMap[listingData.category] || 'food_truck',
        mode: listingData.mode === 'sale' ? 'sale' : 'rent',
        status: 'draft',
        fulfillment_type: fulfillmentMap[listingData.fulfillment_type || 'pickup'] || 'pickup',
        address: listingData.address || null,
        amenities: listingData.amenities || [],
        highlights: listingData.highlights || [],
        price_daily: listingData.price_daily || null,
        price_weekly: listingData.price_weekly || null,
        price_monthly: listingData.price_monthly || null,
        price_sale: listingData.price_sale || null,
        length_inches: listingData.length_inches || null,
        width_inches: listingData.width_inches || null,
        weight_lbs: listingData.weight_lbs || null,
        image_urls: uploadedImages.length > 0 ? uploadedImages : null,
        cover_image_url: uploadedImages.length > 0 ? uploadedImages[0] : null,
      };

      const { data, error } = await supabase
        .from('listings')
        .insert(insertData)
        .select('id')
        .single();

      if (error) throw error;

      // Ensure user has host role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: user.id, role: 'host' }, { onConflict: 'user_id,role' });

      toast.success('Listing draft created! Redirecting to editor...');
      setTimeout(() => navigate(`/create-listing/${data.id}`), 1500);
    } catch (e: any) {
      console.error('Save listing error:', e);
      toast.error('Failed to save listing. Please try again.');
    }
    setIsSaving(false);
  };

  const handleConfirmPreview = async () => {
    if (preview) await saveListing(preview);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Filter display messages (hide initial auto-message)
  const displayMessages = messages.filter((_, i) => !(i === 0 && messages[0]?.content === 'Hi, I want to create a listing.'));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 flex items-center h-14 gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/list')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate">AI Listing Creator</h1>
              <p className="text-xs text-muted-foreground">Create a listing in under a minute</p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <AnimatePresence mode="popLayout">
            {displayMessages.map((msg, i) => {
              const isUser = msg.role === 'user';
              const displayText = isUser ? msg.content : cleanMessageForDisplay(msg.content);
              const msgPreview = !isUser ? extractPreview(msg.content) : null;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] space-y-3 ${isUser ? 'items-end' : 'items-start'}`}>
                    {!isUser && (
                      <div className="flex items-start gap-2">
                        <img src={vendibookFavicon} alt="" className="w-6 h-6 rounded-full mt-1 shrink-0" />
                        <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-muted text-foreground text-sm">
                          <div className="prose prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                            <ReactMarkdown>{displayText}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                    {isUser && (
                      <div className="rounded-2xl rounded-tr-md px-4 py-3 bg-primary text-primary-foreground text-sm">
                        {displayText}
                      </div>
                    )}
                    {msgPreview && (
                      <div className="mt-3">
                        <ListingPreviewCard preview={msgPreview} images={uploadedImages} />
                        <div className="flex gap-2 mt-3 justify-center">
                          <Button
                            variant="dark-shine"
                            size="sm"
                            onClick={handleConfirmPreview}
                            disabled={isSaving}
                            className="gap-1.5"
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Save as Draft
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => inputRef.current?.focus()}
                            className="gap-1.5"
                          >
                            <Edit3 className="h-4 w-4" />
                            Request Changes
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isLoading && displayMessages[displayMessages.length - 1]?.role !== 'assistant' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
              <img src={vendibookFavicon} alt="" className="w-6 h-6 rounded-full mt-1" />
              <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-muted">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Uploaded images strip */}
          {uploadedImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {uploadedImages.map((url, i) => (
                <div key={i} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setUploadedImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="sticky bottom-0 border-t border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="shrink-0 mb-0.5"
            >
              {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            </Button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px] max-h-[120px]"
              style={{ height: 'auto', overflow: 'hidden' }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 120) + 'px';
              }}
            />
            <Button
              variant="dark-shine"
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="shrink-0 mb-0.5"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIListingCreator;
