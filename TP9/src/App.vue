<!--
  TP9 -- Meteo en direct.
  Le gabarit est cable sur les donnees et la logique reseau est implementee
  dans les methodes et la computed de la partie script.
-->
<template>
  <div class="app">
    <header class="topbar">
      <h1>Météo en direct</h1>
      <button class="unit-toggle" @click="basculerUnite" v-if="ville">
        Afficher en {{ unite === 'metric' ? '°F' : '°C' }}
      </button>
    </header>

    <div class="search">
      <input
        v-model="query"
        @input="onInputRecherche"
        type="text"
        placeholder="Rechercher une ville... (ex: Safi, Paris, Tokyo)"
      />
      <p class="hint" v-if="chargementSuggestions">Recherche...</p>
      <p class="msg-error" v-if="erreurSuggestions">{{ erreurSuggestions }}</p>

      <ul class="suggestions" v-if="suggestions.length">
        <li v-for="s in suggestions" :key="s.lat + '-' + s.lon" @click="choisirVille(s)">
          {{ s.name }}<span v-if="s.state">, {{ s.state }}</span> ({{ s.country }})
        </li>
      </ul>
    </div>

    <div class="historique" v-if="historique.length">
      <span>Récent :</span>
      <button v-for="h in historique" :key="h.lat + '-' + h.lon" @click="choisirVille(h)">
        {{ h.name }}
      </button>
    </div>

    <div class="meteo" v-if="ville">
      <p class="loading" v-if="chargementMeteo">Chargement de la météo...</p>
      <p class="msg-error" v-else-if="erreurMeteo">{{ erreurMeteo }}</p>

      <div v-else-if="meteoActuelle" class="courante">
        <h2>{{ ville.name }}, {{ ville.country }}</h2>
        <div class="temp-actuelle">
          <img :src="iconeUrl(meteoActuelle.weather[0].icon)" :alt="meteoActuelle.weather[0].description" />
          <span class="valeur">{{ Math.round(meteoActuelle.main.temp) }}°</span>
          <span class="description">{{ meteoActuelle.weather[0].description }}</span>
        </div>
        <p class="details">
          Ressenti {{ Math.round(meteoActuelle.main.feels_like) }}° · Humidité {{ meteoActuelle.main.humidity }}%
        </p>
      </div>

      <div class="previsions" v-if="previsionsParJour.length">
        <div class="jour" v-for="j in previsionsParJour" :key="j.date">
          <span class="date">{{ j.date }}</span>
          <img :src="iconeUrl(j.icone)" :alt="j.description" />
          <span class="temps">{{ Math.round(j.min) }}° / {{ Math.round(j.max) }}°</span>
        </div>
      </div>
    </div>

    <p class="empty" v-if="!ville">Cherchez une ville pour voir sa météo.</p>
  </div>
</template>

<script>
// La cle est lue depuis .env (jamais committee -- voir .env.example et le sujet).
const API_KEY = import.meta.env.VITE_OWM_API_KEY
const GEO_URL = 'https://api.openweathermap.org/geo/1.0/direct'
const WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather'
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast'

