import Link from "next/link";
import { MARKETING_HOME_URL } from "../../lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gold-400/20 bg-wine-950">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-8 md:grid-cols-3">
        <div>
          <p className="font-display text-lg text-gold-400 mb-2">Perfumas</p>
          <p className="text-sm text-bone-60">
            Perfumería familiar en Bogotá desde 2015. Fragancias inspiradas, insumos para emprendedores y más.
          </p>
          <a href={MARKETING_HOME_URL} className="mt-3 inline-block text-xs uppercase tracking-widest text-gold-400 hover:text-gold-100">
            ← Sitio principal
          </a>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-400 mb-3">Explorar</p>
          <ul className="space-y-2 text-sm text-bone-60">
            <li><Link href="/crear" className="hover:text-gold-400">Crear fragancia</Link></li>
            <li><Link href="/tienda" className="hover:text-gold-400">Tienda</Link></li>
            <li><Link href="/mayoristas" className="hover:text-gold-400">Mayoristas</Link></li>
            <li><a href={`${MARKETING_HOME_URL}/#faq`} className="hover:text-gold-400">Preguntas (marca)</a></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-400 mb-3">Contacto</p>
          <ul className="space-y-2 text-sm text-bone-60">
            <li>Calle 18 #103a-26, Fontibón</li>
            <li>
              <a href="mailto:perfumas2015@gmail.com" className="hover:text-gold-400">
                perfumas2015@gmail.com
              </a>
            </li>
            <li>
              <a href="https://wa.me/573503370279" className="hover:text-gold-400">
                WhatsApp +57 350 337 0279
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gold-400/10 py-4 text-center text-xs text-bone-60">
        © {new Date().getFullYear()} Perfumas · Bogotá, Colombia
      </div>
    </footer>
  );
}
