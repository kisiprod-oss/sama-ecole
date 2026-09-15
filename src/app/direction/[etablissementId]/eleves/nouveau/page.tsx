import Link from "next/link";
import { creerClientServeur } from "@/lib/supabase/server";
import { inscrireEleve } from "../../actions";
import { FormulaireInscription } from "./formulaire-inscription";

export default async function PageNouvelEleve({
  params,
}: {
  params: Promise<{ etablissementId: string }>;
}) {
  const { etablissementId } = await params;
  const supabase = await creerClientServeur();

  const [{ data: classes }, { data: annees }, { data: derniers }] =
    await Promise.all([
      supabase
        .from("classes")
        .select("id, nom")
        .eq("etablissement_id", etablissementId)
        .order("nom"),
      supabase
        .from("annees_scolaires")
        .select("id, libelle")
        .eq("etablissement_id", etablissementId)
        .eq("active", true),
      supabase
        .from("eleves")
        .select("identifiant_interne")
        .eq("etablissement_id", etablissementId)
        .order("identifiant_interne", { ascending: false })
        .limit(1),
    ]);

  // Propose le prochain identifiant en suivant le format déjà utilisé
  // par l'établissement (préfixe-année-numéro). La direction reste libre
  // de le remplacer.
  const dernier = derniers?.[0]?.identifiant_interne ?? "";
  const correspondance = dernier.match(/^(.*?)(\d+)$/);
  const identifiantPropose = correspondance
    ? `${correspondance[1]}${String(Number(correspondance[2]) + 1).padStart(
        correspondance[2].length,
        "0"
      )}`
    : "";

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href={`/direction/${etablissementId}/eleves`}
        className="text-sm font-medium text-bleu hover:underline"
      >
        ← Retour aux élèves
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-texte">
        Inscrire un élève
      </h1>

      {annees && annees.length > 0 ? (
        <>
          <p className="mt-1 text-sm text-texte-attenue">
            Année scolaire {annees[0].libelle}
          </p>
          <FormulaireInscription
            etablissementId={etablissementId}
            classes={classes ?? []}
            anneeScolaireId={annees[0].id}
            identifiantPropose={identifiantPropose}
            action={inscrireEleve}
          />
        </>
      ) : (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-avertissement">
          Aucune année scolaire active. Créez-en une avant d&apos;inscrire des
          élèves.
        </p>
      )}
    </main>
  );
}
