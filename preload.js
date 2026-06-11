const { ipcRenderer } = require('electron');

// Spoof document visibility and focus state. 
// This forces the web client to mark conversations as read even when the app is running invisibly in the background.
Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
Object.defineProperty(document, 'hidden', { get: () => false });
Object.defineProperty(document, 'hasFocus', { get: () => true });
window.document.hasFocus = () => true;

// We run this early to intercept the Notification API before the web client uses it
process.once('loaded', () => {
  const OriginalNotification = window.Notification;

  class CustomNotification {
    constructor(title, options) {
      ipcRenderer.send('show-notification', {
        title: title,
        body: options ? options.body : '',
        conversationId: title
      });
    }
    
    static get permission() {
      return 'granted';
    }
    
    static requestPermission() {
      return Promise.resolve('granted');
    }
  }

  // Override the global Notification object
  window.Notification = CustomNotification;
  
  // Intercept Service Worker notifications
  if (typeof ServiceWorkerRegistration !== 'undefined') {
    ServiceWorkerRegistration.prototype.showNotification = function(title, options) {
      ipcRenderer.send('show-notification', {
        title: title,
        body: options ? options.body : '',
        conversationId: title
      });
      return Promise.resolve();
    };
  }
  
  // Watch the document title for unread message counts
  window.addEventListener('DOMContentLoaded', () => {
    const titleElement = document.querySelector('title');
    if (titleElement) {
      const observer = new MutationObserver(() => {
        const title = document.title;
        const match = title.match(/^\((\d+)\)/);
        const count = match ? parseInt(match[1], 10) : 0;
        ipcRenderer.send('update-badge', count);
      });
      observer.observe(titleElement, { childList: true, characterData: true, subtree: true });
    }
  });
});

// Handle opening conversations when notifications are clicked
ipcRenderer.on('open-conversation', (event, { conversationId }) => {
  const searchName = conversationId.split(' • ')[0].trim();
  const anchors = document.querySelectorAll('a');
  for (const a of anchors) {
    if (a.textContent && a.textContent.includes(searchName)) {
      // Force the web client to process a focus event before clicking
      window.dispatchEvent(new Event('focus', { bubbles: true }));
      document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
      
      a.click();
      a.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      a.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      
      // Focusing the input box ensures the web client commits the read receipt
      setTimeout(() => {
        const inputBox = document.querySelector('textarea, [contenteditable="true"]');
        if (inputBox) inputBox.focus();
      }, 100);
      
      break;
    }
  }
});

// Prepare for native reply from main process
ipcRenderer.on('prepare-reply', (event, { conversationId, replyText }) => {
  ipcRenderer.send('debug-log', 'Preparing reply for: ' + conversationId);
  
  const searchName = conversationId.split(' • ')[0].trim();
  const anchors = document.querySelectorAll('a');
  let found = false;
  
  for (const a of anchors) {
    if (a.textContent && a.textContent.includes(searchName)) {
      // Force the web client to process a focus event before clicking
      window.dispatchEvent(new Event('focus', { bubbles: true }));
      document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
      
      a.click();
      // Also send mouse events to aggressively force the active state
      a.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      a.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      found = true;
      break;
    }
  }
  
  if (!found) {
    const listItems = document.querySelectorAll('mws-conversation-list-item');
    for (const item of listItems) {
      if (item.textContent && item.textContent.includes(searchName)) {
        item.click();
        found = true;
        break;
      }
    }
  }
  
  if (!found) return;
  
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    const inputBox = document.querySelector('textarea, [contenteditable="true"]');
    
    if (inputBox) {
      clearInterval(interval);
      ipcRenderer.send('debug-log', 'Focused input box. Injecting text.');
      inputBox.focus();
      
      // Inject the reply text natively using execCommand which bypasses Angular's untrusted event blocks
      // We know this successfully types the text even in the background!
      document.execCommand('insertText', false, replyText);
      
      // Force native focus back to Chromium for the key injection
      inputBox.focus();
      
      // Ping the main process to fire a native OS-level Enter keydown event
      setTimeout(() => {
        ipcRenderer.send('trigger-native-enter');
        ipcRenderer.send('debug-log', 'Fired native OS Enter key');
      }, 500);
      
    } else if (attempts > 20) {
      clearInterval(interval);
      ipcRenderer.send('debug-log', 'ERROR: Timed out waiting for input box.');
    }
  }, 250);
});
