import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { 
  ArrowLeft, Camera, Eye, EyeOff, Key, Loader2, Save, User, 
  ShieldCheck, CreditCard, Globe, Lock, ExternalLink, Bell,
  Building2, MapPin, ChevronDown, Pencil, Check, X, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useQueryClient } from '@tanstack/react-query';
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
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string;
  header_image_url: string;
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

// Username must be 3-30 chars, lowercase letters, numbers, and underscores only
const usernameRegex = /^[a-z0-9_]{3,30}$/;

const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  display_name: z.string().trim().max(100).optional(),
  username: z.string().trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(usernameRegex, 'Only lowercase letters, numbers, and underscores allowed')
    .optional()
    .or(z.literal('')),
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
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const publicSectionRef = useRef<HTMLDivElement>(null);
  const { isConnected: stripeConnected, isLoading: stripeLoading, connectStripe, isConnecting } = useStripeConnect();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    full_name: '',
    first_name: '',
    last_name: '',
    email: '',
    avatar_url: '',
    header_image_url: '',
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
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);
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
          .select('full_name, first_name, last_name, email, avatar_url, header_image_url, display_name, username, business_name, public_city, public_state, phone_number, address1, address2, city, state, zip_code, identity_verified')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        const profileData = {
          full_name: data.full_name || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || user.email || '',
          avatar_url: data.avatar_url || '',
          header_image_url: (data as { header_image_url?: string }).header_image_url || '',
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

  // Check username uniqueness with debounce
  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    // Validate format first
    if (!usernameRegex.test(username)) {
      setUsernameStatus('invalid');
      return;
    }

    setIsCheckingUsername(true);
    setUsernameStatus('checking');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user?.id || '')
        .maybeSingle();

      if (error) {
        console.error('Error checking username:', error);
        setUsernameStatus('idle');
      } else if (data) {
        setUsernameStatus('taken');
      } else {
        setUsernameStatus('available');
      }
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameStatus('idle');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setFormData(prev => ({ ...prev, username: value }));
    if (errors.username) {
      setErrors(prev => ({ ...prev, username: '' }));
    }

    // Clear existing timeout
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    // Check if it's unchanged from original
    if (value === originalData?.username) {
      setUsernameStatus('idle');
      return;
    }

    // Debounce the uniqueness check
    usernameCheckTimeout.current = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 500);
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

      // Refresh AuthContext profile so Header/MobileMenu update immediately
      await refreshProfile();

      // Invalidate all profile-related queries so PublicProfile, listings, etc. update
      queryClient.invalidateQueries({ queryKey: ['public-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });

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

  const handleHeaderClick = () => {
    headerInputRef.current?.click();
  };

  const handleHeaderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingHeader(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-header-${Date.now()}.${fileExt}`;
      const filePath = `headers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('listing-images')
        .getPublicUrl(filePath);

      const headerUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ header_image_url: headerUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, header_image_url: headerUrl }));
      if (originalData) {
        setOriginalData({ ...originalData, header_image_url: headerUrl });
      }

      // Refresh AuthContext profile so Header/MobileMenu update immediately
      await refreshProfile();

      // Invalidate all profile-related queries so PublicProfile, listings, etc. update
      queryClient.invalidateQueries({ queryKey: ['public-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });

      toast({
        title: 'Header updated',
        description: 'Your profile header image has been updated',
      });
    } catch (error) {
      console.error('Error uploading header:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload header image',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingHeader(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check if username is taken before submitting
    if (usernameStatus === 'taken') {
      setErrors(prev => ({ ...prev, username: 'This username is already taken' }));
      return;
    }

    if (usernameStatus === 'invalid') {
      setErrors(prev => ({ ...prev, username: 'Only lowercase letters, numbers, and underscores allowed' }));
      return;
    }

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

      // Refresh AuthContext profile so Header/MobileMenu update immediately
      await refreshProfile();

      // Invalidate all profile-related queries so PublicProfile, listings, etc. update
      queryClient.invalidateQueries({ queryKey: ['public-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['host-profile'] });

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
          <Card className="rounded-2xl border-0 shadow-xl bg-card">
            <CardHeader className="bg-muted/30 border-b border-border rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-1.5 bg-primary rounded-lg">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                    Personal Information
                  </CardTitle>
                  <CardDescription>Private details used for account management</CardDescription>
                </div>
                <VisibilityBadge isPublic={false} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Locked identity fields notice */}
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Your name and phone number are locked for security. They're used for identity verification and Stripe payouts. <Link to="/help/contact" className="underline">Contact support</Link> to make changes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="first_name" className="text-sm">First Name</Label>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/50 text-amber-600 bg-amber-50/50">
                      <Lock className="h-2.5 w-2.5 mr-0.5" /> Locked
                    </Badge>
                  </div>
                  <Input
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    disabled
                    className="h-9 bg-muted/50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="last_name" className="text-sm">Last Name</Label>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/50 text-amber-600 bg-amber-50/50">
                      <Lock className="h-2.5 w-2.5 mr-0.5" /> Locked
                    </Badge>
                  </div>
                  <Input
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    disabled
                    className="h-9 bg-muted/50 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="phone_number" className="text-sm">Phone Number</Label>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/50 text-amber-600 bg-amber-50/50">
                      <Lock className="h-2.5 w-2.5 mr-0.5" /> Locked
                    </Badge>
                  </div>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    disabled
                    className="h-9 bg-muted/50 cursor-not-allowed"
                  />
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
          <Card className="rounded-2xl border-0 shadow-xl bg-card">
            <CardHeader className="bg-muted/30 border-b border-border rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-1.5 bg-primary rounded-lg">
                      <MapPin className="h-4 w-4 text-primary-foreground" />
                    </div>
                    Address
                  </CardTitle>
                  <CardDescription>Used for billing, payouts, and verification. Not shown publicly.</CardDescription>
                </div>
                <VisibilityBadge isPublic={false} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
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
          <Card className="rounded-2xl border-0 shadow-xl bg-card">
            <CardHeader className="bg-muted/30 border-b border-border rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-1.5 bg-primary rounded-lg">
                      <Building2 className="h-4 w-4 text-primary-foreground" />
                    </div>
                    Business Information
                  </CardTitle>
                  <CardDescription>Optional business details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
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
            <Card className="rounded-2xl border-0 shadow-xl bg-card">
              <CardHeader className="bg-muted/30 border-b border-border rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-1.5 bg-primary rounded-lg">
                        <Globe className="h-4 w-4 text-primary-foreground" />
                      </div>
                      Public Profile
                    </CardTitle>
                    <CardDescription>Information visible to other users</CardDescription>
                  </div>
                  <VisibilityBadge isPublic={true} />
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
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

                {/* Header Image */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Profile Header Image</p>
                      <p className="text-xs text-muted-foreground">Custom banner for your public profile (recommended: 1200x400px)</p>
                    </div>
                    <VisibilityBadge isPublic={true} />
                  </div>
                  <div 
                    className="relative w-full h-32 rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors group"
                    onClick={handleHeaderClick}
                  >
                    {formData.header_image_url ? (
                      <>
                        <img 
                          src={formData.header_image_url} 
                          alt="Profile header" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="text-white text-sm font-medium flex items-center gap-2">
                            {isUploadingHeader ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Camera className="h-4 w-4" />
                            )}
                            Change Header
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        {isUploadingHeader ? (
                          <Loader2 className="h-6 w-6 animate-spin mb-2" />
                        ) : (
                          <Camera className="h-6 w-6 mb-2" />
                        )}
                        <span className="text-sm">Click to upload header image</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={headerInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleHeaderChange}
                  />
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
                    <div className="relative">
                      <Input
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleUsernameChange}
                        placeholder="your_username"
                        className={`h-9 pr-9 ${
                          errors.username || usernameStatus === 'taken' || usernameStatus === 'invalid'
                            ? 'border-destructive focus-visible:ring-destructive' 
                            : usernameStatus === 'available' 
                            ? 'border-emerald-500 focus-visible:ring-emerald-500' 
                            : ''
                        }`}
                        maxLength={30}
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        {isCheckingUsername && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {!isCheckingUsername && usernameStatus === 'available' && (
                          <Check className="h-4 w-4 text-emerald-500" />
                        )}
                        {!isCheckingUsername && (usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                          <X className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>
                    {usernameStatus === 'taken' && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> This username is already taken
                      </p>
                    )}
                    {usernameStatus === 'invalid' && formData.username.length > 0 && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Only lowercase letters, numbers, and underscores allowed
                      </p>
                    )}
                    {usernameStatus === 'available' && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Username is available
                      </p>
                    )}
                    {(usernameStatus === 'idle' || usernameStatus === 'checking') && (
                      <p className="text-xs text-muted-foreground">
                        3-30 characters, lowercase letters, numbers, underscores only
                      </p>
                    )}
                    {errors.username && (
                      <p className="text-xs text-destructive">{errors.username}</p>
                    )}
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
                <div className="border border-border rounded-xl p-4 bg-muted/30">
                  <p className="text-xs font-medium text-primary mb-3">THIS IS WHAT PEOPLE SEE</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-border shadow-md">
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
                  <Button variant="link" size="sm" className="mt-3 h-auto p-0 text-xs text-primary" asChild>
                    <Link to={`/u/${user?.id}`}>
                      View full public profile →
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 5: Trust & Verification */}
          <Card className="rounded-2xl border-0 shadow-xl bg-card">
            <CardHeader className="bg-muted/30 border-b border-border rounded-t-2xl">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-1.5 bg-primary rounded-lg">
                  <ShieldCheck className="h-4 w-4 text-primary-foreground" />
                </div>
                Trust & Verification
              </CardTitle>
              <CardDescription>Build trust with identity verification and payment setup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Identity Verification */}
              <div className="border border-border rounded-xl p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <div className="p-1 bg-primary rounded">
                      <User className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    Identity Verification
                  </h4>
                  {formData.identity_verified ? (
                    <Badge className="bg-primary text-primary-foreground border-0">
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
              <div className="border border-border rounded-xl p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <div className="p-1 bg-primary rounded">
                      <CreditCard className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    Stripe Payouts
                  </h4>
                  {stripeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : stripeConnected ? (
                    <Badge className="bg-primary text-primary-foreground border-0">
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
                  <Button size="sm" onClick={() => connectStripe('/account')} disabled={isConnecting}>
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
          <Card className="rounded-2xl border-0 shadow-xl bg-card cursor-pointer hover:bg-muted/30 transition-all" onClick={() => navigate('/notification-preferences')}>
            <CardHeader className="bg-muted/30 border-b border-border rounded-t-2xl">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary rounded-lg">
                    <Bell className="h-4 w-4 text-primary-foreground" />
                  </div>
                  Notification Preferences
                </span>
                <ExternalLink className="h-4 w-4 text-primary" />
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
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border md:hidden z-50">
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