<script setup lang="ts">
import { ref, onMounted } from "vue"

defineProps<{
  eyebrow: string
  title: string
  subtitle?: string
}>()

// Dispara la secuencia de "enfoque" (desenfoque → nítido) al montar.
const focused = ref(false)
onMounted(() => {
  requestAnimationFrame(() => requestAnimationFrame(() => (focused.value = true)))
})
</script>

<template>
  <section class="auth-hero hidden md:flex md:w-[55%] relative overflow-hidden">
    <!-- Anillos de refracción + punto focal -->
    <div class="rings" :class="{ focused }" aria-hidden="true">
      <svg class="rings-svg" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="auth-focal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#76dcff" stop-opacity="0.5" />
            <stop offset="42%" stop-color="#006780" stop-opacity="0.16" />
            <stop offset="100%" stop-color="#006780" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="300" cy="300" r="300" fill="url(#auth-focal)" stroke="none" />
        <circle cx="300" cy="300" r="286" />
        <circle cx="300" cy="300" r="232" />
        <circle cx="300" cy="300" r="180" />
        <circle cx="300" cy="300" r="130" />
        <circle cx="300" cy="300" r="84" class="ring-focal" />
      </svg>
    </div>

    <!-- Contenido emergiendo del foco -->
    <div class="hero-content" :class="{ focused }">
      <span class="eyebrow">{{ eyebrow }}</span>
      <h1 class="hero-title">{{ title }}</h1>
      <p v-if="subtitle" class="hero-sub">{{ subtitle }}</p>
    </div>

    <!-- Marca -->
    <div class="hero-brand" :class="{ focused }">
      <span class="brand-tick" aria-hidden="true"></span>
      Centro Óptico Santa María
    </div>
  </section>
</template>

<style scoped>
.auth-hero {
  align-items: center;
  justify-content: center;
  color: #fff;
  background: radial-gradient(125% 125% at 50% 38%, #173bab 0%, #00288e 52%, #001a5e 100%);
}

/* ── Anillos ───────────────────────────────────────────────── */
.rings {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(1.1);
  filter: blur(16px);
  transition:
    opacity 1.2s var(--ease-standard),
    transform 1.5s var(--ease-standard),
    filter 1.3s var(--ease-standard);
}
.rings.focused {
  opacity: 1;
  transform: scale(1);
  filter: blur(0);
}
.rings-svg {
  width: 96%;
  height: 96%;
  max-width: 720px;
  overflow: visible;
}
.rings-svg circle {
  fill: none;
  stroke: rgba(255, 255, 255, 0.13);
  stroke-width: 1;
}
.rings-svg .ring-focal {
  stroke: rgba(118, 220, 255, 0.5);
  stroke-width: 1.5;
}

/* ── Contenido ─────────────────────────────────────────────── */
.hero-content {
  position: relative;
  z-index: 1;
  max-width: 30rem;
  padding: 3rem;
  opacity: 0;
  filter: blur(12px);
  transform: translateY(10px);
  transition:
    opacity 0.9s 0.35s var(--ease-standard),
    filter 1s 0.35s var(--ease-standard),
    transform 0.9s 0.35s var(--ease-standard);
}
.hero-content.focused {
  opacity: 1;
  filter: blur(0);
  transform: none;
}

.eyebrow {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: #76dcff;
  margin-bottom: 1.6rem;
}
.hero-title {
  font-family: var(--font-headline);
  font-weight: 800;
  font-size: clamp(2.75rem, 4.8vw, 4.5rem);
  line-height: 0.98;
  letter-spacing: -0.035em;
  text-wrap: balance;
}
.hero-sub {
  margin-top: 1.35rem;
  max-width: 23rem;
  font-size: 1.05rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.72);
}

/* ── Marca (pie) ───────────────────────────────────────────── */
.hero-brand {
  position: absolute;
  left: 3rem;
  bottom: 2.5rem;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  opacity: 0;
  transition: opacity 0.8s 0.7s var(--ease-standard);
}
.hero-brand.focused {
  opacity: 1;
}
.brand-tick {
  width: 1.75rem;
  height: 1px;
  background: #76dcff;
}

@media (prefers-reduced-motion: reduce) {
  .rings,
  .hero-content,
  .hero-brand {
    transition: none;
    opacity: 1;
    filter: none;
    transform: none;
  }
}
</style>
