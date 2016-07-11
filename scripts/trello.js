
//this application only has one component: app
var app = {};

var orginal = {
	loggedIn: m.prop(false),
	boards: [],
	cards: [],
	current: {
		card: m.prop(''),
		board: m.prop(''),
	}
}

var user = {
	loggedIn: m.prop(false),
	boards: [],
	cards: [],
	current: {
		card: m.prop(localStorage.getItem('currentCard')),
		board: m.prop(localStorage.getItem('currentBoard'))
	}
}

//the controller defines what part of the model is relevant for the current page
//in our case, there's only one view-model that handles everything
app.controller = function() {

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
						Trello.deauthorize();
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
				m('.ui icon button tiny', {
					onclick: (e) => {
						e.preventDefault();
						
					}
				}, [
					m('i.play icon')
				])
			])
		}
		return markup;
	}
}

var userCards = {
    view: function(ctrl, args) {
    	var markup = m('');
    	if(user.cards.length) {
    		markup = m('', [
				m('.ui sub header', 'Cards'),
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
					m('option[value=""]', 'Select'),
			        user.cards.map(function(card, index) {
			        	if(!card.closed) {
			                if(card.id == user.current.card()) return m('option[value="'+card.id+'"][selected="selected"]', card.name)
			                else return m('option[value="'+card.id+'"]', card.name)
			            }
			        })
			    ]),
			    m(userActions)
			])
    	}
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
					m('option[value=""]', 'Select'),
			        user.boards.map(function(board, index) {
			        	if(!board.closed) {
			                if(board.id == user.current.board()) return m('option[value="'+board.id+'"][selected="selected"]', board.name)
			                else return m('option[value="'+board.id+'"]', board.name)
			            }
			        })
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

	updateLoggedIn();

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

var getCards = (id) => {

	return new Promise((resolve) => {

		if(!id || id == null) {
			resolve([]);
		} else {

			Trello.get("boards/"+id+"/cards/all", (cards) => {
		        resolve(cards);
		    });

		}

	});

}

var getBoards = () => {

	return new Promise((resolve) => {

		Trello.get("members/me/boards/all", (boards) => {
	        resolve(boards);
	    });

	});

}

var updateLoggedIn = () => {

	m.startComputation();

	Trello.setKey('f8af011952b5693e6a92da65bf6f298e');

	Trello.authorize({
        name: "Trello Helper Extension",
        expiration: "never",
        interactive: false,
        scope: {read: true, write: true},
        success: () => {

			user.loggedIn(true);
            getBoards().then((boards) => {
            	user.boards = boards;
            	getCards(user.current.board()).then((cards) => {
	            	user.cards = cards;
	            	m.endComputation();
	            });
            });

        },
        error: () => {
           	m.endComputation();
        }
    });

}

//initialize the application
m.mount(document.body, {controller: app.controller, view: app.view});


