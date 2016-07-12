
trello.runSync();

chrome.tabs.onHighlighted.addListener((highlightInfo) => {

	chrome.tabs.query({active: true}, (tab) => {
		if(tab[0].url.match(/(trello\.com)/g)) trello.runSync();
	});

});

chrome.runtime.onMessage.addListener((msg, sender) => {

	if ((msg.from === 'trello') && (msg.subject === 'token')) {
		chrome.storage.sync.set({'trello_token': msg.content}, function() {
			if (chrome.runtime.error) console.log("Runtime error.");
			localStorage.setItem('trello_token', msg.content);
			chrome.windows.getCurrent(function(data){
	            chrome.windows.remove(data.id, () => {
	            	chrome.runtime.sendMessage({
					    from:    'trello',
					    subject: 'update'
					});
	            });
	        });
        });
	}

    /* First, validate the message's structure */
    if ((msg.from === 'trello') && (msg.subject === 'showApp')) {
    	chrome.tabs.create({
		    url: 'https://trello.com/1/authorize?key=f8af011952b5693e6a92da65bf6f298e&name=TrelloPimped&expiration=never&scope=read,write&response_type=token',
		    active: false
		}, (tab) => {
		    // After the tab has been created, open a window to inject the tab
		    chrome.windows.create({
		        tabId: tab.id,
		        type: 'popup',
		        focused: true
		        // incognito, top, left, ...
		    });
		});
    }

	if ((msg.from === 'trello') && (msg.subject === 'runSync')) trello.runSync();

    if ((msg.from === 'trello') && (msg.subject === 'set')) trello.set(msg.label, msg.value);
	if ((msg.from === 'trello') && (msg.subject === 'clear')) trello.clear();
	if ((msg.from === 'trello') && (msg.subject === 'remove')) trello.remove(msg.label);

	if ((msg.from === 'trello') && (msg.subject === 'status')) trello.status();
	if ((msg.from === 'trello') && (msg.subject === 'getBoards')) trello.getBoards();
	if ((msg.from === 'trello') && (msg.subject === 'getCards')) trello.getCards(msg.value);
	if ((msg.from === 'trello') && (msg.subject === 'timerStart')) trello.timerStart(msg.value, msg.dates, msg.data);
	if ((msg.from === 'trello') && (msg.subject === 'timerLog')) trello.timerLog(msg.value.card, msg.value.comment, msg.dates, msg.data);
	if ((msg.from === 'trello') && (msg.subject === 'timerStop')) trello.timerStop();

});

// https://gist.github.com/dergachev/e216b25d9a144914eae2
chrome.webRequest.onHeadersReceived.addListener(
  	function (details) {
    	for (var i = 0; i < details.responseHeaders.length; ++i) {
      		if (details.responseHeaders[i].name.toLowerCase() == 'x-frame-options') {
        		details.responseHeaders.splice(i, 1);
        		return {
          			responseHeaders: details.responseHeaders
        		};
    	  	}
    	}
  	}, {
    	urls: ["<all_urls>"]
  	}, ["blocking", "responseHeaders"]
);