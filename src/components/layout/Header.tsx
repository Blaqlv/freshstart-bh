"use client";

import { useState } from "react";
import Link from "next/link";
import { primaryNav, site } from "@/lib/site";
import { cn } from "@/lib/cn";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="Fresh Start Behavioral Health — home">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-dark text-white font-bold">
            FS
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold text-brand-dark">Fresh Start</span>
            <span className="block text-[11px] font-medium uppercase tracking-wide text-ink-soft">
              Behavioral Health
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {primaryNav.map((item) => (
              <li key={item.href} className="group relative">
                <Link
                  href={item.href}
                  className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-ink hover:text-brand-dark"
                >
                  {item.label}
                </Link>
                {"children" in item && item.children && (
                  <ul className="invisible absolute left-0 top-full min-w-56 rounded-xl border border-line bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    {item.children.map((c) => (
                      <li key={c.href}>
                        <Link
                          href={c.href}
                          className="block rounded-md px-3 py-2 text-sm text-ink hover:bg-brand-tint hover:text-brand-dark"
                        >
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href={site.phoneHref} className="text-sm font-semibold text-brand-dark">
            {site.phone}
          </a>
          <Link
            href="/contact#appointment"
            className="rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Schedule
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="lg:hidden rounded-md p-2 text-brand-dark"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
            {open ? (
              <path d="m12 10.6 5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3 1.4-1.4 5.3 5.3Z" />
            ) : (
              <path d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={cn("lg:hidden border-t border-line bg-white", open ? "block" : "hidden")}
      >
        <nav aria-label="Mobile" className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <ul className="space-y-1">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-2 font-medium text-ink hover:bg-brand-tint"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
                {"children" in item && item.children && (
                  <ul className="ml-3 border-l border-line pl-3">
                    {item.children.map((c) => (
                      <li key={c.href}>
                        <Link
                          href={c.href}
                          className="block rounded-md px-3 py-1.5 text-sm text-ink-soft hover:bg-brand-tint"
                          onClick={() => setOpen(false)}
                        >
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <a href={site.phoneHref} className="rounded-full border-2 border-brand-dark px-5 py-2.5 text-center text-sm font-semibold text-brand-dark">
              Call {site.phone}
            </a>
            <Link href="/contact#appointment" className="rounded-full bg-brand-dark px-5 py-2.5 text-center text-sm font-semibold text-white">
              Schedule Appointment
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
