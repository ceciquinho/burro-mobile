<template>
  <ion-page>
    <ion-header class="page-header game-header">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/" text="" /></ion-buttons>
        <ion-title>Mesa {{ displayRound.toString().padStart(2, '0') }}</ion-title>
        <span class="live-label" slot="end"><span class="live-dot"></span> AO VIVO</span>
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content game-content">
      <div class="game-shell">
        <template v-if="state.phase !== 'finished'">
          <section class="turn-heading">
            <p class="eyebrow">RODADA {{ displayRound }}</p>
            <h1>{{ state.currentPlayerName }}<span class="hero-period">.</span></h1>
            <p v-if="isHandoff" class="turn-caption">Passe o aparelho para continuar.</p>
            <p v-else-if="isWaiting" class="turn-caption">Aguardando {{ state.currentPlayerName }} jogar no próprio aparelho.</p>
            <p v-else-if="state.phase === 'exchange'" class="turn-caption">Escolha uma carta para passar à próxima pessoa.</p>
            <p v-else class="turn-caption">Hora de conferir a sua mão.</p>
          </section>

          <section class="players-strip" aria-label="Jogadores e penalidades">
            <div v-for="player in state.players" :key="player.id" class="player-token" :class="{ 'player-token--current': player.isCurrent }">
              <span class="player-avatar">{{ player.name.charAt(0).toLocaleUpperCase() }}</span>
              <span class="player-token__name">{{ player.name }}</span>
              <span class="letter-track" :aria-label="`${player.letterCount} de 5 letras`">
                <i v-for="(letter, index) in letterSlots(player.letters)" :key="index" :class="{ 'letter-filled': letter }">{{ letter || '·' }}</i>
              </span>
              <span v-if="player.hasSelected" class="selected-mark">ESCOLHEU</span>
            </div>
          </section>

          <section class="hand-section" aria-label="Sua mão">
            <header class="section-heading"><span>SUA MÃO</span><span>{{ state.hand.length }} CARTAS</span></header>
            <p v-if="isHandoff" class="private-note">Mão oculta durante a passagem do aparelho.</p>
            <p v-else class="private-note">Visível apenas neste aparelho para {{ viewerName }}</p>
            <div v-if="!isHandoff" class="hand-cards">
              <PlayingCard v-for="card in state.hand" :key="card.id" :card="card" :selected="selectedCardId === card.id" :disabled="isWaiting || state.phase !== 'exchange' || state.hasSelected || actionPending" @select="toggleCard(card.id)" />
            </div>
          </section>

          <div class="game-action-area">
            <div v-if="isHandoff" class="handoff-panel">
              <p>Próxima vez: <strong>{{ state.currentPlayerName }}</strong></p>
              <ion-button class="action-primary" expand="block" @click="passDevice">Passar aparelho <ion-icon slot="end" :icon="arrowForwardOutline" /></ion-button>
            </div>
            <div v-else-if="isWaiting" class="status-note"><span class="selection-seal">…</span> Aguardando a jogada de {{ state.currentPlayerName }}.</div>
            <template v-else-if="state.phase === 'exchange'">
              <div v-if="state.hasSelected" class="status-note"><span class="selection-seal">✓</span> Escolha reservada. Aguarde a mesa.</div>
              <ion-button v-else class="action-primary" expand="block" :disabled="!selectedCardId || actionPending" @click="submitCard">{{ actionPending ? 'Enviando…' : 'Reservar esta carta' }} <ion-icon slot="end" :icon="arrowForwardOutline" /></ion-button>
            </template>
            <template v-else>
              <ion-button v-if="state.canDeclareFour" class="action-primary action-declare" expand="block" :disabled="actionPending" @click="declareFour">Declarar quatro iguais <ion-icon slot="end" :icon="sparklesOutline" /></ion-button>
              <ion-button v-else class="action-secondary" expand="block" :disabled="actionPending" @click="passTurn">{{ actionPending ? 'Enviando…' : 'Não tenho quatro iguais' }} <ion-icon slot="end" :icon="arrowForwardOutline" /></ion-button>
            </template>
            <p v-if="message" class="form-error" role="alert">{{ message }}</p>
          </div>
        </template>

        <section v-else class="result-panel">
          <span class="result-symbol"><ion-icon :icon="trophyOutline" /></span>
          <p class="eyebrow">PARTIDA ENCERRADA</p>
          <h1>{{ playerName(state.winnerId) }} venceu<span class="hero-period">.</span></h1>
          <p class="result-description"><strong>{{ playerName(state.penalizedPlayerId) }}</strong> completou BURRO.</p>
          <div class="result-summary"><span>{{ state.rounds }} trocas</span><span>{{ state.players.length }} jogadores</span></div>
          <p class="result-reason">{{ state.endReason }}</p>
          <ion-button class="action-primary" expand="block" router-link="/history">Ver histórico <ion-icon slot="end" :icon="arrowForwardOutline" /></ion-button>
          <ion-button class="action-text" fill="clear" expand="block" router-link="/">Voltar ao início</ion-button>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { arrowForwardOutline, sparklesOutline, trophyOutline } from 'ionicons/icons'
