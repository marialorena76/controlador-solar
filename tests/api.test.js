const { spawn } = require('child_process');
const axios = require('axios');

let server;

beforeAll(done => {
  server = spawn('flask', ['--app', 'backend/backend.py', 'run', '--no-reload'], { stdio: 'inherit' });
  // give the server a moment to start
  setTimeout(done, 2000);
});

afterAll(() => {
  if (server) {
    server.kill();
  }
});

test('GET / should return HTML page', async () => {
  const res = await axios.get('http://127.0.0.1:5000/');
  expect(res.status).toBe(200);
  expect(res.data.toLowerCase()).toContain('<!doctype html>');
});
