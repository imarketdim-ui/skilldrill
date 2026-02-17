import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CTA = () => {
  const navigate = useNavigate();

  return (
    <section className="section-padding">
      <div className="container-wide">
        <div className="rounded-2xl bg-primary p-10 md:p-16 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
            Готовы начать?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-lg mx-auto">
            Присоединяйтесь к специалистам, которые уже используют SkillSpot
            для управления записями и ростом клиентской базы.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="xl"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => navigate('/auth?tab=signup')}
            >
              Начать бесплатно
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate('/catalog')}
            >
              Посмотреть каталог
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
