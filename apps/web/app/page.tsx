import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-0 px-6 text-white">
      <section className="flex flex-col items-center text-center">
        <Link href="/contractor" className="group block">
          <h1 className="wm-heading text-[52px] font-bold leading-none tracking-tight text-white sm:text-[72px] md:text-[96px]">
            Relai
          </h1>
          <p className="mt-6 max-w-xl text-balance text-lg leading-8 text-text-secondary sm:text-xl">
            The private way to get things done.
          </p>
          <span className="mt-10 inline-flex h-11 items-center justify-center rounded-2xl border border-border-2 bg-bg-2 px-5 text-sm font-semibold text-text-secondary shadow-card transition group-hover:-translate-y-0.5 group-hover:border-gold-primary/40 group-hover:text-gold-primary">
            Enter preview
          </span>
        </Link>
      </section>
    </main>
  );
}
