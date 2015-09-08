var spotify = require('spotify');
var timer = false;

var spotifyImage = function(wjsPlayer, queryType, querySearch, cb) {
//	console.log("query type: "+queryType);
//	console.log("query search: "+querySearch);
	window.utils.checkInternet(function(isConnected) {
		if (isConnected) {
			spotify.search({ type: queryType, query: querySearch },function(err,data) {
				if (err) {
					timer = setTimeout(function() {
						findArtwork(wjsPlayer);
					},5000);
					return;
				}
				result = data[queryType+'s'];
				if (queryType != 'track') {
					if (result.items.length > 0 && result.items[0].images.length > 0 && result.items[0].images[0].url) {
						newImage = result.items[0].images[0].url;
					}
				} else {
					if (result.items.length > 0) {
						if (result.items[0].album && result.items[0].album.images.length && result.items[0].album.images[0].url) {
							newImage = result.items[0].album.images[0].url;
						} else if (result.items[0].artists && result.items[0].artists.length && result.items[0].artists[0].images.length && result.items[0].artists[0].images[0].url) {
							newImage = result.items[0].artists[0].images[0].url;
						}
					}
				}
				if (typeof newImage !== 'undefined') {
					if (cb) cb.call(wjsPlayer,newImage);
					else findArtwork(wjsPlayer,newImage);
				} else if (cb) cb.call(wjsPlayer);
			});
		}
	});
};

var processAlbumTitle = function(wjsPlayer, title, removeOne, tryTrack) {
	oldTitle = title;
	
	if (tryTrack) queryType = 'track';
	else queryType = 'album';
	
	if (removeOne) {
		if (title.indexOf(' ') > -1) title = title.substr(0,title.lastIndexOf(' '));
		if (!isNaN(title)) {
			if (oldTitle.indexOf(' ') > -1) {
				title = oldTitle.substr(oldTitle.lastIndexOf(' ') +1);
				if (!isNaN(title)) titleIsNr = true;
			} else titleIsNr = true;
			if (typeof titleIsNr !== 'undefined') {
				window.powGlobals.torrent.checkedAlbum = true;
				findArtwork(wjsPlayer);
				return;
			}
		}
		if (title != oldTitle) {
			wjsPlayer = this;
			spotifyImage(this, queryType, title, function(newImage) {
				if (tryTrack) window.powGlobals.torrent.checkedAlbum = true;
				if (typeof newImage !== 'undefined') {
					window.powGlobals.torrent.artwork = newImage;
					findArtwork(wjsPlayer,newImage);
				} else {
					if (tryTrack) findArtwork(wjsPlayer);
					else processAlbumTitle(wjsPlayer,oldTitle,false,true);
				}
			});
		}
	} else {
		if (title.indexOf(" (") > -1) title = title.substr(0,title.indexOf(" ("));
		if (title.indexOf(" [") > -1) title = title.substr(0,title.indexOf(" ["));
		if (title.indexOf(" {") > -1) title = title.substr(0,title.indexOf(" {"));
		if (title.indexOf(" - ") > -1) title = title.split(" - ").join(" ");
		if (title.indexOf(" 2CD") > -1) title = title.substr(0,title.indexOf(" 2CD"));
		if (title[0] == "(" && title.indexOf(") ") > -1) title = title.substr(title.indexOf(") ") +1);
		if (title[0] == "[" && title.indexOf("] ") > -1) title = title.substr(title.indexOf("] ") +1);
		if (title[0] == "{" && title.indexOf("} ") > -1) title = title.substr(title.indexOf("} ") +1);
		
		if (title != oldTitle) {
			spotifyImage(this, queryType, title, function(newImage) {
				if (typeof newImage !== 'undefined') {
					window.powGlobals.torrent.artwork = newImage;
					window.powGlobals.torrent.checkedAlbum = true;
					findArtwork(wjsPlayer,newImage);
				} else {
					if (tryTrack) processAlbumTitle(wjsPlayer,title,true,true);
					else processAlbumTitle(wjsPlayer,title,true);
				}
			});
		}
	}
}

