import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Code, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ReviewsEmbedWidget = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState<'iframe' | 'script' | null>(null);

  if (!user) return null;

  const baseUrl = window.location.origin;
  const iframeCode = `<iframe src="${baseUrl}/embed/reviews/${user.id}" width="100%" height="400" frameborder="0" style="border-radius:12px;border:1px solid #e5e7eb;"></iframe>`;
  const scriptCode = `<div id="skillspot-reviews" data-master-id="${user.id}"></div>\n<script src="${baseUrl}/embed/reviews.js" async></script>`;

  const handleCopy = async (code: string, type: 'iframe' | 'script') => {
    await navigator.clipboard.writeText(code);
    setCopied(type);
    toast({ title: 'Код скопирован' });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Code className="h-5 w-5" /> Виджет отзывов
        </CardTitle>
        <CardDescription>
          Разместите виджет с вашими отзывами на своём сайте или в соцсетях
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Вставка через iframe</p>
          <Textarea
            readOnly
            value={iframeCode}
            className="font-mono text-xs h-20 resize-none"
          />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => handleCopy(iframeCode, 'iframe')}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied === 'iframe' ? 'Скопировано!' : 'Копировать'}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Вставка через скрипт</p>
          <Textarea
            readOnly
            value={scriptCode}
            className="font-mono text-xs h-20 resize-none"
          />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => handleCopy(scriptCode, 'script')}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied === 'script' ? 'Скопировано!' : 'Копировать'}
          </Button>
        </div>

        <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">
          💡 Виджет автоматически обновляется при появлении новых отзывов. Поддерживает адаптивный дизайн.
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewsEmbedWidget;
