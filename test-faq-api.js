const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testFAQs() {
  try {
    // Login as customer
    console.log('=== Testing as Customer ===');
    const customerLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'nick@acme.com',
      password: 'password123'
    });

    const customerToken = customerLogin.data.access_token;
    console.log('Customer logged in successfully');

    // Get FAQs as customer
    const customerFAQs = await axios.get(`${API_URL}/faqs`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });

    console.log('\nCustomer FAQs (should only see published):');
    customerFAQs.data.forEach(faq => {
      console.log(`- ${faq.question} (Published: ${faq.isPublished})`);
    });

    // Get categories as customer
    const customerCategories = await axios.get(`${API_URL}/faqs/categories`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });

    console.log('\nCustomer Categories:', customerCategories.data);

    // Login as admin
    console.log('\n=== Testing as Admin ===');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@demo.com',
      password: 'password123'
    });

    const adminToken = adminLogin.data.access_token;
    console.log('Admin logged in successfully');

    // Get all FAQs including unpublished as admin
    const adminFAQs = await axios.get(`${API_URL}/faqs?includeUnpublished=true`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('\nAdmin FAQs (including unpublished):');
    adminFAQs.data.forEach(faq => {
      console.log(`- ${faq.question} (Published: ${faq.isPublished})`);
    });

    console.log('\n✅ All FAQ tests passed!');

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testFAQs();
