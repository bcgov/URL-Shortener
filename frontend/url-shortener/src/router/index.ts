// Import necessary functions from Vue Router for handling navigation
import { createRouter, createWebHistory } from 'vue-router';
import ShortUrl from '../components/ShortUrl.vue';
import UrlSummary from '../views/UrlSummary.vue';
import UrlTable from '../components/UrlTable.vue';

// Define the routes
const routes = [
  {
    path: '/create',
    name: 'create',
    component: ShortUrl,
    meta: { requiresAuth: true },
  },
  {
    path: '/url-summary/:customId',
    name: 'url-summary',
    component: UrlSummary,
    meta: { requiresAuth: true },
  },
  {
    path: '/urls',
    name: 'url-table',
    component: UrlTable,
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    redirect: '/create',
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/create',
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Export the router
export default router;
