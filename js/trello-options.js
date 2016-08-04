
var $body = $('body');

//this application only has one component: app
var app = {};

var orginal = {
	loggedIn: m.prop(false),
	boards: [],
	cards: [],
	lists: [],
	card: {},
	current: {
		card: m.prop(''),
		board: m.prop(''),
		list: m.prop('')
	},
	timer: {
		id: m.prop(''),
		started: m.prop(false),
		paused: m.prop(false)
	}
}

var user = {
	loggedIn: m.prop(false),
	boards: [],
	cards: [],
	lists: [],
	card: {},
	current: {
		card: m.prop(localStorage.getItem('currentCard')),
		board: m.prop(localStorage.getItem('currentBoard')),
		list: m.prop(localStorage.getItem('currentList'))
	},
	timer: {
		id: m.prop(localStorage.getItem('timerID')),
		started: m.prop(localStorage.getItem('timerStarted')),
		paused: m.prop(localStorage.getItem('timerPaused'))
	}
}

var showCards = () => {

	$body.addClass('is-open');
	$('.js-list').removeClass('is-active');
	$('.js-list.change-card').addClass('is-active');
	$('.js-board, .js-list').addClass('is-hidden');
	$('.js-card').removeClass('is-hidden');

}

var showLists = () => {

	$body.addClass('is-open');
	$('.js-list').removeClass('is-active');
	$('.js-list.change-list').addClass('is-active');
	$('.js-card, .js-board').addClass('is-hidden');
	$('.js-list').removeClass('is-hidden');

}

var showBoards = () => {

	$body.addClass('is-open');
	$('.js-list').removeClass('is-active');
	$('.js-list.change-board').addClass('is-active');
	$('.js-card, .js-list').addClass('is-hidden');
	$('.js-board').removeClass('is-hidden');

}

var getTrelloCard = (id) => {

	return new Promise((resolve) => {

		if(!id || id == null) {
			resolve([]);
		} else {

			chrome.runtime.sendMessage({
			    from:    'trello',
			    subject: 'getCard',
			    value: id
			}, function(response) {
				resolve(response);
			});

		}

	});f

}

var checkAuth = {
	view: function(ctrl, args) {
		var output = m('.interface.logged-out', [
			m('span.connect', { onclick: function(e){
				e.preventDefault();
				setAuth();
			} }, 'Connect to Trello')
		])
		if(user.loggedIn()) {
			output = m('', [
				m('.interface', [
					m('span.toggle-settings', { onclick: function(){
						$('.interface').toggleClass('is-open');
						$('body').removeClass('is-open');
					} }, [
						m('span.dot')
					]),
					m.component(userActions),
				]),
				m.component(userMenu),
				m.component(userBoards),
				m.component(userLists),
				m.component(userCards)
			]);
		}
		return output;
	}
}

