import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { 
  ArrowLeft, Camera, Eye, EyeOff, Key, Loader2, Save, User, 
  ShieldCheck, CreditCard, Globe, Lock, ExternalLink, Bell,
  Building2, MapPin, Phone, Mail, ChevronDown, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// Visibility badge component
const VisibilityBadge = ({ isPublic }: { isPublic: boolean }) => (
  <Badge 
    variant="outline" 
    className={`text-[10px] px-1.5 py-0 h-4 ${
      isPublic 
        ? 'border-emerald-500/50 text-emerald-600 bg-emerald-50/50' 
        : 'border-muted-foreground/30 text-muted-foreground bg-muted/30'
    }`}
  >
    {isPublic ? (
      <><Globe className="h-2.5 w-2.5 mr-0.5" /> Public</>
    ) : (
      <><Lock className="h-2.5 w-2.5 mr-0.5" /> Private</>
    )}
  </Badge>
);

interface ProfileData {
  full_name: string;
  email: string;
  avatar_url: string;
  display_name: string;
  username: string;
  business_name: string;
  public_city: string;
  public_state: string;
  phone_number: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip_code: string;
  identity_verified: boolean;
}

const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  display_name: z.string().trim().max(100).optional(),
  username: z.string().trim().max(30).optional(),
  business_name: z.string().trim().max(100).optional(),
  public_city: z.string().trim().max(100).optional(),
  public_state: z.string().trim().max(100).optional(),
  phone_number: z.string().trim().max(20).optional(),
  address1: z.string().trim().max(255).optional(),
  address2: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  zip_code: z.string().trim().max(20).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Account = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const publicSectionRef = useRef<HTMLDivElement>(null);
  const { isConnected: stripeConnected, isLoading: stripeLoading, connectStripe, isConnecting } = useStripeConnect();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    full_name: '',
    email: '',
    avatar_url: '',
    display_name: '',
    username: '',
    business_name: '',
    public_city: '',
    public_state: '',
    phone_number: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip_code: '',
    identity_verified: false,
  });
  const [originalData, setOriginalData] = useState<ProfileData | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url, display_name, username, business_name, public_city, public_state, phone_number, address1, address2, city, state, zip_code, identity_verified')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        const profileData = {
          full_name: data.full_name || '',
          email: data.email || user.email || '',
          avatar_url: data.avatar_url || '',
          display_name: data.display_name || '',
          username: data.username || '',
          business_name: data.business_name || '',
          public_city: data.public_city || '',
          public_state: data.public_state || '',
          phone_number: data.phone_number || '',
          address1: data.address1 || '',
          address2: data.address2 || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
          identity_verified: data.identity_verified || false,
        };

        setFormData(profileData);
        setOriginalData(profileData);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate, toast]);

  // Track changes
  useEffect(() => {
    if (originalData) {
      const changed = Object.keys(formData).some(
        key => formData[key as keyof ProfileData] !== originalData[key as keyof ProfileData]
      );
      setHasChanges(changed);
    }
  }, [formData, originalData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, GIF, or WebP image',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('listing-images')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, avatar_url: avatarUrl }));
      if (originalData) {
        setOriginalData({ ...originalData, avatar_url: avatarUrl });
      }

      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been updated',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload profile picture',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const result = profileSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          display_name: formData.display_name?.trim() || null,
          username: formData.username?.trim() || null,
          business_name: formData.business_name?.trim() || null,
          public_city: formData.public_city?.trim() || null,
          public_state: formData.public_state?.trim() || null,
          phone_number: formData.phone_number?.trim() || null,
          address1: formData.address1?.trim() || null,
          address2: formData.address2?.trim() || null,
          city: formData.city?.trim() || null,
          state: formData.state?.trim() || null,
          zip_code: formData.zip_code?.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setOriginalData({ ...formData });
      setHasChanges(false);

      toast({
        title: 'Changes saved',
        description: 'Your account settings have been updated',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    const result = passwordSchema.safeParse(passwordData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setPasswordErrors(fieldErrors);
      return;
    }

    setIsChangingPassword(true);
    setPasswordErrors({});

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        setPasswordErrors({ currentPassword: 'Current password is incorrect' });
        setIsChangingPassword(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) throw updateError;

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsPasswordSectionOpen(false);

      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: 'Password change failed',
        description: 'Failed to update your password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const scrollToPublicSection = () => {
    publicSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const initials = (formData.display_name || formData.full_name)
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container py-8 max-w-3xl pb-24 md:pb-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-foreground">My Account</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Manage your account details and what's visible publicly
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/u/${user?.id}`}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                View Public Profile
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={scrollToPublicSection}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit Public Info
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: Personal Information (Private) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Private details used for account management</CardDescription>
                </div>
                <VisibilityBadge isPublic={false} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="full_name" className="text-sm">Legal Name</Label>
                    <VisibilityBadge isPublic={false} />
                  </div>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="Your full legal name"
                    className={`h-9 ${errors.full_name ? 'border-destructive' : ''}`}
                  />
                  {errors.full_name && (
                    <p className="text-xs text-destructive">{errors.full_name}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <VisibilityBadge isPublic={false} />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    className={`h-9 ${errors.email ? 'border-destructive' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="phone_number" className="text-sm">Phone Number</Label>
                  <VisibilityBadge isPublic={false} />
                </div>
                <Input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                  className="h-9"
                />
              </div>

              {/* Password Section */}
              <Separator className="my-4" />
              <Collapsible open={isPasswordSectionOpen} onOpenChange={setIsPasswordSectionOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Key className="h-4 w-4" />
                      Change Password
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isPasswordSectionOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={handlePasswordInputChange}
                        placeholder="Enter your current password"
                        className={`pr-10 ${passwordErrors.currentPassword ? 'border-destructive' : ''}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                    {passwordErrors.currentPassword && <p className="text-sm text-destructive">{passwordErrors.currentPassword}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={handlePasswordInputChange}
                        placeholder="Enter new password"
                        className={`pr-10 ${passwordErrors.newPassword ? 'border-destructive' : ''}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                    {passwordErrors.newPassword && <p className="text-sm text-destructive">{passwordErrors.newPassword}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordInputChange}
                        placeholder="Confirm new password"
                        className={`pr-10 ${passwordErrors.confirmPassword ? 'border-destructive' : ''}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                    {passwordErrors.confirmPassword && <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>}
                  </div>

                  <Button type="button" onClick={handlePasswordChange} disabled={isChangingPassword} className="w-full">
                    {isChangingPassword ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* SECTION 2: Address (Private) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address
                  </CardTitle>
                  <CardDescription>Used for billing, payouts, and verification. Not shown publicly.</CardDescription>
                </div>
                <VisibilityBadge isPublic={false} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Input
                  id="address1"
                  name="address1"
                  value={formData.address1}
                  onChange={handleInputChange}
                  placeholder="Address Line 1"
                  className="h-9"
                />
                <Input
                  id="address2"
                  name="address2"
                  value={formData.address2}
                  onChange={handleInputChange}
                  placeholder="Address Line 2 (optional)"
                  className="h-9"
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    className="h-9"
                  />
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="State"
                    className="h-9"
                  />
                  <Input
                    id="zip_code"
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleInputChange}
                    placeholder="ZIP"
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3: Business Information (Mixed) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                  <CardDescription>Optional business details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="business_name" className="text-sm">Business Name</Label>
                  <VisibilityBadge isPublic={true} />
                </div>
                <Input
                  id="business_name"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleInputChange}
                  placeholder="Your business or DBA name (optional)"
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">This will be shown on your public profile</p>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4: Public Profile */}
          <div ref={publicSectionRef}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Public Profile
                    </CardTitle>
                    <CardDescription>Information visible to other users</CardDescription>
                  </div>
                  <VisibilityBadge isPublic={true} />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 border-2 border-border">
                      <AvatarImage src={formData.avatar_url || undefined} alt={formData.full_name} />
                      <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow-md"
                      onClick={handleAvatarClick}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Profile Photo</p>
                    <p className="text-xs text-muted-foreground">Visible on your public profile and listings</p>
                  </div>
                </div>

                <Separator />

                {/* Display Name & Username */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="display_name" className="text-sm">Display Name</Label>
                      <VisibilityBadge isPublic={true} />
                    </div>
                    <Input
                      id="display_name"
                      name="display_name"
                      value={formData.display_name}
                      onChange={handleInputChange}
                      placeholder="Name shown publicly"
                      className="h-9"
                    />
                    <p className="text-xs text-muted-foreground">Defaults to your legal name if empty</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="username" className="text-sm">Username</Label>
                      <VisibilityBadge isPublic={true} />
                    </div>
                    <Input
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="@username"
                      className="h-9"
                    />
                    <p className="text-xs text-muted-foreground">Unique identifier for your profile</p>
                  </div>
                </div>

                {/* Public City/State */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="public_city" className="text-sm">City (Public)</Label>
                      <VisibilityBadge isPublic={true} />
                    </div>
                    <Input
                      id="public_city"
                      name="public_city"
                      value={formData.public_city}
                      onChange={handleInputChange}
                      placeholder="e.g., Houston"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="public_state" className="text-sm">State (Public)</Label>
                      <VisibilityBadge isPublic={true} />
                    </div>
                    <Input
                      id="public_state"
                      name="public_state"
                      value={formData.public_state}
                      onChange={handleInputChange}
                      placeholder="e.g., TX"
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Preview Card */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-3">THIS IS WHAT PEOPLE SEE</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border border-border">
                      <AvatarImage src={formData.avatar_url || undefined} />
                      <AvatarFallback className="text-sm font-bold bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {formData.display_name || formData.full_name || 'Your Name'}
                      </p>
                      {formData.business_name && (
                        <p className="text-xs text-muted-foreground">{formData.business_name}</p>
                      )}
                      {(formData.public_city || formData.public_state) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[formData.public_city, formData.public_state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="link" size="sm" className="mt-3 h-auto p-0 text-xs" asChild>
                    <Link to={`/u/${user?.id}`}>
                      View full public profile →
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 5: Trust & Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Trust & Verification
              </CardTitle>
              <CardDescription>Build trust with identity verification and payment setup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Identity Verification */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Identity Verification
                  </h4>
                  {formData.identity_verified ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not Verified</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {formData.identity_verified 
                    ? 'Your identity has been verified. This badge appears on your profile and listings.'
                    : 'Verify your identity to earn a "Verified ID" badge and build trust with other users.'}
                </p>
                {!formData.identity_verified && (
                  <Button size="sm" asChild>
                    <Link to="/verify-identity">
                      <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                      Verify Identity
                    </Link>
                  </Button>
                )}
              </div>

              {/* Stripe Payouts */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Stripe Payouts
                  </h4>
                  {stripeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : stripeConnected ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      <CreditCard className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not Connected</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {stripeConnected 
                    ? 'You can receive payments for bookings and sales. A "Payouts Enabled" badge appears on your profile.'
                    : 'Connect Stripe to receive payments for bookings and sales.'}
                </p>
                {!stripeConnected && (
                  <Button size="sm" onClick={connectStripe} disabled={isConnecting}>
                    {isConnecting ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Connecting...</>
                    ) : (
                      <><CreditCard className="h-3.5 w-3.5 mr-1.5" />Connect Stripe</>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences Link */}
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/notification-preferences')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>
                Manage email and in-app notification settings
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Desktop Save Button */}
          <div className="hidden md:flex justify-end gap-3">
            <Button type="submit" disabled={isSaving || !hasChanges}>
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Save Changes</>
              )}
            </Button>
          </div>
        </form>

        {/* Mobile Sticky Save Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t md:hidden z-50">
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isSaving || !hasChanges}
            className="w-full"
          >
            {isSaving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Save Changes</>
            )}
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Account;