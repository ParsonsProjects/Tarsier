
$(function(){

	$('.js-click').on('click', function(){

		chrome.runtime.sendMessage({
		    from:    'popup',
		    subject: 'token'
		});

	});

	chrome.runtime.onMessage.addListener(function(msg, sender) {

		if ((msg.from === 'base') && (msg.subject === 'token')) setAuth(msg.data);

	});

})

var setAuth = function(path) {

	$.getScript(path, function(data){

		var onAuthorize = function() {

		}

		Trello.authorize({
		    interactive:false,
		    success: onAuthorize
		});

		Trello.authorize({
	        type: 'popup',
	        name: 'Trello App',
	        scope: {
			    read: true,
			    write: true
			},
	        expiration: 'never',
	        success: onAuthorize
		});

	});

}