<script setup>
import { computed } from "vue";
import { parseAssistantMessage } from "../config/assistantFormat.js";

const props = defineProps({
  content: { type: String, default: "" },
});

const blocks = computed(() => parseAssistantMessage(props.content));

function chartLabel(block) {
  return block.bars.map((bar) => `${bar.label} ${bar.value}`).join(", ");
}
</script>

<template>
  <div class="assistant-message">
    <template v-for="(block, index) in blocks" :key="index">
      <p v-if="block.type === 'paragraph'" class="assistant-message__p">
        <template v-for="(part, partIndex) in block.inlines" :key="partIndex">
          <strong v-if="part.strong">{{ part.text }}</strong>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>

      <ul v-else-if="block.type === 'list' && !block.ordered" class="assistant-message__list">
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <template v-for="(part, partIndex) in item" :key="partIndex">
            <strong v-if="part.strong">{{ part.text }}</strong>
            <template v-else>{{ part.text }}</template>
          </template>
        </li>
      </ul>

      <ol v-else-if="block.type === 'list'" class="assistant-message__list">
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <template v-for="(part, partIndex) in item" :key="partIndex">
            <strong v-if="part.strong">{{ part.text }}</strong>
            <template v-else>{{ part.text }}</template>
          </template>
        </li>
      </ol>

      <div v-else-if="block.type === 'table'" class="assistant-message__table-wrap">
        <table class="assistant-message__table">
          <thead>
            <tr>
              <th
                v-for="(header, headerIndex) in block.headers"
                :key="`${index}-h-${headerIndex}`"
                :style="{ textAlign: block.align[headerIndex] }"
              >
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in block.rows" :key="`${index}-r-${rowIndex}`">
              <td
                v-for="(cell, cellIndex) in row"
                :key="`${index}-${rowIndex}-${cellIndex}`"
                :style="{ textAlign: block.align[cellIndex] }"
              >
                {{ cell }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-else-if="block.type === 'chart'"
        class="assistant-message__chart"
        role="img"
        :aria-label="chartLabel(block)"
      >
        <div v-for="bar in block.bars" :key="bar.label" class="assistant-message__bar">
          <span class="assistant-message__bar-label">{{ bar.label }}</span>
          <span class="assistant-message__track">
            <span class="assistant-message__fill" :style="{ width: `${bar.width}%` }" />
          </span>
          <span class="assistant-message__bar-value">{{ bar.value }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.assistant-message__p {
  margin: 0;
}

.assistant-message__p + .assistant-message__list,
.assistant-message__p + .assistant-message__table-wrap,
.assistant-message__p + .assistant-message__chart {
  margin-top: 8px;
}

.assistant-message__list {
  margin: 0;
  padding-left: 1.15rem;
}

.assistant-message__list li + li {
  margin-top: 4px;
}

.assistant-message {
  min-width: 0;
  max-width: 100%;
}

.assistant-message__table-wrap {
  max-width: 100%;
  overflow-x: auto;
}

.assistant-message__table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
  line-height: 1.35;
}

.assistant-message__table th,
.assistant-message__table td {
  white-space: nowrap;
}

.assistant-message__table th:first-child,
.assistant-message__table td:first-child {
  white-space: normal;
  min-width: 8.5rem;
  max-width: 11rem;
}

.assistant-message__table th {
  padding: 0 8px 6px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.assistant-message__table td {
  padding: 7px 8px 7px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  vertical-align: top;
}

.assistant-message__table td:first-child {
  font-weight: 500;
}

.assistant-message__table tr:last-child td {
  border-bottom: 0;
  padding-bottom: 0;
}

.assistant-message__chart {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.assistant-message__bar {
  display: grid;
  grid-template-columns: minmax(5.5rem, 7.5rem) minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  font-size: 0.8125rem;
}

.assistant-message__bar-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assistant-message__track {
  display: block;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.1);
}

.assistant-message__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: rgb(var(--v-theme-primary));
}

.assistant-message__bar-value {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
</style>
