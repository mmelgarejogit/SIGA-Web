<script setup lang="ts">
const props = defineProps<{
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "default" | "lg"
  disabled?: boolean
  type?: "button" | "submit" | "reset"
}>()

const variantClasses: Record<string, string> = {
  primary: "bg-primary text-on-primary shadow-[var(--shadow-primary)]",
  secondary: "bg-surface-container-high text-on-surface-variant",
  danger: "bg-error text-on-error",
  ghost: "bg-transparent text-on-surface-variant hover:bg-surface-container-high",
}

const sizeClasses: Record<string, string> = {
  sm: "px-5 h-10 text-sm",
  default: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-sm",
}
</script>

<template>
  <button
    :type="props.type ?? 'button'"
    :disabled="props.disabled"
    class="flex items-center justify-center gap-2 rounded-full font-bold transition-all active:scale-95 disabled:opacity-60"
    :class="[variantClasses[props.variant ?? 'primary'], sizeClasses[props.size ?? 'default']]"
  >
    <slot />
  </button>
</template>
