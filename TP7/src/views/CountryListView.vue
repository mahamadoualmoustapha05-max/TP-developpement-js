<template>
  <h1>Explorateur de pays</h1>

  <p class="loading" v-show="loading">Chargement des pays...</p>
  <p class="error" v-if="error">{{ error }}</p>

  <div class="toolbar">
    <input v-model="recherche" placeholder="Rechercher un pays..." />
  </div>

  <div class="grid">
    <CountryCard v-for="country in paysAffiches" :key="country.cca3" :country="country" />
  </div>
</template>

<script>
import CountryCard from '../components/CountryCard.vue'
import {
  ALL_COUNTRIES_QUERY,
  fetchCountryData,
  normalizeCountry
} from '../services/countries.js'

export default {
  name: 'CountryListView',
  components: { CountryCard },
  data() {
    return {
      countries: [],
      loading: true,
      error: null,
      recherche: ''
    }
  },
  computed: {
    paysAffiches() {
      const recherche = this.recherche.trim().toLowerCase()
      return this.countries.filter((country) =>
        country.name.common.toLowerCase().includes(recherche)
      )
    }
  },
  methods: {
    async chargerPays() {
      this.loading = true
      this.error = null
      try {
        const donnees = await fetchCountryData(ALL_COUNTRIES_QUERY)
        this.countries = donnees.countries.map(normalizeCountry)
      } catch (e) {
        this.error = `Impossible de charger les pays : ${e.message}`
      } finally {
        this.loading = false
      }
    }
  },
  mounted() {
    this.chargerPays()
  }
}
</script>
