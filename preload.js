// Preload script for Electron security
// This runs in the renderer process with access to Node.js APIs
// but in an isolated context from the main process

window.addEventListener('DOMContentLoaded', () => {
  // Renderer process is ready
  console.log('Renderer process ready');
});
