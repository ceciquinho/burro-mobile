<template>
  <ion-page>
    <ion-content :fullscreen="true" class="home-screen">
      <div class="home-layout">
        <header class="home-topline"><span class="brand-mark">B.</span><span class="edition-label">MESA LOCAL · 01</span></header>
        <main class="home-hero">
          <div class="hero-copy">
            <p class="eyebrow"><span class="live-dot"></span> CARTAS NA MESA</p>
            <h1>BURRO<span class="hero-period">.</span></h1>
            <p class="hero-subtitle">Um jogo de atenção, troca e nervos tranquilos.</p>
            <div class="suit-row" aria-label="Quatro naipes"><span>♠</span><span class="red-suit">♥</span><span class="red-suit">♦</span><span>♣</span></div>
          </div>
          <div class="table-illustration" aria-hidden="true">
            <div class="table-ring"></div><div class="table-card table-card--back">♠</div>
            <div class="table-card table-card--front"><span>A</span><b>♥</b></div>
            <span class="table-chip table-chip--one">B</span><span class="table-chip table-chip--two">U</span>
            <span class="table-chip table-chip--three">R</span><span class="table-chip table-chip--four">R</span><span class="table-chip table-chip--five">O</span>
          </div>
        </main>
        <nav class="home-actions" aria-label="Menu principal">
          <ion-button class="action-primary" expand="block" router-link="/create"><ion-icon slot="start" :icon="addOutline" />Criar partida</ion-button>
          <ion-button class="action-secondary" expand="block" router-link="/join"><ion-icon slot="start" :icon="peopleOutline" />Entrar em partida</ion-button>
          <div class="home-utility-links">
            <ion-button class="action-text" fill="clear" router-link="/rules"><ion-icon slot="start" :icon="bookOutline" />Como jogar</ion-button>
            <ion-button class="action-text" fill="clear" router-link="/history"><ion-icon slot="start" :icon="timeOutline" />Histórico</ion-button>
          </div>
        </nav>
        <footer class="home-footer"><span>52 CARTAS</span><span>2—6 JOGADORES</span><span>SEM PRESSA</span></footer>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/vue'
import { addOutline, bookOutline, peopleOutline, timeOutline } from 'ionicons/icons'
</script>