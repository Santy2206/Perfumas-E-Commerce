import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-wine-950 text-center px-6">
      <p className="text-gold-400 uppercase tracking-[0.3em] text-xs mb-4">Perfumas</p>
      <h1 className="font-display text-4xl text-bone mb-6">Tu proyecto Next.js está funcionando</h1>
      <Link
        href="/crear"
        className="bg-gold-400 hover:bg-gold-100 text-wine-950 text-sm font-semibold uppercase tracking-widest rounded-sm px-8 py-3 transition-colors"
      >
        Ir al Constructor de Fragancias →
      </Link>
    </main>
  );
}
