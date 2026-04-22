import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  userId: string;
  onUploaded: (url: string) => void;
}

const VoiceRecorder = ({ userId, onUploaded }: Props) => {
  const { toast } = useToast();
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await upload(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (err: any) {
      toast({ title: 'Микрофон недоступен', description: err.message, variant: 'destructive' });
    }
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const upload = async (blob: Blob) => {
    setUploading(true);
    const fileName = `${userId}/${Date.now()}.webm`;
    const { error } = await supabase.storage.from('chat-media').upload(fileName, blob, {
      contentType: 'audio/webm',
      upsert: false,
    });
    if (error) {
      toast({ title: 'Ошибка загрузки', description: error.message, variant: 'destructive' });
    } else {
      const { data } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      onUploaded(data.publicUrl);
    }
    setUploading(false);
  };

  if (uploading) return <Button size="icon" variant="ghost" disabled><Loader2 className="h-4 w-4 animate-spin" /></Button>;

  return (
    <Button
      size="icon"
      variant={recording ? 'destructive' : 'ghost'}
      onClick={recording ? stop : start}
      title={recording ? 'Остановить запись' : 'Голосовое сообщение'}
    >
      {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
};

export default VoiceRecorder;
