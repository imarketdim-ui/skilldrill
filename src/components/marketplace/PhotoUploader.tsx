import { useState, useRef } from "react";
import { Upload, X, Star, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  label: string;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  coverIndex?: number;
  onCoverChange?: (index: number) => void;
  bucket: string;
  storagePath: string;
  maxPhotos?: number;
  maxSizeMb?: number;
  supabase: any;
}

const PhotoUploader = ({
  label,
  photos,
  onPhotosChange,
  coverIndex = 0,
  onCoverChange,
  bucket,
  storagePath,
  maxPhotos = 10,
  maxSizeMb = 5,
  supabase,
}: Props) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList) => {
    if (photos.length + files.length > maxPhotos) {
      toast({ title: `Максимум ${maxPhotos} фото`, variant: "destructive" });
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > maxSizeMb * 1024 * 1024) {
        toast({ title: `${file.name} больше ${maxSizeMb} МБ`, variant: "destructive" });
        continue;
      }
      if (!file.type.startsWith("image/")) {
        toast({ title: `${file.name} — не изображение`, variant: "destructive" });
        continue;
      }

      const ext = file.name.split(".").pop();
      const path = `${storagePath}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) {
        toast({ title: "Ошибка загрузки", description: error.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    if (newUrls.length > 0) {
      onPhotosChange([...photos, ...newUrls]);
    }
    setUploading(false);
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
    if (onCoverChange && coverIndex >= updated.length) {
      onCoverChange(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((url, i) => (
            <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {onCoverChange && (
                  <button
                    type="button"
                    onClick={() => onCoverChange(i)}
                    className={`p-1.5 rounded-full transition-colors ${
                      coverIndex === i ? "bg-primary text-primary-foreground" : "bg-background/80 text-foreground hover:bg-primary hover:text-primary-foreground"
                    }`}
                    title="Сделать обложкой"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="p-1.5 rounded-full bg-background/80 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  title="Удалить"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {coverIndex === i && onCoverChange && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">
                  Обложка
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {photos.length < maxPhotos && (
        <div
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin" />
          ) : (
            <>
              <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Перетащите фото или <span className="text-primary font-medium">выберите файлы</span>
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {photos.length}/{maxPhotos} · JPG, PNG, WebP · до {maxSizeMb} МБ
      </p>
    </div>
  );
};

export default PhotoUploader;
