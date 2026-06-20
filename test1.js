

window.switchAppTab = function(tabId) {
    document.querySelectorAll('.app-tab').forEach(t => {
        t.classList.add('hidden');
    });
    document.getElementById(tabId).classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.target === tabId) {
            btn.classList.remove('text-stone-400');
            btn.classList.add('text-indigo-600');
        } else {
            btn.classList.remove('text-indigo-600');
            btn.classList.add('text-stone-400');
        }
    });

    if (tabId === 'tab-camera' && typeof window.initScanner === 'function') {
        window.initScanner();
    } else if (typeof window.teardownScanner === 'function') {
        window.teardownScanner();
    }
};

