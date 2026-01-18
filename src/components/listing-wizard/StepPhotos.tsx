import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Star, Video, Play, Loader2 } from 'lucide-react';
import { ListingFormData } from '@/types/listing';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export interface VideoUploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
}

interface StepPhotosProps {
  formData: ListingFormData;
  updateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
  videoUploadProgress?: VideoUploadProgress[];
  isUploadingVideos?: boolean;
}

export const StepPhotos: React.FC<StepPhotosProps> = ({
  formData,
  updateField,
  videoUploadProgress = [],
  isUploadingVideos = false,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).filter(
      file => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
    );

    if (newFiles.length === 0) return;

    // Create previews
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);

    // Update form data
    updateField('images', [...formData.images, ...newFiles]);
  };

  const handleVideoSelect = (files: FileList | null) => {
    if (!files) return;

    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const newFiles = Array.from(files).filter(
      file => allowedTypes.includes(file.type) && file.size <= 100 * 1024 * 1024 // 100MB limit
    );

    if (newFiles.length === 0) return;

    // Create previews
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setVideoPreviews(prev => [...prev, ...newPreviews]);

    // Update form data
    updateField('videos', [...formData.videos, ...newFiles]);
  };

  const removeImage = (index: number) => {
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviews[index]);
    
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    updateField('images', formData.images.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    URL.revokeObjectURL(videoPreviews[index]);
    
    setVideoPreviews(prev => prev.filter((_, i) => i !== index));
    updateField('videos', formData.videos.filter((_, i) => i !== index));
  };

  const moveImageToFirst = (index: number) => {
    if (index === 0) return;

    const newPreviews = [...imagePreviews];
    const [moved] = newPreviews.splice(index, 1);
    newPreviews.unshift(moved);
    setImagePreviews(newPreviews);

    const newImages = [...formData.images];
    const [movedImage] = newImages.splice(index, 1);
    newImages.unshift(movedImage);
    updateField('images', newImages);
  };

  const handleDrop = (e: React.DragEvent) => {
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
  };

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

        {/* Quality indicator */}
        {totalPhotos > 0 && (
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-xl border text-sm",
            totalPhotos >= minPhotos 
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
          )}>
            {totalPhotos >= minPhotos ? (
              <>
                <Star className="w-4 h-4" />
                <span>{totalPhotos} photos added — looking great!</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Add {photosNeeded} more photo{photosNeeded > 1 ? 's' : ''} to continue</span>
              </>
            )}
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
            {imagePreviews.map((preview, index) => (
              <div
                key={preview}
                className="relative aspect-square rounded-xl overflow-hidden group bg-muted"
              >
                <img
                  src={preview}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Cover badge */}
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Cover
                  </div>
                )}

                {/* Actions overlay */}
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
              </div>
            ))}

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
            <Video className="w-4 h-4" />
            <span>{totalVideos} video{totalVideos > 1 ? 's' : ''} added</span>
          </div>
        )}

        {/* Video Upload Progress */}
        {isUploadingVideos && videoUploadProgress.length > 0 && (
          <div className="space-y-3 p-4 rounded-xl border bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Uploading videos...</span>
            </div>
            {videoUploadProgress.map((item, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[200px] text-muted-foreground">
                    {item.fileName}
                  </span>
                  <span className={cn(
                    "font-medium",
                    item.status === 'complete' && "text-emerald-600",
                    item.status === 'error' && "text-red-600",
                    item.status === 'uploading' && "text-primary"
                  )}>
                    {item.status === 'complete' && '✓ Done'}
                    {item.status === 'error' && '✗ Failed'}
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
            {formData.existingVideos.map((url, index) => (
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
