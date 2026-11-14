"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "My Comedians" },
  { href: "/tonight", label: "Tonight" },
  { href: "/ask", label: "Ask the Cellar" },
];

function isActive(pathname: string | null, href: string) {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavRow({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Pages"
      className="nav-scroll flex min-w-0 flex-1 gap-4 overflow-x-auto whitespace-nowrap text-[13px] font-medium sm:gap-6 sm:text-sm"
    >
      {LINKS.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 py-3.5 transition-colors ${
              active
                ? "border-neon text-chalk"
                : "border-transparent text-dim hover:text-chalk"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavLinks() {
  return <NavRow pathname={usePathname()} />;
}

// Shown while the current page is not known yet: same links, none marked.
export function NavLinksFallback() {
  return <NavRow pathname={null} />;
}
