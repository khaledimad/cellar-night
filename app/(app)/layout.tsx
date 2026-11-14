import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { BrandWordmark } from "@/components/brand-wordmark";
import { NavLinks, NavLinksFallback } from "@/components/nav-links";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 sm:gap-6">
          <BrandWordmark />
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>
          <form action={signOut} className="shrink-0">
            <button className="rounded px-1 py-1 text-[13px] text-dim transition-colors hover:text-neon sm:text-sm">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</div>
    </div>
  );
}
