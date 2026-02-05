import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ProfileImageUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  currentHeaderUrl: string | null;
  initials: string;
  displayName: string;
  onUpdate: () => void;
}

const ProfileImageUpload = ({
  userId,
  currentAvatarUrl,
  currentHeaderUrl,
  initials,
  displayName,
  onUpdate,
}: ProfileImageUploadProps) => {
  const { toast } = useToast();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File, type: 'avatar' | 'header') => {
    const isAvatar = type === 'avatar';
    const setUploading = isAvatar ? setIsUploadingAvatar : setIsUploadingHeader;
    
    setUploading(true);
    
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }
      
      const maxSize = isAvatar ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB for avatar, 10MB for header
      if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size is ${isAvatar ? '5MB' : '10MB'}`);
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${type}-${Date.now()}.${fileExt}`;
      const bucket = isAvatar ? 'avatars' : 'headers';

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Update profile
      const updateField = isAvatar ? 'avatar_url' : 'header_image_url';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      toast({
        title: 'Image updated',
        description: `Your ${isAvatar ? 'profile picture' : 'header image'} has been updated.`,
      });

      onUpdate();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file, 'avatar');
  };

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file, 'header');
  };

  const removeHeader = async () => {
    setIsUploadingHeader(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ header_image_url: null })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Header removed',
        description: 'Your header image has been removed.',
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to remove header image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingHeader(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Image Upload */}
      <div className="relative">
        <div 
          className={cn(
            "relative w-full h-32 md:h-40 rounded-xl overflow-hidden border-2 border-dashed border-border/70 transition-all",
            "hover:border-primary/50 cursor-pointer group",
            currentHeaderUrl && "border-solid border-border"
          )}
          onClick={() => headerInputRef.current?.click()}
        >
          {currentHeaderUrl ? (
            <>
              <img 
                src={currentHeaderUrl} 
                alt="Header" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    headerInputRef.current?.click();
                  }}
                  disabled={isUploadingHeader}
                >
                  {isUploadingHeader ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-1.5" />
                      Change
                    </>
                  )}
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeHeader();
                  }}
                  disabled={isUploadingHeader}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Remove
                </Button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              {isUploadingHeader ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                  <span className="text-sm font-medium">Add header image</span>
                  <span className="text-xs opacity-70">Recommended: 1200 x 400px</span>
                </>
              )}
            </div>
          )}
        </div>
        <input
          ref={headerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleHeaderChange}
        />
      </div>

      {/* Avatar Upload */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative cursor-pointer group"
            onClick={() => avatarInputRef.current?.click()}
          >
            <Avatar className="h-20 w-20 border-4 border-background shadow-xl ring-2 ring-primary/20">
              <AvatarImage src={currentAvatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {isUploadingAvatar ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </div>
          </motion.div>
          
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        
        <div className="flex-1">
          <p className="font-medium text-foreground">Profile photo</p>
          <p className="text-sm text-muted-foreground">Click to upload a new photo</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileImageUpload;
