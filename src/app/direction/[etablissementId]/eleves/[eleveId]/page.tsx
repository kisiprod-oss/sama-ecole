import Link from "next/link";
import { creerClientServeur } from "@/lib/supabase/server";
import {
  definirVerificationResponsable,
  rattacherResponsable,
} from "../../actions";
import { FormulaireRattachement } from "./formulaire-rattachement";

type Rattachement = {
  id: string;
  lien_parente: string | null;
  verifie: boolean;
  utilisateur_id: string;
};

export default async function PageDossierEleve({
  params,
}: {
  params: Promise<{ etablissementId: string; eleveId: string }>;
}) {
  const { etablissementId, eleveId } = await params;
  const supabase = await creerClientServeur();

  const { data: eleve } = await supabase
    .from("eleves")
    .select(
      "id, identifiant_interne, nom, prenom, date_naissance, sexe, statut, utilisateur_id, classe:classes(id, nom)"
    )
    .eq("id", eleveId)
    .single();

  if (!eleve) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center text-texte-attenue">
        Dossier introuvable, ou hors de votre établissement.
      </main>
    );
  }

  const classe = eleve.classe as unknown as { id: string; nom: string } | null;

  const [
    { data: rattachementsBruts },
    { data: inscriptions },
    { data: absences },
    { data: parentsDisponibles },
  ] = await Promise.all([
    supabase
      .from("responsables_eleves")
      .select("id, lien_parente, verifie, utilisateur_id")
      .eq("eleve_id", eleveId),
    supabase
      .from("inscriptions")
      .select("id, date_debut, date_fin, classe:classes(nom)")
      .eq("eleve_id", eleveId)
      .order("date_debut", { ascending: false }),
    supabase
      .from("absences")
      .select("date, type, justifie, motif")
      .eq("eleve_id", eleveId)
      .order("date", { ascending: false })
      .limit(10),
    supabase
      .from("appartenances")
      .select("utilisateur_id, profil:profils(nom_complet, telephone)")
      .eq("etablissement_id", etablissementId)
      .eq("role", "parent"),
  ]);

  const rattachements = (rattachementsBruts ?? []) as unknown as Rattachement[];

  const profilsParId = new Map<string, { nom_complet: string | null; telephone: string | null }>();
  (parentsDisponibles ?? []).forEach((p) => {
    const profil = p.profil as unknown as {
      nom_complet: string | null;
      telephone: string | null;
    } | null;
    if (profil) profilsParId.set(p.utilisateur_id, profil);
  });

  const dejaRattaches = new Set(rattachements.map((r) => r.utilisateur_id));
  const candidats = [...profilsParId.entries()]
    .filter(([id]) => !dejaRattaches.has(id))
    .map(([id, profil]) => ({
      id,
      nom: profil.nom_complet ?? "Sans nom",
      telephone: profil.telephone,
    }));

  const retards = (absences ?? []).filter((a) => a.type === "retard").length;
  const vraiesAbsences = (absences ?? []).length - retards;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href={`/direction/${etablissementId}/eleves`}
        className="text-sm font-medium text-bleu hover:underline"
      >
        ← Retour aux élèves
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-texte">
        {eleve.prenom} {eleve.nom}
      </h1>
      <p className="text-sm text-texte-attenue">
        {classe ? classe.nom : "Sans classe"} · dossier{" "}
        <span className="font-mono">{eleve.identifiant_interne}</span>
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-bordure bg-fond-carte p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
            Identité
          </h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Ligne libelle="Identifiant interne" valeur={eleve.identifiant_interne} mono />
            <Ligne
              libelle="Né(e) le"
              valeur={
                eleve.date_naissance
                  ? new Date(eleve.date_naissance).toLocaleDateString("fr-FR")
                  : "Non renseigné"
              }
            />
            <Ligne
              libelle="Sexe"
              valeur={eleve.sexe === "M" ? "Masculin" : eleve.sexe === "F" ? "Féminin" : "Non renseigné"}
            />
            <Ligne
              libelle="Compte élève"
              valeur={eleve.utilisateur_id ? "Ouvert" : "Aucun — accès par le parent"}
            />
            <Ligne libelle="Statut" valeur={eleve.statut} />
          </dl>
        </section>

        <section className="rounded-xl border border-bordure bg-fond-carte p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
            Assiduité
          </h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Ligne libelle="Absences" valeur={String(vraiesAbsences)} />
            <Ligne libelle="Retards" valeur={String(retards)} />
          </dl>
          <div className="mt-3 flex flex-col gap-1.5">
            {absences?.slice(0, 4).map((a, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-texte-attenue">
                  {a.type === "retard" ? "Retard" : "Absence"} du{" "}
                  {new Date(a.date).toLocaleDateString("fr-FR")}
                </span>
                <span className={a.justifie ? "text-vert-fonce" : "text-avertissement"}>
                  {a.justifie ? "Justifié" : "Non justifié"}
                </span>
              </div>
            ))}
            {absences?.length === 0 && (
              <p className="text-xs text-texte-attenue">Rien à signaler.</p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-bordure bg-fond-carte p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
          Responsables légaux
        </h2>

        <div className="flex flex-col gap-2">
          {rattachements.map((r) => {
            const profil = profilsParId.get(r.utilisateur_id);
            return (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-bordure px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-texte">
                    {profil?.nom_complet ?? "Compte sans profil visible"}
                  </p>
                  <p className="text-xs text-texte-attenue">
                    {r.lien_parente ?? "Lien non précisé"}
                    {profil?.telephone && ` · ${profil.telephone}`}
                  </p>
                </div>
                <form
                  action={definirVerificationResponsable.bind(
                    null,
                    etablissementId,
                    eleveId,
                    r.id,
                    !r.verifie
                  )}
                >
                  <button
                    type="submit"
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      r.verifie
                        ? "bg-green-50 text-vert-fonce hover:bg-green-100"
                        : "bg-vert text-white hover:bg-vert-fonce"
                    }`}
                  >
                    {r.verifie ? "✓ Vérifié — annuler" : "Marquer vérifié"}
                  </button>
                </form>
              </div>
            );
          })}

          {rattachements.length === 0 && (
            <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-alerte">
              Aucun responsable rattaché. Personne ne peut suivre la scolarité
              de cet enfant côté famille.
            </p>
          )}
        </div>

        {rattachements.some((r) => !r.verifie) && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-avertissement">
            Un rattachement non vérifié n&apos;ouvre <strong>aucun</strong> accès
            au dossier de l&apos;enfant. Vérifiez l&apos;identité de la personne
            (pièce d&apos;identité, carnet) avant de cocher.
          </p>
        )}

        <FormulaireRattachement
          etablissementId={etablissementId}
          eleveId={eleveId}
          candidats={candidats}
          action={rattacherResponsable}
        />
      </section>

      <section className="mt-6 rounded-xl border border-bordure bg-fond-carte p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
          Parcours
        </h2>
        <div className="flex flex-col gap-1.5">
          {inscriptions?.map((i) => (
            <div key={i.id} className="flex justify-between text-sm">
              <span className="text-texte">
                {(i.classe as unknown as { nom: string } | null)?.nom}
              </span>
              <span className="text-texte-attenue">
                depuis le {new Date(i.date_debut).toLocaleDateString("fr-FR")}
                {i.date_fin &&
                  ` — jusqu'au ${new Date(i.date_fin).toLocaleDateString("fr-FR")}`}
              </span>
            </div>
          ))}
          {inscriptions?.length === 0 && (
            <p className="text-sm text-texte-attenue">Aucune inscription enregistrée.</p>
          )}
        </div>
        <p className="mt-3 text-xs text-texte-attenue">
          Un changement de classe ajoute une ligne, il n&apos;efface jamais
          l&apos;ancienne.
        </p>
      </section>
    </main>
  );
}

function Ligne({
  libelle,
  valeur,
  mono,
}: {
  libelle: string;
  valeur: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-texte-attenue">{libelle}</dt>
      <dd className={`text-right font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {valeur}
      </dd>
    </div>
  );
}
