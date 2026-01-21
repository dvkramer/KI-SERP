function injectKramerBox() {
  const query = new URLSearchParams(window.location.search).get("q");
  if (!query) return;

  const isBing = window.location.hostname.includes("bing.com");
  const target = document.querySelector("#center_col") || document.querySelector("#b_content");
  if (!target || document.querySelector("#kramer-ai-box")) return;

  const box = document.createElement("div");
  box.id = "kramer-ai-box";
  
  // Apply specific class for Bing layout adjustments
  if (isBing) {
    box.classList.add("bing-layout");
  }

  box.innerHTML = `
    <div class="kramer-header">🕶️ Kramer Intelligence</div>
    <div id="kramer-content">Gathering thoughts...</div>
  `;
  target.prepend(box);

  chrome.runtime.sendMessage({ type: "FETCH_AI_ANSWER", query: query }, (response) => {
    const contentDiv = document.getElementById("kramer-content");
    if (response.error) {
      contentDiv.innerText = response.error;
    } else {
      contentDiv.innerText = response.answer;
    }
  });
}

injectKramerBox();