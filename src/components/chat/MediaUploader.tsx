import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  userId: string;
  onUploaded: (urls: string[]) => void;
}

const MediaUploader = ({ userId, onUploaded }: Props) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'Файл слишком большой', description: `${file.name} > 10 МБ`, variant: 'destructive' });
        continue;
      }
      const ext = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('chat-media').upload(fileName, file, { contentType: file.type });
      if (!error) {
        const { data } = supabase.storage.from('chat-media').getPublicUrl(fileName);
        urls.push(data.publicUrl);
      }
    }
    if (urls.length > 0) onUploaded(urls);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Прикрепить фото/видео"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
      </Button>
    </>
  );
};

export default MediaUploader;
