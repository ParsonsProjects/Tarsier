
const trello = {};

trello.sendMessage = function(data) {

	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	  	chrome.tabs.sendMessage(tabs[0].id, data, function(response) {
	    	console.log(response.farewell);
	  	});
	});

}

trello.runSync = function() {

	chrome.storage.sync.get(function(items) {
		Object.keys(items).forEach(function(key) {
		    localStorage.setItem(key, items[key]);
		});
		chrome.runtime.sendMessage({
		    from: 'background',
		    subject: 'synced'
		});
	});


}

trello.set = function(label, value) {

	chrome.storage.sync.set({label: value}, () => {
		if (chrome.runtime.error) console.log("Runtime error.");
		localStorage.setItem(label, value);
    });

}

trello.clear = function() {

	chrome.storage.sync.clear(() => {
		if (chrome.runtime.error) console.log("Runtime error.");
		localStorage.clear();
		Trello.deauthorize();
		chrome.runtime.sendMessage({
		    from: 'trello',
		    subject: 'update'
		});
    });

}

trello.remove = function(label) {

	chrome.storage.sync.remove(label, function() {
		if (chrome.runtime.error) console.log("Runtime error.");
		localStorage.removeItem(label);
    });

}

trello.getBoards = function() {

	Trello.get("members/me/boards/all", (boards) => {
        chrome.runtime.sendMessage({
		    from: 'background',
		    subject: 'getBoards',
		    value: boards
		});
    });

}

trello.getCards = (id) => {

	Trello.get("boards/"+id+"/cards/all", (cards) => {
        chrome.runtime.sendMessage({
		    from: 'background',
		    subject: 'getCards',
		    value: cards
		});
    });

}

trello.status = function() {

	Trello.setKey('f8af011952b5693e6a92da65bf6f298e');

	Trello.authorize({
        name: "Trello Helper Extension",
        expiration: "never",
        interactive: false,
        scope: {read: true, write: true},
        success: () => {
        	chrome.runtime.sendMessage({
			    from: 'background',
			    subject: 'status',
			    value: true
			});
        },
        error: () => {
           	chrome.runtime.sendMessage({
			    from: 'background',
			    subject: 'status',
			    value: false
			});
        }
    });

}

trello.timerLog = function(currentCard, currentComment, date, data) {

	trello.getDate(date).then(() => {
		trello.getData(data).then(() => {
			let comment = timerComment();
			Trello.put("cards/"+currentCard+"/actions/"+currentComment+"/comments", { idAction: currentComment, text: comment }, (successMsg) => {
		       	chrome.runtime.sendMessage({
				    from: 'background',
				    subject: 'timerLog',
				    value: successMsg
				});
		    }, (errorMsg) => {
		    	trello.remove('timerID');
		    });
		});
	});

}

trello.getDate = function(date) {

	return new Promise((resolve) => {

		chrome.storage.local.get('timerDates', (items) => {
			if (chrome.runtime.error) console.log("Runtime error.");
			timerDates = JSON.parse(items.timerDates);
			timerDates.push(date);
			let timerDatesString = JSON.stringify(timerDates);
			chrome.storage.local.set({'timerDates': timerDatesString}, () => {
				if (chrome.runtime.error) console.log("Runtime error.");
				resolve();
		    });
	    });

	})

}

trello.getData = function(data) {

	return new Promise((resolve) => {

		chrome.storage.local.get('timerData', (items) => {
			if (chrome.runtime.error) console.log("Runtime error.");
			timerData = items.timerData.split('|');
			timerData.push(data);
			chrome.storage.local.set({'timerData': timerData.join('|')}, () => {
				if (chrome.runtime.error) console.log("Runtime error.");
				resolve();
		    });
	    });

	})

}

trello.timerStart = function(currentCard, date, data) {

	timerDates.push(date);
	timerData.push(data);

	let timerDatesString = JSON.stringify(timerDates);

	chrome.storage.local.set({'timerDates': timerDatesString}, () => {
		if (chrome.runtime.error) console.log("Runtime error.");
    });

    chrome.storage.local.set({'timerData': timerData.join('|')}, () => {
		if (chrome.runtime.error) console.log("Runtime error.");
    });

	let comment = timerComment();
	Trello.post("cards/"+currentCard+"/actions/comments", { text: comment }, (successMsg) => {
       	trello.set('timerID', successMsg.id);
       	console.log(successMsg)
       	chrome.runtime.sendMessage({
		    from: 'background',
		    subject: 'timerStart',
		    value: successMsg
		});
    });

}

trello.timerStop = function() {

	chrome.storage.local.remove('timerDates');
	chrome.storage.local.remove('timerData');
	trello.remove('timerStarted');
   	chrome.runtime.sendMessage({
	    from: 'background',
	    subject: 'timerStop'
	});

}

var timerDates = [];
var timerData = [];

var timeSpent = () => {
	// @fix more complete system needed for counting time
	let time = '**Current time spent:** *';
	let startArr = [];
	let stopArr = [];
	let timeSpent = 0;

	if(timerDates.length > 1) {
		for (var i = 0; i < timerDates.length; i++) {
			let type = timerDates[i].type;
			let time = timerDates[i].time;
			if(type == 'play') startArr.push(time);
			if(type == 'paused' || type == 'stopped') stopArr.push(time);
		}
		for (var i = 0; i < startArr.length; i++) {
			if(stopArr[i]) timeSpent = moment(stopArr[i]).diff(moment(startArr[i])) + parseInt(timeSpent);
		}
		let seconds = moment.duration(timeSpent).seconds();
		let minutes = moment.duration(timeSpent).minutes();
		let hours = moment.duration(timeSpent).hours();
		time += hours + 'h ' + minutes + 'm ' + seconds + 's';
	}

	if(timerDates.length <= 1) time += 'not enough data';

	time += '*\n';
	return time;
}

var timerComment = () => {

	let comment = '';

	comment += '**Tarsier Time Log**\n';
	comment += '\n';
	comment += '---\n';
	comment += timeSpent(timerDates);
	comment += '---\n';
	comment += timerData.join('\n');
	comment += '\n\n';
	comment += '*Do not delete. Please avoid editing this comment.*';

	return comment;

}