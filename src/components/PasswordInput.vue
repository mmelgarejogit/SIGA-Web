<script setup lang="ts">
import { ref } from "vue"
import { inputStyle } from "@/composables/useFieldStyles"

const props = defineProps<{
  modelValue: string
  placeholder?: string
  error?: boolean
}>()

defineEmits<{
  (e: "update:modelValue", value: string): void
}>()

const visible = ref(false)
</script>

<template>
  <div class="relative">
    <input
      :value="props.modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :type="visible ? 'text' : 'password'"
      :placeholder="props.placeholder"
      class="w-full pr-10 h-12 px-4 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
      :style="inputStyle(props.error)"
    />
    <button
      type="button"
      @click="visible = !visible"
      class="absolute right-3 top-1/2 -translate-y-1/2"
      style="color: var(--color-outline)"
      :title="visible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
    >
      <span class="material-symbols-outlined" style="font-size: 18px">{{ visible ? "visibility_off" : "visibility" }}</span>
    </button>
  </div>
</template>
