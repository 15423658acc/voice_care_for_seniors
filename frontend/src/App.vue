<script setup>
</script>

<template>
  <div height="60px" width="60px">

    <router-link to="/">Home</router-link>
    <router-link to="/reminder">reminder</router-link>
    <router-link to="/emergency">emergency</router-link>
    <router-link to="/weather">weather</router-link>
    <router-view/>

</div>
</template>

<style scoped>
a {
  display: block;
  margin: 1rem;
  font-size: 1.2rem;
  text-decoration: none;
  color: #333;
}
</style>
