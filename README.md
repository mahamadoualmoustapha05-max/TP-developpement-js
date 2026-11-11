# Travaux pratiques JavaScript

## TP6 — Annuaire d'étudiants

Application Vue de gestion et de consultation d'un annuaire d'étudiants.

```powershell
cd TP6
npm install
npm run dev
```

## TP7 — Explorateur de pays

Application Vue de recherche et de consultation de pays.

```powershell
cd TP7
npm install
npm run dev
```

## TP9 — Météo en direct

Application Vue météo avec recherche de villes via OpenWeatherMap.

```powershell
cd TP9
npm install
Copy-Item .env.example .env
```

Ajoutez votre clé OpenWeatherMap à `VITE_OWM_API_KEY` dans `.env`, puis lancez :

```powershell
npm run dev
```

Ne publiez jamais le fichier `.env` ni une clé API. Il est ignoré par Git.
