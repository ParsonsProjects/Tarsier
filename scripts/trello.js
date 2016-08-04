
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

	return new Promise((resolve) => {

		chrome.storage.sync.get((items) => {

			Object.keys(items).forEach((key) => {
			    localStorage.setItem(key, items[key]);
			});

			resolve('Sync Run');

		});

	});

}

trello.set = function(label, value) {

	return new Promise((resolve) => {

		if(typeof label === 'object') label = JSON.stringify(label);

		chrome.storage.sync.set({label: value}, () => {
			if (chrome.runtime.error) console.log("Runtime error.");
			localStorage.setItem(label, value);
			resolve(label + ' stored');
	    });

	});

}

trello.clear = function() {

	return new Promise((resolve) => {

		chrome.storage.sync.clear(() => {
			if (chrome.runtime.error) console.log("Runtime error.");
			localStorage.clear();
			Trello.deauthorize();
			resolve('Storage Cleared');
	    });

	});

}

trello.remove = function(label) {

	return new Promise((resolve) => {

		chrome.storage.sync.remove(label, () => {
			if (chrome.runtime.error) console.log("Runtime error.");
			localStorage.removeItem(label);
			resolve(label + ' removed');
	    });

	});

}

trello.getBoards = function() {

	return new Promise((resolve) => {

		Trello.get("members/me/boards/all", (boards) => {
	        resolve(boards);
	    });

	});

}

trello.getLists = (id) => {

	return new Promise((resolve) => {

		Trello.get("boards/"+id+"/lists/all", (lists) => {
	        resolve(lists);
	    });

	});

}

trello.getCards = (id) => {

	return new Promise((resolve) => {

		Trello.get("lists/"+id+"/cards/all", (cards) => {
	        resolve(cards);
	    });

	});

}

trello.getCard = (id) => {

	return new Promise((resolve) => {

		Trello.get("cards/"+id, (card) => {

			chrome.runtime.sendMessage({
		    	from: 'trello',
			    subject: 'set',
			    label: 'currentCardLink',
			    value: card.shortUrl
			});

			resolve(card);

	    });

	});

}

trello.status = function() {

	Trello.setKey('f8af011952b5693e6a92da65bf6f298e');

	return new Promise((resolve) => {

		Trello.authorize({
	        name: "Trello Helper Extension",
	        expiration: "never",
	        interactive: false,
	        scope: {read: true, write: true},
	        success: () => {

				chrome.browserAction.setBadgeText({ text: ' ' });
				chrome.browserAction.setBadgeBackgroundColor({ color: '#4FC1E9' });
				resolve(true);

	        },
	        error: () => {

	        	// maybe error and store in storage?
	        	chrome.browserAction.setBadgeText({ text: ' ' });
	        	chrome.browserAction.setBadgeBackgroundColor({ color: '#FF5722' });
	        	resolve(false);

	        }
	    });

	});

}

trello.timerLog = function(currentCard, currentComment, date, data) {

	return new Promise((resolve) => {

		trello.getDate(date).then(() => {
			return trello.getData(data);
		}).then(() => {
			timerComment().then((comment) => {
				Trello.put("cards/"+currentCard+"/actions/"+currentComment+"/comments", { idAction: currentComment, text: comment }, (successMsg) => {
					resolve(successMsg);
			    }, (errorMsg) => {
			    	trello.remove('timerID');
			    });
			});
		});

	});

}

trello.timerStart = function(currentCard, date, data) {

	return new Promise((resolve) => {

		timerDates = [];
		timerData = [];
		timerDates.push(date);
		timerData.push(data);

		let timerDatesString = JSON.stringify(timerDates);

		localStorage.setItem('timerDates', timerDatesString);
		localStorage.setItem('timerData', timerData.join('|'));

	    timerComment().then((comment) => {
			Trello.post("cards/"+currentCard+"/actions/comments", { text: comment }, (successMsg) => {
		       	trello.set('timerID', successMsg.id);
				chrome.browserAction.setBadgeText({ text: ' ' });
				chrome.browserAction.setBadgeBackgroundColor({ color: '#FFC107' });
		       	resolve(successMsg);
		    });
		});

	});

}

trello.timerStop = function() {

	return new Promise((resolve) => {

		localStorage.removeItem('timerDates');
		localStorage.removeItem('timerData');
		trello.remove('timerStarted');
		chrome.browserAction.setBadgeText({ text: ' ' });
		chrome.browserAction.setBadgeBackgroundColor({ color: '#4FC1E9' });
		resolve('timerStopped');

	});

}

let timerDates = [];
let timerData = [];

trello.getDate = function(date) {

	return new Promise((resolveDates) => {

		let items = localStorage.getItem('timerDates');
		timerDates = JSON.parse(items);
		timerDates.push(date);
		let timerDatesString = JSON.stringify(timerDates);
		localStorage.setItem('timerDates', timerDatesString);
		resolveDates();

	})

}

trello.getData = function(data) {

	return new Promise((resolveData) => {

		let items = localStorage.getItem('timerData');
		timerData = items.split('|');
		timerData.push(data);
		localStorage.setItem('timerData', timerData.join('|'));
		resolveData();

	})

}

trello.search = function(data) {

	return new Promise((resolve) => {

		Trello.get("search", data, (successMsg) => {
	       	resolve(successMsg);
	    });

	});

}

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

		if(totalSpent[2] >= 60) {
			totalSpent[1] += Math.floor(totalSpent[2] / 60);
			totalSpent[2] = totalSpent[2] % 60;
		}

		if(totalSpent[1] >= 60) {
			totalSpent[0] += Math.floor(totalSpent[1] / 60);
			totalSpent[1] = totalSpent[2] % 60;
		}

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