<script setup lang="ts">
interface Column {
  key: string
  label: string
  width?: string
  align?: "left" | "center" | "right"
}

const props = defineProps<{
  columns?: Column[]
  items?: any[]
  loading?: boolean
  empty?: boolean
  emptyText?: string
  emptyMessage?: string
}>()

const emit = defineEmits<{
  (e: "row-click", item: any): void
}>()

const isEmpty = () => {
  if (props.empty !== undefined) return props.empty
  return (props.items ?? []).length === 0
}
</script>

<template>
  <div
    class="rounded-2xl overflow-hidden"
    style="
      background-color: var(--color-surface-container-lowest);
      box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
      outline: 1px solid rgba(196, 197, 213, 0.15);
    "
  >
    <table class="w-full text-left">
      <thead>
        <tr style="background-color: var(--color-surface-container-low)">
          <!-- Slot-based header -->
          <slot name="head">
            <!-- Data-driven header fallback -->
            <th
              v-for="col in props.columns ?? []"
              :key="col.key"
              class="px-6 py-5 text-xs font-bold uppercase tracking-widest"
              style="color: var(--color-outline)"
              :class="
                col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''
              "
            >
              {{ col.label }}
            </th>
          </slot>
        </tr>
      </thead>
      <tbody>
        <!-- Loading skeleton -->
        <template v-if="props.loading">
          <tr v-for="n in 5" :key="n" style="border-bottom: 1px solid rgba(196, 197, 213, 0.12)">
            <td v-for="col in (props.columns ?? [{ key: '_', label: '' }])" :key="col.key" class="px-6 py-4">
              <div
                class="h-4 rounded animate-pulse"
                style="background-color: var(--color-surface-container-high)"
                :style="{ width: Math.random() > 0.5 ? '60%' : '80%' }"
              />
            </td>
          </tr>
        </template>

        <!-- Empty state -->
        <tr v-else-if="isEmpty()">
          <td :colspan="(props.columns ?? []).length || 99" class="px-6 py-16 text-center">
            <slot name="empty">
              <p class="font-medium" style="color: var(--color-outline)">
                {{ props.emptyMessage ?? props.emptyText ?? "No se encontraron registros." }}
              </p>
            </slot>
          </td>
        </tr>

        <!-- Slot-based body -->
        <slot v-else name="body">
          <!-- Data-driven rows fallback -->
          <tr
            v-for="(item, idx) in props.items ?? []"
            :key="item.id ?? idx"
            class="group transition-colors cursor-pointer hover:bg-surface-container-low"
            style="border-bottom: 1px solid rgba(196, 197, 213, 0.12)"
            @click="emit('row-click', item)"
          >
            <td
              v-for="col in props.columns ?? []"
              :key="col.key"
              class="px-6 py-4"
              :class="
                col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''
              "
            >
              <slot :name="col.key" :item="item" :index="idx">
                {{ item[col.key] }}
              </slot>
            </td>
          </tr>
        </slot>
      </tbody>
    </table>
  </div>
</template>
