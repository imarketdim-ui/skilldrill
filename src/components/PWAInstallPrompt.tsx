import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, X, Smartphone, Share, MoreVertical, Plus, Monitor, Apple } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

const detectPlatform = (): Platform => {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows|Macintosh|Linux/.test(ua) && !/Mobile/.test(ua)) return 'desktop';
  return 'unknown';
};

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>('unknown');

  useEffect(() => {
    setPlatform(detectPlatform());

    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem('pwa-dismissed');
    const isDismissed = dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isDismissed) setShowBanner(true);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    // For iOS / desktop without prompt event — still show banner so user can open instructions
    if (!isDismissed && (platform === 'ios' || platform === 'desktop')) {
      const t = setTimeout(() => setShowBanner(true), 3000);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', handler);
        window.removeEventListener('appinstalled', installedHandler);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [platform]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setShowBanner(false);
        } else {
          // User dismissed system prompt → fall back to instructions
          setShowInstructions(true);
        }
        setDeferredPrompt(null);
      } catch {
        setShowInstructions(true);
      }
    } else {
      // No native prompt available — always show platform-specific instructions
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pwa-dismissed', String(Date.now()));
    }
  };

  if (!showBanner || isInstalled) return null;

  const instructions: Record<Platform, { title: string; icon: React.ReactNode; steps: string[] }> = {
    ios: {
      title: 'Установка на iPhone / iPad',
      icon: <Apple className="h-6 w-6" />,
      steps: [
        'Откройте сайт в Safari (обязательно Safari, не Chrome)',
        'Нажмите кнопку «Поделиться» (квадрат со стрелкой вверх) внизу экрана',
        'Прокрутите вниз и выберите «На экран Домой»',
        'Нажмите «Добавить» в правом верхнем углу',
        'Приложение появится на рабочем столе!',
      ],
    },
    android: {
      title: 'Установка на Android',
      icon: <Smartphone className="h-6 w-6" />,
      steps: [
        'Откройте сайт в Chrome',
        'Нажмите на три точки (⋮) в правом верхнем углу',
        'Выберите «Установить приложение» или «Добавить на главный экран»',
        'Подтвердите установку',
        'Приложение появится на рабочем столе!',
      ],
    },
    desktop: {
      title: 'Установка на компьютер',
      icon: <Monitor className="h-6 w-6" />,
      steps: [
        'Откройте сайт в Chrome, Edge или Яндекс Браузере',
        'Нажмите на значок установки (⊕) в адресной строке справа',
        'Или откройте меню браузера (⋮) → «Установить приложение»',
        'Подтвердите установку',
        'Приложение появится в списке программ!',
      ],
    },
    unknown: {
      title: 'Установка приложения',
      icon: <Download className="h-6 w-6" />,
      steps: [
        'Откройте сайт в браузере Chrome или Safari',
        'Найдите опцию «Добавить на главный экран» в меню браузера',
        'Подтвердите установку',
      ],
    },
  };

  const currentInstructions = instructions[platform];

  return (
    <>
      <Card className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 shadow-lg border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Установить SkillSpot</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Быстрый доступ с рабочего стола, уведомления и работа оффлайн
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" onClick={handleInstall} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  {deferredPrompt ? 'Установить' : 'Как установить'}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  Позже
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleDismiss}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {currentInstructions.icon}
              </div>
              {currentInstructions.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {currentInstructions.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm pt-0.5">{step}</p>
              </div>
            ))}
          </div>
          <Button onClick={() => setShowInstructions(false)} className="w-full">
            Понятно
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PWAInstallPrompt;
