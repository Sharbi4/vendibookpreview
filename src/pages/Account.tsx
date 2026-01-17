import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { 
  ArrowLeft, Camera, Eye, EyeOff, Key, Loader2, Save, User, 
  ShieldCheck, CreditCard, Globe, Lock, ExternalLink, Bell,
  Building2, MapPin, Phone, Mail, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const { isConnected: stripeConnected, isLoading: stripeLoading, connectStripe, isConnecting } = useStripeConnect();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
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

        setFormData({
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
        });
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      toast({
        title: 'Profile updated',
        description: 'Your account settings have been saved',
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

      <main className="flex-1 container py-8 max-w-3xl">
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your private information and public profile
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/u/${user?.id}`}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View Public Profile
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="account" className="gap-1.5 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="trust" className="gap-1.5 text-xs sm:text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Trust</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5 text-xs sm:text-sm">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Public</span>
            </TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar & Public Profile Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Profile Picture & Public Info</CardTitle>
                      <CardDescription>This information is visible on your public profile</CardDescription>
                    </div>
                    <VisibilityBadge isPublic={true} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    <div className="flex-1 space-y-2">
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
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        placeholder="Optional business name"
                        className="h-9"
                      />
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
                    </div>
                  </div>

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
                </CardContent>
              </Card>

              {/* Private Information Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Private Information</CardTitle>
                      <CardDescription>This information is never shared publicly</CardDescription>
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

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Private Address</span>
                      <VisibilityBadge isPublic={false} />
                    </div>
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
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end gap-3">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Password Change Card */}
            <Card>
              <Collapsible open={isPasswordSectionOpen} onOpenChange={setIsPasswordSectionOpen}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Change Password
                      </span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isPasswordSectionOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <Separator />
                  <CardContent className="pt-6">
                    <form onSubmit={handlePasswordChange} className="space-y-4">
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
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        {passwordErrors.currentPassword && (
                          <p className="text-sm text-destructive">{passwordErrors.currentPassword}</p>
                        )}
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
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        {passwordErrors.newPassword && (
                          <p className="text-sm text-destructive">{passwordErrors.newPassword}</p>
                        )}
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
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        {passwordErrors.confirmPassword && (
                          <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>
                        )}
                      </div>

                      <Button type="submit" disabled={isChangingPassword} className="w-full">
                        {isChangingPassword ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Notification Preferences Link */}
            <Card>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/notification-preferences')}>
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
          </TabsContent>

          {/* Trust & Verification Tab */}
          <TabsContent value="trust" className="space-y-6">
            {/* Identity Verification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5" />
                  Identity Verification
                </CardTitle>
                <CardDescription>
                  Verify your identity to build trust with other users
                </CardDescription>
              </CardHeader>
              <CardContent>
                {formData.identity_verified ? (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <ShieldCheck className="h-6 w-6 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-800 dark:text-emerald-200">Identity Verified</p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">Your identity has been successfully verified</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <ShieldCheck className="h-6 w-6 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200">Not Yet Verified</p>
                        <p className="text-sm text-amber-600 dark:text-amber-400">Verify your identity to increase trust</p>
                      </div>
                    </div>
                    <Button asChild className="w-full sm:w-auto">
                      <Link to="/verify-identity">
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Verify Identity
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stripe Payouts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5" />
                  Payouts & Payments
                </CardTitle>
                <CardDescription>
                  Connect your Stripe account to receive payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stripeLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : stripeConnected ? (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <CreditCard className="h-6 w-6 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-800 dark:text-emerald-200">Stripe Connected</p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">You can receive payments for bookings and sales</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-muted/50 border rounded-lg">
                      <CreditCard className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Not Connected</p>
                        <p className="text-sm text-muted-foreground">Connect Stripe to receive payments</p>
                      </div>
                    </div>
                    <Button onClick={connectStripe} disabled={isConnecting} className="w-full sm:w-auto">
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Connect Stripe
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Public Profile Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Public Profile Preview</CardTitle>
                    <CardDescription>This is what others see when they view your profile</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/u/${user?.id}`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open Profile
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-6 bg-muted/30">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-16 w-16 border-2 border-border">
                      <AvatarImage src={formData.avatar_url || undefined} />
                      <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {formData.display_name || formData.full_name || 'Your Name'}
                      </h3>
                      {formData.business_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {formData.business_name}
                        </p>
                      )}
                      {(formData.public_city || formData.public_state) && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {[formData.public_city, formData.public_state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.identity_verified && (
                      <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 bg-emerald-50/50">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {stripeConnected && (
                      <Badge variant="outline" className="border-primary/50 text-primary bg-primary/5">
                        <CreditCard className="h-3 w-3 mr-1" />
                        Payouts Enabled
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">What's shown publicly:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-emerald-600" />
                      Display name: {formData.display_name || formData.full_name || '—'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-emerald-600" />
                      Location: {[formData.public_city, formData.public_state].filter(Boolean).join(', ') || '—'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-emerald-600" />
                      Business: {formData.business_name || '—'}
                    </li>
                  </ul>
                </div>

                <div className="mt-4 p-4 border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 rounded-lg">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <Lock className="h-3.5 w-3.5" />
                    Never shown publicly:
                  </h4>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                    <li>• Email address</li>
                    <li>• Phone number</li>
                    <li>• Full legal name (if different from display name)</li>
                    <li>• Physical address</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Account;