import PlayingCard from '../components/PlayingCard.vue'
import { getActiveGameResult, getActiveTransport, getActiveViewerId, hasSavedActiveGame, markActiveGameSaved, setActiveViewerId } from '../communication/gameSession'
import type { PlayerGameView } from '../game/types'
import { historyRepository } from '../database/historyRepository'

const router = useRouter()
const transport = (() => {
  try { return getActiveTransport() } catch { void router.replace('/'); return null }
})()
const viewerId = ref(transport ? getActiveViewerId() : '')
const state = ref<PlayerGameView>(transport ? transport.getState(viewerId.value) : {
  id: '', phase: 'finished', players: [], hand: [], viewerId: '', currentPlayerId: '', currentPlayerName: '', rounds: 0, canDeclareFour: false, hasSelected: false,
})
const selectedCardId = ref('')
const message = ref('')
const actionPending = ref(false)
let unsubscribeState: (() => void) | undefined
const viewerName = computed(() => state.value.players.find((player) => player.id === viewerId.value)?.name ?? '')
const isHandoff = computed(() => transport?.role === 'local' && state.value.phase !== 'finished' && viewerId.value !== state.value.currentPlayerId)
const isWaiting = computed(() => transport?.role !== 'local' && state.value.phase !== 'finished' && viewerId.value !== state.value.currentPlayerId)
const displayRound = computed(() => Math.max(1, state.value.rounds + (state.value.phase === 'exchange' ? 1 : 0)))

onMounted(() => { unsubscribeState = transport?.subscribe(refresh) })
onUnmounted(() => unsubscribeState?.())

function refresh(): void {
  if (!transport) return
  try { state.value = transport.getState(viewerId.value) } catch { return }
  if (state.value.phase === 'finished') void saveResult()
}

function toggleCard(cardId: string): void {
  if (state.value.hasSelected || isHandoff.value) return
  selectedCardId.value = selectedCardId.value === cardId ? '' : cardId
}

async function submitCard(): Promise<void> {
  if (!transport || !selectedCardId.value) return
  actionPending.value = true
  try {
    await transport.selectCard(viewerId.value, selectedCardId.value)
    selectedCardId.value = ''
    message.value = ''
    refresh()
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Não foi possível reservar a carta.'
  } finally {
    actionPending.value = false
  }
}

async function passTurn(): Promise<void> {
  if (!transport) return
  actionPending.value = true
  try {
    await transport.passDeclaration(viewerId.value)
    message.value = ''
    refresh()
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Não foi possível passar a vez.'
  } finally {
    actionPending.value = false
  }
}

async function declareFour(): Promise<void> {
  if (!transport) return
  actionPending.value = true
  try {
    await transport.declareFourOfAKind(viewerId.value)
    message.value = ''
    refresh()
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Não foi possível declarar.'
  } finally {
    actionPending.value = false
  }
}

function passDevice(): void {
  if (transport?.role !== 'local') return
  try {
    setActiveViewerId(state.value.currentPlayerId)
    viewerId.value = state.value.currentPlayerId
    selectedCardId.value = ''
    message.value = ''
    refresh()
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Não foi possível trocar o jogador.'
  }
}

async function saveResult(): Promise<void> {
  if (hasSavedActiveGame()) return
  const result = getActiveGameResult()
  if (!result) return
  await historyRepository.save(result)
  markActiveGameSaved()
}

function letterSlots(letters: string[]): string[] {
  return Array.from({ length: 5 }, (_, index) => letters[index] ?? '')
}

function playerName(id?: string): string {
  return state.value.players.find((player) => player.id === id)?.name ?? 'Jogador'
}
</script>