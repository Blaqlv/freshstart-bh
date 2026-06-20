import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CrisisBanner } from "@/components/layout/CrisisBanner";

/**
 * Public marketing chrome (crisis banner + header + footer). Lives in the
 * (site) route group so the admin portal does not inherit it.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <CrisisBanner />
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
