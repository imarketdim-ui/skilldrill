import { Link } from "react-router-dom";

const footerLinks = {
  product: [
    { label: "Каталог услуг", href: "/catalog" },
    { label: "Тарифы", href: "/subscription" },
    { label: "Для специалистов", href: "/request-role?type=master" },
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
    <footer className="bg-foreground pt-16 pb-8">
      <div className="container-wide">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg font-display">S</span>
              </div>
              <span className="font-display font-bold text-xl text-background">SkillSpot</span>
            </Link>
            <p className="text-background/50 max-w-sm mb-5 text-sm leading-relaxed">
              Маркетплейс услуг. Объединяем клиентов и специалистов на одной платформе.
            </p>
            <div className="text-background/30 text-xs space-y-1">
              <p>ООО «СКИЛЛ СПОТ» · ИНН 1901142926 · ОГРН 1191901004272</p>
              <p>655009, Республика Хакасия, г. Абакан, ул. Российская, д. 45Б</p>
              <p>Email: imp-invest@mail.ru · Тел: 8 (961) 744-00-08</p>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4 text-background/90">Продукт</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-background/50 hover:text-background transition-colors text-sm">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4 text-background/90">Компания</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-background/50 hover:text-background transition-colors text-sm">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4 text-background/90">Правовое</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-background/50 hover:text-background transition-colors text-sm">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-background/30 text-sm">© 2026 ООО «СКИЛЛ СПОТ». Все права защищены.</p>
          <p className="text-background/30 text-sm">Платежи обрабатываются АО «Тинькофф Банк»</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
