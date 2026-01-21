// Config for different search engines
const SEARCH_ENGINES = {
  'google.com': { queryParam: 'q', selectors: ['#center_col', '#main'] },
  'bing.com': { queryParam: 'q', selectors: ['#b_content', '#b_results'], extraClass: 'bing-layout' },
  'duckduckgo.com': { queryParam: 'q', selectors: ['#links', '#web_content_wrapper', 'main'], extraClass: 'ddg-layout' },
  'yahoo.com': { queryParam: 'p', selectors: ['#web', '#main-algo', '#results'] },
  'brave.com': { queryParam: 'q', selectors: ['#results', 'main'], waitForStable: true },
  'yandex.com': { queryParam: 'text', selectors: ['.main__center', '.content__left', '.serp-list'] },
  'ecosia.org': { queryParam: 'q', selectors: ['.mainline', '.results', 'main'] }
};

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
  const config = getEngineConfig();
  if (!config) return;

  const query = getQuery(config);
  if (!query) return;

  if (document.querySelector("#kramer-ai-box")) return;

  const target = findTarget(config.selectors);
  if (!target) return;

  const box = document.createElement("div");
  box.id = "kramer-ai-box";
  
  if (config.extraClass) {
    box.classList.add(config.extraClass);
  }

  box.innerHTML = `
    <div class="kramer-header">🕶️ Kramer Intelligence</div>
    <div id="kramer-content">Gathering thoughts...</div>
  `;
  
  target.prepend(box);

  chrome.runtime.sendMessage({ type: "FETCH_AI_ANSWER", query: query }, (response) => {
    const contentDiv = document.getElementById("kramer-content");
    if (response && contentDiv) {
      if (response.error) {
        contentDiv.innerText = response.error;
      } else {
        contentDiv.innerText = response.answer;
      }
    }
  });
}

function waitForStableDOM(config) {
  let mutationTimeout;
  const observer = new MutationObserver(() => {
    // Clear previous timeout
    clearTimeout(mutationTimeout);
    
    // Wait 500ms of no mutations before injecting
    mutationTimeout = setTimeout(() => {
      observer.disconnect();
      injectKramerBox();
    }, 500);
  });

  const target = findTarget(config.selectors);
  if (target) {
    observer.observe(target, { childList: true, subtree: true });
    
    // Fallback: stop observing after 5 seconds
    setTimeout(() => {
      observer.disconnect();
      injectKramerBox();
    }, 5000);
  }
}

const config = getEngineConfig();
if (config && config.waitForStable) {
  // For Brave: wait for DOM to stabilize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForStableDOM(config));
  } else {
    waitForStableDOM(config);
  }
} else {
  // For other engines: inject normally
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectKramerBox);
  } else {
    injectKramerBox();
  }
  
  // Single delayed retry for any dynamic loading
  setTimeout(injectKramerBox, 1500);
}