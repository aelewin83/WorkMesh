import { Suspense } from "react";
import { AuthExperience } from "../AuthExperience";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F8FAFC] p-6 text-[#111827]">Loading sign in...</main>}>
      <AuthExperience mode="login" />
    </Suspense>
  );
}
