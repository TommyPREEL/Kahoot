# CLAUDE.md — BlitzQuiz

Quiz multijoueur temps réel (un host projette, les joueurs répondent sur mobile). Monorepo npm sans workspaces : `client/` (React 18 + Vite + TS) et `server/` (Express + Socket.IO + TS). Pas de base de données : salles en mémoire côté serveur, quiz sauvegardés dans le `localStorage` du host.

> Le `CLAUDE.md` du dossier parent (AnimeMasters) ne s'applique PAS à ce projet. Ignorer ses règles (spec, ledger, PostgreSQL, Better Auth...).

## Commandes

```bash
npm run install:all     # installe racine + server + client
npm run dev             # server :3650 + client :3600
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit
cd server && npm test   # tests d'intégration Socket.IO (démarre un vrai serveur)
```
Pas de lint configuré. Toujours lancer les deux `tsc --noEmit` avant de déclarer une tâche finie.

## Carte du code

- `server/src/index.ts` — handlers Socket.IO (création, join, reconnexion, pause, kick, leave, disconnect).
- `server/src/GameEngine.ts` — cycle d'une question, scoring, pause/reprise, construction des payloads.
- `server/src/RoomManager.ts` — stockage des salles, jetons, helpers.
- `server/src/validateQuiz.ts` — reconstruit le quiz reçu du client champ par champ (ne jamais faire confiance au client).
- `client/src/App.tsx` — routage par `view` + abonnement aux événements socket.
- `client/src/session.ts` — session host/joueur en `localStorage` (jetons de reconnexion).
- `client/src/quizFile.ts` — export/import JSON des questionnaires.
- `client/src/components/{host,player,shared}` — écrans. Styles : `client/src/styles/global.css` (tokens dans `:root`).

Les types sont dupliqués entre `server/src/types.ts` et `client/src/types.ts` : modifier les deux ensemble.

## Règles

1. **Serveur autoritaire.** Timer, score, bonne réponse, état de la partie : décidés côté serveur. Le client n'affiche que ce qu'il reçoit.
2. **Ne jamais envoyer `isCorrect` / `sliderCorrect` au joueur** avant la fin de la question (`questionStartPayload` les retire).
3. **Reconnexion par jeton, jamais par pseudo.** `playerToken` / `hostToken` sont rendus à la création et exigés pour reprendre une place.
4. **Déconnexion du host = pause**, pas suppression : la salle survit `HOST_GRACE_MS` (5 min). Le host reprend la partie explicitement.
5. Valider toute entrée socket (`typeof`, bornes) ; un quiz importé passe par la même validation que la création.
6. Aléatoire de sécurité (codes de salle, jetons) : `crypto`, pas `Math.random`.

## Design

- Pas de « look IA » : pas d'emojis comme icônes (SVG inline ou texte), pas de glassmorphism, pas de dégradés violets génériques, pas de copie de l'identité visuelle de Kahoot.
- Couleurs, rayons, ombres : uniquement via les tokens CSS de `global.css`. Préférer une classe CSS à un `style={{}}` répété.
- Les 4 réponses se distinguent par couleur **et** forme/lettre (daltonisme). Cibles tactiles ≥ 44 px, focus visible, `prefers-reduced-motion` respecté.
- Écrans host lisibles sur projecteur ; écrans joueur testés à 360 px de large.

## Façon de travailler

- Chercher (`grep`) avant de lire ; lire des plages ciblées ; éditer par diffs, sans reformater un fichier entier.
- Pas de nouvelle dépendance si le navigateur ou Node le fait déjà (drag & drop, fichiers, crypto).
- Toute modification d'un événement socket : mettre à jour serveur, client, et le test d'intégration correspondant.
- Commits Conventional Commits (`feat(host): ...`), petits. Ne pas committer sans demande.
- Réponse finale courte : ce qui a changé, ce qui a été vérifié, ce qui reste ouvert.
