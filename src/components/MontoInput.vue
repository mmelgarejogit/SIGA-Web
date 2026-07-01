<script setup lang="ts">
/**
 * Input estándar de montos (Guaraníes). Solo dígitos, con máscara de miles en vivo
 * (1.500.000). Emite un número entero (o null si está vacío). Sigue el spec de input
 * del design system: inputStyle() + h-12 + appearance-none + data-field (ring de foco).
 */
import { ref, watch } from "vue"
import { inputStyle } from "@/composables/useFieldStyles"
import { formatMiles, parseMonto } from "@/utils/money"

const props = defineProps<{
  modelValue: number | null
  hasError?: boolean
  placeholder?: string
  disabled?: boolean
  id?: string
  align?: "left" | "right"
  /** Variante densa para editores en línea / celdas (px-2 py-1, text-xs, sin alto fijo). */
  compact?: boolean
}>()

const emit = defineEmits<{ "update:modelValue": [number | null] }>()

const display = ref(formatMiles(props.modelValue))

// Resincronizar si el valor cambia desde afuera (reset de formulario, carga de datos).
watch(
  () => props.modelValue,
  (v) => {
    if (v !== parseMonto(display.value)) display.value = formatMiles(v)
  },
)

function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  const raw = el.value
  const caret = el.selectionStart ?? raw.length
  // Cantidad de dígitos a la izquierda del cursor (para reposicionarlo tras enmascarar).
  const digitsLeft = raw.slice(0, caret).replace(/\D/g, "").length

  const num = parseMonto(raw)
  display.value = formatMiles(num)
  emit("update:modelValue", num)

  // Forzar el DOM al valor enmascarado. Si el usuario teclea un carácter no numérico
  // el número no cambia, el binding :value no se re-renderiza y el carácter inválido
  // quedaría visible: lo escribimos a mano y reposicionamos el cursor.
  el.value = display.value
  let pos = 0
  let seen = 0
  while (pos < display.value.length && seen < digitsLeft) {
    if (/\d/.test(display.value[pos]!)) seen++
    pos++
  }
  el.setSelectionRange(pos, pos)
}
</script>

<template>
  <input
    :id="id"
    :value="display"
    type="text"
    inputmode="numeric"
    autocomplete="off"
    :placeholder="placeholder ?? '0'"
    :disabled="disabled"
    data-field
    class="w-full outline-none appearance-none shadow-none transition-all"
    :class="[
      compact ? 'px-2 py-1 text-xs' : 'px-4 h-12 text-sm',
      align === 'right' ? 'text-right' : '',
    ]"
    :style="inputStyle(!!hasError)"
    @input="onInput"
  />
</template>
