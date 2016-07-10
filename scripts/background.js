
chrome.runtime.onMessage.addListener((msg, sender) => {

	if ((msg.from === 'trello') && (msg.subject === 'token')) {
        localStorage.setItem('trello_token', msg.content);
        chrome.windows.getCurrent(function(data){
            chrome.windows.remove(data.id, () => {});
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
