import { Suspense } from "react";
import { AuthExperience } from "../AuthExperience";

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F8FAFC] p-6 text-[#111827]">Loading account setup...</main>}>
      <AuthExperience mode="register" />
    </Suspense>
  );
}
