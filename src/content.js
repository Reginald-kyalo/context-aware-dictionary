// Content script for Context Dictionary

// Variables to track double-tap detection
let lastTapTime = 0;
const doubleTapDelay = 300; // ms

// Create the overlay element for displaying definitions
const overlay = document.createElement('div');
overlay.id = 'cd-dictionary-overlay';
overlay.classList.add('cd-dictionary-overlay');
document.body.appendChild(overlay);

// Listen for mouse-up events to detect selections and double-taps
document.addEventListener('mouseup', function(event) {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (!selectedText) return;
  
  const currentTime = new Date().getTime();
  const tapLength = currentTime - lastTapTime;
  
  if (tapLength < doubleTapDelay && tapLength > 0) {
    // Double tap detected
    const context = getContextualText(selection);
    lookupWord(selectedText, context);
  }
  
  lastTapTime = currentTime;
});

// Extract contextual text from the selection
function getContextualText(selection) {
  if (!selection.rangeCount) return { surroundingText: "", pageTitle: "" };
  
  // Get the range and its container
  const range = selection.getRangeAt(0);
  let contextElement = range.commonAncestorContainer;
  
  // Walk up to find an element node
  while (contextElement && 
         contextElement.nodeType !== Node.ELEMENT_NODE &&
         contextElement.parentNode) {
    contextElement = contextElement.parentNode;
  }
  
  // Find a meaningful semantic container
  let container = contextElement;
  while (container && 
         !['P', 'DIV', 'ARTICLE', 'SECTION', 'LI', 'TD', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(container.nodeName) &&
         container.parentNode) {
    container = container.parentNode;
  }

  // Extract the text and title
  const contextText = container ? container.textContent : contextElement.textContent;
  const pageTitle = document.title;
  
  // Get headings for additional context
  const headings = [];
  const h1 = document.querySelector('h1');
  if (h1) headings.push(h1.textContent);
  
  return {
    surroundingText: contextText.substring(0, 1000), // Limit to 1000 chars
    pageTitle: pageTitle,
    headings: headings
  };
}

// Send lookup request to background script
function lookupWord(word, context) {
  browser.runtime.sendMessage({
    action: 'lookupWord',
    word: word,
    context: context
  });
}

// Listen for messages from the background script
browser.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'showDefinition') {
    showDefinitionOverlay(request.data);
    return Promise.resolve({success: true});
  }
  
  if (request.action === 'getContextForWord') {
    // Used by context menu
    const selection = window.getSelection();
    return Promise.resolve({
      context: getContextualText(selection)
    });
  }
});

// Show the definition overlay
function showDefinitionOverlay(data) {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Populate overlay with definition
  overlay.innerHTML = `
    <div class="cd-header">
      <span class="cd-word">${data.word}</span>
      <span class="cd-close-btn">×</span>
    </div>
    <div class="cd-definition">${data.definition}</div>
    <div class="cd-source">${data.source === 'cache' ? 'From cache' : 'Powered by Gemini AI'}</div>
  `;
  
  // Position overlay near the selected text
  overlay.style.display = 'block';
  
  // Ensure the overlay doesn't go off-screen
  const topPosition = rect.bottom + window.scrollY + 10;
  let leftPosition = rect.left + window.scrollX;
  if (leftPosition + 300 > window.innerWidth) {
    leftPosition = window.innerWidth - 310;
  }
  
  overlay.style.top = `${topPosition}px`;
  overlay.style.left = `${leftPosition}px`;
  
  // Handle close button
  overlay.querySelector('.cd-close-btn').addEventListener('click', () => {
    overlay.style.display = 'none';
  });
  
  // Close when clicking outside
  document.addEventListener('click', function closeOverlay(e) {
    if (!overlay.contains(e.target) && e.target !== overlay) {
      overlay.style.display = 'none';
      document.removeEventListener('click', closeOverlay);
    }
  }, { once: true });
}