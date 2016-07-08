
chrome.runtime.onMessage.addListener(function(msg, sender) {

    /* First, validate the message's structure */
    if ((msg.from === 'trello') && (msg.subject === 'showApp')) {
        chrome.tabs.create({
		    url: chrome.extension.getURL('popup.html'),
		    active: false
		}, function(tab) {
		    // After the tab has been created, open a window to inject the tab
		    chrome.windows.create({
		        tabId: tab.id,
		        type: 'popup',
		        focused: true
		        // incognito, top, left, ...
		    });
		});
    }

    if ((msg.from === 'popup') && (msg.subject === 'token')) {
    	chrome.runtime.sendMessage({
		    from:    'base',
		    subject: 'token',
		    data: 'https://api.trello.com/1/client.js?key=f8af011952b5693e6a92da65bf6f298e'
		});
    }

});
