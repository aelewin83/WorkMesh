export const metadata = {
  title: "Relai",
  description: "The private way to get things done."
};

export default function LandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-0 px-6 text-white">
      <section className="flex flex-col items-center text-center">
        <h1 className="wm-heading text-[52px] font-bold leading-none tracking-tight text-white sm:text-[72px] md:text-[96px]">
          Relai
        </h1>
        <p className="mt-6 max-w-xl text-balance text-lg leading-8 text-text-secondary sm:text-xl">
          The private way to get things done.
        </p>
      </section>
    </main>
  );
}
