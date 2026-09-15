"use client";

import { useState, useTransition } from "react";

type Candidat = { id: string; nom: string; telephone: string | null };

export function FormulaireRattachement({
  etablissementId,
  eleveId,
  candidats,
  action,
}: {
  etablissementId: string;
  eleveId: string;
  candidats: Candidat[];
  action: (
    etablissementId: string,
    eleveId: string,
    formData: FormData
  ) => Promise<{ erreur: string | null }>;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  if (candidats.length === 0) {
    return (
      <p className="mt-4 rounded-lg border border-dashed border-bordure px-3 py-2.5 text-xs text-texte-attenue">
        Aucun autre compte parent disponible dans cet établissement. Créer un
        compte pour un nouveau responsable suppose de lui envoyer une
        invitation — cette fonction attend la configuration d&apos;un service
        d&apos;email, qui n&apos;est pas branché.
      </p>
    );
  }

  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-2 border-t border-bordure pt-4"
      action={(formData: FormData) => {
        demarrer(async () => {
          const resultat = await action(etablissementId, eleveId, formData);
          setErreur(resultat.erreur);
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <label
          htmlFor="utilisateur_id"
          className="text-xs font-medium text-texte-attenue"
        >
          Rattacher un responsable
        </label>
        <select
          id="utilisateur_id"
          name="utilisateur_id"
          required
          className="h-10 rounded-lg border border-bordure px-3 text-sm"
        >
          <option value="">Choisir…</option>
          {candidats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
              {c.telephone ? ` — ${c.telephone}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="lien_parente"
          className="text-xs font-medium text-texte-attenue"
        >
          Lien de parenté
        </label>
        <input
          id="lien_parente"
          name="lien_parente"
          placeholder="Mère, père, tuteur…"
          className="h-10 rounded-lg border border-bordure px-3 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={enCours}
        className="h-10 rounded-lg bg-bleu px-4 text-sm font-semibold text-white hover:bg-bleu-fonce disabled:opacity-60"
      >
        {enCours ? "Rattachement…" : "Rattacher"}
      </button>

      {erreur && <p className="w-full text-sm text-alerte">{erreur}</p>}

      <p className="w-full text-xs text-texte-attenue">
        Le rattachement est créé <strong>non vérifié</strong> : il faudra le
        confirmer ci-dessus pour qu&apos;il ouvre l&apos;accès.
      </p>
    </form>
  );
}
