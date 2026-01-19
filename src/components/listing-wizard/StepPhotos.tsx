import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Star, Video, Play, Loader2, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { ListingFormData } from '@/types/listing';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

export interface VideoUploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

export interface ImageUploadState {
  file: File;
  status: 'pending' | 'ready' | 'error';
  error?: string;
  previewUrl?: string;
}

interface StepPhotosProps {
  formData: ListingFormData;
  updateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
  videoUploadProgress?: VideoUploadProgress[];
  isUploadingVideos?: boolean;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export const StepPhotos: React.FC<StepPhotosProps> = ({
  formData,
  updateField,
  videoUploadProgress = [],
  isUploadingVideos = false,
}) => {
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [imageStates, setImageStates] = useState<Map<File, ImageUploadState>>(new Map());
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  
  // Track object URLs to prevent memory leaks
  const imagePreviewUrlsRef = useRef<Map<File, string>>(new Map());
  const videoPreviewUrlsRef = useRef<Map<File, string>>(new Map());

  // Generate previews from formData.images - sync with form state
  const imagePreviews = React.useMemo(() => {
    const urls: string[] = [];
    const urlMap = imagePreviewUrlsRef.current;
    
    // Clean up URLs for files no longer in formData
    for (const [file, url] of urlMap.entries()) {
      if (!formData.images.includes(file)) {
        URL.revokeObjectURL(url);
        urlMap.delete(file);
      }
    }
    
    // Create URLs for current files
    for (const file of formData.images) {
      if (!urlMap.has(file)) {
        urlMap.set(file, URL.createObjectURL(file));
      }
      urls.push(urlMap.get(file)!);
    }
    
    return urls;
  }, [formData.images]);

  // Generate previews from formData.videos - sync with form state
  const videoPreviews = React.useMemo(() => {
    const urls: string[] = [];
    const urlMap = videoPreviewUrlsRef.current;
    
    // Clean up URLs for files no longer in formData
    for (const [file, url] of urlMap.entries()) {
      if (!formData.videos.includes(file)) {
        URL.revokeObjectURL(url);
        urlMap.delete(file);
      }
    }
    
    // Create URLs for current files
    for (const file of formData.videos) {
      if (!urlMap.has(file)) {
        urlMap.set(file, URL.createObjectURL(file));
      }
      urls.push(urlMap.get(file)!);
    }
    
    return urls;
  }, [formData.videos]);

  // Cleanup all URLs on unmount
  React.useEffect(() => {
    return () => {
      for (const url of imagePreviewUrlsRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      for (const url of videoPreviewUrlsRef.current.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  // Get state for a specific image
  const getImageState = useCallback((file: File): ImageUploadState | undefined => {
    return imageStates.get(file);
  }, [imageStates]);

  // Validate and process a single image file
  const validateImageFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { valid: false, error: `Invalid format: ${file.type.split('/')[1] || 'unknown'}. Use JPG, PNG, or WebP.` };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      return { valid: false, error: `Too large (${sizeMB}MB). Max 10MB allowed.` };
    }
    return { valid: true };
  }, []);

  // Validate video file
  const validateVideoFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return { valid: false, error: `Invalid format. Use MP4, WebM, or MOV.` };
    }
    if (file.size > MAX_VIDEO_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      return { valid: false, error: `Too large (${sizeMB}MB). Max 100MB allowed.` };
    }
    return { valid: true };
  }, []);

