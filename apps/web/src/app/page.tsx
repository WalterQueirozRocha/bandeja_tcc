export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
      <h1 className="text-3xl font-semibold">Bandeja</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Gestão alimentar escolar
      </p>
      <nav className="flex gap-4 underline">
        <a href="/login">Entrar</a>
        <a href="/ingredientes">Ingredientes</a>
      </nav>
    </main>
  );
}
