<script setup lang="ts">
import { onMounted, onUnmounted } from "vue"

const props = defineProps<{
  show: boolean
  title?: string
  size?: "sm" | "md" | "lg" | "xl"
}>()

const emit = defineEmits<{
  (e: "close"): void
}>()

const sizeClasses: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.show) {
    emit("close")
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="props.show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- overlay -->
        <div
          class="absolute inset-0"
          style="background-color: rgba(24, 28, 32, 0.5)"
          @click.self="emit('close')"
        />

        <!-- panel -->
        <div
          class="relative w-full rounded-3xl overflow-hidden"
          :class="sizeClasses[props.size ?? 'lg']"
          style="
            background-color: var(--color-surface-container-lowest);
            box-shadow: 0 24px 64px rgba(0, 40, 142, 0.18);
          "
        >
          <!-- header -->
          <div
            v-if="props.title"
            class="flex items-center justify-between px-8 pt-8 pb-6"
            style="border-bottom: 1px solid rgba(196, 197, 213, 0.2)"
          >
            <h3
              class="text-xl font-extrabold"
              style="font-family: var(--font-headline); color: var(--color-primary)"
            >
              {{ props.title }}
            </h3>
            <button
              class="p-1 rounded-full transition-colors"
              style="color: var(--color-outline)"
              @click="emit('close')"
            >
              <span class="material-symbols-outlined" style="font-size: 22px"> close </span>
            </button>
          </div>

          <!-- body -->
          <div class="px-8 py-6 max-h-[70vh] overflow-y-auto">
            <slot />
          </div>

          <!-- footer -->
          <div
            v-if="$slots.footer"
            class="px-8 py-6 flex justify-end gap-3"
            style="border-top: 1px solid rgba(196, 197, 213, 0.2)"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
