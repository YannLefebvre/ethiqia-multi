# Éthiq·IA — Mode Session Multi-joueurs

Jeu sérieux sur l'éthique de l'IA, mode session synchronisé en temps réel.

## Flux de jeu

```
Accueil → Créer ou Rejoindre une session
    ↓
Salle d'attente (code partagé, attente des joueurs)
    ↓
Phase 1 — Vote individuel (timer 10s de réflexion par carte)
    ↓
Phase 2 — Concertation (votes révélés, discussion)
    ↓
Phase 3 — Vote collectif (timer 10s, égalité = les deux validés)
    ↓
Bilan (désaccords, revirements, stats globales toutes sessions)
```

## Installation

```bash
npm install
npm run dev
```

## Setup Supabase (une seule fois)

1. Aller dans votre projet Supabase → SQL Editor
2. Coller le contenu de `supabase_setup.sql` et exécuter
3. Vérifier dans Table Editor que les 4 tables existent :
   - `sessions`
   - `players`
   - `votes_indiv`
   - `votes_collectif`
4. Dans Database → Replication, activer Realtime sur les 4 tables

## Déploiement

```bash
npm run build
# Déployer le dossier dist/ sur Vercel ou GitHub Pages
```

## Architecture technique

- **Frontend** : React + Vite
- **Backend** : Supabase (PostgreSQL + Realtime WebSockets)
- **Synchronisation** : Supabase Realtime (abonnements postgres_changes)
- **Pas de serveur** : tout est client + BaaS

## Statistiques du bilan

### Par session
- **Désaccord** : % de divergence entre joueurs sur chaque carte (0% = unanime, 100% = partagé 50/50)
- **Revirement** : carte où la majorité individuelle ≠ vote collectif final
- **Égalité** : vote collectif 50/50 → les deux options validées

### Toutes sessions (onglet global)
- **Polarisation** : même calcul sur l'agrégat de toutes les sessions → identifie les cartes universellement clivantes
- Nombre de sessions et total de votes par carte
