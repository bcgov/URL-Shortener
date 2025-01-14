// Import necessary functions from Vue Router for handling navigation
import { createRouter, createWebHistory } from 'vue-router';
// Import the Keycloak initialization function for handling authentication
import { initializeKeycloak } from '@/services/keycloak';
// Import the components (pages) to be displayed for various routes in the app
import ShortUrl from '../components/ShortUrl.vue';
import UrlSummary from '../views/UrlSummary.vue';
import UrlTable from '../components/UrlTable.vue';

// Define the routes for the application (the paths users can visit)
const routes = [
  {
    path: '/create', // This is the path the user will visit to create short URLs
    name: 'create', // A name to identify this route
    component: ShortUrl, // The component (page) to be displayed for this route
    meta: { requiresAuth: true }, // This route requires authentication
  },
  {
    path: '/url-summary/:customId', // Dynamic route where :customId is a variable in the URL
    name: 'url-summary', // A name to identify this route
    component: UrlSummary, // The component (page) to be displayed for this route
    meta: { requiresAuth: true }, // This route also requires authentication
  },
  {
    path: '/urls', // Path for viewing the list of URLs
    name: 'url-table', // Name for this route
    component: UrlTable, // The component to show the list of URLs
    meta: { requiresAuth: true }, // This route requires the user to be logged in
  },
  {
    path: '/', // The default route, which will redirect users to the '/create' page
    redirect: '/create', // Automatically redirects to the create URL page
    meta: { requiresAuth: true }, // Even this default route requires authentication
  },
  {
    path: '/:pathMatch(.*)*', // Catch-all route for any invalid URLs
    redirect: '/create', // Redirect users back to the '/create' page
    meta: { requiresAuth: true }, // This redirect also requires authentication
  },
];

// Create the router instance using the defined routes and set up browser history mode
const router = createRouter({
  history: createWebHistory(), // Use HTML5 History API to handle navigation
  routes, // Register the routes we just defined
});

// Navigation guard to handle authentication before allowing access to routes
router.beforeEach(async (to, from, next) => {
  try {
    // Initialize Keycloak to check if the user is authenticated
    const keycloak = await initializeKeycloak(); 

    // Check if the route requires authentication (via meta.requiresAuth)
    if (to.meta.requiresAuth && keycloak && !keycloak.authenticated) {
      // If not authenticated, redirect the user to the login page (using Keycloak)
      await keycloak.login({ redirectUri: window.location.origin + to.fullPath });
    } else {
      // If authenticated, or the route does not require authentication, allow navigation
      next();
    }
  } catch (error) {
    // If an error occurs during authentication or navigation, log the error
    console.error('Error during route navigation:', error);
    next(false); // Prevent navigation if there's an error
  }
});

// Export the router to be used in the main app
export default router;