  const handleImageSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessingImages(true);
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];
    const newStates = new Map(imageStates);

    for (const file of fileArray) {
      const validation = validateImageFile(file);
      
      if (validation.valid) {
        validFiles.push(file);
        newStates.set(file, { file, status: 'ready' });
      } else {
        errors.push(`${file.name}: ${validation.error}`);
        newStates.set(file, { file, status: 'error', error: validation.error });
      }
    }

    setImageStates(newStates);

    // Show errors if any
    if (errors.length > 0) {
      const errorCount = errors.length;
      const successCount = validFiles.length;
      
      toast({
        title: successCount > 0 
          ? `${successCount} photo${successCount > 1 ? 's' : ''} added, ${errorCount} failed`
          : `${errorCount} photo${errorCount > 1 ? 's' : ''} couldn't be added`,
        description: errors.slice(0, 3).join('\n') + (errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''),
        variant: successCount > 0 ? 'default' : 'destructive',
      });
    } else if (validFiles.length > 0) {
      toast({
        title: `${validFiles.length} photo${validFiles.length > 1 ? 's' : ''} added`,
        description: 'Photos ready to upload when you save.',
      });
    }

    // Update form data with valid files only
    if (validFiles.length > 0) {
      updateField('images', [...formData.images, ...validFiles]);
    }

    setIsProcessingImages(false);
  }, [formData.images, imageStates, toast, updateField, validateImageFile]);

  const handleVideoSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      const validation = validateVideoFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    // Show errors if any
    if (errors.length > 0) {
      toast({
        title: `${errors.length} video${errors.length > 1 ? 's' : ''} couldn't be added`,
        description: errors.slice(0, 2).join('\n'),
        variant: 'destructive',
      });
    }

    if (validFiles.length > 0) {
      updateField('videos', [...formData.videos, ...validFiles]);
      if (errors.length === 0) {
        toast({
          title: `${validFiles.length} video${validFiles.length > 1 ? 's' : ''} added`,
        });
      }
    }
  }, [formData.videos, toast, updateField, validateVideoFile]);

  const removeImage = useCallback((index: number) => {
    const file = formData.images[index];
    if (file) {
      setImageStates(prev => {
        const newStates = new Map(prev);
        newStates.delete(file);
        return newStates;
      });
    }
    updateField('images', formData.images.filter((_, i) => i !== index));
  }, [formData.images, updateField]);

  const removeVideo = useCallback((index: number) => {
    updateField('videos', formData.videos.filter((_, i) => i !== index));
  }, [formData.videos, updateField]);

  const moveImageToFirst = useCallback((index: number) => {
    if (index === 0) return;
    const newImages = [...formData.images];
    const [movedImage] = newImages.splice(index, 1);
    newImages.unshift(movedImage);
    updateField('images', newImages);
    toast({ title: 'Cover photo updated' });
  }, [formData.images, toast, updateField]);

  // Retry failed image
  const retryImage = useCallback((file: File) => {
    const validation = validateImageFile(file);
    if (validation.valid) {
      setImageStates(prev => {
        const newStates = new Map(prev);
        newStates.set(file, { file, status: 'ready' });
        return newStates;
      });
      toast({ title: 'Image validated successfully' });
    } else {
      toast({
        title: 'Image still invalid',
        description: validation.error,
        variant: 'destructive',
      });
    }
  }, [toast, validateImageFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const videoFiles = Array.from(files).filter(f => f.type.startsWith('video/'));
    
    if (imageFiles.length > 0) {
      const dt = new DataTransfer();
      imageFiles.forEach(f => dt.items.add(f));
      handleImageSelect(dt.files);
    }
    
    if (videoFiles.length > 0) {
      const dt = new DataTransfer();
      videoFiles.forEach(f => dt.items.add(f));
      handleVideoSelect(dt.files);
    }
  }, [handleImageSelect, handleVideoSelect]);

  const allImages = [...imagePreviews, ...formData.existingImages];
  const allVideos = [...videoPreviews, ...formData.existingVideos];
  const totalPhotos = allImages.length;
  const totalVideos = allVideos.length;
  const minPhotos = 3;
  const photosNeeded = Math.max(0, minPhotos - totalPhotos);

  return (
    <div className="space-y-8">
      {/* Photos Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Add Photos</h3>
          <p className="text-sm text-muted-foreground">
            Upload high-quality photos. The first image will be your cover photo.
            <span className="font-medium text-foreground"> Minimum {minPhotos} photos required.</span>
          </p>
        </div>

        {/* Simple progress indicator */}
        {(totalPhotos > 0 || photosNeeded > 0) && (
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-xl border text-sm",
            totalPhotos >= minPhotos
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
          )}>
            {totalPhotos >= minPhotos ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>{totalPhotos} photo{totalPhotos !== 1 ? 's' : ''} — ready to publish</span>
              </>
            ) : totalPhotos > 0 ? (
              <>
                <Upload className="w-4 h-4" />
                <span>{totalPhotos} of {minPhotos} photos added — add {photosNeeded} more</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                <span>Add at least {minPhotos} photos to continue</span>
              </>
            )}
          </div>
        )}

        {/* Processing indicator */}
        {isProcessingImages && (
          <div className="flex items-center gap-2 p-3 rounded-xl border bg-muted/50 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Processing images...</span>
          </div>
        )}

        {/* Photo Upload Area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => imageInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
          )}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleImageSelect(e.target.files)}
            className="hidden"
          />
          <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
          <p className="font-medium">Drag & drop or click to upload photos</p>
          <p className="text-sm text-muted-foreground mt-1">
            JPG, PNG, WebP up to 10MB each
          </p>
        </div>

        {/* Image Grid */}
        {allImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {formData.images.map((file, index) => {
              const state = getImageState(file);
              const preview = imagePreviews[index];
              const hasError = state?.status === 'error';
              
              return (
                <div
                  key={preview || file.name}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden group bg-muted",
                    hasError && "ring-2 ring-red-500"
                  )}
                >
                  {preview && (
                    <img
                      src={preview}
                      alt={`Upload ${index + 1}`}
                      className={cn(
                        "w-full h-full object-cover",
                        hasError && "opacity-50"
                      )}
                    />
                  )}
                  
                  {/* Error overlay */}
                  {hasError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white p-2">
                      <AlertCircle className="w-6 h-6 text-red-400 mb-1" />
                      <p className="text-xs text-center line-clamp-2">{state?.error}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        onClick={(e) => { e.stopPropagation(); retryImage(file); }}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                  )}
                  
                  {/* Cover badge */}
                  {index === 0 && !hasError && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Cover
                    </div>
                  )}

                  {/* Actions overlay */}
                  {!hasError && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {index !== 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={(e) => { e.stopPropagation(); moveImageToFirst(index); }}
                        >
                          Make Cover
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Existing images from edit mode */}
            {formData.existingImages.map((url, index) => (
              <div
                key={url}
                className="relative aspect-square rounded-xl overflow-hidden bg-muted"
              >
                <img
                  src={url}
                  alt={`Existing ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Saved indicator */}
                <div className="absolute top-2 right-2">
                  <div className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Saved
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {allImages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No photos added yet</p>
          </div>
        )}
      </div>

      {/* Videos Section */}
      <div className="space-y-6 border-t pt-8">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Video className="w-5 h-5" />
            Add Videos
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Optional</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            Upload videos to showcase your listing. Videos help buyers and renters see your asset in action.
          </p>
        </div>

        {/* Video count indicator */}
        {totalVideos > 0 && !isUploadingVideos && (
          <div className="flex items-center gap-2 p-3 rounded-xl border text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
            <CheckCircle className="w-4 h-4" />
            <span>{totalVideos} video{totalVideos > 1 ? 's' : ''} added</span>
          </div>
        )}

        {/* Video Upload Progress */}
        {isUploadingVideos && videoUploadProgress.length > 0 && (
          <div className="space-y-3 p-4 rounded-xl border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Uploading videos...</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {videoUploadProgress.filter(v => v.status === 'complete').length}/{videoUploadProgress.length} complete
              </span>
            </div>
            {videoUploadProgress.map((item, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[200px] text-muted-foreground">
                    {item.fileName}
                  </span>
                  <span className={cn(
                    "font-medium flex items-center gap-1",
                    item.status === 'complete' && "text-emerald-600",
                    item.status === 'error' && "text-red-600",
                    item.status === 'uploading' && "text-primary"
                  )}>
                    {item.status === 'complete' && <><CheckCircle className="w-3 h-3" /> Done</>}
                    {item.status === 'error' && <><AlertCircle className="w-3 h-3" /> Failed</>}
                    {item.status === 'uploading' && `${Math.round(item.progress)}%`}
                    {item.status === 'pending' && 'Waiting...'}
                  </span>
                </div>
                <Progress 
                  value={item.progress} 
                  className={cn(
                    "h-2",
                    item.status === 'complete' && "[&>div]:bg-emerald-500",
                    item.status === 'error' && "[&>div]:bg-red-500"
                  )}
                />
                {item.status === 'error' && item.error && (
                  <p className="text-xs text-red-500 mt-1">{item.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Video Upload Area */}
        <div
          onClick={() => videoInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all border-border hover:border-muted-foreground"
        >
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            multiple
            onChange={(e) => handleVideoSelect(e.target.files)}
            className="hidden"
          />
          <Video className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
          <p className="font-medium">Click to upload videos</p>
          <p className="text-sm text-muted-foreground mt-1">
            MP4, WebM, MOV up to 100MB each
          </p>
        </div>

        {/* Video Grid */}
        {allVideos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {videoPreviews.map((preview, index) => (
              <div
                key={preview}
                className="relative aspect-video rounded-xl overflow-hidden group bg-muted"
              >
                <video
                  src={preview}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                />
                
                {/* Play indicator */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:hidden">
                  <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={(e) => { e.stopPropagation(); removeVideo(index); }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Existing videos from edit mode */}
            {formData.existingVideos.map((url) => (
              <div
                key={url}
                className="relative aspect-video rounded-xl overflow-hidden bg-muted group"
              >
                <video
                  src={url}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:hidden">
                  <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                {/* Saved indicator */}
                <div className="absolute top-2 right-2">
                  <div className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Saved
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {allVideos.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Video className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No videos added yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
