
var timerID = '';
var cardID = '';

$(() => {

	chrome.runtime.sendMessage({
	    from:    'trello',
	    subject: 'status'
	});

	// check if popup already open
	$('.list-card').not('.js-open-quick-card-editor').on('click', () => {

		let startTimer = $('<a class="button-link" href="#"><span class="icon-sm icon-clock"></span> Start Timer</a>').prependTo('.window-module.other-actions .u-clearfix');

		startTimer.on('click', (e) => {
			e.preventDefault();
			// https://trello.com/c/DcqBrqdx/1-target-card.json
			timerID = '';
			cardID = '';
			$.get(window.location.href + '.json', (data) => {
				cardID = data.id;
				chrome.runtime.sendMessage({
			    	from: 'trello',
				    subject: 'set',
				    label: 'timerStarted',
				    value: true
				});
				timerStart('Timer started - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'play', 'time': moment()});
			});
		})

	});

});

var timerStart = (timerData, timerDates) => {

	return new Promise((resolve) => {

		chrome.runtime.sendMessage({
		    from: 'trello',
		    subject: 'timerStart',
		    value: cardID,
		    data: timerData,
		    dates: timerDates
		});

		chrome.runtime.onMessage.addListener((msg, sender) => {

			if ((msg.from === 'background') && (msg.subject === 'timerStart')) {
				timerID = msg.value.id;
				resolve(msg.value);
			}

		});

	});

}