"use server";

import { revalidatePath } from "next/cache";
import { creerClientServeur } from "@/lib/supabase/server";

export async function publierEvaluation(
  etablissementId: string,
  evaluationId: string
): Promise<void> {
  const supabase = await creerClientServeur();

  // La politique RLS "evaluations_update" vérifie déjà que l'utilisateur
  // connecté est bien direction ou enseignant de cet établissement :
  // cette action ne fait qu'exécuter la requête avec sa session. En cas
  // d'échec (droits insuffisants), la ligne reste simplement inchangée.
  await supabase
    .from("evaluations")
    .update({ valide: true, publie: true })
    .eq("id", evaluationId);

  revalidatePath(`/direction/${etablissementId}`);
}

export async function creerClasse(
  etablissementId: string,
  formData: FormData
) {
  const nom = String(formData.get("nom") ?? "").trim();
  const niveauId = String(formData.get("niveau_id") ?? "");
  const anneeScolaireId = String(formData.get("annee_scolaire_id") ?? "");

  if (!nom || !niveauId || !anneeScolaireId) {
    return { erreur: "Merci de remplir tous les champs." };
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("classes").insert({
    etablissement_id: etablissementId,
    niveau_id: niveauId,
    annee_scolaire_id: anneeScolaireId,
    nom,
  });

  if (error) {
    return { erreur: "Impossible de créer cette classe." };
  }

  revalidatePath(`/direction/${etablissementId}`);
  return { erreur: null };
}

export async function inscrireEleve(
  etablissementId: string,
  formData: FormData
) {
  const nom = String(formData.get("nom") ?? "").trim();
  const prenom = String(formData.get("prenom") ?? "").trim();
  const identifiant = String(formData.get("identifiant_interne") ?? "").trim();
  const classeId = String(formData.get("classe_id") ?? "");
  const anneeScolaireId = String(formData.get("annee_scolaire_id") ?? "");
  const dateNaissance = String(formData.get("date_naissance") ?? "");
  const sexe = String(formData.get("sexe") ?? "");

  if (!nom || !prenom || !identifiant || !classeId || !anneeScolaireId) {
    return { erreur: "Nom, prénom, identifiant et classe sont obligatoires." };
  }

  const supabase = await creerClientServeur();

  const { data: eleve, error } = await supabase
    .from("eleves")
    .insert({
      etablissement_id: etablissementId,
      identifiant_interne: identifiant,
      nom,
      prenom,
      date_naissance: dateNaissance || null,
      sexe: sexe === "M" || sexe === "F" ? sexe : null,
      classe_id: classeId,
    })
    .select("id")
    .single();

  if (error || !eleve) {
    const doublon = error?.code === "23505";
    return {
      erreur: doublon
        ? `L'identifiant ${identifiant} est déjà utilisé dans cet établissement.`
        : "Impossible d'inscrire cet élève.",
    };
  }

  await supabase.from("inscriptions").insert({
    eleve_id: eleve.id,
    classe_id: classeId,
    annee_scolaire_id: anneeScolaireId,
  });

  revalidatePath(`/direction/${etablissementId}/eleves`);
  return { erreur: null, eleveId: eleve.id };
}

/**
 * Rattache un responsable légal à un élève. Le rattachement est créé
 * NON vérifié : tant que la direction n'a pas reconnu la personne, il
 * n'ouvre aucun accès au dossier de l'enfant (c'est la politique RLS
 * qui l'impose, pas seulement cet écran).
 */
export async function rattacherResponsable(
  etablissementId: string,
  eleveId: string,
  formData: FormData
) {
  const utilisateurId = String(formData.get("utilisateur_id") ?? "");
  const lienParente = String(formData.get("lien_parente") ?? "").trim();

  if (!utilisateurId) {
    return { erreur: "Choisissez un responsable." };
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("responsables_eleves").insert({
    eleve_id: eleveId,
    utilisateur_id: utilisateurId,
    lien_parente: lienParente || null,
    verifie: false,
  });

  if (error) {
    return {
      erreur:
        error.code === "23505"
          ? "Ce responsable est déjà rattaché à cet élève."
          : "Impossible de rattacher ce responsable.",
    };
  }

  revalidatePath(`/direction/${etablissementId}/eleves/${eleveId}`);
  return { erreur: null };
}

/**
 * Marque un rattachement comme vérifié ou non. C'est ce geste — et lui
 * seul — qui ouvre au parent l'accès aux résultats de l'enfant.
 */
export async function definirVerificationResponsable(
  etablissementId: string,
  eleveId: string,
  rattachementId: string,
  verifie: boolean
): Promise<void> {
  const supabase = await creerClientServeur();
  await supabase
    .from("responsables_eleves")
    .update({ verifie })
    .eq("id", rattachementId);

  revalidatePath(`/direction/${etablissementId}/eleves/${eleveId}`);
}

/**
 * Change un élève de classe en conservant l'historique : l'inscription
 * en cours est close, une nouvelle est ouverte.
 */
export async function changerClasse(
  etablissementId: string,
  eleveId: string,
  formData: FormData
) {
  const classeId = String(formData.get("classe_id") ?? "");
  const anneeScolaireId = String(formData.get("annee_scolaire_id") ?? "");

  if (!classeId || !anneeScolaireId) {
    return { erreur: "Choisissez une classe." };
  }

  const supabase = await creerClientServeur();

  await supabase
    .from("inscriptions")
    .update({ date_fin: new Date().toISOString().slice(0, 10) })
    .eq("eleve_id", eleveId)
    .is("date_fin", null);

  const { error } = await supabase.from("inscriptions").insert({
    eleve_id: eleveId,
    classe_id: classeId,
    annee_scolaire_id: anneeScolaireId,
  });

  if (error) return { erreur: "Impossible d'enregistrer le changement." };

  await supabase.from("eleves").update({ classe_id: classeId }).eq("id", eleveId);

  revalidatePath(`/direction/${etablissementId}/eleves/${eleveId}`);
  return { erreur: null };
}
