const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const pidFilePath = path.join(__dirname, '.server.pid');

module.exports = async () => {
  console.log('\nStarting Flask server for tests...');
  const server = spawn('flask', ['--app', 'backend/backend.py', 'run', '--no-reload'], {
    detached: true,
    stdio: 'pipe', // Use pipe to capture error output
  });

  server.stderr.on('data', (data) => {
    console.error(`Flask server stderr: ${data}`);
  });

  server.on('error', (err) => {
    console.error('Failed to start Flask server:', err);
    throw new Error('Failed to start Flask server');
  });

  if (server.pid) {
    fs.writeFileSync(pidFilePath, server.pid.toString());
    console.log(`Flask server started with PID: ${server.pid}`);
    server.unref();
    // Give the server a moment to start up
    await new Promise(resolve => setTimeout(resolve, 5000)); // Increased timeout
  } else {
    console.error('Flask server did not start. PID is missing.');
    // Wait a moment to see if an error message comes through stderr
    await new Promise(resolve => setTimeout(resolve, 1000));
    throw new Error('Flask server failed to start, PID was not generated.');
  }
};
