import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface PublicFields {
  avatar_url: string;
  header_image_url: string;
  display_name: string;
  username: string;
  business_name: string;
  public_city: string;
  public_state: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  initials: string;
  initial: PublicFields;
  onSaved: () => Promise<void> | void;
}

const usernameRegex = /^[a-z0-9_]{3,30}$/;

export default function EditPublicProfileSheet({ open, onOpenChange, userId, initials, initial, onSaved }: Props) {
  const { refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<PublicFields>(initial);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setForm(initial); }, [open, initial]);

  const uploadImage = async (file: File, prefix: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/${prefix}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('listing-images').upload(path, file);
    if (error) throw error;
    return supabase.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
  };

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(file, 'avatars');
      setForm((f) => ({ ...f, avatar_url: url }));
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploadingAvatar(false); }
  };

  const onPickHeader = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error('Image must be under 10MB');
    setUploadingHeader(true);
    try {
      const url = await uploadImage(file, 'headers');
      setForm((f) => ({ ...f, header_image_url: url }));
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploadingHeader(false); }
  };

  const save = async () => {
    setUsernameError(null);
    const uname = form.username.trim().toLowerCase();
    if (uname && !usernameRegex.test(uname)) {
      setUsernameError('3–30 chars: lowercase letters, numbers, underscores.');
      return;
    }
    setSaving(true);
    try {
      if (uname && uname !== initial.username) {
        const { data: taken } = await supabase.from('profiles').select('id').eq('username', uname).neq('id', userId).maybeSingle();
        if (taken) { setUsernameError('That username is taken.'); setSaving(false); return; }
      }
      const { error } = await supabase.from('profiles').update({
        avatar_url: form.avatar_url || null,
        header_image_url: form.header_image_url || null,
        display_name: form.display_name.trim() || null,
        username: uname || null,
        business_name: form.business_name.trim() || null,
        public_city: form.public_city.trim() || null,
        public_state: form.public_state.trim() || null,
      }).eq('id', userId);
      if (error) throw error;
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ['public-profile'] });
      qc.invalidateQueries({ queryKey: ['user-profile'] });
      await onSaved();
      toast.success('Public profile updated');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">Public profile</SheetTitle>
          <SheetDescription>What buyers see on your storefront and listings.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Header + avatar */}
          <div className="space-y-3">
            <div
              onClick={() => headerRef.current?.click()}
              className="relative w-full h-28 rounded-md border-2 border-dashed border-border bg-muted/30 overflow-hidden cursor-pointer hover:border-primary/50"
            >
              {form.header_image_url ? (
                <img src={form.header_image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground gap-2">
                  {uploadingHeader ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  Upload banner (1200×400)
                </div>
              )}
              <input ref={headerRef} type="file" accept="image/*" className="hidden" onChange={onPickHeader} />
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border border-border">
                  <AvatarImage src={form.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <Button
                  type="button" size="icon" variant="secondary"
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full"
                  onClick={() => avatarRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                </Button>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
              </div>
              <div>
                <p className="text-sm font-medium">Profile photo</p>
                <p className="text-xs text-muted-foreground">JPG/PNG, up to 5MB.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dn" className="text-sm">Display name</Label>
              <Input id="dn" value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} className="h-10" placeholder="Jane's Studio" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="un" className="text-sm">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  id="un" value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                  className="h-10 pl-7" placeholder="janesstudio"
                />
              </div>
              {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bn" className="text-sm">Business name <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="bn" value={form.business_name} onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))} className="h-10" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pc" className="text-sm">City</Label>
              <Input id="pc" value={form.public_city} onChange={(e) => setForm((f) => ({ ...f, public_city: e.target.value }))} className="h-10" placeholder="Houston" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ps" className="text-sm">State</Label>
              <Input id="ps" value={form.public_state} onChange={(e) => setForm((f) => ({ ...f, public_state: e.target.value }))} className="h-10" placeholder="TX" />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save changes'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
