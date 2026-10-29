// Les questions du quiz.
// - "correct" = numéro de la bonne réponse, en partant de 0 :
//   0 = rouge ▲, 1 = bleu ◆, 2 = jaune ●, 3 = vert ■
// - "image" (optionnel) = photo affichée pendant la question, ex. "images/photo1.jpg"
// - "revealImage" (optionnel) = photo affichée au moment de la réponse
// - "time" (optionnel) = durée en secondes pour cette question
// - "double: true" (optionnel) = points doublés, avec annonce spéciale

export const QUIZ = {
  title: "Le Quiz de Toto & Bruce",
  subtitle: "Édition spéciale 1996 · 30 ans",
  timePerQuestion: 20,
  // Classement affiché à l'écran seulement après ces questions (numéros à partir de 1)
  scoreboardAfter: [11],
  photos: {
    lobby: ["images/plage.jpg", "images/palmiers.jpg", "images/soiree.jpg"], // diaporama du lobby
    losers: "images/soiree.jpg",  // écran des loosers (mets "" pour l'enlever)
    outro: "images/plage.jpg",    // écran final « Joyeux anniversaire »
  },
  teams: [
    { id: "bruce", name: "Team Bruce", color: "#00c8e8" },
    { id: "toto", name: "Team Toto", color: "#ff3fa4" },
  ],
  questions: [
    // --- Les débuts ---
    {
      q: "Combien de jours séparent les anniversaires de Bruce et Toto ?",
      answers: ["15", "29", "31", "45"],
      correct: 1,
    },
    {
      q: "Comment Bruce et Toto se sont-ils connus ?",
      answers: ["À l'école", "Au club de foot", "La mère de Bruce était la nourrice de Toto", "En colo"],
      correct: 2,
      revealImage: "images/palmiers.jpg",
    },
    {
      q: "Quel point commun Toto partage-t-il avec la maman de Bruce ?",
      answers: ["Ils ont le même signe astrologique", "Ils sont tous les deux du même mois de naissance", "Ils sont nés le même jour et le même mois"],
      correct: 2,
    },
    // --- L'enfance ---
    {
      q: "Où Bruce & Toto partaient-ils en vacances quand ils étaient petits ?",
      answers: ["Les Sables-d'Olonne", "Noirmoutier-en-l'Île", "La Tranche-sur-Mer", "Saint-Jean-de-Monts"],
      correct: 3,
    },
    {
      q: "Avec quels jouets Bruce et Toto ont-ils débarqué devant l'école primaire, provoquant la panique ?",
      answers: ["Des épées et des sabres de pirates", "Des armes en plastique", "Des pistolets à eau et des bombes à eau", "Les jouets de maman…"],
      correct: 1,
    },
    {
      q: "Quel langage inventé par Bruce et Toto durant leur enfance ont-ils utilisé pendant une bonne partie de leur vie ?",
      answers: ["Bloutchik", "Zoubalouf", "Kishpaf", "Fringalax"],
      correct: 2,
    },
    {
      q: "Pendant les soirées d'été, quelle activité insolite occupait Bruce et Toto ?",
      answers: ["Chasser les hannetons", "Courir après les chauves-souris", "Attraper des cigales à mains nues", "Faire des batailles de pistolets à eau"],
      correct: 0,
    },
    {
      q: "Qu'est-ce que Bruce et Toto attendaient impatiemment le vendredi soir à la télé ?",
      answers: ["Koh-Lanta", "Le Journal du hard", "Fear Factor", "WWE SmackDown, le catch"],
      correct: 3,
    },
    // --- L'adolescence ---
    {
      q: "Quelle musique a marqué Bruce et Toto durant leur adolescence ? 🎶",
      answers: ["Nuit de folie — Début de soirée", "Les Sunlights des tropiques — Gilbert Montagné", "Macumba — Jean-Pierre Mader", "Femme libérée — Cookie Dingler"],
      correct: 1,
    },
    {
      q: "Complète cette phrase culte entre Bruce et Toto : « Tu te rappelles là où… »",
      answers: ["… on chantait à tue-tête !", "… on mettait la musique à fond !", "… on dansait comme des fous !", "… viens danser, hé !"],
      correct: 3,
    },
    {
      q: "Quel morceau Bruce et Toto se prennent-ils pour les interprètes quand ils rappent ensemble ?",
      answers: ["Patrimoine du ghetto — Mac Tyer feat. Kery James", "Le Même Sang — Sinik feat. Diam's", "Maman ne le sait pas — Ninho & Niska", "Ma grosse — Orelsan & Nessbeal"],
      correct: 0,
    },
    {
      q: "Quelle musique Bruce a-t-il traduite sur YouTube, cumulant plusieurs centaines de milliers de vues ?",
      answers: ["Femme Like U — K-Maro", "Dernière danse — Kyo", "Leçon particulière — Slaï", "Confessions nocturnes — Diam's et Vitaa"],
      correct: 2,
    },
    // --- La vie dans le Sud ---
    {
      q: "Avec quelle voiture Toto a-t-il parcouru 800 km pour venir s'installer dans le Sud ?",
      answers: ["Une Volkswagen Golf VI", "Une Peugeot 206", "Une Renault Clio III", "Une Renault Twingo"],
      correct: 3,
    },
    {
      q: "Quel était le rituel de fin de soirée de Bruce, Toto et leurs femmes lors de leurs premières soirées dans le Sud ?",
      answers: ["Un after en boîte", "Une session karaoké", "Un barbecue improvisé", "Une partie de jeux de société"],
      correct: 1,
      revealImage: "images/soiree.jpg",
    },
    // --- Aujourd'hui ---
    {
      q: "Dans quel domaine Toto lance-t-il sa boîte ?",
      answers: ["Restauration", "BTP", "Immobilier", "Nettoyage"],
      correct: 3,
    },
    {
      q: "En quelle année Bruce a-t-il rejoint La Boîte Immo ?",
      answers: ["2015", "2016", "2018", "2020"],
      correct: 2,
    },
    {
      q: "Comment s'appellent les enfants de Toto ?",
      answers: ["Liam et Soan", "Lowen et Solan", "Lowen et Noah", "Lorenzo et Sacha"],
      correct: 1,
    },
    {
      q: "Comment s'appelle la fille de Bruce ?",
      answers: ["Alicia", "Alya", "Aya", "Alyssa"],
      correct: 1,
    },
    {
      q: "À eux deux, combien d'années fêtent-ils ce soir ?",
      answers: ["60", "30", "15", "56"],
      correct: 0,
      revealImage: "images/plage.jpg",
    },
    // --- Spécial 1996 ---
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
