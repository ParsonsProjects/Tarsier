
//this application only has one component: app
var app = {};

var orginal = {
	loggedIn: m.prop(false),
	boards: [],
	cards: [],
	card: {},
	current: {
		card: m.prop(''),
		board: m.prop('')
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
	card: {},
	current: {
		card: m.prop(localStorage.getItem('currentCard')),
		board: m.prop(localStorage.getItem('currentBoard'))
	},
	timer: {
		id: m.prop(localStorage.getItem('timerID')),
		started: m.prop(localStorage.getItem('timerStarted')),
		paused: m.prop(localStorage.getItem('timerPaused'))
	}
}

var checkAuth = {
	view: function(ctrl, args) {
		var output = m('', [
			m('h4.ui dividing header', 'Connect to Trello'),
			m('a.ui primary button', {
				onclick: (e) => {
					e.preventDefault();
					setAuth();
				}
			}, 'Connect')
		])
		if(user.loggedIn()) {
			output = m('', [
				m('h4.ui dividing header', 'Connected to Trello'),
				m('a.ui primary button', {
					onclick: (e) => {
						e.preventDefault();
						user = orginal;
						timerLog('Timer stopped - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'stopped', 'time': moment()});
						chrome.runtime.sendMessage({
						    from: 'trello',
						    subject: 'clear'
						});
					}
				}, 'Disconnect')
			]);
		}
		return output;
	}
}

var userActions = {
	view: function(ctrl, args) {
		var markup = m('');
		if(user.current.card()) {

			markup = m('.buttons', [
				currentCard(),
				m('.ui divider'),
				m('.ui buttons tiny', [
					playButton(),
					pauseButton(),
					stopButton(),
					timerClock()
				]),
				m('.ui hidden divider')
			])

			function currentCard() {

				if(user.card) {
					return m('', m.trust('<strong>Selected Card:</strong> ' + user.card.name))
				}

			}

			function timerClock() {

				if(user.timer.started()) {
					// return m('', user.)
				}

			}

			function pauseButton() {

				if(user.timer.started() && !user.timer.paused()) {
					return m('.ui icon button tiny[title="Pause"]', {
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

				if(user.timer.started()) {
					return m('.ui icon button tiny[title="Stop"]', {
						onclick: (e) => {
							e.preventDefault();
							// set comments time
							user.timer.started(false);
							timerLog('Timer stopped - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'stopped', 'time': moment()});
						}
					}, [
						m('i.stop icon')
					])
				}

			}

			function playButton() {

				if(!user.timer.started()) {
					return m('.ui icon button tiny[title="Start"]', {
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
							timerStart('Timer started - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'play', 'time': moment()});
						}
					}, [
						m('i.play icon')
					])
				}

				if(user.timer.started() && user.timer.paused()) {
					return m('.ui icon button tiny[title="Resume"]', {
						onclick: (e) => {
							e.preventDefault();
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
		return markup
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
		});

		chrome.runtime.onMessage.addListener((msg, sender) => {

			if ((msg.from === 'background') && (msg.subject === 'timerLog')) {
				resolve(msg.value);
				if(!user.timer.started()) {
					chrome.runtime.sendMessage({
				    	from: 'trello',
					    subject: 'timerStop'
					});
				}
			}

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
		});

		chrome.runtime.onMessage.addListener((msg, sender) => {

			if ((msg.from === 'background') && (msg.subject === 'timerStart')) {
				user.timer.id(msg.value.id);
				resolve(msg.value);
			}

		});

	});

}

var userCards = {
	getCard: function() {
		if(user.current.card()) {
			m.request({method: 'GET', url: 'https://trello.com/1/search?query='+user.current.card()+'&modelTypes=cards'}).then((data) => {
				user.card = data.cards[0];
			});
		}
	},
	controller: function() {
		var ctrl = this;
		ctrl.changeCard = function(value) {
			if(!user.timer.started()) {
				user.current.card(value);
				chrome.runtime.sendMessage({
			    	from: 'trello',
				    subject: 'set',
				    label: 'currentCard',
				    value: value
				});
				setTimeout(function(){
					userCards.getCard();
				}, 1000);
			} else {
				alert('Time log already running!');
			}
		}
	},
    view: function(ctrl, args) {
    	var markup = m.component(Select, {
          	data: user.cards,
          	value: user.current.card,
          	onchange: ctrl.changeCard,
          	label: 'Card'
        });
		return markup;
    }
}

userCards.getCard();

var userBoards = {
	controller: function() {
		this.changeBoard = function(value) {
			if(!user.timer.started()) {
				chrome.runtime.sendMessage({
			    	from: 'trello',
				    subject: 'set',
				    label: 'currentBoard',
				    value: value
				});
				setTimeout(function(){
					user.current.card('');
					user.current.board(value);
					getCards(value).then((cards) => {
						m.startComputation();
						user.cards = cards;
						m.endComputation();
					});
				}, 1000);
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
          	label: 'Board'
        });
		return markup;
    }
}

var Select = {
	//    Returns a select box
    view: function(ctrl, attrs) {
        var selectedId = attrs.value();
        //Create a Select progrssively enhanced SELECT element
        return m('.ui dropdown button', {config: Select.config(attrs)}, [
			m('span.text', 'Select ' + attrs.label),
			m('.menu', [
				m('.ui icon search input', [
					m('i.search icon'),
					m('input[type="text"][placeholder="Search '+attrs.label+'"]')
				]),
				m('.scrolling menu', [
					attrs.data.map(function(item, index) {
			        	if(!item.closed) {
			                return m('.item[data-id="'+item.id+'"]', m.trust(truncate.apply(item.name, [30, true])))
			            }
			        })
				])
			])
        ]);
    },
    /**
    Select config factory. The params in this doc refer to properties of the `ctrl` argument
    @param {Object} data - the data with which to populate the <option> list
    @param {prop} value - the prop of the item in `data` that we want to select
    @param {function(Object id)} onchange - the event handler to call when the selection changes.
        `id` is the the same as `value`
    */
    //    Note: The config is never run server side.
    config: function(ctrl) {
        return function(element, isInitialized) {

            var el = $(element);
            if (!isInitialized) {

                el.dropdown({
                	fullTextSearch: true,
                	context: '#main-view',
	            	onChange: function(value, text, $selectedItem) {
	            		var value = $selectedItem.data().id;
				      	ctrl.onchange(value);
				    }
	            });

            }
            el.val(ctrl.value()).trigger("change");

        };
    }
}

//here's the view
app.view = function() {
    return [
    	m('.ui hidden divider'),
    	m('main#main-view.ui container', [
    		m(userActions),
			m(userBoards),
			m(userCards),
			m('.ui hidden divider'),
    		m(checkAuth)
    	]),
    	m('.ui hidden divider')
    ]
};


$(() => {

	chrome.runtime.sendMessage({
	    from:    'trello',
	    subject: 'runSync'
	});

	$('body').on('click', '.result', function(e){
		e.preventDefault();
		e.stopPropagation();
	});

})

chrome.runtime.onMessage.addListener((msg, sender) => {

	if ((msg.from === 'trello') && (msg.subject === 'update')) updateLoggedIn();
	if ((msg.from === 'background') && (msg.subject === 'synced')) {
		user = {
			loggedIn: m.prop(false),
			boards: [],
			cards: [],
			current: {
				card: m.prop(localStorage.getItem('currentCard')),
				board: m.prop(localStorage.getItem('currentBoard'))
			},
			timer: {
				id: m.prop(localStorage.getItem('timerID')),
				started: m.prop(localStorage.getItem('timerStarted')),
				paused: m.prop(localStorage.getItem('timerPaused'))
			}
		}
		updateLoggedIn();
	}

});

var setAuth = () => {

	chrome.runtime.sendMessage({
	    from:    'trello',
	    subject: 'showApp'
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
			});

			chrome.runtime.onMessage.addListener((msg, sender) => {

				if ((msg.from === 'background') && (msg.subject === 'getCards')) {
					resolve(msg.value);
				}

			});

		}

	});

}

var getBoards = () => {

	return new Promise((resolve) => {

		chrome.runtime.sendMessage({
		    from:    'trello',
		    subject: 'getBoards'
		});

		chrome.runtime.onMessage.addListener((msg, sender) => {

			if ((msg.from === 'background') && (msg.subject === 'getBoards')) {
				resolve(msg.value);
			}

		});

	});

}

var updateLoggedIn = () => {

	m.startComputation();

	chrome.runtime.sendMessage({
	    from:    'trello',
	    subject: 'status'
	});

	chrome.runtime.onMessage.addListener((msg, sender) => {

		if ((msg.from === 'background') && (msg.subject === 'status')) {

			if(msg.value) {
				user.loggedIn(msg.value);
	            getBoards().then((boards) => {
	            	user.boards = boards;
	            	getCards(user.current.board()).then((cards) => {
		            	user.cards = cards;
		            	m.endComputation();
		            });
	            });
			} else {
				user.loggedIn(msg.value);
			}

			m.endComputation();

		}

	});

}

function truncate( n, useWordBoundary ){
    var isTooLong = this.length > n,
        s_ = isTooLong ? this.substr(0,n-1) : this;
        s_ = (useWordBoundary && isTooLong) ? s_.substr(0,s_.lastIndexOf(' ')) : s_;
    return  isTooLong ? s_ + '&hellip;' : s_;
};

//initialize the application
m.mount(document.body, app);