var userMenu = {
	view: function(ctrl, args) {
		var markup = m('');
		markup = m('.user-menu', [
			m('span.js-list item change-board[title="Change Board"]', { onclick: function(){
				showBoards();
			} }, 'B', [
				m('span.tiny', 'oard')
			]),
			m('span.js-list item change-list[title="Change List"]', { onclick: function(){
				showLists();
			} }, 'L', [
				m('span.tiny', 'ist')
			]),
			m('span.js-list item change-card[title="Change Card"]', { onclick: function(){
				showCards();
			} }, 'C', [
				m('span.tiny', 'ard')
			]),
			m('span.item disconnect[title="Disconnect"]', { onclick: function(e){
				e.preventDefault();
				if(user.timer.started() == true) timerLog('Timer stopped - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'stopped', 'time': moment()});
				user = orginal;
				chrome.runtime.sendMessage({
				    from: 'trello',
				    subject: 'clear'
				}, function(response) {
					updateLoggedIn();
				});
				$body.removeClass('is-open');
				$('.interface').removeClass('is-open');
				m.redraw();
			} }, 'D', [
				m('span.tiny', 'isconnect')
			]),
		]);
		return markup;
	}
}

var userActions = {
	view: function(ctrl, args) {
		var markup = m('');
		if(user.current.card()) {

			markup = m('span.actions', [
				currentCard(),
				m('span.user-actions', [
					playButton(),
					pauseButton(),
					stopButton(),
					timerClock()
				])
			])

			function currentCard() {
				if(user.card) {
					return m('span.name', m.trust('<a target="_blank" href="' +user.card.shortUrl+ '" title="' +user.card.name+ '">' + truncate.apply(user.card.name, [30, true]) + '</a>'))
				}

			}

			function timerClock() {

				if(user.timer.started() == true) {
					// return m('', user.)
				}

			}

			function pauseButton() {

				if(user.timer.started() == true && user.timer.paused()!= true) {
					return m('span.icon button [title="Pause"]', {
						onclick: (e) => {
							e.preventDefault();
							user.timer.paused(true);
							chrome.runtime.sendMessage({
						    	from: 'trello',
							    subject: 'set',
							    label: 'timerPaused',
							    value: true
							});
							// set comments time
							timerLog('Timer paused - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'paused', 'time': moment()});
						}
					}, [
						m('i.pause icon')
					])
				}

			}

			function stopButton() {

				if(user.timer.started() == true) {
					return m('.icon button[title="Stop"]', {
						onclick: (e) => {
							e.preventDefault();
							// set comments time
							user.timer.started(false);
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
							chrome.runtime.sendMessage({
						    	from: 'trello',
							    subject: 'timerStop'
							}, function(response) { console.log(response) });
						}
					}, [
						m('i.stop icon')
					])
				}

			}

			function playButton() {

				if(user.timer.started() != true) {
					return m('.icon button [title="Start"]', {
						onclick: (e) => {
							e.preventDefault();
							// clear out data
							timerDates = [];
							timerData = [];
							user.timer = orginal.timer;
							// set initial comments time
							user.timer.started(true);
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
						}
					}, [
						m('i.play icon')
					])
				}

				if(user.timer.started() == true && user.timer.paused() == true) {
					return m('.icon button [title="Resume"]', {
						onclick: (e) => {
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
							user.timer.paused(false);
							// set comments time
							timerLog('Timer resumed - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'play', 'time': moment()});
						}
					}, [
						m('i.play icon')
					])
				}

			}

		}
		return markup;
	}
}

var timerLog = (timerData, timerDates) => {

	return new Promise((resolve) => {

		chrome.runtime.sendMessage({
		    from: 'trello',
		    subject: 'timerLog',
		    value: {
		    	card: user.current.card(),
		    	comment: user.timer.id()
		    },
		    data: timerData,
		    dates: timerDates
		}, function(response) {
			resolve(response);
		});

	});

}

var timerStart = (timerData, timerDates) => {

	return new Promise((resolve) => {

		chrome.runtime.sendMessage({
		    from: 'trello',
		    subject: 'timerStart',
		    value: user.current.card(),
		    data: timerData,
		    dates: timerDates
		}, function(response) {
			user.timer.id(response.id);
			resolve(response);
		});

	});

}

var userCards = {
	getCard: function() {
		if(user.current.card()) {
			getTrelloCard(user.current.card()).then((card) => {
				user.card = card;
				$body.removeClass('is-open');
				$('.interface').removeClass('is-open');
				m.redraw();
			});
		}
	},
	controller: function() {
		var ctrl = this;
		ctrl.changeCard = function(value, text, $selectedItem) {
			if(user.timer.started() != true) {
				user.current.card(value);
				chrome.runtime.sendMessage({
			    	from: 'trello',
				    subject: 'set',
				    label: 'currentCard',
				    value: value
				});
				userCards.getCard();
			} else {
				alert('Time log already running!');
			}
		}
	},
    view: function(ctrl, args) {
    	var data = {
    		data: user.cards,
          	value: user.current.card,
          	onchange: ctrl.changeCard,
          	label: 'Card',
    		addClass: 'js-card',
          	placeholder: 'Please select a list'
    	}
    	if(!user.current.board()) data.addClass += ' disabled';
    	var markup = m.component(Select, data);
		return markup;
    }
}

userCards.getCard();

var userLists = {
	controller: function() {
		this.changeList = function(value, text, $selectedItem) {
			chrome.runtime.sendMessage({
		    	from: 'trello',
			    subject: 'set',
			    label: 'currentList',
			    value: value
			});
			user.card = '';
			user.current.card('');
			user.current.list(value);
			getCards(value).then((cards) => {
				m.startComputation();
				user.cards = cards;
				m.endComputation();
				showCards();
			});
		}
	},
    view: function(ctrl, args) {
		var markup = m.component(Select, {
          	data: user.lists,
          	value: user.current.list,
          	onchange: ctrl.changeList,
          	label: 'List',
          	addClass: 'js-list',
          	placeholder: 'Please select a board'
        });
		return markup;
    }
}

var userBoards = {
	controller: function() {
		this.changeBoard = function(value, text, $selectedItem) {
			if(user.timer.started() != true) {
				chrome.runtime.sendMessage({
			    	from: 'trello',
				    subject: 'set',
				    label: 'currentBoard',
				    value: value
				});
				user.current.card('');
				user.current.board(value);
				getLists(value).then((lists) => {
					m.startComputation();
					user.lists = lists;
					user.cards = [];
					m.endComputation();
					showLists();
				});
			} else {
				alert('Time log already running!');
			}
		}
	},
    view: function(ctrl, args) {
    	var markup = m.component(Select, {
          	data: user.boards,
          	value: user.current.board,
          	onchange: ctrl.changeBoard,
          	label: 'Board',
          	addClass: 'js-board',
          	placeholder: 'Please connect to trello'
        });
		return markup;
    }
}

var Select = {
	//    Returns a select box
    view: function(ctrl, attrs) {
        //Create a Select progrssively enhanced SELECT element
        return m('.select is-hidden ' + attrs.addClass, [
			m('.menu', [
				Select.items(attrs)
			])
        ]);
    },
    items: function(ctrl) {
    	var selectedId = ctrl.value();
    	if(ctrl.data.length) {
    		return m('.scrolling menu', [
				ctrl.data.map(function(item, index) {
		        	if(!item.closed) {
		        		var activeClass = (selectedId == item.id) ? ' is-active' : '';
		                return m('a.item'+activeClass+'[data-id="'+item.id+'"][title="'+item.name+'"]', {
		                	onclick: function(e) {
		                		e.preventDefault();
		                		var value = $(this).data().id;
						    	var text = $(this).text();
						    	ctrl.onchange(value, text, $(this));
						    	m.withAttr('value', ctrl.value);
		                	}
		                }, m.trust(truncate.apply(item.name, [30, true])))
		            }
		        })
		    ])
		} else {
			return m('.scrolling menu', [
				m('.item', ctrl.placeholder)
			])
		}
    }
}

//here's the view
app.view = function() {
    return [
		m.component(checkAuth)
    ]
};


$(() => {

	chrome.runtime.sendMessage({
	    from:    'trello',
	    subject: 'runSync'
	}, function(response) {

		user = {
			loggedIn: m.prop(false),
			boards: [],
			cards: [],
			lists: [],
			current: {
				card: m.prop(localStorage.getItem('currentCard')),
				board: m.prop(localStorage.getItem('currentBoard')),
				list: m.prop(localStorage.getItem('currentList'))
			},
			timer: {
				id: m.prop(localStorage.getItem('timerID')),
				started: m.prop(localStorage.getItem('timerStarted')),
				paused: m.prop(localStorage.getItem('timerPaused'))
			}
		}

		//initialize the application
		m.mount(document.body, app);

		updateLoggedIn();

	});

	$('body').on('click', '.result', function(e){
		e.preventDefault();
		e.stopPropagation();
	});

})

chrome.runtime.onMessage.addListener((msg, sender) => {

	if ((msg.from === 'trello') && (msg.subject === 'update')) updateLoggedIn();

});

var setAuth = () => {

	chrome.runtime.sendMessage({
	    from:    'trello',
	    subject: 'showApp'
	});

}

var getLists = (id) => {

	return new Promise((resolve) => {

		if(!id || id == null) {
			resolve([]);
		} else {

			chrome.runtime.sendMessage({
			    from:    'trello',
			    subject: 'getLists',
			    value: id
			}, function(response) {
				resolve(response);
			});

		}

	});

}

var getCards = (id) => {

	return new Promise((resolve) => {

		if(!id || id == null) {
			resolve([]);
		} else {

			chrome.runtime.sendMessage({
			    from:    'trello',
			    subject: 'getCards',
			    value: id
			}, function(response) {
				resolve(response);
			});

		}

	});

}

var getBoards = () => {

	return new Promise((resolve) => {

		chrome.runtime.sendMessage({
		    from:    'trello',
		    subject: 'getBoards'
		}, function(response) {
			resolve(response);
		});

	});

}

var updateLoggedIn = () => {

	m.startComputation();

	chrome.runtime.sendMessage({
	    from:    'trello',
	    subject: 'status'
	}, function(response) {

		if(response) {
			user.loggedIn(response);
            getBoards().then((boards) => {
            	user.boards = boards;
            	getLists(user.current.board()).then((lists) => {
	            	user.lists = lists;
	            	getCards(user.current.list()).then((cards) => {
		            	user.cards = cards;
		            	m.endComputation();
		            });
	            });
            });
		} else {
			user.loggedIn(response);
		}

		m.endComputation();

	});

}

function truncate( n, useWordBoundary ){
    var isTooLong = this.length > n,
        s_ = isTooLong ? this.substr(0,n-1) : this;
        s_ = (useWordBoundary && isTooLong) ? s_.substr(0,s_.lastIndexOf(' ')) : s_;
    return  isTooLong ? s_ + '&hellip;' : s_;
};



