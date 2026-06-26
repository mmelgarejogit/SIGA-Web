<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps<{
  modelValue: boolean
  label: string
  confirmMessage?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const showConfirm = ref(false)
const pendingValue = ref(false)

watch(() => props.modelValue, () => {
  showConfirm.value = false
})

function requestToggle() {
  pendingValue.value = !props.modelValue
  showConfirm.value = true
}

function confirm() {
  emit('update:modelValue', pendingValue.value)
  showConfirm.value = false
}

function cancel() {
  showConfirm.value = false
}

function defaultMessage() {
  return pendingValue.value ? '¿Confirmar activación?' : '¿Confirmar desactivación?'
}
</script>

<template>
  <div style="border-radius: var(--radius-md); overflow: hidden; background-color: var(--color-surface-container-low)">

    <!-- Fila principal -->
    <div class="flex items-center justify-between px-4 py-3">
      <span class="text-sm font-semibold" style="color: var(--color-on-surface-variant)">
        {{ label }}
      </span>
      <button
        type="button"
        role="switch"
        :aria-checked="modelValue"
        @click="requestToggle"
        class="relative flex-shrink-0 transition-colors duration-200"
        style="width: 44px; height: 24px; border-radius: var(--radius-xs);"
        :style="modelValue
          ? 'background-color: var(--color-primary);'
          : 'background-color: var(--color-outline-variant);'"
      >
        <span
          class="absolute bg-white transition-all duration-200"
          style="top: 4px; width: 16px; height: 16px; border-radius: 3px;"
          :style="modelValue ? 'left: 24px;' : 'left: 4px;'"
        ></span>
      </button>
    </div>

    <!-- Panel de confirmación -->
    <Transition name="confirm">
      <div
        v-if="showConfirm"
        class="px-4 pb-3 pt-2.5"
        style="border-top: 1px solid var(--color-hairline);"
      >
        <div class="flex items-start gap-2 mb-3">
          <span class="material-symbols-outlined flex-shrink-0 mt-px"
                style="font-size: 16px; color: var(--color-outline)">info</span>
          <p class="text-xs font-medium leading-relaxed" style="color: var(--color-on-surface-variant)">
            {{ confirmMessage ?? defaultMessage() }}
          </p>
        </div>
        <div class="flex gap-2 justify-end">
          <BaseButton variant="secondary" size="sm" @click="cancel">Cancelar</BaseButton>
          <BaseButton variant="primary" size="sm" @click="confirm">Confirmar</BaseButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.confirm-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.confirm-leave-active {
  transition: opacity 0.12s ease, transform 0.1s ease;
}
.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
