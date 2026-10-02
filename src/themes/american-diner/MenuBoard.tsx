"use client";

import { useState } from "react";
import type { ResolvedMenu } from "@/lib/poc/types";

/**
 * Diner menu board with category tabs. Keyboard accessible: tabs are real
 * buttons with aria-selected and arrow-key support.
 */
export function MenuBoard({ menu }: { menu: ResolvedMenu }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const section = menu.sections[activeIndex] ?? menu.sections[0];
  if (!section) return null;

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = (activeIndex + delta + menu.sections.length) % menu.sections.length;
      setActiveIndex(next);
      const tabs = event.currentTarget.parentElement;
      const buttons = tabs?.querySelectorAll<HTMLButtonElement>("button");
      buttons?.[next]?.focus();
    }
  }

  return (
    <div className="border-4 border-[var(--secondary)] bg-white shadow-[10px_10px_0_var(--secondary)]">
      <div role="tablist" aria-label="Menu categories" className="flex flex-wrap border-b-4 border-[var(--secondary)] bg-[var(--bg)]">
        {menu.sections.map((item, index) => (
          <button
            key={item.id}
            role="tab"
            id={`menu-tab-${item.id}`}
            aria-selected={index === activeIndex}
            aria-controls={`menu-panel-${item.id}`}
            onClick={() => setActiveIndex(index)}
            onKeyDown={onKeyDown}
            className={`min-h-[48px] flex-1 px-4 py-3 text-center text-[13px] font-extrabold uppercase tracking-[0.06em] transition-colors ${
              index === activeIndex
                ? "bg-[var(--secondary)] text-white"
                : "text-[var(--secondary)] hover:bg-[var(--secondary)]/10"
            }`}
            style={index > 0 ? { borderLeft: "3px solid var(--secondary)" } : undefined}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`menu-panel-${section.id}`}
        aria-labelledby={`menu-tab-${section.id}`}
        className="p-7 md:p-9"
      >
        {section.description ? (
          <p className="mb-5 text-center font-display text-lg text-[var(--secondary)]">{section.description}</p>
        ) : null}
        <ul className="grid gap-x-10 md:grid-cols-2">
          {section.items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4 border-b-2 border-dashed border-[var(--border)] py-3.5">
              <span>
                <span className="font-display text-[17px] text-[var(--text)]">{item.name}</span>
                {item.description ? (
                  <span className="mt-0.5 block max-w-[36ch] text-[13px] font-medium text-[var(--muted)]">
                    {item.description}
                  </span>
                ) : null}
                {item.tags.length > 0 ? (
                  <span className="mt-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--primary)]">
                    {item.tags.join(" · ")}
                  </span>
                ) : null}
              </span>
              {item.price ? (
                <span className="font-display text-xl text-[var(--primary)]">{item.price}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
