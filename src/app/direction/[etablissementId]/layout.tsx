import { exigerRole } from "@/lib/auth";
import { EnteteEtablissement } from "@/components/entete-etablissement";
import { NavigationDirection } from "./navigation-direction";

export default async function DispositionDirection({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ etablissementId: string }>;
}) {
  const { etablissementId } = await params;
  const { profil, appartenances } = await exigerRole(
    etablissementId,
    "direction"
  );
  const etablissement = appartenances.find(
    (a) => a.etablissement.id === etablissementId
  )!.etablissement;

  return (
    <div className="min-h-screen bg-fond">
      <EnteteEtablissement
        nomEtablissement={etablissement.nom}
        demo={etablissement.demo}
        role="direction"
        nomUtilisateur={profil?.nom_complet ?? ""}
      />
      <NavigationDirection etablissementId={etablissementId} />
      {children}
    </div>
  );
}
