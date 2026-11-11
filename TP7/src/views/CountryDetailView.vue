<template>
  <p class="loading" v-show="loading">Chargement...</p>
  <p class="error" v-if="error">{{ error }}</p>

  <div v-if="country">
    <img :src="country.flags.svg" :alt="`Drapeau ${country.name.common}`" style="width: 200px;" />
    <h1>{{ country.name.common }}</h1>
    <p>Nom officiel : {{ country.name.official }}</p>
    <p>Capitale : {{ country.capital ? country.capital[0] : '—' }}</p>
    <p>Région : {{ country.region }}</p>
    <p>Population : non disponible avec cette API</p>
  </div>

  <button @click="$router.back()">Retour</button>
</template>

<script>
import {
  COUNTRY_BY_CODE_QUERY,
  fetchCountryData,
  normalizeCountry
} from '../services/countries.js'

export default {
  name: 'CountryDetailView',
  data() {
    return {
      country: null,
      loading: true,
      error: null
    }
  },
  methods: {
    async chargerPays() {
      this.loading = true
      this.error = null
      this.country = null
      try {
        const donnees = await fetchCountryData(COUNTRY_BY_CODE_QUERY, {
          code: this.$route.params.code
        })
        if (!donnees.country) throw new Error('Pays introuvable')
        this.country = normalizeCountry(donnees.country)
      } catch (e) {
        this.error = `Impossible de charger les informations du pays : ${e.message}`
      } finally {
        this.loading = false
      }
    }
  },
  watch: {
    '$route.params.code'() {
      this.chargerPays()
    }
  },
  mounted() {
    this.chargerPays()
  }
}
</script>
