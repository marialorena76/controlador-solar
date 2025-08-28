const axios = require('axios');

// The server is now started and stopped by the global setup and teardown scripts
// defined in jest.config.js.

test('GET / should return HTML page', async () => {
  let response;
  try {
    response = await axios.get('http://127.0.0.1:5000/');
    expect(response.status).toBe(200);
    expect(response.data).toContain('<!DOCTYPE html>');
  } catch (error) {
    // If the server isn't ready, the test might fail.
    // This provides more context than a generic timeout error.
    console.error('Error connecting to the test server. Is it running?', error.message);
    throw error;
  }
});
