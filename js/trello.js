
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
		if(window.location.href.match(/(trello.com\/c)/g)) cardOpen();

	}, 500);

	$('.window').addClass('full-width');

	$('.list-card').not('.js-open-quick-card-editor').on('click', () => {
		cardOpen();
	});



});

const cardOpen = () => {

	addActions();
	sortActions();

}

const sortActions = () => {

	let tabbedNav = '<div class="tabbed-pane-nav"><ul style="text-align: left;">';
	tabbedNav += '<li class="tabbed-pane-nav-item"><a data-type="all" class="tabbed-pane-nav-item-button active js-all">All</a></li>';
	tabbedNav += '<li class="tabbed-pane-nav-item"><a data-type="comments" class="tabbed-pane-nav-item-button js-comments">Comments</a></li>';
	tabbedNav += '<li class="tabbed-pane-nav-item"><a data-type="time" class="tabbed-pane-nav-item-button js-time">Time Log</a></li>';
	tabbedNav += '<li class="tabbed-pane-nav-item"><a data-type="other" class="tabbed-pane-nav-item-button js-other">Activity</a></li>';
	tabbedNav += '</ul></div>';

	let tabbedContent = '<div class="tabbed-panes">';
	tabbedContent += '<div class="tab-pane js-tab-all"></div>';
	tabbedContent += '<div style="display: none;" class="tab-pane js-tab-comments"></div>';
	tabbedContent += '<div style="display: none;" class="tab-pane js-tab-time"></div>';
	tabbedContent += '<div style="display: none;" class="tab-pane js-tab-other"></div>';

	let allActions = [];
	let commentActions = [];
	let otherActions = [];
	let timeActions = [];
	let observer;

	$('.js-list-actions').before(tabbedNav + tabbedContent);

	let cardInterval = setInterval(() => {

		if(!$('.js-loading-card-actions').is(':visible')) {

			init();

			function init() {
				loopActions();
			 	showAll();
				var callback = $('.tabbed-pane-nav-item-button.active').data('type');
			 	if(callback == 'comments') showComments();
			 	if(callback == 'other') showOther();
			 	if(callback == 'time') showTime();
				startObserver();
			}

			function loopActions() {

				allActions = [];
				commentActions = [];
				otherActions = [];
				timeActions = [];
				let $actions = $('.js-list-actions > .phenom');
				$actions.each(function(e) {

					if($(this).hasClass('mod-comment-type')) {
						if($(this).find('.comment-box-input').val().match('#TarsierTimeLog')) {
							timeActions.push($(this));
						} else {
							commentActions.push($(this));
						}
					} else {
						otherActions.push($(this));
					}

					allActions.push($(this));

				});

			}

			function startObserver() {

				//http://www.skysteve.com/dev/2014/04/01/detecting_dom_changes.html
				//setup our callback function to loop through each mutation and print the number of nodes
				//that have been added and removed
				var fnCallback = function (mutations) {
				 	observer.disconnect();
				 	init();
				};

				observer = new MutationObserver(fnCallback);

				//now create our observer and get our target element
				var elTarget = document.querySelector(".js-list-actions"),
				objConfig = {
				 	childList: true,
				 	subtree : true,
				 	attributes: false,
				 	characterData : false
				};

				//then actually do some observing
				observer.observe(elTarget, objConfig);

			}

			function showTime() {
				$('.js-tab-time').html('');
				if(timeActions.length === 0) $('<div class="phenom mod-other-type u-font-weight-bold">No Time Logs</div>').appendTo($('.js-tab-time'));
				for (var i = 0; i < timeActions.length; i++) {
					timeActions[i].appendTo($('.js-tab-time'))
				}
			}

			function showAll() {
				for (var i = 0; i < allActions.length; i++) {
					allActions[i].appendTo($('.js-tab-all'))
				}
			}

			function showComments() {
				$('.js-tab-comments').html('');
				if(timeActions.length === 0) $('<div class="phenom mod-other-type u-font-weight-bold">No Comments</div>').appendTo($('.js-tab-comments'));
				for (var i = 0; i < commentActions.length; i++) {
					commentActions[i].appendTo($('.js-tab-comments'))
				}
			}

			function showOther() {
				for (var i = 0; i < otherActions.length; i++) {
					otherActions[i].appendTo($('.js-tab-other'))
				}
			}

			function swapTab(tab) {
				$('.js-list-actions').hide();
				$('.tabbed-pane-nav-item-button').removeClass('active');
				$('.js-'+tab).addClass('active');
				$('.tab-pane').hide();
				$('.js-tab-'+tab).show();
			}

			$('.js-time').on('click', (e) => {
				showTime();
				swapTab('time');
			});

			$('.js-all').on('click', (e) => {
				showAll();
				swapTab('all');
			});

			$('.js-comments').on('click', (e) => {
				showComments();
				swapTab('comments');
			});

			$('.js-other').on('click', (e) => {
				showOther();
				swapTab('other');
			});

			clearInterval(cardInterval);

		}

	}, 100);

}

const addActions = () => {

	let $cardWindow = $('.window-module.other-actions .u-clearfix');

	let cardInterval = setInterval(() => {

		if($cardWindow.length) {

			let $startTimerBtn = $('<a class="button-link js-start-timer disabled" href="#"><span class="icon-sm icon-clock"></span> Start Timer</a>').prependTo($cardWindow);
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
					chrome.runtime.sendMessage({
				    	from: 'trello',
					    subject: 'set',
					    label: 'timerPaused',
					    value: false
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
				    label: 'timerStarted',
				    value: true
				});
				chrome.runtime.sendMessage({
			    	from: 'trello',
				    subject: 'set',
				    label: 'timerPaused',
				    value: false
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
				chrome.runtime.sendMessage({
			    	from: 'trello',
				    subject: 'set',
				    label: 'timerPaused',
				    value: false
				});
				timerLog('Timer stopped - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'stopped', 'time': moment()});
				$stopTimerBtn.addClass('hide');
				$pauseTimerBtn.addClass('hide');
				$startTimerBtn.removeClass('hide');
				chrome.runtime.sendMessage({
			    	from: 'trello',
				    subject: 'timerStop'
				}, function(response) { console.log(response) });

			});

			clearInterval(cardInterval);

		}

	}, 100);

}

const timerStart = (timerData, timerDates) => {

	return new Promise((resolve) => {

		chrome.runtime.sendMessage({
		    from: 'trello',
		    subject: 'timerStart',
		    value: cardID,
		    data: timerData,
		    dates: timerDates
		}, function(response) {
			resolve(response);
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
		}, function(response) {
			resolve(response);
		});

	});

}