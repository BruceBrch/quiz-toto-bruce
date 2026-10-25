// Les questions du quiz.
// - "correct" = numéro de la bonne réponse, en partant de 0 :
//   0 = rouge ▲, 1 = bleu ◆, 2 = jaune ●, 3 = vert ■
// - "image" (optionnel) = chemin d'une photo, ex. "images/photo1.jpg"
// - "time" (optionnel) = durée en secondes pour cette question
// - "double: true" (optionnel) = points doublés, avec annonce spéciale

export const QUIZ = {
  title: "Le Quiz de Toto & Bruce",
  subtitle: "Édition spéciale 1996 · 30 ans",
  timePerQuestion: 20,
  teams: [
    { id: "bruce", name: "Team Bruce", color: "#00c8e8" },
    { id: "toto", name: "Team Toto", color: "#ff3fa4" },
  ],
  questions: [
    {
      q: "Combien de jours séparent les anniversaires de Bruce et Toto ?",
      answers: ["15", "29", "31", "45"],
      correct: 1,
    },
    {
      q: "Comment Bruce et Toto se sont-ils connus ?",
      answers: ["À l'école", "Au club de foot", "La mère de Bruce était la nourrice de Toto", "En colo"],
      correct: 2,
    },
    {
      q: "Comment s'appellent les enfants de Toto ?",
      answers: ["Liam et Soan", "Lowen et Solan", "Lowen et Noah", "Lorenzo et Sacha"],
      correct: 1,
    },
    {
      q: "Dans quel domaine Toto lance-t-il sa boîte ?",
      answers: ["Restauration", "BTP", "Immobilier", "Nettoyage"],
      correct: 3,
    },
    {
      q: "À eux deux, combien d'années fêtent-ils ce soir ?",
      answers: ["60", "30", "15", "56"],
      correct: 0,
    },
    {
      q: "En quelle année Bruce a-t-il rejoint La Boîte Immo ?",
      answers: ["2015", "2016", "2018", "2020"],
      correct: 2,
    },
    {
      q: "Comment s'appelle la fille de Bruce ?",
      answers: ["Alicia", "Alya", "Aya", "Alyssa"],
      correct: 1,
    },
    {
      q: "Quel rappeur français sort l'album « Première consultation » en 1996 ?",
      answers: ["MC Solaar", "Booba", "Doc Gynéco", "Oxmo Puccino"],
      correct: 2,
    },
    {
      q: "Quel tube de Gala, toujours joué en soirée, sort en 1996 ?",
      answers: ["Freed from Desire", "Rhythm of the Night", "What Is Love", "Blue (Da Ba Dee)"],
      correct: 0,
    },
    {
      q: "Quel club français gagne une Coupe d'Europe en 1996 ?",
      answers: ["OM", "PSG", "Bordeaux", "Monaco"],
      correct: 1,
      double: true,
    },
  ],
};
