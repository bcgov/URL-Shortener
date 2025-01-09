<template>
    <div class="error-page">
      <h1>Error</h1>
      <p>Sorry, the link you are trying to access is either invalid or has expired.</p>
      <router-link to="/">Go back to the homepage</router-link>
    </div>
  </template>
  
  <script>
  export default {
    name: 'ErrorPage',
  };
  </script>
  
  <style scoped>
  .error-page {
    text-align: center;
    margin-top: 50px;
  }
  
  .error-page h1 {
    font-size: 2.5rem;
    color: #d9534f; /* Bootstrap danger color */
  }
  
  .error-page p {
    font-size: 1.2rem;
    color: #555;
  }
  
  .error-page a {
    color: #0275d8; /* Bootstrap primary color */
    text-decoration: none;
    font-weight: bold;
  }
  
  .error-page a:hover {
    text-decoration: underline;
  }
  </style>
  