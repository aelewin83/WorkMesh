"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, BriefcaseBusiness, Home, UserRound, WalletCards } from "lucide-react";

type Role = "contractor" | "employer" | "admin";

const roleFromPath = (pathname: string): Role => {
  if (pathname.startsWith("/employer")) return "employer";
  if (pathname.startsWith("/admin")) return "admin";
  return "contractor";
};

const linksForRole = (role: Role) => {
  if (role === "employer") {
    return [
      { label: "Home", href: "/", Icon: Home },
      { label: "Request", href: "/employer#post-gig", Icon: BriefcaseBusiness },
      { label: "Chat", href: "/employer#open-chat", Icon: Bell },
      { label: "Settle", href: "/employer#payments", Icon: WalletCards },
      { label: "Profile", href: "/employer#profile", Icon: UserRound }
    ];
  }

  if (role === "admin") {
    return [
      { label: "Home", href: "/", Icon: Home },
      { label: "Disputes", href: "/admin#admin-disputes", Icon: BriefcaseBusiness },
      { label: "Invites", href: "/admin#admin-invites", Icon: Bell },
      { label: "Settle", href: "/admin#admin-payments", Icon: WalletCards },
      { label: "Users", href: "/admin#admin-users", Icon: UserRound }
    ];
  }

  return [
    { label: "Home", href: "/contractor#mobile-home", Icon: Home },
    { label: "Work", href: "/contractor#mobile-gigs", Icon: BriefcaseBusiness },
    { label: "Chat", href: "/contractor#mobile-chat", Icon: Bell },
    { label: "Settle", href: "/contractor#mobile-pay", Icon: WalletCards },
    { label: "Profile", href: "/contractor#mobile-profile", Icon: UserRound }
  ];
};

export function GlobalBottomNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const showBottomNav = pathname.startsWith("/contractor") || pathname.startsWith("/employer") || pathname.startsWith("/admin");
  const role = roleFromPath(pathname);
  const links = linksForRole(role);

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  if (!showBottomNav) return null;

  return (
    <nav className="fixed inset-x-3 bottom-3 z-[80] grid grid-cols-5 gap-1 rounded-3xl border border-border-2 bg-bg-1/95 p-1.5 shadow-card backdrop-blur-xl md:hidden">
      {links.map(({ label, href, Icon }) => {
        const basePath = href.split("#")[0];
        const hrefHash = href.includes("#") ? `#${href.split("#")[1]}` : "";
        const active = hrefHash ? basePath === pathname && hrefHash === hash : basePath === pathname || (href === "/" && pathname === "/");

        return (
          <Link
            key={label}
            href={href}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[0.68rem] transition ${
              active ? "bg-bg-3 text-gold-primary" : "text-text-muted hover:bg-white/[.04] hover:text-text-primary"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
