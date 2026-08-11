import Link from "next/link";
import { Section } from "../../components/layout/Section";

export const metadata = { title: "Preguntas frecuentes" };

const FAQS = [
  {
    q: "¿Son seguras las réplicas de perfume para mi piel?",
    a: "Sí. Utilizamos productos de alta calidad y seguimos normas estrictas de seguridad en la elaboración.",
  },
  {
    q: "¿Cuál es la diferencia entre un perfume original y una réplica?",
    a: "La principal diferencia es el precio y la concentración de los ingredientes. Nuestras fragancias están inspiradas en casas de lujo, elaboradas a base de aceite.",
  },
  {
    q: "¿Puedo personalizar mi perfume?",
    a: "Sí. En Preparar eliges fragancia, envase (AAA / AA / Genérico), feromonas opcionales, texto de etiqueta y envoltura de regalo.",
  },
  {
    q: "¿Venden insumos al por mayor?",
    a: "Sí. Regístrate en el portal Mayoristas con tu NIT. Tras la aprobación tendrás precios especiales y cantidades mínimas.",
  },
  {
    q: "¿Hacen envíos?",
    a: "Ofrecemos recogida en Fontibón (Calle 18 #103a-26) y Bonanza (Av. Calle 72 #70-90), domicilio en Bogotá y envío nacional con Envia. El domicilio es gratis en Bogotá desde $100.000 y a nivel nacional desde $200.000 si hay perfumería (Preparar o Preparadas). Puedes sumar hogar y accesorios; los insumos solo cuentan para el gratis si su valor es menor que el de perfumería.",
  },
  {
    q: "¿Cuánto se demora en preparar un perfume?",
    a: "En tienda física, entre 3 y 5 minutos. Los pedidos online se preparan según el método de envío elegido.",
  },
];

export default function FaqPage() {
  return (
    <Section tone="light" className="min-h-[50vh]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <h1 className="font-display text-3xl text-ink mb-8">Preguntas frecuentes</h1>
        <dl className="space-y-6">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-sm border border-gold-400/25 bg-white p-5">
              <dt className="font-display text-lg text-ink mb-2">{f.q}</dt>
              <dd className="text-sm text-ink-60">{f.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-10 text-sm text-ink-60">
          ¿Más dudas?{" "}
          <Link href="https://wa.me/573503370279" className="text-gold-400 underline">
            Escríbenos por WhatsApp
          </Link>
        </p>
      </div>
    </Section>
  );
}
