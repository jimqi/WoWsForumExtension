/* stores the dom elements represeting forum posts in an 2d array along with the posters name and id
 * [ [dom element, id, name], [...], [...]]
 *
 */
function getPosts() {
	//get list of all posts in the thread
	var xPathResult = document.evaluate(
		//all posts are div elements in a container with id = ips_posts
		"//div[@id='ips_Posts']/div",
		document,
		null,
		XPathResult.ORDERED_NODE_ITERATOR_TYPE,
		null);

	var posts = [];
	var xPathNode = xPathResult.iterateNext();
	while (xPathNode) {
		//push the dom element as an array so we can associate it with the posters name and id
		posts.push([xPathNode]);
		xPathNode = xPathResult.iterateNext();
	}
	
	//iterate over all the posts and find the name and ids of the posters then store them in the array
	for (var i = 0; i < posts.length; i++) {
		var id = getPosterID(posts[i][0]);
		var name = getPosterName(posts[i][0]);
		posts[i].push(id);
		posts[i].push(name);
		//initialDisplay(posts[i][0], id, name);
	}

	//create query string of id's not in cache
	var notInCache = [];
	var inCache = [];
	//iterate through id's and check if we have cached information
	for (var j = 0; j < posts.length; j++) {
		if (!cacheTest(posts[j][1])) {
			notInCache.push(posts[j][1]);
		}
		else {
			inCache.push(posts[j][1]);
		}
	}

	var queryString = notInCache.join();

	if (queryString.length > 0) {
		getUserData(queryString, function(userDataJSON) {
			storeInCache(userDataJSON, notInCache);
			for (var k = 0; k < posts.length; k++) {
				modifyPost(posts[k][0], posts[k][1], posts[k][2]);
			}
		});
	}

	else {
		for (var k = 0; k < posts.length; k++) {
			modifyPost(posts[k][0], posts[k][1], posts[k][2]);
		}
	}


}

/* Searches through the post for the username
 *
 * @param {DOM node} post - dom node containing one post in the thread
 */
 function getPosterName(post) {
 	var name;
 	var xPathResult = document.evaluate(
 		"./div/h3/span/a/span",
 		post,
 		null,
 		XPathResult.FIRST_ORDERED_NODE_TYPE,
 		null);

 	//different page layout if not logged in
 	if (xPathResult.singleNodeValue == null) {
  		var xPathResult = document.evaluate(
 			"./div/h3/span",
 			post,
 			null,
 			XPathResult.FIRST_ORDERED_NODE_TYPE,
 			null);		
 		}

 	var xPathNode = xPathResult.singleNodeValue;

 	var name = xPathNode.innerHTML;

 	return name;
 }

/* Searches through the post for the href containing a link to the user profile then uses a
 * reguler expression to extract the user id
 *
 * @param {DOM node} post - dom node containing one post in the thread
 */
 function getPosterID(post) {
 	var id;
 	var xPathResult = document.evaluate(
 		"./div/div/div/ul/li/a",
 		post,
 		null,
 		XPathResult.FIRST_ORDERED_NODE_TYPE,
 		null);

 	var xPathNode = xPathResult.singleNodeValue;

 	var urlString = xPathNode.href;

	//url is in the form of http://forum.worldofwarships.com/index.php?/user/{username}-{userid}/
	//example http://forum.worldofwarships.com/index.php?/user/mystrl-1013356250/
	//regex looks for a 10 digit group in the url
	var id = urlString.match(/\d{10}/)

	//.match returns an arrary. since we only have 1 match we just take the first element of the array and return it as a string
	return id[0];
}

/* makes an api call to the wargaming api to get data for the specified userid
 * returns the data as a json object
 * 
 * @param {string} userid - userid of the poster
 *
 * returns data for the specified userID as a json
 */
 function getUserData(userid, callback) {
 	var xhr = new XMLHttpRequest();
 	xhr.open("GET", "https://wowsforumextension.herokuapp.com/?userid=" + userid, true); 
 	xhr.send();

 	xhr.onreadystatechange = function() {
 		if(xhr.readyState == 4 && xhr.status == 200) {
 			var json;

 			json = JSON.parse(xhr.responseText);
 			callback(json);
 		}
 	}
}

function initialDisplay(post, userid, playerName) {

	//addListElement(post, "PVP Win Rate: " + "loading" + "% (" + "loading" + ")");

	//addListElement(post, "Solo PVP Win Rate: " + "loading"  + "% (" + "loading" + ")");

	//add links to profiles
	var warshipsStatsLink = "http://warshipstats.com/na/player/" + playerName
	var warshipsStatsLinkText = "WarshipsStats";
	addLinkElement(post, warshipsStatsLinkText, warshipsStatsLink);

	var profileLink = "http://worldofwarships.com/en/community/accounts/" +userid + "-" + playerName
	var profileLinkText = "Profile";
	addLinkElement(post, profileLinkText, profileLink);
}

/* modifies a single post in the forum thread
 * 
 * @param {DOM node} post - dom node containing one post in the thread
 * @param {string} userid - userid of the poster
 */
