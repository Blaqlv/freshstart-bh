"use client";

import { useEffect, useState } from "react";

type LinkTarget = { label: string; href: string; group: string };
type NavData = { services: LinkTarget[]; pages: LinkTarget[]; locations: LinkTarget[]; anchors: LinkTarget[] };

interface Props {
  value: string;
  onChange: (href: string) => void;
  label?: string;
}

const GROUPS = ["Services", "Pages", "Locations", "Anchors"] as const;
const labelCls = "block text-xs font-medium text-ink-soft";
const inputCls = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark";

export function LinkPicker({ value, onChange, label }: Props) {
  const [tab, setTab] = useState<"internal" | "external">(
    !value || value.startsWith("/") || value.startsWith("#") ? "internal" : "external"
  );
  const [targets, setTargets] = useState<LinkTarget[]>([]);
  const [query, setQuery] = useState("");
  const [externalValue, setExternalValue] = useState(tab === "external" ? value : "");

  useEffect(() => {
    if (tab === "internal" && targets.length === 0) {
      fetch("/api/admin/link-targets")
        .then((r) => r.json())
        .then((d: NavData) => {
          setTargets([...d.services, ...d.pages, ...d.locations, ...d.anchors]);
        });
    }
  }, [tab, targets.length]);

  const filtered = targets.filter(
    (t) =>
      t.label.toLowerCase().includes(query.toLowerCase()) ||
      t.href.toLowerCase().includes(query.toLowerCase())
  );

  const grouped = GROUPS.reduce<Record<string, LinkTarget[]>>((acc, g) => {
    acc[g] = filtered.filter((t) => t.group === g);
    return acc;
  }, {} as Record<string, LinkTarget[]>);

  return (
    <div className="space-y-2">
      {label && <span className={labelCls}>{label}</span>}

      {value && (
        <div className="flex items-center gap-2 rounded-lg bg-brand-tint px-3 py-1.5 text-xs">
          <span className="flex-1 truncate font-mono text-brand-dark">{value}</span>
          <button type="button" onClick={() => onChange("")} className="text-brand-dark/60 hover:text-brand-dark">✕</button>
        </div>
      )}

      <div className="flex gap-1 rounded-lg bg-surface-alt p-1">
        {(["internal", "external"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1 text-xs font-semibold transition ${tab === t ? "bg-white text-brand-dark shadow-sm" : "text-ink-soft"}`}
          >
            {t === "internal" ? "Internal" : "External / Tel / Email"}
          </button>
        ))}
      </div>

      {tab === "internal" ? (
        <div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, services, locations…"
            className={inputCls}
          />
          <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-white">
            {GROUPS.map((group) =>
              grouped[group].length === 0 ? null : (
                <div key={group}>
                  <p className="bg-surface-alt/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                    {group}
                  </p>
                  {grouped[group].map((t) => (
                    <button
                      key={t.href}
                      type="button"
                      onClick={() => { onChange(t.href); setQuery(""); }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-alt ${value === t.href ? "font-semibold text-brand-dark" : ""}`}
                    >
                      <span className="flex-1">{t.label}</span>
                      <span className="font-mono text-xs text-ink-soft">{t.href}</span>
                    </button>
                  ))}
                </div>
              )
            )}
            {filtered.length === 0 && query && (
              <p className="px-3 py-3 text-xs text-ink-soft">No results for &quot;{query}&quot;</p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <input
            type="text"
            value={externalValue}
            onChange={(e) => setExternalValue(e.target.value)}
            onBlur={() => { if (externalValue) onChange(externalValue); }}
            placeholder="https://example.com  or  tel:+1…  or  mailto:…"
            className={inputCls}
          />
          {externalValue && !externalValue.match(/^(https?:\/\/|tel:|mailto:|#)/) && (
            <p className="text-xs text-accent">Should start with https://, tel:, mailto:, or #</p>
          )}
        </div>
      )}
    </div>
  );
}
