import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CTA = () => {
  const navigate = useNavigate();

  return (
    <section className="section-padding">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-[hsl(225,25%,8%)]"
        >
          {/* Subtle glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative px-8 py-16 md:px-16 md:py-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="max-w-2xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 text-sm mb-8">
                <Zap className="w-4 h-4 text-accent" />
                Начните прямо сейчас
              </div>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white mb-6">
                Готовы начать?
              </h2>
              <p className="text-lg md:text-xl text-white/60 mb-10">
                Присоединяйтесь к специалистам, которые уже используют SkillSpot 
                для управления записями и ростом клиентской базы.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="xl" onClick={() => navigate('/auth?tab=signup')}>
                  Начать бесплатно
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button 
                  size="xl" 
                  className="bg-white/10 text-white border border-white/15 hover:bg-white/20"
                  onClick={() => navigate('/catalog')}
                >
                  Посмотреть каталог
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
