<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  placeholder?: string
  error?: boolean
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void
  (e: "blur", evt: FocusEvent): void
}>()

function clear() {
  emit("update:modelValue", "")
}
</script>

<template>
  <div class="relative">
    <span
      class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2"
      style="font-size: 18px; color: var(--color-outline)"
    >
      search
    </span>
    <input
      :value="props.modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="emit('blur', $event)"
      type="text"
      :placeholder="props.placeholder ?? 'Buscar...'"
      class="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all"
      :style="
        props.error
          ? 'background-color: #FFF8F7; border: 1.5px solid var(--color-error); color: var(--color-on-surface);'
          : 'background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-outline-variant); color: var(--color-on-surface);'
      "
    />
    <button
      v-if="props.modelValue"
      @click="clear"
      class="absolute right-3 top-1/2 -translate-y-1/2"
      style="color: var(--color-outline)"
    >
      <span class="material-symbols-outlined" style="font-size: 18px"> close </span>
    </button>
  </div>
</template>
