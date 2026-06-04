import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  MessageSquareLock,
  ShieldCheck,
  WalletCards
} from "lucide-react";

const trustItems = [
  {
    title: "Selective identity",
    body: "Choose how much identity and information you share.",
    Icon: ShieldCheck
  },
  {
    title: "Private job listings",
    body: "Messages and work details are protected with end-to-end encryption.",
    Icon: MessageSquareLock
  },
  {
    title: "Secure payments",
    body: "Structured agreements and secure payment flows are built into the engagement process.",
    Icon: WalletCards
  },
  {
    title: "Trusted coordination",
    body: "Coordinate sensitive work privately with contributors and hiring teams.",
    Icon: CheckCircle2
  }
] as const;

const focusAreas = [
  "Writing and Reporting",
  "Media and Production",
  "Research, Analysis, and Advisory",
  "Logistics and Transport",
  "Local Sourcing and Fixer Work",
  "Security Coordination",
  "Executive Assistance and Coordination",
  "Events and Staffing",
  "Technical Support and Advisory",
  "Custom"
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#FFFFFF_32rem,#F8FAFC_100%)] text-[#111827]">
      <header className="sticky top-0 z-50 bg-[#F8FAFC]/86 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-6">
          <Link href="/" className="flex min-h-11 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EDE9FE] text-[#4F46E5]">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="leading-none">
              <span className="block text-base font-semibold text-[#111827]">Relai</span>
              <span className="hidden text-xs text-[#667085] sm:block">Private beta</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-[#667085] md:flex">
            <Link href="#trust" className="transition hover:text-[#4F46E5]">Trust</Link>
            <Link href="#focus" className="transition hover:text-[#4F46E5]">Who it is for</Link>
            <Link href="#privacy" className="transition hover:text-[#4F46E5]">Privacy</Link>
          </nav>

          <Link href="/auth/login" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white px-5 text-sm font-semibold text-[#111827] shadow-[0_8px_24px_rgba(17,24,39,0.05)] transition hover:-translate-y-0.5 hover:border-[#7C5CFF]">
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-[1200px] px-5 pb-10 pt-14 text-center sm:px-6 lg:pb-12 lg:pt-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold tracking-wide text-[#4F46E5]">Private beta</p>
          <h1 className="mx-auto mt-5 max-w-4xl text-[42px] font-semibold leading-[1.04] text-[#111827] sm:text-[64px] lg:text-[76px]">
            Secure hiring for trusted work.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#475467] sm:text-xl">
            Coordinate sensitive work privately and securely. Relai helps people create trusted agreements, communicate safely, and move work forward with confidence.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/auth/register" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#4F46E5] px-7 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(79,70,229,0.22)] transition hover:-translate-y-0.5 hover:bg-[#7C5CFF]">
              Join private beta
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link href="#focus" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#E5E7EB] bg-white px-7 text-sm font-semibold text-[#4F46E5] transition hover:-translate-y-0.5 hover:border-[#7C5CFF]">
              See use cases
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-4 text-sm text-[#667085] sm:grid-cols-3">
          <p><span className="font-semibold text-[#111827]">Invite-only</span> access</p>
          <p><span className="font-semibold text-[#111827]">Encrypted</span> communication</p>
          <p><span className="font-semibold text-[#111827]">Selective</span> disclosure</p>
        </div>

        <div className="relative mx-auto mt-12 h-[300px] max-w-[920px] overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#EDE9FE_0%,#FFFFFF_45%,#E6F7F5_100%)] shadow-[0_28px_80px_rgba(79,70,229,0.14)] sm:h-[360px]">
          <div className="absolute -left-20 bottom-[-7rem] h-72 w-72 rounded-[4rem] bg-white/60 rotate-45" />
          <div className="absolute -right-16 bottom-[-6rem] h-80 w-80 rounded-[4rem] bg-[#EDE9FE]/70 -rotate-45" />
          <div className="absolute left-1/2 top-10 w-[min(82%,38rem)] -translate-x-1/2 rounded-[2rem] border border-white/80 bg-white/82 p-5 text-left shadow-[0_24px_60px_rgba(17,24,39,0.16)] backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4F46E5]">Secure request</p>
                <h2 className="mt-2 text-xl font-semibold text-[#111827]">Field research support</h2>
              </div>
              <span className="rounded-full bg-[#EDE9FE] px-3 py-1 text-xs font-semibold text-[#4F46E5]">Protected</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#F8FAFC] p-4">
                <p className="text-xs text-[#667085]">Agreement</p>
                <p className="mt-1 font-semibold text-[#111827]">In review</p>
              </div>
              <div className="rounded-2xl bg-[#F8FAFC] p-4">
                <p className="text-xs text-[#667085]">Messages</p>
                <p className="mt-1 font-semibold text-[#111827]">Encrypted</p>
              </div>
              <div className="rounded-2xl bg-[#F8FAFC] p-4">
                <p className="text-xs text-[#667085]">Payment</p>
                <p className="mt-1 font-semibold text-[#111827]">Ready</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 left-8 hidden rounded-3xl bg-white px-5 py-4 text-left shadow-[0_18px_50px_rgba(17,24,39,0.12)] sm:block">
            <p className="text-xs font-semibold text-[#14B8A6]">Selective identity</p>
            <p className="mt-1 text-sm text-[#475467]">Share details after trust is earned.</p>
          </div>
          <div className="absolute bottom-8 right-8 hidden rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#111827] shadow-[0_18px_50px_rgba(17,24,39,0.12)] sm:block">
            Secure payments active
          </div>
        </div>
      </section>

      <section id="trust">
        <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-6 lg:py-18">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#4F46E5]">Trust by design</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#111827] sm:text-5xl">Built for sensitive coordination.</h2>
          </div>

          <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map(({ title, body, Icon }) => (
              <article key={title}>
                <Icon className="h-5 w-5 text-[#4F46E5]" strokeWidth={1.75} aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold text-[#111827]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#667085]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="focus" className="px-5 py-8 sm:px-6 lg:py-10">
        <div className="mx-auto max-w-[1200px] rounded-[2rem] bg-[linear-gradient(135deg,#EDE9FE_0%,#FFFFFF_52%,#FFF7E0_100%)] px-5 py-12 shadow-[0_24px_70px_rgba(17,24,39,0.06)] sm:px-8 lg:px-10 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold text-[#4F46E5]">Who uses Relai</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#111827] sm:text-5xl">Built for trusted field and remote work.</h2>
              <p className="mt-5 text-base leading-7 text-[#344054]">
                Relai supports focused coordination domains, not a public job board taxonomy. Choose the area that best describes the work you coordinate or support.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {focusAreas.map((area) => (
                <div key={area} className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 text-sm font-medium text-[#344054] shadow-[0_10px_28px_rgba(17,24,39,0.035)]">
                  {area}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="privacy">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 sm:px-6 lg:grid-cols-[1fr_1fr] lg:py-18">
          <div>
            <p className="text-sm font-semibold text-[#4F46E5]">Privacy-first coordination</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#111827] sm:text-5xl">Share less until trust is earned.</h2>
          </div>
          <div className="space-y-6 text-base leading-8 text-[#344054]">
            <p>
              Relai is designed for work that needs discretion, clarity, and trust. Start with only the information needed to evaluate a request.
            </p>
            <p>
              As an engagement becomes more concrete, participants can choose what to reveal, when to reveal it, and who can see it.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-8 text-white sm:px-6 lg:py-10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 rounded-[2rem] bg-[#4F46E5] px-6 py-12 shadow-[0_24px_70px_rgba(79,70,229,0.22)] sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div>
            <p className="text-sm font-semibold text-[#FBBF24]">Private beta</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">Start with a private account.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#EDE9FE]">
              After signup, choose whether you are creating a contributor profile or an employer profile.
            </p>
          </div>
          <Link href="/auth/register" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[#4F46E5] transition hover:-translate-y-0.5 hover:bg-[#EDE9FE]">
            Request access
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer>
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-5 py-8 text-sm text-[#667085] sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>Relai</p>
          <div className="flex gap-5">
            <Link href="/auth/login" className="hover:text-[#111827]">Sign in</Link>
            <Link href="/contractor" className="hover:text-[#111827]">Contributor app</Link>
            <Link href="/employer" className="hover:text-[#111827]">Employer app</Link>
          </div>
        </div>
      </footer>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-2 gap-2 rounded-full border border-[#E5E7EB] bg-white/95 p-2 shadow-[0_12px_36px_rgba(17,24,39,0.10)] backdrop-blur md:hidden">
        <Link href="/auth/register" className="flex min-h-12 items-center justify-center rounded-full bg-[#4F46E5] text-sm font-semibold text-white">Join beta</Link>
        <Link href="#focus" className="flex min-h-12 items-center justify-center rounded-full bg-[#EDE9FE] text-sm font-semibold text-[#4F46E5]">Use cases</Link>
      </nav>
    </main>
  );
}
