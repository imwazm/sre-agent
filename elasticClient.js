// const { Client } = require('@elastic/elasticsearch');

// // Validate that credentials exist before trying to connect
// if (!process.env.ELASTIC_CLOUD_ID || !process.env.ELASTIC_PASSWORD) {
//   console.warn('⚠️ Warning: ELASTIC_CLOUD_ID or ELASTIC_PASSWORD is missing from your .env file.');
// }

// const client = new Client({
//   cloud: {
//     id: process.env.ELASTIC_CLOUD_ID
//   },
//   auth: {
//     username: 'elastic', // Default master username for Elastic Cloud
//     password: process.env.ELASTIC_PASSWORD
//   }
// });

// // Immediately test the cloud connection on startup
// if (process.env.ELK_STUB === 'false') {
//   client.info()
//     .then(response => {
//       console.log('✅ Connected to Elastic Cloud Cluster:', response.cluster_name);
//     })
//     .catch(error => {
//       console.error('❌ Elastic Cloud Connection Failed:', error.message);
//     });
// } else {
//   console.log('💡 ELK is running in STUB (mock) mode.');
// }

// module.exports = client;

const { Client } = require('@elastic/elasticsearch');

// Double-check if variables are available
const cloudId = process.env.ELASTIC_CLOUD_ID;
const password = process.env.ELASTIC_PASSWORD;

if (!cloudId || !password) {
  console.error('❌ Error: ELASTIC_CLOUD_ID or ELASTIC_PASSWORD is completely missing from your .env file.');
  process.exit(1); 
}

// Ensure the ID isn't just placeholder text
if (cloudId.includes('paste_your_cloud_id')) {
  console.error('❌ Error: You are still using placeholder text for ELASTIC_CLOUD_ID in your .env file.');
  process.exit(1);
}

// Initialize the live client securely
const client = new Client({
  cloud: {
    id: cloudId.trim() // .trim() removes any accidental spaces or hidden windows newlines (\r)
  },
  auth: {
    username: 'elastic',
    password: password.trim()
  }
});

// Immediately verify connection if live mode is toggled
if (process.env.ELK_STUB === 'false') {
  client.info()
    .then(response => {
      console.log('✅ Connected to Elastic Cloud Cluster:', response.cluster_name);
    })
    .catch(error => {
      console.error('❌ Elastic Cloud Connection Failed:', error.message);
    });
} else {
  console.log(' ELK is running in STUB (mock) mode.');
}

module.exports = client;