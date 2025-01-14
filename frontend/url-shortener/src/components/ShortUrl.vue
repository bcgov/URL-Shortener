<template>
  <div>
    <div class="url-shortener">
      <!-- Page Heading -->
      <h1 class="form-heading">Short URL Form</h1>
      
      <!-- Form for Shortening URL -->
      <form @submit.prevent="submitForm">
        <div class="input-group">
          <!-- Target URL Input -->
          <div class="input-container">
            <label for="targetURL">Target URL:</label>
            <!-- Input field for the URL to shorten -->
            <input v-model="targetUrl" placeholder="Enter URL to shorten" :disabled="formSubmitted" />
            <!-- Display validation error if the URL is invalid -->
            <span class="error" v-if="!isValidUrl(targetUrl) && targetUrl">
              Please enter a valid URL (e.g., http://example.com)
            </span>
          </div>

          <!-- Expiry Date Input -->
          <div class="input-container">
            <label for="expiryDate">Expiry Date (Optional):</label>
            <!-- Input field for expiry date of the short URL -->
            <input 
              type="date" 
              id="expiryDate" 
              v-model="expiryDate" 
              placeholder="Choose Expiry Date" 
              :disabled="formSubmitted" 
              :min="getTodayDate()" 
            />
            <!-- Display validation error if the selected date is in the past -->
            <span class="error" v-if="isPastDate(expiryDate) && expiryDate">
              Expiry date cannot be set in the past
            </span>
          </div>


          <!-- Notes Input -->
          <div class="input-container">
            <label for="description">Notes (Optional):</label>
            <!-- Input field for adding additional notes -->
            <textarea v-model="description" placeholder="Enter Notes" :disabled="formSubmitted"></textarea>
          </div>

          <!-- Submit Button -->
          <button type="submit" :disabled="isSubmitting || formSubmitted">
            <!-- Button text changes based on form state -->
            {{ isSubmitting || formSubmitted ? 'Processing...' : 'Create Short URL' }}
          </button>
        </div>
      </form>

      <!-- Success Message (shown after form submission) -->
      <div v-if="formSubmitted && !error">
        <p class="success-message">Form submitted successfully! Redirecting to the summary page...</p>
      </div>

      <!-- Error Message (shown if an error occurs) -->
      <div v-if="error" class="error-message">
        <p><strong>Error:</strong> {{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'; // Import reactive refs
import axios from 'axios'; // For API requests
import { useRouter } from 'vue-router'; // For navigation
import { useUserStore } from '@/stores/userStore'; // Access user authentication data
import dayjs from 'dayjs'; // Import dayjs
import utc from 'dayjs/plugin/utc'; // UTC plugin for dayjs
import timezone from 'dayjs/plugin/timezone'; // Timezone plugin for dayjs

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Reactive variables for form data
const targetUrl = ref(''); // Holds the target URL
const description = ref(''); // Holds the notes/description
const expiryDate = ref(''); // Holds the expiry date (optional)
const customId = ref(''); // Holds the generated custom ID
const shortenedUrl = ref(''); // Holds the shortened URL
const error = ref(''); // Holds any error messages
const isSubmitting = ref(false); // Indicates if the form is being submitted
const formSubmitted = ref(false); // Indicates if the form has been successfully submitted

// Environment variables
const frontendURL = import.meta.env.VITE_FRONTEND_URL; // Frontend base URL
const backendURL = import.meta.env.VITE_BACKEND_URL; // Backend API base URL

const userStore = useUserStore(); // Access the user store
const router = useRouter(); // Router instance for navigation

// Form submission logic
const submitForm = async () => {
  isSubmitting.value = true; // Mark form as submitting

  try {
    const currentTime = dayjs().tz(dayjs.tz.guess()); // Get current time in user's timezone

    let expiryDateUTC = null;
    if (expiryDate.value) {
      // Convert the expiry date to the end of the selected day in the user's timezone
      expiryDateUTC = dayjs(expiryDate.value)
        .endOf('day') // Set to end of day
        .tz(dayjs.tz.guess()) // Interpret as local timezone
        .utc() // Convert to UTC
        .toISOString(); // Convert to ISO string
    }

    // Send form data to the backend API
    const response = await axios.post(
      `${backendURL}/create`,
      {
        targetUrl: targetUrl.value,
        description: description.value,
        expiryDate: expiryDateUTC, // Send UTC expiry date
        createdTime: currentTime.utc().toISOString(), // Add the current UTC time
      },
      {
        headers: {
          Authorization: `Bearer ${userStore.token}`, // Include authentication token
        },
      }
    );

    // Update form state on success
    shortenedUrl.value = response.data.shortenedUrl; // Set shortened URL
    customId.value = response.data.customId; // Set custom ID
    error.value = ''; // Clear errors
    formSubmitted.value = true; // Mark form as submitted

    // Redirect to summary page after a short delay
    setTimeout(() => {
      router.push({ name: 'url-summary', params: { customId: customId.value } }); // Navigate to URL summary page
    }, 2000); // 2-second delay
  } catch (err: any) {
    // Handle errors from API call
    error.value = err.response?.data.message || 'Error occurred';
  } finally {
    isSubmitting.value = false; // Reset submitting state
  }
};

// URL validation function
const isValidUrl = (url: string) => {
  try {
    new URL(url); // Attempt to construct a URL object
    return true; // URL is valid
  } catch {
    return false; // URL is invalid
  }
};

// Date validation function
const isPastDate = (date: string) => {
  const now = dayjs().tz(dayjs.tz.guess()); // Get current time in user's timezone
  const selectedDate = dayjs(date).tz(dayjs.tz.guess()); // Interpret the input date in local timezone
  return selectedDate.isBefore(now, 'day'); // Check if the date is before today
};

const getTodayDate = () => {
  return dayjs().tz(dayjs.tz.guess()).format('YYYY-MM-DD');
};

</script>

<style scoped>
/* Style for the URL shortener container */
.url-shortener {
  margin-top: 20px;
}

/* Heading style */
.form-heading {
  margin-bottom: 20px;
}

/* Input group styling */
.input-group {
  display: flex;
  flex-direction: column;
}

/* Input container spacing */
.input-container {
  margin-bottom: 10px;
}

/* Error message styling */
.error {
  color: red;
}

/* Disabled button styling */
button:disabled {
  background-color: lightgray;
  color: gray;
  cursor: not-allowed;
}

/* Success message styling */
.success-message {
  margin-top: 20px;
  color: rgb(0, 0, 0);
}

/* Error message block styling */
.error-message {
  margin-top: 20px;
  color: red;
}
</style>
