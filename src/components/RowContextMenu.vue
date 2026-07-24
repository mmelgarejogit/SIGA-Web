<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue"

export type ContextMenuItem =
  | { type: "item"; label: string; icon: string; action: () => void; danger?: boolean; hidden?: boolean }
  | { type: "separator" }

defineProps<{ items: ContextMenuItem[] }>()

const open = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const btnRef = ref<HTMLElement | null>(null)
const menuPos = ref<Record<string, string>>({ top: "0px", left: "0px" })

const MENU_WIDTH = 180

async function toggle() {
  if (!open.value && btnRef.value) {
    const rect = btnRef.value.getBoundingClientRect()
    const gap = 4
    const left = Math.max(4, rect.right - MENU_WIDTH)
    // Se abre hacia abajo por defecto; una vez renderizado se mide el alto real
    // y se voltea hacia arriba si el menú se saldría por el borde inferior.
    menuPos.value = { top: `${rect.bottom + gap}px`, left: `${left}px` }
    open.value = true
    await nextTick()
    const menuH = menuRef.value?.offsetHeight ?? 0
    const overflowBelow = rect.bottom + gap + menuH > window.innerHeight
    const fitsAbove = rect.top - gap - menuH > 0
    if (overflowBelow && fitsAbove) {
      menuPos.value = { top: `${rect.top - gap - menuH}px`, left: `${left}px` }
    }
    return
  }
  open.value = !open.value
}

function handleClickOutside(e: MouseEvent) {
  if (
    menuRef.value && !menuRef.value.contains(e.target as Node) &&
    btnRef.value && !btnRef.value.contains(e.target as Node)
  ) {
    open.value = false
  }
}

function runAction(item: ContextMenuItem) {
  if (item.type === "item") {
    item.action()
    open.value = false
  }
}

onMounted(() => document.addEventListener("mousedown", handleClickOutside))
onUnmounted(() => document.removeEventListener("mousedown", handleClickOutside))
</script>

<template>
  <div style="position: relative; display: inline-flex" @click.stop>
    <button
      ref="btnRef"
      type="button"
      @click.stop="toggle"
      class="ctx-trigger"
      :class="{ active: open }"
      aria-label="Más acciones"
      :aria-expanded="open"
    >
      <span class="material-symbols-outlined" style="font-size: 20px">more_vert</span>
    </button>

    <Transition name="ctx">
      <div v-if="open" ref="menuRef" class="ctx-menu" role="menu" :style="menuPos">
        <template v-for="(item, i) in items" :key="i">
          <div v-if="item.type === 'separator'" class="ctx-sep"></div>
          <button
            v-else-if="!item.hidden"
            type="button"
            class="ctx-item"
            :class="{ danger: item.danger }"
            role="menuitem"
            @click="runAction(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">{{ item.icon }}</span>
            {{ item.label }}
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ctx-trigger {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-xs);
  border: none;
  background: transparent;
  color: var(--color-outline);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.ctx-trigger:hover,
.ctx-trigger.active {
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
}

.ctx-menu {
  position: fixed;
  z-index: 9999;
  background: var(--color-surface-container-lowest);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: 4px;
  min-width: 180px;
  box-shadow: var(--shadow-md);
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  font-size: 13px;
  font-family: inherit;
  color: var(--color-on-surface);
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}
.ctx-item:hover {
  background: var(--color-surface-container-high);
}
.ctx-item.danger {
  color: var(--color-error);
}
.ctx-item.danger:hover {
  background: var(--color-error-container);
}
.ctx-item .material-symbols-outlined {
  color: var(--color-outline);
}
.ctx-item.danger .material-symbols-outlined {
  color: var(--color-error);
}

.ctx-sep {
  height: 1px;
  background: var(--color-outline-variant);
  margin: 4px 0;
  opacity: 0.4;
}

.ctx-enter-active,
.ctx-leave-active {
  transition: opacity 0.12s, transform 0.12s;
}
.ctx-enter-from,
.ctx-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
</style>
