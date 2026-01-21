chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FETCH_AI_ANSWER") {
    fetch('https://ki-vercel-for-serp.vercel.app/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: request.query })
    })
    .then(res => res.json())
    .then(data => sendResponse(data))
    .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});