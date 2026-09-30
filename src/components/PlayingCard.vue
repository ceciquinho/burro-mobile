<template>
  <button
    class="playing-card"
    :class="[{ 'playing-card--red': red, 'playing-card--selected': selected }, `playing-card--${size}`]"
    :aria-label="`${rankLabel} de ${suitLabel}${selected ? ', selecionada' : ''}`"
    :aria-pressed="selected"
    :disabled="disabled"
    @click="$emit('select')"
  >
    <span class="playing-card__corner"><b>{{ rankLabel }}</b><span>{{ suitSymbol }}</span></span>
    <span class="playing-card__center">{{ suitSymbol }}</span>
    <span class="playing-card__corner playing-card__corner--bottom"><b>{{ rankLabel }}</b><span>{{ suitSymbol }}</span></span>
  </button>
</template>

<script setup lang="ts">
import type { Card } from '../game/types'

const props = withDefaults(defineProps<{ card: Card; selected?: boolean; disabled?: boolean; size?: 'regular' | 'compact' }>(), {
  selected: false,
  disabled: false,
  size: 'regular',
})

defineEmits<{ select: [] }>()

const rankLabel = props.card.rank === 'A' ? 'A' : props.card.rank
const suitSymbol = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' }[props.card.suit]
const suitLabel = { clubs: 'paus', diamonds: 'ouros', hearts: 'copas', spades: 'espadas' }[props.card.suit]
const red = props.card.suit === 'hearts' || props.card.suit === 'diamonds'
</script>