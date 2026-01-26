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

// State management
let isCreatingBox = false; // Short-term lock for DOM manipulation
let lastQuery = null;      // Track the query currently being fetched or displayed
let cachedResponse = null; // Store the answer to prevent re-fetching

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

// Helper to format text
function formatAnswer(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>');
}

function injectKramerBox() {
  // 1. Guard: If box exists, stop.
  if (document.getElementById("kramer-ai-box")) return;
  
  // 2. Guard: If we are literally in the middle of creating the div, stop.
  if (isCreatingBox) return;

  const config = getEngineConfig();
  if (!config) return;

  const query = getQuery(config);
  if (!query) return;

  const target = findTarget(config.selectors);
  if (!target) return;

  // Lock acquired
  isCreatingBox = true;

  const box = document.createElement("div");
  box.id = "kramer-ai-box";
  
  if (config.extraClass) {
    box.classList.add(config.extraClass);
  }

  // 3. Render Content
  // If we have a cached response for THIS query, show it immediately.
  // This prevents "Gathering thoughts..." flashing if the box was just wiped.
  if (query === lastQuery && cachedResponse) {
    let contentHtml = "Gathering thoughts...";
    if (cachedResponse.error) {
        contentHtml = cachedResponse.error;
    } else if (cachedResponse.answer) {
        contentHtml = formatAnswer(cachedResponse.answer);
    }
    
    box.innerHTML = `
      <div class="kramer-header">🕶️ Kramer Intelligence</div>
      <div id="kramer-content">${contentHtml}</div>
    `;
  } else {
    // New query or still loading: Show loading state
    box.innerHTML = `
      <div class="kramer-header">🕶️ Kramer Intelligence</div>
      <div id="kramer-content">Gathering thoughts...</div>
    `;
  }

  // 4. Insert into DOM
  // Insert BEFORE lists to keep HTML valid, otherwise PREPEND inside containers
  if (target.tagName === 'OL' || target.tagName === 'UL') {
    target.parentElement.insertBefore(box, target);
  } else {
    target.prepend(box);
  }

  // Unlock DOM manipulation immediately so we can recover if wiped
  isCreatingBox = false;

  // 5. Fetch ONLY if this is a brand new query
  // We check 'query !== lastQuery' to ensure we only fire the API once per unique search.
  if (query !== lastQuery) {
    // LOCK: Mark this query as "in progress" immediately
    lastQuery = query;
    cachedResponse = null; // Clear old cache

    chrome.runtime.sendMessage({ type: "FETCH_AI_ANSWER", query: query }, (response) => {
        // Handle runtime errors (like extension update/reload context invalidation)
        if (chrome.runtime.lastError) {
            console.error("Kramer Extension Error:", chrome.runtime.lastError);
            response = { error: "Extension disconnected. Please refresh." };
        }

        // Save result to cache so re-injections are free
        cachedResponse = response || { error: "No response received." };

        // Update DOM if the box is still on screen
        const contentDiv = document.getElementById("kramer-content");
        if (contentDiv) {
            if (cachedResponse.error) {
                contentDiv.innerText = cachedResponse.error;
            } else {
                contentDiv.innerHTML = formatAnswer(cachedResponse.answer);
            }
        }
    });
  }
}

// Persistent Observer
function startPersistentObserver() {
  let debounceTimeout;

  const observer = new MutationObserver((mutations) => {
    // Fast debounce: 150ms is quick enough to feel instant, 
    // but slow enough to group multiple React/Angular DOM updates.
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      if (!document.getElementById("kramer-ai-box")) {
        injectKramerBox();
      }
    }, 150);
  });

  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
}

// Initial Bootstrap
if (getEngineConfig()) {
  injectKramerBox();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPersistentObserver);
  } else {
    startPersistentObserver();
  }
}