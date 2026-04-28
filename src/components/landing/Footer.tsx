import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const footerLinks = {
  product: [
    { label: "Каталог услуг", href: "/catalog" },
    { label: "Лендинг", href: "/landing" },
    { label: "Тарифы", href: "/for-business#pricing" },
    { label: "Для специалистов", href: "/create-account?type=master" },
  ],
  company: [
    { label: "О платформе", href: "/about" },
    { label: "Для бизнеса", href: "/for-business" },
    { label: "Контакты", href: "/contacts" },
  ],
  legal: [
    { label: "Политика конфиденциальности", href: "/privacy" },
    { label: "Пользовательское соглашение", href: "/terms" },
    { label: "Публичная оферта", href: "/offer" },
  ],
};

const Footer = () => {
  return (
    <footer className="bg-foreground text-white pt-16 pb-8">
      <div className="container-wide">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex items-center gap-2 mb-4">
              <Link to="/catalog" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="font-bold text-xl">SkillSpot</span>
              </Link>
            </motion.div>
            <p className="text-white/60 max-w-sm mb-4">
              Платформа услуг. Объединяем клиентов и специалистов на одной платформе.
            </p>
            <div className="text-white/40 text-xs space-y-1">
              <p>ООО «СКИЛЛ СПОТ» · ИНН 1901142926 · ОГРН 1191901004272</p>
              <p>655009, Республика Хакасия, г. Абакан, ул. Российская, д. 45Б</p>
              <p>Email: imp-invest@mail.ru · Тел: 8 (961) 744-00-08</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Продукт</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-white/60 hover:text-white transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Компания</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-white/60 hover:text-white transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Правовая информация</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-white/60 hover:text-white transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm">© 2026 ООО «СКИЛЛ СПОТ». Все права защищены.</p>
          <p className="text-white/40 text-sm">Платежи обрабатываются АО «Тинькофф Банк»</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
