import { createRouter, createWebHistory } from '@ionic/vue-router'
import HomePage from '../views/HomePage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/rules', name: 'rules', component: () => import('../views/RulesPage.vue') },
    { path: '/create', name: 'create', component: () => import('../views/CreateGamePage.vue') },
    { path: '/host', name: 'host', component: () => import('../views/HostBluetoothPage.vue') },
    { path: '/join', name: 'join', component: () => import('../views/JoinGamePage.vue') },
    { path: '/game', name: 'game', component: () => import('../views/GamePage.vue') },
    { path: '/history', name: 'history', component: () => import('../views/HistoryPage.vue') },
    { path: '/history/:id', name: 'game-details', component: () => import('../views/GameDetailsPage.vue') },
  ],
})

export default router