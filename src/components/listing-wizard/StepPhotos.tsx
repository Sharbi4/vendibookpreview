import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Star } from 'lucide-react';
import { ListingFormData } from '@/types/listing';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface StepPhotosProps {
  formData: ListingFormData;
  updateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
}

export const StepPhotos: React.FC<StepPhotosProps> = ({
  formData,
  updateField,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).filter(
      file => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
    );

    if (newFiles.length === 0) return;

    // Create previews
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);

    // Update form data
    updateField('images', [...formData.images, ...newFiles]);
  };

  const removeImage = (index: number) => {
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(previews[index]);
    
    setPreviews(prev => prev.filter((_, i) => i !== index));
    updateField('images', formData.images.filter((_, i) => i !== index));
  };

  const moveToFirst = (index: number) => {
    if (index === 0) return;

    const newPreviews = [...previews];
    const [moved] = newPreviews.splice(index, 1);
    newPreviews.unshift(moved);
    setPreviews(newPreviews);

    const newImages = [...formData.images];
    const [movedImage] = newImages.splice(index, 1);
    newImages.unshift(movedImage);
    updateField('images', newImages);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const allImages = [...previews, ...formData.existingImages];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Add Photos</h3>
        <p className="text-sm text-muted-foreground">
          Upload high-quality photos. The first image will be your cover photo.
          Minimum 1 photo required to publish.
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
        <p className="font-medium">Drag & drop or click to upload</p>
        <p className="text-sm text-muted-foreground mt-1">
          JPG, PNG, WebP up to 10MB each
        </p>
      </div>

      {/* Image Grid */}
      {allImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
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
                    onClick={(e) => { e.stopPropagation(); moveToFirst(index); }}
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
  );
};
