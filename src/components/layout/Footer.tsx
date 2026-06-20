import Link from "next/link";
import { footerNav, locations, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-auto bg-brand-dark text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand + trust */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-brand-dark font-bold">
                FS
              </span>
              <span className="font-bold">Fresh Start</span>
            </div>
            <p className="mt-3 text-sm text-white/80">{site.tagline}</p>
            <ul className="mt-4 flex flex-wrap gap-2 text-xs">
              <li className="rounded bg-white/10 px-2 py-1">CARF Accredited</li>
              <li className="rounded bg-white/10 px-2 py-1">OHMAS Certified</li>
              <li className="rounded bg-white/10 px-2 py-1">HIPAA Aware</li>
              <li className="rounded bg-white/10 px-2 py-1">Secure Website</li>
            </ul>
          </div>

          {/* Nav */}
          <nav aria-label="Footer" className="md:col-span-2">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {footerNav.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/85 hover:text-white hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">Contact</h2>
            <a href={site.phoneHref} className="mt-2 block text-lg font-bold hover:underline">
              {site.phone}
            </a>
            <address className="mt-3 space-y-2 not-italic text-sm text-white/80">
              {locations.slice(0, 2).map((loc) => (
                <div key={loc.slug}>
                  <span className="font-medium text-white">{loc.name}</span>
                  <br />
                  {loc.street}, {loc.city}, {loc.state} {loc.zip}
                </div>
              ))}
            </address>
            <div className="mt-4 flex gap-3">
              <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white" aria-label="Facebook">
                Facebook
              </a>
              <a href={site.google} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white" aria-label="Google Business listing">
                Google
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/15 pt-6 text-xs text-white/60">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved. Individual results
            are not guaranteed and may vary from person to person.
          </p>
        </div>
      </div>
    </footer>
  );
}
