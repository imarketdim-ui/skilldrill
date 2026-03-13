import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle2, Loader2, FileText, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface KYCFormProps {
  kycVerified?: boolean;
  onVerified?: () => void;
}

const KYCForm = ({ kycVerified = false, onVerified }: KYCFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    setUploading(true);

    try {
      const files = Array.from(e.target.files);
      const newPaths: string[] = [];

      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: 'Ошибка', description: `Файл ${file.name} слишком большой (макс. 10 МБ)`, variant: 'destructive' });
          continue;
        }

        const ext = file.name.split('.').pop();
        const path = `${user.id}/kyc-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error } = await supabase.storage
          .from('certificates')
          .upload(path, file, { upsert: false });

        if (error) {
          toast({ title: 'Ошибка загрузки', description: error.message, variant: 'destructive' });
        } else {
          newPaths.push(path);
        }
      }

      setUploadedFiles(prev => [...prev, ...newPaths]);
      if (newPaths.length > 0) {
        toast({ title: 'Загружено', description: `${newPaths.length} файл(ов) загружено` });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить файлы', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (path: string) => {
    setUploadedFiles(prev => prev.filter(p => p !== path));
    supabase.storage.from('certificates').remove([path]);
  };

  const handleSubmit = async () => {
    if (!user || uploadedFiles.length === 0) return;
    setSubmitting(true);

    try {
      // Save certificate paths to master_profiles
      const { data: mp } = await supabase
        .from('master_profiles')
        .select('id, certificate_photos')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!mp) {
        toast({ title: 'Ошибка', description: 'Профиль мастера не найден', variant: 'destructive' });
        return;
      }

      const existingPhotos = (mp.certificate_photos as string[]) || [];
      const allPhotos = [...existingPhotos, ...uploadedFiles];

      const { error } = await supabase
        .from('master_profiles')
        .update({ certificate_photos: allPhotos as any })
        .eq('id', mp.id);

      if (error) throw error;

      toast({ title: 'Документы отправлены', description: 'Ваши документы отправлены на верификацию администратором.' });
      setUploadedFiles([]);
      onVerified?.();
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось отправить документы', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (kycVerified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Верификация пройдена
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Документы подтверждены
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Верификация документов (KYC)</CardTitle>
        <CardDescription>
          Загрузите документы, подтверждающие вашу квалификацию: дипломы, сертификаты, лицензии.
          После проверки администратором ваш профиль получит статус «Верифицирован».
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="kyc-files">Документы (PDF, JPG, PNG — до 10 МБ каждый)</Label>
          <div className="mt-2">
            <Input
              id="kyc-files"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="cursor-pointer"
            />
          </div>
        </div>

        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загрузка файлов...
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <Label>Загруженные файлы:</Label>
            {uploadedFiles.map((path) => (
              <div key={path} className="flex items-center justify-between p-2 rounded-md bg-muted">
                <div className="flex items-center gap-2 text-sm truncate">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{path.split('/').pop()}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFile(path)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={uploadedFiles.length === 0 || submitting}
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Отправка...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Отправить на верификацию
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default KYCForm;
