import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
          className="relative overflow-hidden rounded-3xl bg-primary"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -translate-x-1/2 translate-y-1/2" />
          
          <div className="relative px-8 py-16 md:px-16 md:py-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="max-w-2xl mx-auto"
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                Готовы начать?
              </h2>
              <p className="text-lg md:text-xl text-white/80 mb-10">
                Присоединяйтесь к специалистам, которые уже используют SkillSpot 
                для управления записями и ростом клиентской базы.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="accent" size="xl" onClick={() => navigate('/auth?tab=signup')}>
                  Начать бесплатно
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button 
                  size="xl" 
                  className="bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
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
