// Config for different search engines
const SEARCH_ENGINES = {
  'google.com': { queryParam: 'q', selectors: ['#center_col', '#main'] },
  'bing.com': { queryParam: 'q', selectors: ['#b_results', '#b_content'], extraClass: 'bing-layout', waitForStable: true },
  'duckduckgo.com': { queryParam: 'q', selectors: ['#links', '#web_content_wrapper', 'main'], extraClass: 'ddg-layout' },
  'yahoo.com': { queryParam: 'p', selectors: ['#web', '#main-algo', '#results'] },
  'brave.com': { queryParam: 'q', selectors: ['#results', 'main'], waitForStable: true },
  'yandex.com': { queryParam: 'text', selectors: ['.main__center', '.content__left', '.serp-list'] },
  'ecosia.org': { queryParam: 'q', selectors: ['.mainline', '.results', 'main'] }
};

let isInjecting = false; // Semaphore to prevent double-injection

function getEngineConfig() {
  const hostname = window.location.hostname;
  for (const [domain, config] of Object.entries(SEARCH_ENGINES)) {
    if (hostname.includes(domain)) {
      return config;
    }
  }
  return null;
}

function getQuery(config) {
  return new URLSearchParams(window.location.search).get(config.queryParam);
}

function findTarget(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return null;
}

function injectKramerBox() {
  // 1. Guard: Check if box already exists or if we are currently injecting
  if (document.querySelector("#kramer-ai-box") || isInjecting) return;

  const config = getEngineConfig();
  if (!config) return;

  const query = getQuery(config);
  if (!query) return;

  const target = findTarget(config.selectors);
  if (!target) return;

  isInjecting = true; // Lock

  const box = document.createElement("div");
  box.id = "kramer-ai-box";
  
  if (config.extraClass) {
    box.classList.add(config.extraClass);
  }

  box.innerHTML = `
    <div class="kramer-header">🕶️ Kramer Intelligence</div>
    <div id="kramer-content">Gathering thoughts...</div>
  `;
  
  // Handle list elements (Bing uses <ol>) by inserting before, keeping HTML valid
  if (target.tagName === 'OL' || target.tagName === 'UL') {
    target.parentElement.insertBefore(box, target);
  } else {
    target.prepend(box);
  }

  chrome.runtime.sendMessage({ type: "FETCH_AI_ANSWER", query: query }, (response) => {
    const contentDiv = document.getElementById("kramer-content");
    if (response && contentDiv) {
      if (response.error) {
        contentDiv.innerText = response.error;
      } else {
        const formattedAnswer = response.answer
          .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
          .replace(/\*(.*?)\*/g, '<i>$1</i>');
          
        contentDiv.innerHTML = formattedAnswer; 
      }
    }
    isInjecting = false; // Unlock
  });
}

// Optimized: Persistent Observer instead of polling
function startPersistentObserver(config) {
  let debounceTimeout;

  const observer = new MutationObserver((mutations) => {
    // Debounce: Only act if the DOM stops changing for 500ms
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      // Check if our box is missing
      if (!document.querySelector("#kramer-ai-box")) {
        injectKramerBox();
      }
    }, 500);
  });

  // Observe the body for major layout changes (AJAX navigation/hydration)
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
}

// Initial Bootstrap
const config = getEngineConfig();
if (config) {
  // Try immediate injection
  injectKramerBox();

  // Start the persistent observer to handle AJAX and Hydration
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => startPersistentObserver(config));
  } else {
    startPersistentObserver(config);
  }
}