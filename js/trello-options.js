
//this application only has one component: app
var app = {};

var orginal = {
	loggedIn: m.prop(false),
	boards: [],
	cards: [],
	current: {
		card: m.prop(''),
		board: m.prop(''),
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
				m('.ui divider'),
				playButton(),
				pauseButton(),
				stopButton(),
				timerClock()
			])

			function timerClock() {

				if(user.timer.started()) {
					// return m('', user.)
				}

			}

			function pauseButton() {

				if(user.timer.started() && !user.timer.paused()) {
					return m('.ui icon button tiny', {
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
					return m('.ui icon button tiny', {
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
					return m('.ui icon button tiny', {
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
					return m('.ui icon button tiny', {
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
    view: function(ctrl, args) {
    	var markup = m('');
    	//if(user.cards.length) {
    		markup = m('', [
			    m(userActions),
				m('.ui sub header', 'Cards'),
				m('.ui two column middle aligned very relaxed stackable grid', [
					m('.column', [
						m("select.ui fluid search dropdown", { config: function(element, isInitialized) {

				            if (!isInitialized) {
				            	$(element).dropdown({
					            	onChange: function(value, text, $selectedItem) {
					            		m.startComputation();
								      	user.current.card(value);
								      	chrome.runtime.sendMessage({
									    	from: 'trello',
										    subject: 'set',
										    label: 'currentCard',
										    value: value
										});
								      	m.endComputation();
								    }
					            });
				            }

				        } }, [
							m('option[value=""]', 'Select Card'),
					        user.cards.map(function(card, index) {
					        	if(!card.closed) {
					                if(card.id == user.current.card()) return m('option[value="'+card.id+'"][selected="selected"]', card.name)
					                else return m('option[value="'+card.id+'"]', card.name)
					            }
					        })
					    ])
					]),
					m('.ui vertical divider', 'Or'),
					m('.center aligned column', [
					    m('.ui search', { config: function(element, isInitialized) {

				            if (!isInitialized) {

				            	$(element).search({
							    	apiSettings : {
							    		onResponse: function(data) {
							    			var response = {
									            results : data.cards
									        };
							    			return response;
							    		},
							    		url: 'https://trello.com/1/search?query={query}&modelTypes=cards'
							    	},
							    	minCharacters : 3,
						    		fields: {
								      	title : 'name'
								    },
							        onSelect: function(result, response) {
							        	let value = result.id;
							        	m.startComputation();
								      	user.current.card(value);
								      	chrome.runtime.sendMessage({
									    	from: 'trello',
										    subject: 'set',
										    label: 'currentCard',
										    value: value
										});
								      	m.endComputation();
							        }
							    });

				            }

				        } }, [
					      	m('.ui icon input', [
					        	m('input.prompt[type="text"][placeholder="Search All Cards"]'),
					        	m('i.search link icon')
					      	]),
					        m('.results')
					    ])
					])
				])
			])
    	//}
		return markup;
    }
}

var userBoards = {
    view: function(ctrl, args) {
    	var markup = m('');
    	if(user.boards.length > 0) {
    		markup = m('', [
				m(userCards),
				m('.ui sub header', 'Boards'),
				m('.ui two column middle aligned very relaxed stackable grid', [
					m('.column', [
						m("select.ui fluid search dropdown", { config: function(element, isInitialized) {

				            if (!isInitialized) {
				            	$(element).dropdown({
					            	onChange: function(value, text, $selectedItem) {
								      	user.current.board(value);
								      	chrome.runtime.sendMessage({
									    	from: 'trello',
										    subject: 'set',
										    label: 'currentBoard',
										    value: value
										});
								      	getCards(value).then((cards) => {
								      		m.startComputation();
							            	user.cards = cards;
							            	m.endComputation();
							            });
								    }
					            });
				            }

				        } }, [
							m('option[value=""]', 'Select Board'),
					        user.boards.map(function(board, index) {
					        	if(!board.closed) {
					                if(board.id == user.current.board()) return m('option[value="'+board.id+'"][selected="selected"]', board.name)
					                else return m('option[value="'+board.id+'"]', board.name)
					            }
					        })
					    ])
					]),
					m('.ui vertical divider', 'Or'),
					m('.center aligned column', [
						m('.ui search', { config: function(element, isInitialized) {

					            if (!isInitialized) {

					            	$(element).search({
								    	apiSettings : {
								    		onResponse: function(data) {
								    			var response = {
										            results : data.boards
										        };
								    			return response;
								    		},
								    		url: 'https://trello.com/1/search?query={query}&modelTypes=boards'
								    	},
								    	minCharacters : 3,
							    		fields: {
									      	title   : 'name'
									    },
								        onSelect: function(result, response) {
								        	let value = result.id;
								        	user.current.board(value);
									      	chrome.runtime.sendMessage({
										    	from: 'trello',
											    subject: 'set',
											    label: 'currentBoard',
											    value: value
											});
									      	getCards(value).then((cards) => {
									      		m.startComputation();
								            	user.cards = cards;
								            	m.endComputation();
								            });
								        }
								    });

					            }

					        } }, [
					      	m('.ui icon input', [
					        	m('input.prompt[type="text"][placeholder="Search All Boards"]'),
					        	m('i.search link icon')
					      	]),
					        m('.results')
					    ])
					])
				]),
			    m('.ui hidden divider')
			])
    	}
		return markup;
    }
}

//here's the view
app.view = function() {
    return [
    	m('.ui hidden divider'),
    	m('main.ui container', [
    		m(userBoards),
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

//initialize the application
m.mount(document.body, {controller: app.controller, view: app.view});


