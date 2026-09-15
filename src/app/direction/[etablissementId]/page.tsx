import { exigerRole } from "@/lib/auth";
import { creerClientServeur } from "@/lib/supabase/server";
import { publierEvaluation, creerClasse } from "./actions";
import { FormulaireCreerClasse } from "./formulaire-creer-classe";

export default async function PageDirection({
  params,
}: {
  params: Promise<{ etablissementId: string }>;
}) {
  const { etablissementId } = await params;
  await exigerRole(etablissementId, "direction");

  const supabase = await creerClientServeur();

  const [
    { data: classes },
    { count: nbEleves },
    { data: enseignants },
    { data: evaluationsEnAttente },
    { data: devoirsRecents },
    { data: annonces },
    { data: niveaux },
    { data: anneesScolaires },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id, nom, niveau:niveaux(nom), eleves(count)")
      .eq("etablissement_id", etablissementId),
    supabase
      .from("eleves")
      .select("id", { count: "exact", head: true })
      .eq("etablissement_id", etablissementId)
      .eq("statut", "actif"),
    supabase
      .from("appartenances")
      .select("utilisateur_id, profil:profils(nom_complet)")
      .eq("etablissement_id", etablissementId)
      .eq("role", "enseignant"),
    supabase
      .from("evaluations")
      .select("id, titre, periode, classe:classes(nom), matiere:matieres(nom)")
      .eq("etablissement_id", etablissementId)
      .eq("publie", false)
      .order("date_evaluation", { ascending: false }),
    supabase
      .from("devoirs")
      .select("id, titre, date_echeance, classe:classes(nom), matiere:matieres(nom)")
      .eq("etablissement_id", etablissementId)
      .order("date_publication", { ascending: false })
      .limit(5),
    supabase
      .from("annonces")
      .select("id, titre, contenu, cible, publie_le")
      .eq("etablissement_id", etablissementId)
      .order("publie_le", { ascending: false })
      .limit(5),
    supabase.from("niveaux").select("id, nom").eq("etablissement_id", etablissementId),
    supabase
      .from("annees_scolaires")
      .select("id, libelle")
      .eq("etablissement_id", etablissementId)
      .eq("active", true),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-texte">
          Vue d&apos;ensemble
        </h1>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Carte titre="Élèves actifs" valeur={nbEleves ?? 0} />
          <Carte titre="Classes" valeur={classes?.length ?? 0} />
          <Carte titre="Enseignants" valeur={enseignants?.length ?? 0} />
          <Carte
            titre="Évaluations à publier"
            valeur={evaluationsEnAttente?.length ?? 0}
            accent
          />
        </div>

        <section className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-texte">Classes</h2>
            <div className="flex flex-col gap-2">
              {classes?.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-bordure bg-fond-carte px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-texte">{c.nom}</p>
                    <p className="text-sm text-texte-attenue">
                      {(c.niveau as unknown as { nom: string } | null)?.nom}
                    </p>
                  </div>
                  <span className="text-sm text-texte-attenue">
                    {(c.eleves as unknown as { count: number }[])?.[0]
                      ?.count ?? 0}{" "}
                    élève(s)
                  </span>
                </div>
              ))}
              {classes?.length === 0 && (
                <p className="text-sm text-texte-attenue">
                  Aucune classe pour le moment.
                </p>
              )}
            </div>

            {niveaux && niveaux.length > 0 && anneesScolaires && anneesScolaires.length > 0 && (
              <FormulaireCreerClasse
                etablissementId={etablissementId}
                niveaux={niveaux}
                anneeScolaireId={anneesScolaires[0].id}
                creerClasseAction={creerClasse}
              />
            )}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-texte">
              Évaluations en attente de publication
            </h2>
            <div className="flex flex-col gap-2">
              {evaluationsEnAttente?.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-xl border border-bordure bg-fond-carte px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-texte">{ev.titre}</p>
                    <p className="text-sm text-texte-attenue">
                      {(ev.classe as unknown as { nom: string } | null)?.nom}{" "}
                      · {(ev.matiere as unknown as { nom: string } | null)?.nom} ·{" "}
                      {ev.periode}
                    </p>
                  </div>
                  <form
                    action={publierEvaluation.bind(
                      null,
                      etablissementId,
                      ev.id
                    )}
                  >
                    <button
                      type="submit"
                      className="rounded-lg bg-vert px-3 py-1.5 text-sm font-semibold text-white hover:bg-vert-fonce"
                    >
                      Publier
                    </button>
                  </form>
                </div>
              ))}
              {evaluationsEnAttente?.length === 0 && (
                <p className="text-sm text-texte-attenue">
                  Rien en attente : toutes les évaluations saisies sont
                  publiées.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-texte">
              Devoirs récents
            </h2>
            <div className="flex flex-col gap-2">
              {devoirsRecents?.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-bordure bg-fond-carte px-4 py-3"
                >
                  <p className="font-medium text-texte">{d.titre}</p>
                  <p className="text-sm text-texte-attenue">
                    {(d.classe as unknown as { nom: string } | null)?.nom} ·{" "}
                    {(d.matiere as unknown as { nom: string } | null)?.nom} ·
                    échéance {new Date(d.date_echeance).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              ))}
              {devoirsRecents?.length === 0 && (
                <p className="text-sm text-texte-attenue">Aucun devoir.</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-texte">
              Annonces récentes
            </h2>
            <div className="flex flex-col gap-2">
              {annonces?.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-bordure bg-fond-carte px-4 py-3"
                >
                  <p className="font-medium text-texte">{a.titre}</p>
                  <p className="text-sm text-texte-attenue">{a.contenu}</p>
                </div>
              ))}
              {annonces?.length === 0 && (
                <p className="text-sm text-texte-attenue">Aucune annonce.</p>
              )}
            </div>
          </div>
        </section>
    </main>
  );
}

function Carte({
  titre,
  valeur,
  accent,
}: {
  titre: string;
  valeur: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-bordure bg-fond-carte p-4">
      <p className="text-sm text-texte-attenue">{titre}</p>
      <p
        className={`mt-1 text-3xl font-bold ${accent ? "text-avertissement" : "text-bleu"}`}
      >
        {valeur}
      </p>
    </div>
  );
}