var processSongTitle = function(wjsPlayer, title, author) {
	rmTrackNr = false;
	if (!isNaN(title.split(' ')[0])) {
		if (wjsPlayer.currentItem() > 0) {
			if (!isNaN(wjsPlayer.itemDesc(wjsPlayer.currentItem()-1).title.split(' ')[0])) {
				if (parseInt(wjsPlayer.itemDesc(wjsPlayer.currentItem()-1).title.split(' ')[0])+1 == parseInt(title.split(' ')[0])) {
					rmTrackNr = true;
				}
			}
		} else if (wjsPlayer.itemCount() > 1) {
			if (!isNaN(wjsPlayer.itemDesc(wjsPlayer.currentItem()+1).title.split(' ')[0])) {
				if (parseInt(wjsPlayer.itemDesc(wjsPlayer.currentItem()+1).title.split(' ')[0])-1 == parseInt(title.split(' ')[0])) {
					rmTrackNr = true;
				}
			}
		}
	}
	if (rmTrackNr) {
		title = title.substr(title.indexOf(" ")+1);
	}
	if (title.indexOf(" (") > -1) title = title.substr(0,title.indexOf(" ("));
	if (title.indexOf(" [") > -1) title = title.substr(0,title.indexOf(" ["));
	if (title.indexOf(" {") > -1) title = title.substr(0,title.indexOf(" {"));
	if (title.indexOf(" @") > -1) title = title.substr(0,title.indexOf(" @"));
	if (title.indexOf(" feat ") > -1) title = title.substr(0,title.indexOf(" feat "));
	if (title.indexOf(" ft ") > -1) title = title.substr(0,title.indexOf(" ft "));
	if (title.indexOf(" ft. ") > -1) title = title.substr(0,title.indexOf(" ft. "));
	if (title.indexOf("(") > 0) title = title.substr(0,title.indexOf("("));
	if (title.indexOf("[") > 0) title = title.substr(0,title.indexOf("["));
	if (title.indexOf("{") > 0) title = title.substr(0,title.indexOf("{"));
	if (title.toLowerCase() == 'intro') {
		if (author) spotifyImage(wjsPlayer,'artist',author);
		return false;
	}
	if (author) query = author+' '+title;
	else query = title;
	return query;
}

var findArtwork = function(wjsPlayer, imageURL) {
	stopTimer();
	if (window.powGlobals.torrent && window.powGlobals.torrent.artwork) {
		wjsPlayer.wrapper.css("backgroundImage","url("+window.powGlobals.torrent.artwork+")");
	} else if (wjsPlayer.itemDesc(wjsPlayer.currentItem()).artworkURL || imageURL) {
		if (!imageURL) imageURL = wjsPlayer.itemDesc(wjsPlayer.currentItem()).artworkURL;
		wjsPlayer.wrapper.css("backgroundImage","url("+imageURL+")");
	} else if (wjsPlayer.itemDesc(wjsPlayer.currentItem()).artist && wjsPlayer.itemDesc(wjsPlayer.currentItem()).album) {
		spotifyImage(wjsPlayer,'album',wjsPlayer.itemDesc(wjsPlayer.currentItem()).artist+' '+wjsPlayer.itemDesc(wjsPlayer.currentItem()).album);
	} else if (window.powGlobals.torrent && window.powGlobals.torrent.engine && !window.powGlobals.torrent.checkedAlbum) {
		processAlbumTitle(wjsPlayer,window.powGlobals.torrent.engine.torrent.name);
	} else if (wjsPlayer.itemDesc(wjsPlayer.currentItem()).artist && wjsPlayer.itemDesc(wjsPlayer.currentItem()).title) {
		newQuery = processSongTitle(wjsPlayer,wjsPlayer.itemDesc(wjsPlayer.currentItem()).title,wjsPlayer.itemDesc(wjsPlayer.currentItem()).artist);
		if (newQuery) spotifyImage(wjsPlayer,'track',newQuery);
	} else if (wjsPlayer.itemDesc(wjsPlayer.currentItem()).artist) {
		spotifyImage(wjsPlayer,'artist',wjsPlayer.itemDesc(wjsPlayer.currentItem()).artist);
	} else if (wjsPlayer.itemDesc(wjsPlayer.currentItem()).title) {
		newQuery = processSongTitle(wjsPlayer,wjsPlayer.itemDesc(wjsPlayer.currentItem()).title);
		if (newQuery) spotifyImage(wjsPlayer,'track',newQuery);
	}
}

var stopTimer = function() {
	if (timer) {
		clearTimeout(timer);
		timer = false;
	}
}

module.exports = {
	spotifyImage: spotifyImage,
	findArtwork: findArtwork,
	processAlbumTitle: processAlbumTitle,
	processSongTitle: processSongTitle,
	stopTimer: stopTimer
}