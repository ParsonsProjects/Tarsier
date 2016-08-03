
const trello = {};

trello.sendMessage = function(data) {

	chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
		if(!tabs) return;
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

trello.getLists = (id) => {

	Trello.get("boards/"+id+"/lists/all", (lists) => {
        trello.sendMessage({
		    from: 'background',
		    subject: 'getLists',
		    value: lists
		});
    });

}

trello.getCards = (id) => {

	Trello.get("lists/"+id+"/cards/all", (cards) => {
        trello.sendMessage({
		    from: 'background',
		    subject: 'getCards',
		    value: cards
		});
    });

}

trello.getCard = (id) => {

	Trello.get("cards/"+id, (card) => {

		chrome.runtime.sendMessage({
	    	from: 'trello',
		    subject: 'set',
		    label: 'currentCardLink',
		    value: card.shortUrl
		});

        trello.sendMessage({
		    from: 'background',
		    subject: 'getCard',
		    value: card
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
			chrome.browserAction.setBadgeBackgroundColor({ color: '#4FC1E9' });

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
		return trello.getData(data);
	}).then(() => {
		timerComment().then((comment) => {
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

	timerComment().then((comment) => {
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
	chrome.browserAction.setBadgeBackgroundColor({ color: '#4FC1E9' });

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

const timeEst = (data, spent) => {

	let time = '---\n**Estimated time:** *';
	let totalEst = [0,0,0];
	let timeLogs = [];
	let h, m, s;
	let noLog = 'not enough data*\n'
	let totalSpent = spent;

	data.actions.forEach((action, i) => {
		let str = action.data.text;
		if(!str) return;
		if(!str.match('#TarsierTimeLog')) return;
		timeLogs.push(action);

		// @fix need to work out if s/m is big enough to count to next interval

	});

	if(!timeLogs.length) return time + noLog;

	if(timeLogs.length) {

		let str = timeLogs[0].data.text;
		let estStr = str.replace(/\n/g, '').split('---')[1];
		estStr = estStr.match(/(\*[0-9][0-9]:[0-9][0-9]:[0-9][0-9]\*)/g);

		if(estStr) {
			estStr = estStr[0].replace(/\*/g, '');
			estStr = estStr.split(':');
			totalEst[0] = parseInt(estStr[0]);
			totalEst[1] = parseInt(estStr[1]);
			totalEst[2] = parseInt(estStr[2]);
		}

		// remove first item as we are passing the time in
		timeLogs.shift();

		timeLogs.forEach((action, i) => {

			let str = action.data.text;
			let spentStr = str.replace(/\n/g, '').split('---')[0];
			spentStr = spentStr.match(/(\*[0-9][0-9]:[0-9][0-9]:[0-9][0-9]\*)/g);
			if(!spentStr) return;
			spentStr = spentStr[0].replace(/\*/g, '');
			spentStr = spentStr.split(':');
			totalSpent[0] += parseInt(spentStr[0]);
			totalSpent[1] += parseInt(spentStr[1]);
			totalSpent[2] += parseInt(spentStr[2]);

		});

	}

	if(totalSpent[2] > totalEst[2]) totalEst[2] = totalSpent[2];
	if(totalSpent[1] > totalEst[1]) totalEst[1] = totalSpent[1];
	if(totalSpent[0] > totalEst[0]) totalEst[0] = totalSpent[0];

	h = $.trim(totalEst[0]).length === 1 ? '0' + totalEst[0] : totalEst[0];
    m = $.trim(totalEst[1]).length === 1 ? '0' + totalEst[1] : totalEst[1];
    s = $.trim(totalEst[2]).length === 1 ? '0' + totalEst[2] : totalEst[2];
	time += h + ':' + m + ':' + s;

	time += '*\n';
	return time;

}

const timeSpent = (data) => {
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
		let h = $.trim(hours).length === 1 ? '0' + hours : hours;
        let m = $.trim(minutes).length === 1 ? '0' + minutes : minutes;
        let s = $.trim(seconds).length === 1 ? '0' + seconds : seconds;
        let timeArr = (localStorage.getItem('timerStarted')) ? [hours, minutes, seconds] : [0,0,0];
		time += h + ':' + m + ':' + s;
		time += '*\n';
		time += timeEst(data, timeArr);
	}

	if(timerDates.length <= 1) {
		time += 'not enough data';
		time += '*\n';
	}

	return time;
}

const timerComment = () => {

	return new Promise((resolve) => {

		$.get(localStorage.getItem('currentCardLink') + '.json', (data) => {

			let comment = '';

			comment += timeSpent(data);
			comment += '---\n';
			comment += timerData.join('\n');
			comment += '\n\n';
			comment += '*Do not delete. Please avoid editing this comment.*';
			comment += '\n';
			comment += '#TarsierTimeLog';

			resolve(comment);

		});

	});

}