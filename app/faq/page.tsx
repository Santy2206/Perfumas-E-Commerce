import Link from "next/link";

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
    a: "Sí. En /crear eliges fragancia, envase (AAA / AA / Genérico), feromonas opcionales, texto de etiqueta y envoltura de regalo.",
  },
  {
    q: "¿Venden insumos al por mayor?",
    a: "Sí. Regístrate en el portal Mayoristas con tu NIT. Tras la aprobación tendrás precios especiales y cantidades mínimas.",
  },
  {
    q: "¿Hacen envíos?",
    a: "Ofrecemos recogida en Fontibón y Bonanza, domicilio en Bogotá y envío nacional a ciudades principales.",
  },
  {
    q: "¿Cuánto se demora en preparar un perfume?",
    a: "En tienda física, entre 3 y 5 minutos. Los pedidos online se preparan según el método de envío elegido.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
      <h1 className="font-display text-3xl text-bone mb-8">Preguntas frecuentes</h1>
      <dl className="space-y-6">
        {FAQS.map((f) => (
          <div key={f.q} className="rounded-sm border border-gold-400/20 bg-white/5 p-5">
            <dt className="font-display text-lg text-bone mb-2">{f.q}</dt>
            <dd className="text-sm text-bone-60">{f.a}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-10 text-sm text-bone-60">
        ¿Más dudas?{" "}
        <Link href="https://wa.me/573503370279" className="text-gold-400 underline">
          Escríbenos por WhatsApp
        </Link>
      </p>
    </div>
  );
}
