<template>
  <router-link :to="`/pays/${country.code}`" class="country-card">
    <img :src="country.flags.svg" :alt="`Drapeau ${country.name.common}`" />
    <h3>{{ country.name.common }}</h3>
    <p>{{ country.capital ? country.capital[0] : '—' }}</p>
    <p>{{ country.region }}</p>
  </router-link>
</template>

<script>
export default {
  name: 'CountryCard',
  props: {
    country: { type: Object, required: true }
  }
}
</script>