export default {
  name: 'App',
  data() {
    return {
      query: '',
      debounceTimer: null,
      rechercheRequestId: 0,
      suggestions: [],
      chargementSuggestions: false,
      erreurSuggestions: null,

      ville: null, // { name, country, state, lat, lon }
      historique: [],
      villeChoisieManuellement: false,

      meteoActuelle: null,
      previsions: [], // tableau brut renvoye par /forecast (tranches de 3h)
      chargementMeteo: false,
      erreurMeteo: null,
      meteoRequestId: 0,

      unite: 'metric' // 'metric' (°C) | 'imperial' (°F)
    }
  },
  mounted() {
    this.chargerHistorique()

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (this.villeChoisieManuellement) return

          this.ville = {
            name: 'Ma position',
            country: '',
            lat: coords.latitude,
            lon: coords.longitude
          }
          this.chargerMeteo()
        },
        (erreur) => {
          console.info(`Géolocalisation indisponible : ${erreur.message}`)
          if (!this.villeChoisieManuellement && this.historique.length) {
            this.choisirVille(this.historique[0])
          }
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      )
    } else if (this.historique.length) {
      this.choisirVille(this.historique[0])
    }
  },
  computed: {
    // Regroupe les tranches par date et retient l'icône la plus proche de midi.
    previsionsParJour() {
      const jours = {}

      for (const tranche of this.previsions) {
        const date = tranche.dt_txt.slice(0, 10)
        const heure = Number(tranche.dt_txt.slice(11, 13))
        const distanceMidi = Math.abs(heure - 12)

        if (!jours[date]) {
          jours[date] = {
            date,
            min: tranche.main.temp_min,
            max: tranche.main.temp_max,
            icone: tranche.weather[0].icon,
            description: tranche.weather[0].description,
            distanceMidi
          }
          continue
        }

        const jour = jours[date]
        jour.min = Math.min(jour.min, tranche.main.temp_min)
        jour.max = Math.max(jour.max, tranche.main.temp_max)
        if (distanceMidi < jour.distanceMidi) {
          jour.icone = tranche.weather[0].icon
          jour.description = tranche.weather[0].description
          jour.distanceMidi = distanceMidi
        }
      }

      return Object.values(jours)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(({ distanceMidi, ...jour }) => jour)
    }
  },
  methods: {
    iconeUrl(code) {
      return `https://openweathermap.org/img/wn/${code}@2x.png`
    },

    // Attend la fin de la saisie avant de lancer une recherche.
    onInputRecherche() {
      clearTimeout(this.debounceTimer)
      this.rechercheRequestId += 1
      this.erreurSuggestions = null
      this.chargementSuggestions = false

      if (!this.query.trim()) {
        this.suggestions = []
        return
      }

      this.debounceTimer = setTimeout(() => {
        this.rechercherVilles()
      }, 400)
    },

    // Recherche les villes et distingue les erreurs HTTP des résultats vides.
    async rechercherVilles() {
      const recherche = this.query.trim()
      if (!recherche) {
        this.suggestions = []
        return
      }

      const requestId = ++this.rechercheRequestId
      this.chargementSuggestions = true
      this.erreurSuggestions = null

      try {
        if (!API_KEY || API_KEY === 'votre_cle_ici') {
          throw new Error('Clé API absente. Ajoutez VITE_OWM_API_KEY dans votre fichier .env.')
        }

        const url = `${GEO_URL}?q=${encodeURIComponent(recherche)}&limit=5&appid=${API_KEY}`
        const reponse = await fetch(url)

        if (reponse.status === 401) {
          throw new Error('Clé API invalide ou absente.')
        }
        if (reponse.status === 429) {
          throw new Error('Quota API dépassé. Veuillez réessayer plus tard.')
        }
        if (!reponse.ok) {
          throw new Error(`Erreur du service de géocodage (HTTP ${reponse.status}).`)
        }

        const villes = await reponse.json()
        if (requestId !== this.rechercheRequestId || this.query.trim() !== recherche) return

        this.suggestions = villes
        if (villes.length === 0) {
          this.erreurSuggestions = 'Aucune ville trouvée pour cette recherche.'
        }
      } catch (erreur) {
        if (requestId === this.rechercheRequestId && this.query.trim() === recherche) {
          this.suggestions = []
          this.erreurSuggestions = erreur instanceof TypeError
            ? 'Impossible de contacter OpenWeatherMap. Vérifiez votre connexion.'
            : erreur instanceof Error ? erreur.message : 'Une erreur inattendue est survenue.'
        }
      } finally {
        if (requestId === this.rechercheRequestId && this.query.trim() === recherche) {
          this.chargementSuggestions = false
        }
      }
    },

    chargerHistorique() {
      try {
        const sauvegarde = localStorage.getItem('tp9-historique-meteo')
        if (!sauvegarde) return

        const villes = JSON.parse(sauvegarde)
        if (!Array.isArray(villes)) {
          console.error('Historique météo ignoré : le format enregistré est invalide.')
          return
        }

        this.historique = villes
          .filter((ville) =>
            ville &&
            typeof ville.name === 'string' &&
            typeof ville.country === 'string' &&
            Number.isFinite(ville.lat) &&
            Number.isFinite(ville.lon)
          )
          .slice(0, 5)
      } catch (erreur) {
        console.error('Impossible de charger l’historique météo depuis le stockage local.', erreur)
      }
    },

    // Sélectionne une ville et l'ajoute à l'historique persistant.
    choisirVille(ville) {
      clearTimeout(this.debounceTimer)
      this.rechercheRequestId += 1
      this.villeChoisieManuellement = true
      this.query = ''
      this.suggestions = []
      this.chargementSuggestions = false
      this.erreurSuggestions = null
      this.ville = ville
      this.historique = [
        ville,
        ...this.historique.filter((element) => element.lat !== ville.lat || element.lon !== ville.lon)
      ].slice(0, 5)
      try {
        localStorage.setItem('tp9-historique-meteo', JSON.stringify(this.historique))
      } catch (erreur) {
        console.error('Impossible d’enregistrer l’historique météo dans le stockage local.', erreur)
      }
      this.chargerMeteo()
    },

    // Charge météo et prévisions en parallèle pour la ville et l'unité courantes.
    async chargerMeteo() {
      if (!this.ville) return

      const { lat, lon } = this.ville
      const unite = this.unite
      const requestId = ++this.meteoRequestId
      this.chargementMeteo = true
      this.erreurMeteo = null
      this.meteoActuelle = null
      this.previsions = []

      try {
        if (!API_KEY || API_KEY === 'votre_cle_ici') {
          throw new Error('Clé API absente. Ajoutez VITE_OWM_API_KEY dans votre fichier .env.')
        }

        const parametres = `lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${unite}&lang=fr`
        const [reponseMeteo, reponsePrevisions] = await Promise.all([
          fetch(`${WEATHER_URL}?${parametres}`),
          fetch(`${FORECAST_URL}?${parametres}`)
        ])

        for (const reponse of [reponseMeteo, reponsePrevisions]) {
          if (reponse.status === 401) throw new Error('Clé API invalide ou absente.')
          if (reponse.status === 429) throw new Error('Quota API dépassé. Veuillez réessayer plus tard.')
          if (!reponse.ok) throw new Error(`Erreur du service météo (HTTP ${reponse.status}).`)
        }

        const [meteo, previsions] = await Promise.all([
          reponseMeteo.json(),
          reponsePrevisions.json()
        ])

        if (
          requestId !== this.meteoRequestId ||
          this.ville.lat !== lat ||
          this.ville.lon !== lon ||
          this.unite !== unite
        ) return

        if (this.ville.name === 'Ma position') {
          this.ville = {
            ...this.ville,
            name: meteo.name || 'Ma position',
            country: meteo.sys?.country || ''
          }
        }
        this.meteoActuelle = meteo
        this.previsions = previsions.list
      } catch (erreur) {
        if (
          requestId === this.meteoRequestId &&
          this.ville.lat === lat &&
          this.ville.lon === lon &&
          this.unite === unite
        ) {
          this.erreurMeteo = erreur instanceof TypeError
            ? 'Impossible de contacter OpenWeatherMap. Vérifiez votre connexion.'
            : erreur instanceof Error ? erreur.message : 'Une erreur inattendue est survenue.'
        }
      } finally {
        if (
          requestId === this.meteoRequestId &&
          this.ville.lat === lat &&
          this.ville.lon === lon &&
          this.unite === unite
        ) {
          this.chargementMeteo = false
        }
      }
    },

    // Change l'unité demandée à l'API puis recharge les données météo.
    basculerUnite() {
      if (!this.ville) return
      this.unite = this.unite === 'metric' ? 'imperial' : 'metric'
      this.chargerMeteo()
    }
  }
}
</script>
