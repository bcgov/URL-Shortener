<template>
  <div class="url-summary-container">
    <!-- Edit Button -->
    <button class="bcgov-edit-button" @click="toggleEditMode">
      {{ editButtonText }}
    </button>
    
      <h2><strong>Short URL: </strong>
        <a :href="shortenedUrl || '#'" target="_blank">{{ shortenedUrl || 'N/A' }}</a>
        <button class="copy-btn" @click="copyToClipboard(shortenedUrl || '')">
          <img src="../assets/copy.svg" alt="Copy icon" />
        </button>
      </h2>
      

      <br />
    <!-- URL Details Section -->
    <div class="url-details">
      <h2><strong>URL Details</strong></h2>
      

      <p v-if="targetUrl">
        <span style="font-weight: bold;">Target URL: </span>
        <a :href="targetUrl || '#'" target="_blank">{{ targetUrl || 'N/A' }}</a>
        <button class="copy-btn" @click="copyToClipboard(targetUrl || '')">
          <img src="../assets/copy.svg" alt="Copy icon" />
        </button>
      </p>
      <p><span style="font-weight: bold;">Expiry Date:</span> {{ formatExpiryDate(expiryDate) || 'No expiry date' }}</p>
      <p v-if="customId">
        <span style="font-weight: bold;">Internal Link: </span>
        <a :href="`${frontendURL}/url-summary/${customId}`" target="_blank">{{ `${frontendURL}/url-summary/${customId}` || 'N/A' }}</a>
        <button class="copy-btn" @click="copyToClipboard(`${frontendURL}/url-summary/${customId}`)">
          <img src="../assets/copy.svg" alt="Copy icon" />
        </button>
      </p>
      
      <p><span style="font-weight: bold;">Created By:</span> {{ createdBy || 'Unknown' }}</p>
      <p><span style="font-weight: bold;">Created Date:</span> {{ createdTime || 'N/A' }}</p>
      <p><span style="font-weight: bold;">Edited By:</span> {{ editedBy || 'No edits' }}</p>
      <p><span style="font-weight: bold;">Edited Date:</span> {{ updatedAt || 'No edits' }}</p>
      <p><span style="font-weight: bold;">Notes:</span> {{ description || 'No description provided' }}</p>
    </div>





    <!-- Feedback Message -->
    <p v-if="copiedMessage" style="color: green;">{{ copiedMessage }}</p>

    <!-- Edit Form -->
    <div v-if="isEditing" class="edit-form">
      <h2><strong>Edit Form</strong></h2>
      <div class="edit-form-container">
        <form @submit.prevent="submitEdit">
          <label for="targetUrl">Target URL:</label>
          <input
            id="targetUrl"
            type="text"
            v-model="editedTargetUrl"
            pattern="https?://.*(:[0-9]+)?(/.*)?"
            :disabled="fieldsDisabled"
            required
          />
          <label for="expiryDate">Expiry Date (Optional):</label>
          <input
            id="expiryDate"
            type="date"
            v-model="editedExpiryDate"
            :disabled="fieldsDisabled"
            :min="getTodayDate()"
          />
        
          <label for="description">Notes (Optional):</label>
          <p style="font-style: italic;" >{{editedDescription.length }} / 500 max characters limit</p>
          <textarea
            id="description"
            v-model="editedDescription"
            :disabled="fieldsDisabled"
            rows="3"
            placeholder="Enter description (optional)"
            maxlength="500"
          ></textarea>
          <button
            type="submit"
            class="bcgov-submit-button"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? "Changes saved successfully!" : "Save Edits" }}
          </button>
        </form>
      </div>
    </div>
    <br />



    <!-- History Table -->
    <div class="history-table">
      <h2><strong>History</strong></h2>
  
      <table v-if="formattedHistory.length">
        <thead>
          <tr>
            <th>Field</th>
            <th>Old Value</th>
            <th>New Value</th>
            <th>Edited By</th>
            <th>Edited Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(history, index) in formattedHistory" :key="index">
            <td>{{ history.fieldEdited }}</td>
            <td>{{ history.oldValue || 'N/A' }}</td>
            <td>{{ history.newValue || 'N/A' }}</td>
            <td>{{ history.editedBy || 'Unknown' }}</td>
            <td>{{ convertToLocalTime(history.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else>No history available.</p>
    </div>

    <!-- Action Links -->
    <div class="action-container">
      <router-link :to="{ name: 'create' }" class="create-url">Create new Short URL</router-link>
      <br />
      <router-link :to="{ name: 'url-table' }" class="url-list-link">View all Existing URLs</router-link>
    </div>
  </div>
</template>


<script setup>
// Import necessary libraries and plugins
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useUserStore } from '@/stores/userStore';
import { computed } from 'vue';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Define reactive state variables
const route = useRoute();
const customId = ref(route.params.customId || '');
const shortenedUrl = ref('');
const targetUrl = ref('');
const description = ref('');
const expiryDate = ref('');
const createdTime = ref('');
const createdBy = ref('');
const updatedAt = ref('');
const editedBy = ref('');
const backendURL = import.meta.env.VITE_BACKEND_URL;
const frontendURL = import.meta.env.VITE_FRONTEND_URL;
const copiedMessage = ref('');

// State for editing and submission
const isEditing = ref(false); // Tracks if the form is in edit mode
const isSubmitting = ref(false); // Tracks if the submit button is disabled
const fieldsDisabled = ref(false); // Tracks if form fields are disabled

// Form-specific values
const editedTargetUrl = ref('');
const editedExpiryDate = ref('');
const editedDescription = ref('');
const editButtonText = ref('Edit'); // Tracks the button's displayed text
const historyData = ref([]); // Tracks the history data of edits

// Toggles the edit mode for the form
const toggleEditMode = () => {
  if (!isEditing.value) {
    // Enter edit mode directly
    isEditing.value = true;
    fieldsDisabled.value = false; // Re-enable fields
    isSubmitting.value = false; // Allow submission
    editButtonText.value = 'Cancel'; // Change button text to "Cancel"

    // Populate fields with current values
    editedTargetUrl.value = targetUrl.value || '';
    editedExpiryDate.value = expiryDate.value ? formatExpiryDate(expiryDate.value) : '';
    editedDescription.value = description.value || '';
  } else {
    // Exit edit mode
    isEditing.value = false;
    fieldsDisabled.value = true; // Disable fields
    editButtonText.value = 'Edit'; // Reset button text to "Edit"
  }
};

// Handles form submission to update URL details
const submitEdit = async () => {
  const userStore = useUserStore();
  isSubmitting.value = true; // Disable the submit button
  fieldsDisabled.value = true; // Temporarily disable fields during submission

  try {
    // Create payload with updated values
    const payload = {
      targetUrl: editedTargetUrl.value,
      expiryDate: editedExpiryDate.value
        ? dayjs(editedExpiryDate.value).endOf('day').utc().toISOString()
        : null,
      description: editedDescription.value,
    };

    // Make the PUT request to update data
    await axios.put(`${backendURL}/update-url/${customId.value}`, payload, {
      headers: { Authorization: `Bearer ${userStore.token}` },
    });

    // Wait briefly to allow the database to update
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Refresh the URL summary and history after submission
    await fetchUrlSummary();
    await fetchHistory();

    // Keep the form visible but disable further edits
    fieldsDisabled.value = true;
    isSubmitting.value = true; // Keep the submit button disabled
    isEditing.value = true; // Keep the form in view
    editButtonText.value = 'Edit'; // Reset button text to "Edit"
    console.log('Edit submitted successfully and history reloaded.');
  } catch (error) {
    console.error('Error updating URL:', error);

    // Re-enable the form to allow retrying the edit
    isSubmitting.value = false;
    fieldsDisabled.value = false;
  }
};

// Fetch the URL summary details
const fetchUrlSummary = async () => {
  const userStore = useUserStore();

  try {
    const response = await axios.get(`${backendURL}/url-summary/${customId.value}`, {
      headers: { Authorization: `Bearer ${userStore.token}` },
    });

    // Update state variables with response data
    const data = response.data;
    shortenedUrl.value = data.shortenedUrl || 'N/A';
    targetUrl.value = data.targetUrl || 'N/A';
    description.value = data.description || 'No description provided';
    expiryDate.value = data.expiryDate ? formatExpiryDate(data.expiryDate) : 'No expiry date';
    createdTime.value = convertToLocalTime(data.createdTime);
    updatedAt.value = data.updatedAt ? convertToLocalTime(data.updatedAt) : 'No edits';
    createdBy.value = data.createdBy || 'Unknown';
    editedBy.value = data.editedBy || 'No edits';
  } catch (error) {
    console.error('Error fetching URL summary:', error);
  }
};

// Fetch the edit history for the URL
const fetchHistory = async () => {
  const userStore = useUserStore();

  try {
    const response = await axios.get(`${backendURL}/url-history/${customId.value}`, {
      headers: { Authorization: `Bearer ${userStore.token}` },
    });

    // Update the history data
    historyData.value = response.data.versions || [];
  } catch (error) {
    console.error('Error fetching history:', error);
  }
};

// Compute formatted history to display in the table
const formattedHistory = computed(() => {
  const result = [];

  // Start with the main document (latest values)
  const mainEntry = {
    targetUrl: targetUrl.value,
    expiryDate: expiryDate.value,
    description: description.value,
    updatedAt: updatedAt.value,
    editedBy: editedBy.value,
  };

  // Combine versions array (oldest to newest) followed by the main document
  const combinedHistory = [...historyData.value.map(entry => entry._doc || entry), mainEntry];

  // Traverse history from newest to oldest
  for (let i = combinedHistory.length - 1; i > 0; i--) {
    const currentEntry = combinedHistory[i];
    const prevEntry = combinedHistory[i - 1];

    // Compare changes between the current and previous entries
    const changes = [
      {
        fieldEdited: 'Target URL',
        oldValue: prevEntry.targetUrl || 'N/A',
        newValue: currentEntry.targetUrl || 'N/A',
        changed: currentEntry.targetUrl !== prevEntry.targetUrl,
        updatedAt: prevEntry.updatedAt, // Use prevEntry's updatedAt for historical accuracy
        editedBy: prevEntry.editedBy || 'Unknown',
      },
      {
        fieldEdited: 'Expiry Date',
        oldValue: prevEntry.expiryDate
          ? dayjs(prevEntry.expiryDate).format('YYYY-MM-DD')
          : 'N/A',
        newValue: currentEntry.expiryDate
          ? dayjs(currentEntry.expiryDate).format('YYYY-MM-DD')
          : 'N/A',
        changed: !dayjs(prevEntry.expiryDate).isSame(currentEntry.expiryDate, 'day'),
        updatedAt: prevEntry.updatedAt, // Use prevEntry's updatedAt for historical accuracy
        editedBy: prevEntry.editedBy || 'Unknown',
      },
      {
        fieldEdited: 'Description',
        oldValue: prevEntry.description || 'N/A',
        newValue: currentEntry.description || 'N/A',
        changed: currentEntry.description !== prevEntry.description,
        updatedAt: prevEntry.updatedAt, // Use prevEntry's updatedAt for historical accuracy
        editedBy: prevEntry.editedBy || 'Unknown',
      },
    ];

    // Add only actual changes to the result
    changes.forEach(change => {
      if (change.changed) {
        const isDuplicate = result.some(
          entry =>
            entry.fieldEdited === change.fieldEdited &&
            entry.updatedAt === convertToLocalTime(change.updatedAt)
        );

        if (!isDuplicate) {
          result.push({
            fieldEdited: change.fieldEdited,
            oldValue: change.oldValue,
            newValue: change.newValue,
            editedBy: change.editedBy,
            updatedAt: convertToLocalTime(change.updatedAt),
          });
        }
      }
    });
  }

  return result;
});

onMounted(async () => {
  const userStore = useUserStore();

  try {
    const response = await axios.get(`${backendURL}/url-summary/${customId.value}`, {
      headers: { Authorization: `Bearer ${userStore.token}` },
    });

    const data = response.data;

    shortenedUrl.value = data.shortenedUrl || 'N/A';
    targetUrl.value = data.targetUrl || 'N/A';
    description.value = data.description || 'No description provided';
    expiryDate.value = data.expiryDate ? formatExpiryDate(data.expiryDate) : 'No expiry date';
    createdTime.value = convertToLocalTime(data.createdTime);
    updatedAt.value = data.updatedAt ? convertToLocalTime(data.updatedAt) : 'No edits';
    createdBy.value = data.createdBy || 'Unknown'; 
    editedBy.value = data.editedBy || 'No edits';

    // Fetch the main document (URL summary)
    await fetchUrlSummary();
    // Fetch history data
    await fetchHistory();
  } catch (error) {
    console.error('Error retrieving URL details:', error);
  }
});


// Convert UTC date to local time
const convertToLocalTime = (utcDate) => {
  if (!utcDate) return 'N/A';
  return dayjs(utcDate).tz(dayjs.tz.guess()).format('YYYY-MM-DD HH:mm:ss');
};

// Format expiry date to a readable string
const formatExpiryDate = (utcDate) => {
  if (!utcDate) return 'No expiry date';
  return dayjs(utcDate).tz(dayjs.tz.guess()).format('YYYY-MM-DD');
};

// Get today's date in local time
const getTodayDate = () => {
  return dayjs().tz(dayjs.tz.guess()).format('YYYY-MM-DD');
};

// Copy text to clipboard with feedback message
const copyToClipboard = (text) => {
  const input = document.createElement('textarea');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  copiedMessage.value = 'URL copied!';
  setTimeout(() => {
    copiedMessage.value = '';
  }, 5000);
};
</script>


<style scoped>
.url-summary-container {
  margin: 0 auto;
  padding: 20px;
  position: relative;
}

.url-details p {
  margin: 5px 0;
}

.copy-btn {
  display: inline-block;
  width: 18px;
  height: 18px;
  background-image: url('../assets/copy.svg');
  background-size: cover;
  background-repeat: no-repeat;
  cursor: pointer;
  margin-left: 10px;
  border: none;
  background-color: transparent;
  padding: 0;
  vertical-align: middle;
}

.copy-btn img {
  display: block;
}

.target-url-container {
  word-break: break-word;
  overflow-wrap: break-word;
}

.action-container {
  margin-top: 20px;
}

a:hover {
  color: #003f88;
}

a {
  color: rgb(0, 0, 0);
  text-decoration: underline;
}

/* Style for the "Create a new Short URL" link */
.create-url {
  display: inline-block; /* Makes it a block for better padding */
  margin-top: 20px; /* Adds spacing from surrounding elements */
  margin-bottom: 20px; /* Adds spacing from surrounding elements */
  font-weight: bold; /* Makes the text bold */
}


/* Active state for when the link is clicked */
.create-url:active {
  transform: translateY(0); /* Returns to normal position */
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2); /* Slightly reduced shadow */
}

.edit-form {
  margin-top: 20px;
}

.edit-form label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.edit-form input {
  margin-bottom: 15px;
  padding: 5px;
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;
}


.bcgov-edit-button {
  position: absolute; /* Position relative to container */
  top: 15px; /* Adjust top margin */
  right: 20px; /* Adjust right margin */
  padding: 7px 10px; /* Smaller padding for compact size */
  font-size: 18px; /* Smaller font size */
  background-color: var(--surface-color-primary-button-default); /* Primary button color */
  color: var(--typography-color-primary-invert); /* Inverted text color */
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  width: auto; /* Ensure the button only takes as much space as its content */
  display: inline-block; /* Prevent it from expanding */
  text-align: center; /* Center text alignment */
}

.bcgov-edit-button:hover {
  background-color: var(--surface-color-primary-button-hover);
}

.bcgov-edit-button:focus {
  outline: 2px solid #2684FF;
  outline-offset: 2px;
}

.bcgov-submit-button {
  background-color: var(--surface-color-primary-button-default);
  color: var(--typography-color-primary-invert);
  border: none;
  border-radius: 4px;
  padding: 12px 24px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.bcgov-submit-button:disabled {
  background-color: #d3d3d3; /* Grey out the button */
  color: #9c9c9c; /* Change text color */
  cursor: not-allowed; /* Show not-allowed cursor */
  opacity: 0.7; /* Slightly transparent */
  border: 1px solid #bfbfbf; /* Optional: Add a border to show it's disabled */
}
.edit-form-container {
  width: 50%;
  padding: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Optional styling */
  border: 1px solid #ccc; /* Optional styling */
  border-radius: 8px; /* Optional styling */
}


input:disabled,
textarea:disabled {
  background-color: var(--surface-color-disabled);
  color: var(--typography-color-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}


</style>