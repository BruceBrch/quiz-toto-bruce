# Le Quiz de Toto & Bruce

Un quiz façon Kahoot, sans limite de joueurs et sans compte pour les invités.

- **`host.html`** : l'écran de l'animateur, à afficher sur la télé.
- **`index.html`** : la page des joueurs, qu'ils ouvrent en scannant le QR code.
- **`questions.js`** : les questions. Tu peux les modifier à tout moment.

---

## Étape 1 : créer la base Firebase (gratuit, environ 5 min)

1. Va sur <https://console.firebase.google.com> et connecte-toi avec un compte Google.
2. **Ajouter un projet**, nomme-le par exemple `quiz-toto-bruce`. Tu peux désactiver Google Analytics, ça ne sert pas ici.
3. Dans le menu de gauche, ouvre **Créer › Realtime Database** et clique sur **Créer une base de données**.
   - Emplacement : **Belgique (europe-west1)**.
   - Mode : **Démarrer en mode test**.
4. Dans l'onglet **Règles** de la base, remplace le contenu par celui du fichier `database.rules.json` puis clique sur **Publier**.
   Sans ça, le mode test s'arrête au bout de 30 jours.
5. Clique sur la roue dentée ⚙️ › **Paramètres du projet**. En bas, dans « Vos applications », clique sur l'icône **`</>`** (Web), donne un nom, puis **Enregistrer l'application**.
6. Firebase affiche un bloc `const firebaseConfig = { ... }`. Copie les valeurs dans **`config.js`**, par exemple :

   ```js
   export const FIREBASE_CONFIG = {
     apiKey: "AIza...",
     authDomain: "quiz-toto-bruce.firebaseapp.com",
     databaseURL: "https://quiz-toto-bruce-default-rtdb.europe-west1.firebasedatabase.app",
     projectId: "quiz-toto-bruce",
     appId: "1:1234:web:abcd",
   };
   ```

   ⚠️ La ligne **`databaseURL`** est indispensable. Si elle n'apparaît pas, c'est que la base (point 3) n'était pas encore créée : recharge la page des paramètres.

## Étape 2 : mettre en ligne sur GitHub Pages

1. Crée un compte sur <https://github.com>, puis un **nouveau dépôt** (« New repository »), par exemple `quiz-toto-bruce`, en **Public**.
2. Sur la page du dépôt, clique sur **Add file › Upload files** et glisse **tous les fichiers de ce dossier**. Clique ensuite sur **Commit changes**.
3. Va dans **Settings › Pages**. Dans « Branch », choisis **main** et **/ (root)**, puis **Save**.
4. Une à deux minutes plus tard, le site est en ligne sur :
   `https://TON-PSEUDO.github.io/quiz-toto-bruce/`

- Écran animateur : `https://TON-PSEUDO.github.io/quiz-toto-bruce/host.html`
- Les joueurs n'ont rien à taper : ils scannent le QR code affiché sur l'écran.

## Étape 3 : faire un essai avant le jour J

Ouvre `host.html` sur ton ordi, scanne le QR code avec 2 ou 3 téléphones et fais une partie complète.

> Sans Firebase configuré, le quiz tourne en **mode test local** (bandeau jaune) : ça ne marche qu'entre onglets du même navigateur. C'est pratique pour voir à quoi ça ressemble, mais pas pour jouer avec des téléphones.

---

## Le jour J

1. Branche l'ordi sur la télé et ouvre **`host.html`** en plein écran (touche F11, ou ⌃⌘F sur Mac). Mets le son.
2. Les invités scannent le QR code, ou vont sur l'adresse affichée et tapent le **PIN**.
3. Les pseudos apparaissent à l'écran. Clique sur un pseudo pour retirer quelqu'un, par exemple un nom déplacé.
4. **Commencer**. Ensuite, chaque écran a un bouton **Suivant**. La touche **Espace** ou **→** fait la même chose, ce qui marche aussi avec une télécommande de présentation.

Le déroulé, comme dans Kahoot :
- En rejoignant, chaque invité choisit **Team Bruce** ou **Team Toto**.
- Dans le lobby et pendant toute la partie, les invités peuvent envoyer des **réactions emoji** qui s'envolent sur la télé.
- La question s'affiche seule pendant 5 secondes, puis les 4 réponses apparaissent et le chrono de 20 s démarre.
- Dès que tout le monde a répondu, ou à la fin du chrono, l'écran montre la bonne réponse et le nombre de votes par réponse. Chaque téléphone affiche Bonne réponse / Raté, les points gagnés et la position du joueur.
- Pendant la partie, les téléphones n'affichent que les points gagnés sur la question : **ni score total, ni classement**.
- **À la mi-temps** (après la question 5), l'écran affiche le classement des 5 premiers et la **bataille des équipes**. Tu peux changer le moment avec `scoreboardAfter` dans `questions.js`.
- La **dernière question compte double** ⚡ et elle est annoncée avec une animation.

La grande finale, dans l'ordre :
1. 🥄 **Le classement des loosers** : les 3 derniers, révélés un par un jusqu'au roi des loosers.
2. 🏆 **L'équipe gagnante**, sur la moyenne des points par joueur.
3. 🥇 **Le podium**.
4. 🎁 **Le cadeau surprise** : le bouton « Et le gagnant remporte… » fait trembler le cadeau, puis le révèle. Rien n'est annoncé avant.
5. 🎂 **Le mot de la fin** : votre photo et « Joyeux anniversaire Toto & Bruce ».

## Les photos

Elles sont dans le dossier `images/` et se règlent dans `questions.js` (rubrique `photos`) :
- `lobby` : le diaporama pendant que les invités se connectent.
- `losers` : la photo sur l'écran des loosers. Mets `""` pour l'enlever.
- `outro` : la photo de l'écran final.
- Sur une question, `revealImage: "images/xxx.jpg"` affiche une photo au moment de la réponse.

**Points :** jusqu'à 1000 par bonne réponse selon la rapidité (minimum 500 si tu réponds juste au dernier moment), plus un bonus de série de +100 par bonne réponse d'affilée, plafonné à +500.

**Si quelque chose plante :**
- Si un joueur recharge sa page, il retrouve sa partie et ses points.
- Si l'écran animateur est rechargé, la partie reprend là où elle en était, dans le même onglet.
- **Passer** (en bas à droite pendant une question) termine la question tout de suite.

## Modifier les questions

Dans `questions.js`, chaque question ressemble à ceci :

```js
{
  q: "Comment s'appelle la fille de Bruce ?",
  answers: ["Alicia", "Alya", "Aya", "Alyssa"],
  correct: 1,          // 0 = rouge ▲, 1 = bleu ◆, 2 = jaune ●, 3 = vert ■
  image: "images/alya.jpg",   // optionnel : mets la photo dans un dossier images/
  time: 30,                   // optionnel : durée en secondes pour cette question
  double: true,               // optionnel : points doublés
},
```

Tu peux aussi ne mettre que 2 réponses (vrai/faux). Après une modification, renvoie le fichier sur GitHub (Add file › Upload files).
