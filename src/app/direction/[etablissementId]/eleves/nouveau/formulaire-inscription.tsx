"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Classe = { id: string; nom: string };

export function FormulaireInscription({
  etablissementId,
  classes,
  anneeScolaireId,
  identifiantPropose,
  action,
}: {
  etablissementId: string;
  classes: Classe[];
  anneeScolaireId: string;
  identifiantPropose: string;
  action: (
    etablissementId: string,
    formData: FormData
  ) => Promise<{ erreur: string | null; eleveId?: string }>;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  return (
    <form
      className="mt-6 flex flex-col gap-4"
      action={(formData: FormData) => {
        demarrer(async () => {
          const resultat = await action(etablissementId, formData);
          setErreur(resultat.erreur);
          if (!resultat.erreur && resultat.eleveId) {
            router.push(
              `/direction/${etablissementId}/eleves/${resultat.eleveId}`
            );
          }
        });
      }}
    >
      <input type="hidden" name="annee_scolaire_id" value={anneeScolaireId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ id="prenom" libelle="Prénom" requis />
        <Champ id="nom" libelle="Nom" requis />

        <div className="flex flex-col gap-1">
          <label htmlFor="date_naissance" className="text-xs font-medium text-texte-attenue">
            Date de naissance
          </label>
          <input
            id="date_naissance"
            name="date_naissance"
            type="date"
            className="h-11 rounded-lg border border-bordure bg-fond-carte px-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="sexe" className="text-xs font-medium text-texte-attenue">
            Sexe
          </label>
          <select
            id="sexe"
            name="sexe"
            className="h-11 rounded-lg border border-bordure bg-fond-carte px-3 text-sm"
          >
            <option value="">Non renseigné</option>
            <option value="F">Féminin</option>
            <option value="M">Masculin</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="classe_id" className="text-xs font-medium text-texte-attenue">
            Classe
          </label>
          <select
            id="classe_id"
            name="classe_id"
            required
            className="h-11 rounded-lg border border-bordure bg-fond-carte px-3 text-sm"
          >
            <option value="">Choisir…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="identifiant_interne"
            className="text-xs font-medium text-texte-attenue"
          >
            Identifiant interne
          </label>
          <input
            id="identifiant_interne"
            name="identifiant_interne"
            required
            defaultValue={identifiantPropose}
            placeholder="ETO-2026-0003"
            className="h-11 rounded-lg border border-bordure bg-fond-carte px-3 font-mono text-sm"
          />
          <span className="text-xs text-texte-attenue">
            Doit rester unique dans l&apos;établissement.
          </span>
        </div>
      </div>

      <p className="rounded-lg border border-dashed border-bordure px-4 py-3 text-xs text-texte-attenue">
        Aucune adresse email n&apos;est demandée pour l&apos;enfant. Le
        rattachement d&apos;un responsable légal se fait à l&apos;étape
        suivante, sur son dossier.
      </p>

      {erreur && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-alerte">
          {erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours || classes.length === 0}
        className="h-12 rounded-lg bg-bleu text-sm font-semibold text-white hover:bg-bleu-fonce disabled:opacity-60"
      >
        {enCours ? "Inscription…" : "Inscrire l'élève"}
      </button>

      {classes.length === 0 && (
        <p className="text-sm text-avertissement">
          Créez d&apos;abord une classe depuis la vue d&apos;ensemble.
        </p>
      )}
    </form>
  );
}

function Champ({
  id,
  libelle,
  requis,
}: {
  id: string;
  libelle: string;
  requis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-texte-attenue">
        {libelle}
      </label>
      <input
        id={id}
        name={id}
        required={requis}
        className="h-11 rounded-lg border border-bordure bg-fond-carte px-3 text-sm"
      />
    </div>
  );
}
