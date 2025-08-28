const fs = require('fs');
const path = require('path');

const pidFilePath = path.join(__dirname, '.server.pid');

module.exports = async () => {
  console.log('\nStopping Flask server...');
  try {
    const pid = fs.readFileSync(pidFilePath, 'utf8');
    if (pid) {
      console.log(`Killing server process with PID: ${pid}`);
      // process.kill() will kill the detached process
      process.kill(-pid); // Kill the entire process group
      fs.unlinkSync(pidFilePath);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') { // Ignore error if file doesn't exist
      console.error('Error stopping server:', error);
    }
  }
};
