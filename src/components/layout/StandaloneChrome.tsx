import { CrisisBanner } from "@/components/layout/CrisisBanner";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { Footer } from "@/components/layout/Footer";

/**
 * Full public chrome (crisis banner + header + footer) for pages that render
 * outside the (site) route group — notably app/not-found.tsx and
 * app/forbidden/page.tsx, which mount in the root layout and would otherwise
 * lack the sitewide crisis banner (A7 / A12).
 */
export function StandaloneChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <CrisisBanner />
      <HeaderServer />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