function modifyPost(post, userid, playerName) {
	//we stored the data as a string using stringify so remember to turn it back into a json with parse
	var userInfo = getFromCache(userid, 0);

	if (userInfo === null) {
		addListElement(post, "This user has not played any battles");
		return;
	}

	try {
		var battlesPVP = userInfo.statistics.pvp.battles;
		var winsPVP = userInfo.statistics.pvp.wins;

		var battlesPVPSOLO = userInfo.statistics.pvp_solo.battles;
		var winsPVPSOLO = userInfo.statistics.pvp_solo.wins;
	}
	catch (err) {
		console.log("Error handling user info: ", err);
	}
	//pvp win rate including divisions
	var winratePVP = winsPVP/battlesPVP;
	winratePVP = winratePVP*100;
	winratePVP = winratePVP.toFixed(2);
	addListElement(post, "PVP Win Rate: " + winratePVP + "% (" + battlesPVP + ")");

	//pvp win rate solo only
	var winratePVPSOLO = winsPVPSOLO/battlesPVPSOLO;
	winratePVPSOLO = winratePVPSOLO*100;
	winratePVPSOLO = winratePVPSOLO.toFixed(2);
	addListElement(post, "Solo PVP Win Rate: " + winratePVPSOLO  + "% (" + battlesPVPSOLO + ")");

	//add links to profiles
	var warshipsStatsLink = "http://warshipstats.com/na/player/" + playerName
	var warshipsStatsLinkText = "WarshipsStats";
	addLinkElement(post, warshipsStatsLinkText, warshipsStatsLink);

	var profileLink = "http://worldofwarships.com/en/community/accounts/" +userid + "-" + playerName
	var profileLinkText = "Profile";
	addLinkElement(post, profileLinkText, profileLink);
}

/* Returns true if we have a non expired cached json for the userid. False otherwise.
 *
 * @param {int} userid - userid we are searching for in localstorage
 */
function cacheTest(userid) {
	if (localStorage.getItem(userid) !== null && notExpired(userid)) {
		return true;
	}
	else
		return false;

}

/* Returns true if the cache entry is less than 24 hours old
 *
 * @param {int} userid - key of the localStorage entry we want to check
 */
function notExpired(userid) {
	var timestamp = getFromCache(userid, 1);
	var currentTime = new Date().getTime();

	//milliseconds per day = 86400000
	if ((currentTime - timestamp) > 86400000) {
		return false;
	}
	else {
		return true;
	}
}

/* Stores the newely retrieved information from getUserData into localstorage by iterating through the list of ids not in cache
 *
 * @param {int} userid - userid we are using as the key
 */
function storeInCache(json, userid) {
	for (var i = 0; i < userid.length; i++) {
		var storageObject = {value: json.data[userid[i]], timestamp: new Date().getTime()}
		localStorage.setItem(userid[i], JSON.stringify(storageObject));
	}
}

/* Retrieves the stored json associated with the user id
 *
 * @param {int} userid - userid we are searching for in localstorage
 * @param {int} mode - select whether we want the json or timestamp 1 for timestamp otherwise json
 *
 * returns a json of the user info
 */
function getFromCache(userid, mode) {
	var userInfo = localStorage.getItem(userid);
	//we stringified it when we stored it so we need to convert back to a json before we do anything with it
	userInfo = JSON.parse(userInfo);
	var timestamp = userInfo.timestamp;
	userInfo = userInfo.value;
	if (mode == 1) {
		return timestamp;
	}
	else {
		return userInfo;
	}
}

/* adds a string to the list underneath the profile picture. used to display data on the user in the browser
 *
 * @param {DOM node} post - dom node containing one post in the thread
 * @param {string} string - specific string to be added. set in modifyPost
 */
 function addListElement(post, string) {
	//dom node containing details on the poster (member group, posts etc) that was will add info to
	var xPathResult = document.evaluate(
		"./div//div[@class='user_details']",
		post,
		null,
		XPathResult.FIRST_ORDERED_NODE_TYPE,
		null);
	if (xPathResult.singleNodeValue != null) {
		var ul = xPathResult.singleNodeValue;
		var li = document.createElement("li");
		li.appendChild(document.createTextNode(string));
		ul.appendChild(li);
	}
	else {
		console.log("Error finding DOM element (addListElement)");
	}
}

/* Adds a link to the user info panel
 *
 * @param {DOM node} post - dom node containing one post in the thread
 * @param {string} linkText - display text of the link
 * @param {link} - url of the link element
 */
function addLinkElement(post, linkText, link) {
	var xPathResult = document.evaluate(
 		"./div//div[@class='user_details']",
 		post,
 		null,
 		XPathResult.FIRST_ORDERED_NODE_TYPE,
 		null);

	var ul = xPathResult.singleNodeValue;

	var a = document.createElement("a");
	a.textContent = linkText;
	a.setAttribute('href', link);
	ul.appendChild(a);

	var br = document.createElement("br");
	ul.appendChild(br);
}

function init() {
	chrome.storage.sync.get({
		enabled: true
	}, function(items) {
		if (items.enabled) {
			getPosts();
		}
	});
}

$('document').ready( function(event) {
	init();
});

/*
 * checks if the user is logged in by looking to see if the reply button is enabled in the forum thread
 * alerts the user if they are not logged in
 *
 */

 /*
  * no longer needed. keep just incase we need it in the future`
  *
function checkLoggedIn() {
	var xPathResult = document.evaluate(
 		"//div[@class='topic_controls']/ul/li",
 		document,
 		null,
 		XPathResult.FIRST_ORDERED_NODE_TYPE,
 		null);
 	var xPathNode = xPathResult.singleNodeValue;

 	var result = xPathNode.getAttribute("class");
 	console.log(result);

 	if (result === "disabled") {
 		alert("this extension currently only works if you're logged in")
 		return false;
 	}
 	else
 		return true;
}

*/