// Popup script for Context Dictionary

document.addEventListener('DOMContentLoaded', function() {
  loadLookupHistory();
  
  // Set up clear history button
  document.getElementById('clear-history').addEventListener('click', clearHistory);
});

// Load lookup history from storage
function loadLookupHistory() {
  browser.storage.local.get(['lookupHistory']).then(result => {
    const history = result.lookupHistory || [];
    const container = document.getElementById('history-container');
    const controls = document.getElementById('controls');
    
    if (history.length === 0) {
      container.innerHTML = '<div class="empty-message">No lookups yet. Double-tap on any word to define it.</div>';
      controls.style.display = 'none';
      return;
    }
    
    container.innerHTML = '';
    controls.style.display = 'block';
    
    // Show the 10 most recent lookups
    history.slice(0, 10).forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      
      const date = new Date(item.timestamp);
      const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      
      historyItem.innerHTML = `
        <div class="word">${item.word}</div>
        <div class="definition">${item.definition}</div>
        <div class="timestamp">${formattedDate}</div>
      `;
      
      container.appendChild(historyItem);
    });
  }).catch(error => {
    console.error('Error loading history:', error);
    document.getElementById('history-container').innerHTML = 
      '<div class="empty-message">Error loading history. Please try again.</div>';
  });
}

// Clear history from storage
function clearHistory() {
  if (confirm('Are you sure you want to clear all lookup history?')) {
    browser.storage.local.set({ lookupHistory: [] }).then(() => {
      loadLookupHistory();
    }).catch(error => {
      console.error('Error clearing history:', error);
      alert('Failed to clear history. Please try again.');
    });
  }
}