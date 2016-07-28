
let cardID = '';
let timerID = '';
let timerStarted = '';

$(() => {

	// small timeout
	setTimeout(() => {

		chrome.runtime.sendMessage({
		    from:    'trello',
		    subject: 'status'
		});

		// check if popup already open
		if(window.location.href.match(/(trello.com\/c)/g)) checkCardOpen();

	}, 500);

	$('.list-card').not('.js-open-quick-card-editor').on('click', () => {
		checkCardOpen();
	});


});

const checkCardOpen = () => {

	let $cardWindow = $('.window-module.other-actions .u-clearfix');

	let cardInterval = setInterval(() => {

		if($cardWindow.length) {

			addActions($cardWindow);
			sortActions();
			clearInterval(cardInterval);

		}

	}, 100);

}

const sortActions = () => {

	var tabbedNav = '<div class="tabbed-pane-nav"><ul>';
	tabbedNav += '<li class="tabbed-pane-nav-item"><a class="tabbed-pane-nav-item-button active js-all">All</a></li>';
	tabbedNav += '<li class="tabbed-pane-nav-item"><a class="tabbed-pane-nav-item-button js-comments">Comments</a></li>';
	tabbedNav += '<li class="tabbed-pane-nav-item"><a class="tabbed-pane-nav-item-button js-other">Other</a></li>';
	tabbedNav += '</ul></div>';

	var tabbedContent = '<div class="tabbed-panes">';
	tabbedContent += '<div class="tab-pane js-tab-all"></div>';
	tabbedContent += '<div style="display: none;" class="tab-pane js-tab-comments"></div>';
	tabbedContent += '<div style="display: none;" class="tab-pane js-tab-other"></div>';

	var allActions = [];
	var commentActions = [];
	var otherActions = [];

	$('.js-list-actions').before(tabbedNav + tabbedContent);
	$('.js-list-actions').hide();

	// @todo add interval to show new actions comments/change etc
	// total length of items
	// if it changes add to array

	$('.js-list-actions > div').each(function(e) {

		if($(this).hasClass('mod-comment-type')) {
			commentActions.push($(this));
		} else {
			otherActions.push($(this));
		}

		allActions.push($(this));
		$(this).appendTo($('.js-tab-all'));

	});

	$('body').on('click', '.js-all', (e) => {
		for (var i = 0; i < allActions.length; i++) {
			allActions[i].appendTo($('.js-tab-all'))
		}
		$('.tabbed-pane-nav-item-button').removeClass('active');
		$('.js-all').addClass('active');
		$('.tab-pane').hide();
		$('.js-tab-all').show();
	});

	$('body').on('click', '.js-comments', (e) => {
		for (var i = 0; i < commentActions.length; i++) {
			commentActions[i].appendTo($('.js-tab-comments'));
		}
		$('.tabbed-pane-nav-item-button').removeClass('active');
		$('.js-comments').addClass('active');
		$('.tab-pane').hide();
		$('.js-tab-comments').show();
	});

	$('body').on('click', '.js-other', (e) => {
		for (var i = 0; i < otherActions.length; i++) {
			otherActions[i].appendTo($('.js-tab-other'));
		}
		$('.tabbed-pane-nav-item-button').removeClass('active');
		$('.js-other').addClass('active');
		$('.tab-pane').hide();
		$('.js-tab-other').show();
	});

}

const addActions = ($cardWindow) => {

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

}

const timerStart = (timerData, timerDates) => {

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

const timerLog = (timerData, timerDates) => {

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