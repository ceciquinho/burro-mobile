<template>
  <ion-page>
    <ion-header class="page-header"><ion-toolbar><ion-buttons slot="start"><ion-back-button default-href="/" text="" /></ion-buttons><ion-title>Nova partida</ion-title></ion-toolbar></ion-header>
    <ion-content class="page-content create-content">
      <section class="create-hero">
        <div class="create-hero__copy">
          <p class="create-kicker"><span class="create-kicker__dot"></span> PREPARAR A MESA</p>
          <h1>Quem vem<br />pra mesa<span>.</span></h1>
          <p>Uma mão de quatro cartas para cada pessoa.</p>
        </div>
        <div class="create-hero__cards" aria-hidden="true">
          <span class="create-playing-card create-playing-card--back">♣</span>
          <span class="create-playing-card create-playing-card--front"><b>4</b><span>♠</span></span>
          <i class="seat-dot seat-dot--one"></i><i class="seat-dot seat-dot--two"></i><i class="seat-dot seat-dot--three"></i>
        </div>
        <span class="create-hero__index">NOVA PARTIDA · 01</span>
      </section>

      <div class="page-shell create-shell">
        <section class="create-step" aria-labelledby="table-size-title">
          <header class="create-section-heading">
            <span class="create-step-number">01</span>
            <div><h2 id="table-size-title">Tamanho da mesa</h2><p>Quantas pessoas vão jogar?</p></div>
            <span class="create-count">{{ names.length }} LUGARES</span>
          </header>
          <ion-segment v-model="playerCount" class="player-count-segment" aria-label="Número de jogadores">
            <ion-segment-button v-for="count in [2, 3, 4, 5, 6]" :key="count" :value="String(count)">
              <ion-label>{{ count }}</ion-label>
            </ion-segment-button>
          </ion-segment>
        </section>

        <section class="create-step roster-step" aria-labelledby="roster-title">
          <header class="create-section-heading create-section-heading--roster">
            <span class="create-step-number">02</span>
            <div><h2 id="roster-title">Quem está jogando?</h2><p>A ordem define a volta da mesa.</p></div>
          </header>
          <ion-list class="name-list roster-list" lines="none">
            <ion-item v-for="(_, index) in names" :key="index" class="name-row roster-row">
              <span class="player-number" :class="{ 'player-number--host': index === 0 }" slot="start">{{ String(index + 1).padStart(2, '0') }}</span>
              <ion-input v-model="names[index]" :label="index === 0 ? 'ANFITRIÃO' : `JOGADOR ${String(index + 1).padStart(2, '0')}`" label-placement="stacked" :placeholder="index === 0 ? 'Seu nome' : 'Nome do jogador'" :maxlength="24" />
              <ion-icon v-if="index === 0" class="host-marker" :icon="sparklesOutline" slot="end" aria-label="Anfitrião" />
            </ion-item>
          </ion-list>
        </section>

        <div class="create-submit-area">
          <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
          <ion-button class="action-primary form-submit" expand="block" @click="createGame">Distribuir as cartas <ion-icon slot="end" :icon="arrowForwardOutline" /></ion-button>
          <ion-button class="action-secondary bluetooth-submit" expand="block" router-link="/host"><ion-icon slot="start" :icon="bluetoothOutline" />Hospedar por Bluetooth</ion-button>
          <p class="form-note"><span class="deal-note-mark">4</span> Baralho embaralhado. Quatro cartas por jogador.</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonPage, IonSegment, IonSegmentButton, IonTitle, IonToolbar } from '@ionic/vue'
import { arrowForwardOutline, bluetoothOutline, sparklesOutline } from 'ionicons/icons'
import { startLocalGame } from '../communication/gameSession'

const router = useRouter()
const playerCount = ref('2')
const names = ref(['', ''])
const errorMessage = ref('')

watch(playerCount, (count) => {
  names.value = Array.from({ length: Number(count) }, (_, index) => names.value[index] ?? '')
})

function createGame(): void {
  const normalized = names.value.map((name) => name.trim())
  if (normalized.some((name) => !name) || new Set(normalized.map((name) => name.toLocaleLowerCase())).size !== normalized.length) {
    errorMessage.value = 'Preencha todos os nomes sem repetir.'
    return
  }
  try {
    startLocalGame(normalized.map((name, index) => ({ id: `player-${index + 1}`, name })))
    void router.push('/game')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível iniciar a partida.'
  }
}
</script>