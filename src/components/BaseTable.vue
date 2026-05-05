<script setup lang="ts">
interface Column {
  key: string
  label: string
  width?: string
  align?: "left" | "center" | "right"
}

const props = defineProps<{
  columns: Column[]
  items: any[]
  loading?: boolean
  emptyText?: string
}>()

const emit = defineEmits<{
  (e: "row-click", item: any): void
}>()
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
          <th
            v-for="col in props.columns"
            :key="col.key"
            class="px-6 py-5 text-xs font-bold uppercase tracking-widest"
            style="color: var(--color-outline)"
            :class="
              col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''
            "
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- Loading skeleton -->
        <template v-if="props.loading">
          <tr v-for="n in 5" :key="n" style="border-bottom: 1px solid rgba(196, 197, 213, 0.12)">
            <td v-for="col in props.columns" :key="col.key" class="px-6 py-4">
              <div
                class="h-4 rounded animate-pulse"
                style="background-color: var(--color-surface-container-high)"
                :style="{ width: Math.random() > 0.5 ? '60%' : '80%' }"
              />
            </td>
          </tr>
        </template>

        <!-- Empty state -->
        <tr v-else-if="props.items.length === 0">
          <td :colspan="props.columns.length" class="px-6 py-16 text-center">
            <p class="font-medium" style="color: var(--color-outline)">
              {{ props.emptyText ?? "No se encontraron registros." }}
            </p>
          </td>
        </tr>

        <!-- Data rows -->
        <tr
          v-for="(item, idx) in props.items"
          :key="item.id ?? idx"
          class="group transition-colors cursor-pointer hover:bg-surface-container-low"
          style="border-bottom: 1px solid rgba(196, 197, 213, 0.12)"
          @click="emit('row-click', item)"
        >
          <td
            v-for="col in props.columns"
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
      </tbody>
    </table>
  </div>
</template>
