import { motion } from "framer-motion";

const footerLinks = {
  product: [
    { label: "Возможности", href: "#features" },
    { label: "Для бизнеса", href: "#" },
    { label: "Для специалистов", href: "#" },
    { label: "Цены", href: "#" },
  ],
  company: [
    { label: "О нас", href: "#" },
    { label: "Блог", href: "#" },
    { label: "Карьера", href: "#" },
    { label: "Контакты", href: "#" },
  ],
  legal: [
    { label: "Политика конфиденциальности", href: "#" },
    { label: "Условия использования", href: "#" },
    { label: "Обработка данных", href: "#" },
  ],
};

const Footer = () => {
  return (
    <footer className="bg-foreground text-white pt-16 pb-8">
      <div className="container-wide">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <motion.a
              href="/"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex items-center gap-2 mb-4"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-dark flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="font-display font-bold text-xl">SkillSpot</span>
            </motion.a>
            <p className="text-white/60 max-w-sm mb-6">
              Маркетплейс услуг нового поколения. Объединяем клиентов, специалистов и бизнесы на одной платформе.
            </p>
            <div className="flex gap-4">
              {["Twitter", "Facebook", "Instagram", "LinkedIn"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                >
                  {social[0]}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Продукт</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Компания</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Правовая информация</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm">
            © 2024 SkillSpot. Все права защищены.
          </p>
          <p className="text-white/40 text-sm">
            Сделано с ❤️ в России
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
