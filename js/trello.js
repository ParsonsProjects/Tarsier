
let cardID = '';
let timerID = '';
let timerStarted = '';

$(() => {

	chrome.runtime.sendMessage({
	    from:    'trello',
	    subject: 'status'
	});

	// check if popup already open
	if(window.location.href.match(/(trello.com\/c)/g)) checkCardOpen();
	$('.list-card').not('.js-open-quick-card-editor').on('click', () => {
		checkCardOpen();
	});


});

var checkCardOpen = () => {

	let $cardWindow = $('.window-module.other-actions .u-clearfix');

	let cardInterval = setInterval(() => {

		if($cardWindow.length) {

			let $startTimerBtn = $('<a class="button-link js-start-timer" href="#"><span class="icon-sm icon-clock"></span> Start Timer</a>').prependTo($cardWindow);
			let $pauseTimerBtn = $('<a class="button-link js-pause-timer hide" href="#"><span class="icon-sm icon-clock"></span> Pause Timer</a>').prependTo($cardWindow);
			let $stopTimerBtn = $('<a class="button-link js-stop-timer hide" href="#"><span class="icon-sm icon-close"></span> Stop Timer</a>').prependTo($cardWindow);

			$startTimerBtn.on('click', (e) => {
				e.preventDefault();

				timerID = '';
				cardID = '';

				$.get(window.location.href + '.json', (data) => {
					cardID = data.id;
					timerStarted = true;
					chrome.runtime.sendMessage({
				    	from: 'trello',
					    subject: 'set',
					    label: 'timerStarted',
					    value: true
					});
					timerStart('Timer started - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'play', 'time': moment()});
					$startTimerBtn.addClass('hide');
					$pauseTimerBtn.removeClass('hide');
					$stopTimerBtn.removeClass('hide');
				});

			});

			$pauseTimerBtn.on('click', (e) => {
				e.preventDefault();

				chrome.runtime.sendMessage({
			    	from: 'trello',
				    subject: 'set',
				    label: 'timerPaused',
				    value: true
				});
				timerLog('Timer paused - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'paused', 'time': moment()});

			});

			$stopTimerBtn.on('click', (e) => {
				e.preventDefault();

				timerStarted = false;
				chrome.runtime.sendMessage({
			    	from: 'trello',
				    subject: 'set',
				    label: 'timerStarted',
				    value: false
				});
				timerLog('Timer stopped - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'stopped', 'time': moment()});
				$stopTimerBtn.addClass('hide');
				$pauseTimerBtn.addClass('hide');
				$startTimerBtn.removeClass('hide');

			});

			clearInterval(cardInterval);

		}

	}, 100);

}

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
				resolve(msg.value);
			}

		});

	});

}

var timerLog = (timerData, timerDates) => {

	return new Promise((resolve) => {

		chrome.runtime.sendMessage({
		    from: 'trello',
		    subject: 'timerLog',
		    value: {
		    	card: cardID,
		    	comment: timerID
		    },
		    data: timerData,
		    dates: timerDates
		});

		chrome.runtime.onMessage.addListener((msg, sender) => {

			if ((msg.from === 'background') && (msg.subject === 'timerLog')) {
				resolve(msg.value);
				if(!timerStarted) {
					chrome.runtime.sendMessage({
				    	from: 'trello',
					    subject: 'timerStop'
					});
				}
			}

		});

	});

}