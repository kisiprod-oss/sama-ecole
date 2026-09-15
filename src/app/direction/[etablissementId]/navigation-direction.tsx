"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const entrees = [
  { segment: "", libelle: "Vue d'ensemble" },
  { segment: "eleves", libelle: "Élèves" },
];

export function NavigationDirection({
  etablissementId,
}: {
  etablissementId: string;
}) {
  const chemin = usePathname();
  const base = `/direction/${etablissementId}`;

  return (
    <nav className="border-b border-bordure bg-white">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-6">
        {entrees.map((e) => {
          const href = e.segment ? `${base}/${e.segment}` : base;
          const actif = e.segment
            ? chemin.startsWith(href)
            : chemin === base;
          return (
            <Link
              key={e.libelle}
              href={href}
              className={`-mb-px border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap ${
                actif
                  ? "border-bleu text-bleu"
                  : "border-transparent text-texte-attenue hover:text-texte"
              }`}
            >
              {e.libelle}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
