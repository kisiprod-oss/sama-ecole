import Link from "next/link";
import { creerClientServeur } from "@/lib/supabase/server";

type EleveListe = {
  id: string;
  identifiant_interne: string;
  nom: string;
  prenom: string;
  statut: string;
  classe: { nom: string } | null;
  responsables_eleves: { verifie: boolean }[];
};

export default async function PageEleves({
  params,
  searchParams,
}: {
  params: Promise<{ etablissementId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { etablissementId } = await params;
  const { q } = await searchParams;
  const recherche = (q ?? "").trim();

  const supabase = await creerClientServeur();

  let requete = supabase
    .from("eleves")
    .select(
      "id, identifiant_interne, nom, prenom, statut, classe:classes(nom), responsables_eleves(verifie)"
    )
    .eq("etablissement_id", etablissementId)
    .order("nom");

  if (recherche) {
    const motif = `%${recherche}%`;
    requete = requete.or(
      `nom.ilike.${motif},prenom.ilike.${motif},identifiant_interne.ilike.${motif}`
    );
  }

  const { data } = await requete;
  const eleves = (data ?? []) as unknown as EleveListe[];

  const sansResponsable = eleves.filter(
    (e) => e.responsables_eleves.length === 0
  ).length;
  const enAttenteVerification = eleves.filter(
    (e) =>
      e.responsables_eleves.length > 0 &&
      e.responsables_eleves.every((r) => !r.verifie)
  ).length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-texte">Élèves</h1>
          <p className="text-sm text-texte-attenue">
            {eleves.length} élève(s)
            {recherche && ` correspondant à « ${recherche} »`}
          </p>
        </div>
        <Link
          href={`/direction/${etablissementId}/eleves/nouveau`}
          className="rounded-lg bg-bleu px-4 py-2 text-sm font-semibold text-white hover:bg-bleu-fonce"
        >
          Inscrire un élève
        </Link>
      </div>

      <form className="mt-5" action={`/direction/${etablissementId}/eleves`}>
        <input
          type="search"
          name="q"
          defaultValue={recherche}
          placeholder="Rechercher par nom, prénom ou identifiant…"
          className="h-11 w-full rounded-lg border border-bordure bg-fond-carte px-4 text-sm outline-none focus:border-bleu"
        />
      </form>

      {(sansResponsable > 0 || enAttenteVerification > 0) && (
        <div className="mt-5 flex flex-col gap-2">
          {sansResponsable > 0 && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-alerte">
              {sansResponsable} élève(s) sans aucun responsable rattaché :
              personne ne peut suivre leur scolarité côté famille.
            </p>
          )}
          {enAttenteVerification > 0 && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-avertissement">
              {enAttenteVerification} élève(s) dont le rattachement attend une
              vérification. Tant qu&apos;elle n&apos;est pas faite, le
              responsable ne voit rien.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {eleves.map((e) => {
          const verifies = e.responsables_eleves.filter((r) => r.verifie).length;
          const total = e.responsables_eleves.length;
          return (
            <Link
              key={e.id}
              href={`/direction/${etablissementId}/eleves/${e.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bordure bg-fond-carte px-4 py-3 hover:border-bleu"
            >
              <div className="min-w-0">
                <p className="font-medium text-texte">
                  {e.nom}, {e.prenom}
                </p>
                <p className="font-mono text-xs text-texte-attenue">
                  {e.identifiant_interne}
                  {e.classe && ` · ${e.classe.nom}`}
                </p>
              </div>
              {total === 0 ? (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-alerte">
                  Aucun responsable
                </span>
              ) : verifies > 0 ? (
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-vert-fonce">
                  {verifies} responsable(s) vérifié(s)
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-avertissement">
                  Vérification en attente
                </span>
              )}
            </Link>
          );
        })}

        {eleves.length === 0 && (
          <p className="text-sm text-texte-attenue">
            {recherche
              ? "Aucun élève ne correspond à cette recherche."
              : "Aucun élève inscrit pour le moment."}
          </p>
        )}
      </div>
    </main>
  );
}
