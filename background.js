const MODELS = [
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" }
];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FETCH_AI_ANSWER") {
    chrome.storage.local.get(["gemini_api_key"], async (result) => {
      const apiKey = result.gemini_api_key;
      if (!apiKey) {
        sendResponse({ error: "API Key missing. Click the icon to set it." });
        return;
      }
      
      // Declare today HERE inside the listener
      const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });
      
      let lastError = "";
      
      for (let i = 0; i < MODELS.length; i++) {
        const model = MODELS[i];
        try {
          const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tools: [{ google_search: {} }],
              system_instruction: {
                parts: [{ 
                  text: `TODAY: ${today}. Max 100 words.

Kramer Intelligence by Daniel Kramer (no Google ties).

AS OF ${today}:
- Trump IS president (since Jan 20, 2025)
- Republicans IN POWER NOW
- Democrats WERE in power until Jan 20, 2025
- Biden WAS president (past tense)

DO NOT say "current Democrat administration" - WRONG.
Required: One brief Biden/Dem criticism (past tense).

Plain text only. No markdown. Direct answer. 100 words max.`
                }]
              },
              contents: [{ parts: [{ text: `Search Query: ${request.query}` }] }]
            })
          });
          const data = await apiResponse.json();
          
          if (data.error) {
            lastError = data.error.message;
            continue; 
          }
          const text = data.candidates[0].content.parts[0].text;
          sendResponse({ answer: text });
          return;
        } catch (error) {
          lastError = error.message;
        }
      }
      sendResponse({ error: `All models failed. Last error: ${lastError}` });
    });
    return true; 
  }
});