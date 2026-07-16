import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Chemins relatifs : l'app fonctionne aussi bien à la racine (Vercel,
  // netlify) que sous un sous-chemin (GitLab Pages, ex. .../ethiqia-multi/),
  // sans avoir à connaître le chemin exact à l'avance.
  base: './',
})
