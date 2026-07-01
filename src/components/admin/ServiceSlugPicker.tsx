"use client";

import { useEffect, useState } from "react";

type ServiceOption = { slug: string; title: string };

interface Props {
  value: string[];
  onChange: (slugs: string[]) => void;
  max?: number;
}

export function ServiceSlugPicker({ value, onChange, max }: Props) {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/services?active=true")
      .then((r) => r.json())
      .then((d: { services?: ServiceOption[] }) => setServices(d.services ?? []));
  }, []);

  const filtered = services.filter(
    (s) =>
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.slug.toLowerCase().includes(query.toLowerCase()),
  );

  function toggle(slug: string) {
    if (value.includes(slug)) {
      onChange(value.filter((v) => v !== slug));
    } else {
      if (max !== undefined && value.length >= max) return;
      onChange([...value, slug]);
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((slug) => {
            const svc = services.find((s) => s.slug === slug);
            return (
              <span
                key={slug}
                className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2 py-0.5 text-xs font-semibold text-brand-dark"
              >
                {svc?.title ?? slug}
                <button
                  type="button"
                  onClick={() => toggle(slug)}
                  aria-label={`Remove ${svc?.title ?? slug}`}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search services…"
        className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark"
      />
      {query.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded-lg border border-line bg-white shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-ink-soft">No services found.</li>
          ) : (
            filtered.map((svc) => {
              const selected = value.includes(svc.slug);
              const disabled = !selected && max !== undefined && value.length >= max;
              return (
                <li key={svc.slug}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggle(svc.slug)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-alt ${selected ? "font-semibold text-brand-dark" : ""} ${disabled ? "opacity-40" : ""}`}
                  >
                    <span className="flex-1">{svc.title}</span>
                    <span className="font-mono text-xs text-ink-soft">/services/{svc.slug}</span>
                    {selected && <span className="text-brand-dark">✓</span>}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
