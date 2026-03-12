import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, Users, Calendar, X, ArrowRight, PartyPopper } from 'lucide-react';

const TOUR_STORAGE_KEY = 'skillspot_biz_tour_completed';

const steps = [
  {
    icon: ClipboardList,
    title: 'Создайте услугу',
    description: 'Перейдите в раздел «Услуги» и добавьте хотя бы одну услугу с ценой и длительностью.',
    sectionKey: 'services',
  },
  {
    icon: Users,
    title: 'Добавьте мастера',
    description: 'В разделе «Команда» пригласите мастера по email или SkillSpot ID. Он примет приглашение в ЛК.',
    sectionKey: 'masters',
  },
  {
    icon: Calendar,
    title: 'Откройте календарь',
    description: 'Расписание автоматически строится на основе мастеров и их услуг. Клиенты смогут записываться онлайн!',
    sectionKey: 'schedule',
  },
];

interface Props {
  onNavigate: (section: string) => void;
}

const BusinessOnboardingTour = ({ onNavigate }: Props) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  };

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      dismiss();
    }
  };

  const goToStep = () => {
    onNavigate(steps[currentStep].sectionKey);
    next();
  };

  if (!visible) return null;

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6"
      >
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary">Шаг {currentStep + 1} из {steps.length}</span>
                    {isLast && <PartyPopper className="h-4 w-4 text-accent" />}
                  </div>
                  <h3 className="font-bold text-base">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={goToStep}>
                      Перейти <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={next}>
                      {isLast ? 'Завершить тур' : 'Пропустить'}
                    </Button>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={dismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-1.5 mt-4">
              {steps.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i <= currentStep ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default BusinessOnboardingTour;
