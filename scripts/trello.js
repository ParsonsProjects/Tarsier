
const trello = {};

trello.sendMessage = function(data) {

	chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
	  	chrome.tabs.sendMessage(tabs[0].id, data, (response) => {

	  	});
	});

	chrome.runtime.sendMessage(data, (response) => {

	});

}

trello.runSync = function() {

	chrome.storage.sync.get((items) => {

		Object.keys(items).forEach((key) => {
		    localStorage.setItem(key, items[key]);
		});

		trello.sendMessage({
		    from: 'background',
		    subject: 'synced'
		});

	});

}

trello.set = function(label, value) {

	if(typeof label === 'object') label = JSON.stringify(label);

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
		trello.sendMessage({
		    from: 'trello',
		    subject: 'update'
		});
    });

}

trello.remove = function(label) {

	chrome.storage.sync.remove(label, () => {
		if (chrome.runtime.error) console.log("Runtime error.");
		localStorage.removeItem(label);
    });

}

trello.getBoards = function() {

	Trello.get("members/me/boards/all", (boards) => {
        trello.sendMessage({
		    from: 'background',
		    subject: 'getBoards',
		    value: boards
		});
    });

}

trello.getCards = (id) => {

	Trello.get("boards/"+id+"/cards/all", (cards) => {
        trello.sendMessage({
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

        	trello.sendMessage({
			    from: 'background',
			    subject: 'status',
			    value: true
			});

			chrome.browserAction.setBadgeText({ text: ' ' });
			chrome.browserAction.setBadgeBackgroundColor({ color: '#8BC34A' });

        },
        error: () => {

        	// maybe error and store in storage?
        	chrome.browserAction.setBadgeText({ text: ' ' });
        	chrome.browserAction.setBadgeBackgroundColor({ color: '#FF5722' });

        }
    });

}

trello.timerLog = function(currentCard, currentComment, date, data) {

	trello.getDate(date).then(() => {
		trello.getData(data).then(() => {
			let comment = timerComment();
			Trello.put("cards/"+currentCard+"/actions/"+currentComment+"/comments", { idAction: currentComment, text: comment }, (successMsg) => {
		       	trello.sendMessage({
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

trello.timerStart = function(currentCard, date, data) {

	timerDates = [];
	timerData = [];
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
       	trello.sendMessage({
		    from: 'background',
		    subject: 'timerStart',
		    value: successMsg
		});
		chrome.browserAction.setBadgeText({ text: ' ' });
		chrome.browserAction.setBadgeBackgroundColor({ color: '#FFC107' });
    });

}

trello.timerStop = function() {

	chrome.storage.local.remove('timerDates');
	chrome.storage.local.remove('timerData');
	trello.remove('timerStarted');
   	trello.sendMessage({
	    from: 'background',
	    subject: 'timerStop'
	});

	chrome.browserAction.setBadgeText({ text: ' ' });
	chrome.browserAction.setBadgeBackgroundColor({ color: '#8BC34A' });

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

trello.search = function(data) {

	Trello.get("search", data, (successMsg) => {
       	trello.sendMessage({
		    from: 'background',
		    subject: 'search',
		    value: successMsg
		});
    });

}

let timerDates = [];
let timerData = [];

const timeSpent = () => {
	// @fix more complete system needed for counting time
	let time = '**Current time spent:** *';
	let startArr = [];
	let stopArr = [];
	let timeSpentInt = 0;

	if(timerDates.length > 1) {
		for (var i = 0; i < timerDates.length; i++) {
			let type = timerDates[i].type;
			let time = timerDates[i].time;
			if(type == 'play') startArr.push(time);
			if(type == 'paused' || type == 'stopped') stopArr.push(time);
		}
		for (var i = 0; i < startArr.length; i++) {
			if(stopArr[i]) timeSpentInt = moment(stopArr[i]).diff(moment(startArr[i])) + parseInt(timeSpentInt);
		}
		let seconds = moment.duration(timeSpentInt).seconds();
		let minutes = moment.duration(timeSpentInt).minutes();
		let hours = moment.duration(timeSpentInt).hours();
		time += hours + 'h ' + minutes + 'm ' + seconds + 's';
	}

	if(timerDates.length <= 1) time += 'not enough data';

	time += '*\n';
	return time;
}

const timerComment = () => {

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