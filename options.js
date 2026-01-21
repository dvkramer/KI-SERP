// Save key to chrome.storage
document.getElementById('save').addEventListener('click', () => {
  const key = document.getElementById('apiKey').value;
  chrome.storage.local.set({ gemini_api_key: key }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Key saved! Reload your search page.';
    setTimeout(() => { status.textContent = ''; }, 3000);
  });
});

// Load existing key if it exists
chrome.storage.local.get(['gemini_api_key'], (result) => {
  if (result.gemini_api_key) {
    document.getElementById('apiKey').value = result.gemini_api_key;
  }
});