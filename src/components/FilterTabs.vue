<script setup lang="ts">
interface Tab {
  label: string
  value: string
}

const props = defineProps<{
  tabs: Tab[]
  modelValue: string
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void
}>()

function select(value: string) {
  emit("update:modelValue", value)
}
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap">
    <button
      v-for="tab in props.tabs"
      :key="tab.value"
      @click="select(tab.value)"
      class="px-6 py-2 rounded-full text-sm font-semibold transition-all"
      :class="
        props.modelValue === tab.value
          ? 'bg-primary text-on-primary'
          : 'bg-surface-container-high text-on-surface-variant'
      "
    >
      {{ tab.label }}
    </button>
  </div>
</template>
