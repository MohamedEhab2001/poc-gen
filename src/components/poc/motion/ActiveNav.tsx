"use client";

import { useEffect, useState } from "react";

/**
 * Section navigation with a subtle scroll-spy indicator: one shared
 * IntersectionObserver watches the linked sections and marks the current
 * link. Plain anchors — hash navigation, keyboard focus, and skip links are
 * untouched. Themes style idle/active states through their own classes.
 */
export function ActiveNav({
  links,
  className,
  linkClassName,
  activeClassName,
}: {
  links: Array<{ href: string; label: string }>;
  className?: string;
  linkClassName: string;
  /** Added to the link whose section is currently in view. */
  activeClassName: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const sectionIds = links
      .map((link) => link.href.replace(/^#/, ""))
      .filter((id) => id.length > 0);
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section != null);
    if (sections.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio);
          else visible.delete(entry.target.id);
        }
        if (visible.size > 0) {
          const ranked = [...visible.entries()].sort((a, b) => b[1] - a[1]);
          if (ranked[0]) setActiveId(ranked[0][0]);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [links]);

  return (
    <nav aria-label="Primary" className={className}>
      {links.map((link) => {
        const active = activeId === link.href.replace(/^#/, "");
        return (
          <a
            key={link.href}
            href={link.href}
            aria-current={active ? "true" : undefined}
            className={`${linkClassName}${active ? ` ${activeClassName}` : ""}`}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
