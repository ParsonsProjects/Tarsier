
var referrer = document.referrer;
var key = referrer.match(/key=([^&]+)/g);

// check we are coming from our app
if(key[0].split('=')[1] == 'f8af011952b5693e6a92da65bf6f298e') {

	chrome.runtime.sendMessage({
	    from:    'trello',
	    subject: 'token',
	    content: $('pre').text().replace(/[\n\r\s]/g, '')
	});

}