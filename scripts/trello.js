

//this application only has one component: app
var app = {};

//the view-model tracks a running list of apps,
//stores a description for new apps before they are created
//and takes care of the logic surrounding when adding is permitted
//and clearing the input after adding a app to the list
app.vm = (function() {
    var vm = {}
    vm.init = function() {
        vm.auth = m.prop(false);
    }
    return vm
}())

//the controller defines what part of the model is relevant for the current page
//in our case, there's only one view-model that handles everything
app.controller = function() {
    app.vm.init()
}

app.checkAuth = function() {
	if(app.vm.auth()) {
		return [
			m('h4.ui dividing header', 'Connected to Trello'),
			m('a.ui primary button', {
				onclick: (e) => {
					e.preventDefault();
					Trello.deauthorize();
					localStorage.removeItem('trello_token');
					updateLoggedIn();
				}
			}, 'Disconnect')
		]
	} else {
		return [
			m('h4.ui dividing header', 'Connect to Trello'),
			m('a.ui primary button', {
				onclick: (e) => {
					e.preventDefault();
					setAuth();
				}
			}, 'Connect')
		]
	}
}

//here's the view
app.view = function() {
    return [
    	m('.ui hidden divider'),
    	m('main.ui container', [
    		app.checkAuth()
    	])    	
    ]
};


$(() => {

	updateLoggedIn();

})

chrome.runtime.onMessage.addListener((msg, sender) => {

	if ((msg.from === 'trello') && (msg.subject === 'token')) {

		updateLoggedIn();

	    Trello.members.get("me", function(member){
	    	console.log(member);
	    });

	    Trello.get("members/me/boards", function(boards) {
            console.log(boards);
        });

	}

})

var saveOptions = () => {

}

var restoreOptions = () => {

}

var setAuth = () => {

	chrome.runtime.sendMessage({
	    from:    'trello',
	    subject: 'showApp'
	});

}

var updateLoggedIn = () => {
	Trello.setKey('f8af011952b5693e6a92da65bf6f298e');
	Trello.authorize({
        name: "Trello Helper Extension",
        expiration: "never",
        interactive: false,
        scope: {read: true, write: true},
        success: () => {
            app.vm.auth(true);
            m.redraw();
        },
        error: () => {
            app.vm.auth(false);
            m.redraw();
        }
    });
}

//initialize the application
m.mount(document.body, {controller: app.controller, view: app.view});

