// Background script for Context Dictionary

// Cache for storing previously looked-up definitions
const definitionCache = {};

// Gemini API key (replace with your actual key)
const GEMINI_API_KEY = 'AIzaSyB1yd8k_keyDemLNp7Z1g7WnPJBIESubAA';

// Set up context menu on install
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "define-selection",
    title: "Define '%s'",
    contexts: ["selection"]
  });
});

// Context menu click handler
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "define-selection") {
    browser.tabs.sendMessage(tab.id, { 
      action: "getContextForWord",
      word: info.selectionText
    }).then(response => {
      if (response && response.context) {
        handleWordLookup(info.selectionText, response.context, tab.id);
      }
    }).catch(error => console.error("Context menu error:", error));
  }
});

// Listen for messages from content script
browser.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'lookupWord') {
    return handleWordLookup(request.word, request.context, sender.tab.id);
  }
});

// Process word lookup request
async function handleWordLookup(word, context, tabId) {
  try {
    // Check cache first
    const cacheKey = `${word}-${context.pageTitle.slice(0, 20)}`;
    if (definitionCache[cacheKey]) {
      return sendDefinitionToTab(tabId, {
        word: word,
        definition: definitionCache[cacheKey],
        source: 'cache'
      });
    }
    
    // Get definition from Gemini API
    const definition = await getGeminiDefinition(word, context);
    
    // Cache the result
    definitionCache[cacheKey] = definition;
    
    // Send back to content script
    await sendDefinitionToTab(tabId, {
      word: word,
      definition: definition,
      source: 'gemini'
    });
    
    // Store in history
    await storeInHistory(word, definition, context.pageTitle);
    
    return { success: true };
    
  } catch (error) {
    console.error('Error getting definition:', error);
    
    await sendDefinitionToTab(tabId, {
      word: word,
      definition: "Sorry, I couldn't get a definition for this word. Error: " + error.message,
      error: error.message,
      source: 'error'
    });
    
    return { success: false, error: error.message };
  }
}

// Send definition back to content script
async function sendDefinitionToTab(tabId, data) {
  return browser.tabs.sendMessage(tabId, {
    action: 'showDefinition',
    data: data
  });
}

// Call Gemini API for context-aware definition
async function getGeminiDefinition(word, context) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Give me a clear, concise dictionary definition of the word "${word}" that specifically fits the following context. Focus on the meaning that's most relevant to this context:
          
          Text context: "${context.surroundingText}"
          
          Page title: "${context.pageTitle}"
          
          Format your response as a dictionary-style definition without mentioning the context I provided.`
        }]
      }]
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Store lookup in history
async function storeInHistory(word, definition, pageTitle) {
  try {
    const result = await browser.storage.local.get(['lookupHistory']);
    const history = result.lookupHistory || [];
    
    history.unshift({
      word: word,
      definition: definition,
      pageTitle: pageTitle,
      timestamp: new Date().toISOString()
    });
    
    // Keep history limited to last 50 items
    if (history.length > 50) {
      history.pop();
    }
    
    return browser.storage.local.set({ lookupHistory: history });
  } catch (error) {
    console.error("Error storing history:", error);
  }
}