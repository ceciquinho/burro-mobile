<template>
  <ion-page>
    <ion-header class="page-header"><ion-toolbar><ion-buttons slot="start"><ion-back-button default-href="/history" text="" /></ion-buttons><ion-title>Detalhes</ion-title></ion-toolbar></ion-header>
    <ion-content class="page-content">
      <div v-if="record" class="page-shell details-shell">
        <p class="eyebrow">{{ record.date }} · {{ record.time }}</p><h1 class="page-title">{{ record.winner }} venceu<span class="hero-period">.</span></h1>
        <div class="detail-result"><span class="result-symbol"><ion-icon :icon="trophyOutline" /></span><div><span>JOGADOR PENALIZADO</span><strong>{{ record.penalized }}</strong></div></div>
        <section class="detail-section"><h2>Participantes</h2><ion-list class="detail-list" lines="none"><ion-item v-for="player in record.players" :key="player.id" class="detail-row"><span class="player-avatar-small" slot="start">{{ player.name.charAt(0).toLocaleUpperCase() }}</span><ion-label>{{ player.name }}</ion-label><span class="detail-letters" slot="end">{{ player.letters.join(' ') || '—' }}</span></ion-item></ion-list></section>
        <section class="detail-section"><h2>Resumo</h2><div class="detail-pair"><span>Trocas concluídas</span><b>{{ record.rounds }}</b></div><div class="detail-pair"><span>Jogadores</span><b>{{ record.players.length }}</b></div><div class="detail-pair"><span>Motivo do encerramento</span><b>{{ record.reason }}</b></div></section>
      </div>
      <div v-else class="page-shell empty-state"><span class="empty-mark">?</span><h2>Partida não encontrada.</h2><ion-button class="action-secondary" router-link="/history">Voltar ao histórico</ion-button></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar, IonButton } from '@ionic/vue'
import { trophyOutline } from 'ionicons/icons'
import { historyRepository, type HistoryRecord } from '../database/historyRepository'

const route = useRoute()
const record = ref<HistoryRecord>()

onMounted(async () => { record.value = await historyRepository.get(String(route.params.id)) })
</script>