import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { COMPANY_INFO, PAYMENT_METHODS } from "@/lib/companyInfo";

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
    { label: "Возвраты и отмены", href: "/refunds" },
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
              <p>{COMPANY_INFO.legalName} · ИНН {COMPANY_INFO.inn} · ОГРН {COMPANY_INFO.ogrn}</p>
              <p>{COMPANY_INFO.address}</p>
              <p>Email: {COMPANY_INFO.email} · Тел: {COMPANY_INFO.phoneDisplay}</p>
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

        <div className="grid gap-4 border-t border-white/10 pt-8 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-3">
            <p className="text-sm text-white/40">© 2026 {COMPANY_INFO.legalName}. Все права защищены.</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => (
                <span key={method} className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/60">
                  {method}
                </span>
              ))}
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/60">
                Эквайринг: {COMPANY_INFO.paymentProvider}
              </span>
            </div>
          </div>
          <div className="space-y-1 text-right text-sm text-white/40">
            <p>Возвраты и претензии: <Link to="/refunds" className="text-white/70 transition-colors hover:text-white">порядок возврата</Link></p>
            <p>Поддержка: <a href={`mailto:${COMPANY_INFO.email}`} className="text-white/70 transition-colors hover:text-white">{COMPANY_INFO.email}</a></p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
