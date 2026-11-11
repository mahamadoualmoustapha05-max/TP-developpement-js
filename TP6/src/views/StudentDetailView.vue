<template>
  <div v-if="student">
    <h1>{{ student.firstName }} {{ student.lastName }}</h1>

    <p>Filière : <input v-model.trim="student.filiere" aria-label="Filière"></p>
    <p>Année : <input v-model.number="student.year" type="number" min="1" aria-label="Année"></p>
    <p>Email : <input v-model.trim="student.email" type="email" aria-label="Email"></p>
  </div>
  <div v-else>
    <p>Étudiant introuvable.</p>
  </div>

  <router-link to="/">Retour à la liste</router-link>
</template>

<script>
import { store } from '../store/students.js'

export default {
  name: 'StudentDetailView',
  computed: {
    student() {
      return store.students.find((student) => student.id === Number(this.$route.params.id))
    }
  }
}
</script>
