"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";

type Role = "contractor" | "employer";
type AuthMode = "register" | "login";

export function AuthExperience({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = params.get("role") === "employer" ? "employer" : "contractor";
  const [role, setRole] = useState<Role>(initialRole);
  const [inviteCode, setInviteCode] = useState("RELAI-BETA");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "ready" | "error" | "success">("idle");
  const [identifierStatus, setIdentifierStatus] = useState<"idle" | "checking" | "available" | "unavailable" | "invalid">("idle");
  const [identifierMessage, setIdentifierMessage] = useState("");
  const [message, setMessage] = useState("");

  const isRegister = mode === "register";
  const passwordMeetsCriteria = password.length >= 10;
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;

  const identifierHint = useMemo(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) return isRegister ? "Use a username or email address." : "";
    if (!isValidIdentifier(clean)) return "Use a valid email address or a username with 3-24 letters, numbers, dots, hyphens, or underscores.";
    if (identifierStatus === "checking") return "Checking availability...";
    if (identifierStatus === "available") return "Available.";
    if (identifierStatus === "unavailable") return identifierMessage || "That username or email is already in use.";
    return isRegister ? "Availability checks automatically as you type." : "";
  }, [identifierMessage, identifierStatus, isRegister, username]);

  useEffect(() => {
    if (!isRegister) return;
    const clean = username.trim().toLowerCase();
    setIdentifierMessage("");
    if (!clean) {
      setIdentifierStatus("idle");
      return;
    }
    if (!isValidIdentifier(clean)) {
      setIdentifierStatus("invalid");
      return;
    }

    setIdentifierStatus("checking");
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/auth/check-username", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username: clean }),
          signal: controller.signal
        });
        const data = await response.json();
        setIdentifierStatus(response.ok && data.available ? "available" : "unavailable");
        setIdentifierMessage(data.available ? "Available." : data.message ?? "That username or email is already in use.");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setIdentifierStatus("idle");
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [isRegister, username]);

  async function submit() {
    setStatus("checking");
    setMessage(isRegister ? "Creating your account..." : "Signing in...");
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inviteCode, username, password, confirmPassword, role })
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus("error");
      setMessage(data.message ?? "Please check the form and try again.");
      return;
    }
    setStatus("success");
    setMessage(isRegister ? "Account ready. Opening your first-run workspace..." : "Welcome back. Opening your workspace...");
    router.push(data.role === "employer" ? "/employer#first-run" : "/contractor#first-run");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#FFFFFF_34rem,#F8FAFC_100%)] px-4 py-6 text-[#111827]">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-[1040px] flex-col">
        <header className="flex min-h-14 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EDE9FE] text-[#4F46E5]">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-semibold leading-none text-[#111827]">Relai</span>
              <span className="mt-1 block text-sm text-[#667085]">Private beta</span>
            </span>
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white px-5 text-sm font-semibold text-[#111827] shadow-[0_8px_24px_rgba(17,24,39,0.05)] transition hover:-translate-y-0.5 hover:border-[#7C5CFF]">
            Back home
          </Link>
        </header>

        <section className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center py-12 text-center sm:py-16">
          <p className="text-sm font-semibold tracking-wide text-[#4F46E5]">
            {isRegister ? "Private beta access" : "Welcome back"}
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-[40px] font-semibold leading-[1.04] text-[#111827] sm:text-[60px]">
            {isRegister ? "Create your Relai account." : "Sign in to Relai."}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#475467] sm:text-lg">
            {isRegister
              ? "Start with a username or email. Choose your profile below and keep identity disclosure under your control."
              : "Continue to your private workspace for trusted requests, agreements, messaging, and secure payments."}
          </p>

          <section className="mt-10 rounded-[2rem] border border-[#E5E7EB] bg-white/90 p-4 text-left shadow-[0_24px_70px_rgba(17,24,39,0.08)] backdrop-blur sm:p-6">
            <div className="grid gap-4">
              {isRegister ? (
                <>
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Invite code</span>
                    <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} className="min-h-12 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-[#111827] outline-none transition focus:border-[#7C5CFF] focus:bg-white" />
                  </label>

                  <div className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Profile type</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(["contractor", "employer"] as const).map((item) => (
                        <button key={item} type="button" onClick={() => setRole(item)} className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-semibold capitalize transition ${role === item ? "border-[#4F46E5] bg-[#EDE9FE] text-[#4F46E5]" : "border-[#E5E7EB] bg-white text-[#667085] hover:border-[#7C5CFF] hover:text-[#4F46E5]"}`}>
                          <UserRound className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                          {item === "contractor" ? "Contributor" : "Hiring"}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Username or email</span>
                <div className="relative">
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className={`min-h-12 w-full rounded-2xl border bg-[#F8FAFC] px-4 pr-11 text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:bg-white ${isRegister && identifierStatus === "available" ? "border-[#14B8A6] focus:border-[#14B8A6]" : isRegister && (identifierStatus === "invalid" || identifierStatus === "unavailable") ? "border-[#FF7A59] focus:border-[#FF7A59]" : "border-[#E5E7EB] focus:border-[#7C5CFF]"}`}
                  />
                  {isRegister && identifierStatus === "available" ? (
                    <CheckCircle2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#14B8A6]" strokeWidth={1.75} aria-hidden="true" />
                  ) : null}
                </div>
                {isRegister && identifierHint ? (
                  <span className={`text-xs leading-5 ${identifierStatus === "available" ? "text-[#0F766E]" : identifierStatus === "invalid" || identifierStatus === "unavailable" ? "text-[#B93815]" : "text-[#667085]"}`}>
                    {identifierHint}
                  </span>
                ) : null}
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Password</span>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={`min-h-12 w-full rounded-2xl border bg-[#F8FAFC] px-4 pr-11 text-[#111827] outline-none transition focus:bg-white ${passwordMeetsCriteria ? "border-[#14B8A6] focus:border-[#14B8A6]" : "border-[#E5E7EB] focus:border-[#7C5CFF]"}`}
                  />
                  {passwordMeetsCriteria ? (
                    <CheckCircle2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#14B8A6]" strokeWidth={1.75} aria-hidden="true" />
                  ) : null}
                </div>
                {isRegister ? (
                  <span className={`text-xs leading-5 ${passwordMeetsCriteria ? "text-[#0F766E]" : "text-[#667085]"}`}>
                    {passwordMeetsCriteria ? "Password meets the minimum requirement." : "Use at least 10 characters."}
                  </span>
                ) : null}
              </label>

              {isRegister ? (
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Confirm password</span>
                  <div className="relative">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className={`min-h-12 w-full rounded-2xl border bg-[#F8FAFC] px-4 pr-11 text-[#111827] outline-none transition focus:bg-white ${passwordsMatch ? "border-[#14B8A6] focus:border-[#14B8A6]" : "border-[#E5E7EB] focus:border-[#7C5CFF]"}`}
                    />
                    {passwordsMatch ? (
                      <CheckCircle2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#14B8A6]" strokeWidth={1.75} aria-hidden="true" />
                    ) : null}
                  </div>
                </label>
              ) : null}

              {status !== "idle" ? (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${status === "error" ? "border-[#FF7A59]/30 bg-[#FFF1ED] text-[#B93815]" : status === "success" ? "border-[#14B8A6]/30 bg-[#E6F7F5] text-[#0F766E]" : "border-[#E5E7EB] bg-[#F8FAFC] text-[#475467]"}`}>
                  {message}
                </div>
              ) : null}

              <button type="button" onClick={submit} disabled={status === "checking"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#4F46E5] px-6 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(79,70,229,0.20)] transition hover:-translate-y-0.5 hover:bg-[#7C5CFF] disabled:cursor-wait disabled:opacity-70">
                <LockKeyhole className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                {status === "checking" ? "Working..." : isRegister ? "Create account" : "Sign in"}
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>

              <p className="text-center text-sm text-[#667085]">
                {isRegister ? "Already have an account?" : "New to Relai?"}{" "}
                <Link href={isRegister ? "/auth/login" : "/auth/register"} className="font-semibold text-[#4F46E5] underline-offset-4 hover:underline">
                  {isRegister ? "Sign in" : "Create account"}
                </Link>
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function isValidIdentifier(value: string) {
  return /^[a-z0-9._-]{3,24}$/.test(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
