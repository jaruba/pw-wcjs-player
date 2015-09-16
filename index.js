/*****************************************************************************
* Copyright (c) 2015 Branza Victor-Alexandru <branza.alex[at]gmail.com>
*
* This program is free software; you can redistribute it and/or modify it
* under the terms of the GNU Lesser General Public License as published by
* the Free Software Foundation; either version 2.1 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU Lesser General Public License for more details.
*
* You should have received a copy of the GNU Lesser General Public License
* along with this program; if not, write to the Free Software Foundation,
* Inc., 51 Franklin Street, Fifth Floor, Boston MA 02110-1301, USA.
*****************************************************************************/

// WebChimera.js Player v0.5.1

var vlcs = {},
    opts = {},
    players = {},
    $ = require('jquery'),
    seekDrag = false,
    volDrag = false,
    firstTime = true,
    stopForce = false,
    forceProgress = -1,
    nextPlayTime = -1,
    subSize = 1,
    http = require('http'),
    events = require('events'),
    retriever = require('subtitles-grouping/lib/retriever'),
    artwork = require('./lib/album-artwork'),
    path = require('path'),
    relbase = "./"+path.relative(path.dirname(require.main.filename), __dirname),
    sleepId,
    cookie,
    delayedTime,
    supportedLinks = ["youtube.com","video.google.com",".googlevideo.com","vimeo.com","dailymotion.com","dailymotion.co.uk","bbc.co.uk","trailers.apple.com","break.com","canalplus.fr","extreme.com","france2.fr","jamendo.com","koreus.com","lelombrik.net","liveleak.com","metacafe.com","mpora.com","pinkbike.com","pluzz.francetv.fr","rockbox.org","soundcloud.com","zapiks.com","metachannels.com","joox.com"],
    supportedEncoding = [["Auto Detect","auto"],["Universal (UTF-8)","utf8"],["Universal (UTF-16)","utf16"],["Universal (big endian UTF-16)","UTF-16BE"],["Universal (little endian UTF-16)","utf16le"],["Universal, Chinese (GB18030)","GB18030"],["Western European (Latin-9)","latin9"],["Western European (Windows-1252)","windows1252"],["Western European (IBM 00850)","ibm850"],["Eastern European (Latin-2)","latin2"],["Eastern European (Windows-1250)","windows1250"],["Esperanto (Latin-3)","latin3"],["Nordic (Latin-6)","latin6"],["Cyrillic (Windows-1251)","windows1251"],["Russian (KOI8-R)","koi8-ru"],["Ukranian (KOI8-U)","koi8-u"],["Arabic (ISO 8859-6)","ISO-8859-6"],["Arabic (Windows-1256)","windows1256"],["Greek (ISO 8859-7)","ISO-8859-7"],["Greek (Windows-1253)","windows1253"],["Hebrew (ISO 8859-8)","ISO-8859-8"],["Hebrew (Windows-1255)","windows1255"],["Turkish (ISO 8859-9)","ISO-8859-9"],["Turkish (Windows-1254)","windows1254"],["Thai (TIS 620-2533/ISO 8859-11)","ISO-8859-11"],["Thai (Windows-874)","windows874"],["Baltic (Latin-7)","latin7"],["Baltic (Windows-1257)","windows1257"],["Celtic (Latin-8)","latin8"],["South-Eastern European (Latin-10)","latin10"],["Simplified Chinese (ISO-2022-CN-EXT)","ISO-2022-CN-EXT"],["Simplified Chinese Unix (EUC-CN)","EUC-CN"],["Japanese (7-bits JIS/ISO-2022-JP-2)","ISO-2022-JP-2"],["Japanese Unix (EUC-JP)","EUC-JP"],["Japanese (Shift JIS)","Shift_JIS"],["Korean (EUC-KR/CP949)","EUC-KR"],["Korean (ISO-2022-KR)","ISO-2022-KR"],["Traditional Chinese (Big5)","Big5"],["Traditional Chinese Unix (EUC-TW)","EUC-TW"],["Hong-Kong Supplementary (HKSCS)","Big5-HKSCS"],["Vietnamese (VISCII)","viscii"],["Vietnamese (Windows-1258)","windows1258"]],
    defaults = {
        audioChan: { "error": -1, "stereo": 1, "reverseStereo": 2, "left": 3, "right": 4, "dolby": 5 },
        audioChanInt: { "-1": "error", "1": "stereo", "2": "reverseStereo", "3": "left", "4": "right", "5": "dolby" }
    };
    
require('jquery-ui/sortable');
try{var powerSaveBlocker=require('remote').require('power-save-blocker')}catch(ex){var sleep=require('computer-sleep/sleep')}

// inject css
if (!$("link[href='"+relbase+"/css/general.css']").length) {
    $('<link href="'+relbase+'/css/general.css" rel="stylesheet">').appendTo("head");
    window.document.styleSheets[0].addRule('.wcp-menu-items::-webkit-scrollbar','width: 44px !important;');
    window.document.styleSheets[0].addRule('.wcp-menu-items::-webkit-scrollbar-track','background-color: #696969 !important; border-right: 13px solid rgba(0, 0, 0, 0); border-left: 21px solid rgba(0, 0, 0, 0); background-clip: padding-box; -webkit-box-shadow: none !important;');
    window.document.styleSheets[0].addRule('.wcp-menu-items::-webkit-scrollbar-thumb','background-color: #e5e5e5; border-right: 13px solid rgba(0, 0, 0, 0); border-left: 21px solid rgba(0, 0, 0, 0); background-clip: padding-box; -webkit-box-shadow: none !important; display: block !important');
    window.document.styleSheets[0].addRule('.wcp-menu-items::-webkit-scrollbar-thumb:hover','background-color: #e5e5e5 !important; border-right: 13px solid rgba(0, 0, 0, 0); border-left: 21px solid rgba(0, 0, 0, 0); background-clip: padding-box; -webkit-box-shadow: none !important;');
    window.document.styleSheets[0].addRule('.wcp-menu-items::-webkit-scrollbar-thumb:active','background-color: #e5e5e5 !important; border-right: 13px solid rgba(0, 0, 0, 0); border-left: 21px solid rgba(0, 0, 0, 0); background-clip: padding-box; -webkit-box-shadow: none !important;');
}

// deinitializate when page changed
window.onbeforeunload = function(e) {
    // stop all players
    for (var wjsIndex in players) if (players.hasOwnProperty(wjsIndex) && players[wjsIndex].vlc) players[wjsIndex].vlc.stop();

    // clear wcjs-player from require cache when page changes
    if (global.require.cache) {
        for (module in global.require.cache) {
            if (global.require.cache.hasOwnProperty(module) && module.indexOf("wcjs-player") > -1) delete global.require.cache[module];
        }
    } else if (require.cache) {
        for (module in require.cache) {
            if (require.cache.hasOwnProperty(module) && module.indexOf("wcjs-player") > -1) delete require.cache[module];
        }
    }
}

function wjs(context) {
    
    this.version = "v0.5.1";

    // Save the context
    this.context = (typeof context === "undefined") ? "#webchimera" : context;  // if no playerid set, default to "webchimera"
    
    if ($(this.context).hasClass("webchimeras")) this.context = "#"+$(this.context).find(".wcp-wrapper")[0].id;
    
    if (this.context.substring(0,1) == "#") {
        if (window.document.getElementById(this.context.substring(1)).firstChild) {
            this.wrapper = window.document.getElementById(this.context.substring(1));
            this.canvas = this.wrapper.firstChild.firstChild;
            this.wrapper = $(this.wrapper);
        }
        this.allElements = [window.document.getElementById(this.context.substring(1))];
    } else {
        if (this.context.substring(0,1) == ".") this.allElements = window.document.getElementsByClassName(this.context.substring(1));
        else this.allElements = window.document.getElementsByTagName(this.context);
        this.wrapper = this.allElements[0];
        this.canvas = this.wrapper.firstChild.firstChild;
        this.wrapper = $(this.wrapper);
    }
    if (vlcs[this.context]) {
        this.vlc = vlcs[this.context].vlc;
        this.renderer = vlcs[this.context].renderer;
    }
    this.plugin = this.vlc;
    return this;
}

wjs.prototype.toggleMute = function() {
    if (!this.vlc.mute) this.mute(true);
    else this.mute(false);
    return this;
}

wjs.prototype.togglePause = function() {
    if (!this.playing()) {
        if (this.itemCount() > 0) this.play();
    } else this.pause();
    return this;
}

wjs.prototype.play = function(mrl) {
    if (!this.playing()) {
        switchClass(this.find(".wcp-anim-basic"),"wcp-anim-icon-pause","wcp-anim-icon-play");

        wjsButton = this.find(".wcp-play");
        if (wjsButton.length != 0) wjsButton.removeClass("wcp-play").addClass("wcp-pause");
        
        wjsButton = this.find(".wcp-replay");
        if (wjsButton.length != 0) wjsButton.removeClass("wcp-replay").addClass("wcp-pause");
        
        if (!mrl && window.playerApi.tempSel > -1) this.playItem(window.playerApi.tempSel);
        else if (mrl) this.vlc.playlist.play(mrl);
        else if (this.itemCount() > 0) this.vlc.playlist.play();
    }
    return this;
}

wjs.prototype.pause = function() {
    if (this.playing()) {
        switchClass(this.find(".wcp-anim-basic"),"wcp-anim-icon-play","wcp-anim-icon-pause");
        this.find(".wcp-pause").removeClass("wcp-pause").addClass("wcp-play");
        this.vlc.playlist.pause();
    }
    return this;
}

wjs.prototype.playItem = function(i) {
    if (typeof i !== 'undefined') {
        if (i < this.itemCount() && i > -1) {
            if (this.itemDesc(i).disabled) {
                this.vlc.playlist.items[i].disabled = false;
                if (this.find(".wcp-playlist").is(":visible")) {
                    this.find(".wcp-playlist-items:eq("+i+")").removeClass("wcp-disabled");
                }
                this.find(".wcp-playlist").find(".wcp-menu-selected").removeClass("wcp-menu-selected");
                this.find(".wcp-playlist-items:eq("+i+")").addClass("wcp-menu-selected");
            }
            
            opts[this.context].keepHidden = true;
            this.zoom(0);
            this.renderer.clearCanvas();
            
            wjsButton = this.find(".wcp-play");
            if (wjsButton.length != 0) wjsButton.removeClass("wcp-play").addClass("wcp-pause");
            
            wjsButton = this.find(".wcp-replay");
            if (wjsButton.length != 0) wjsButton.removeClass("wcp-replay").addClass("wcp-pause");
    
            this.vlc.playlist.playItem(i);
    
            positionChanged.call(this,0);
            this.find(".wcp-time-current").text("");
            this.find(".wcp-time-total").text("");
        }
    } else return false;
    return this;
}

wjs.prototype.stop = function(ignoreButtons) {
    wjsButton = this.find(".wcp-pause");
    if (wjsButton.length != 0) wjsButton.removeClass("wcp-pause").addClass("wcp-play");

    wjsButton = this.find(".wcp-replay");
    if (wjsButton.length != 0) wjsButton.removeClass("wcp-replay").addClass("wcp-play");

    this.vlc.playlist.stop();
        
    positionChanged.call(this,0);
    this.find(".wcp-time-current").text("");
    this.find(".wcp-time-total").text("");
    if (!ignoreButtons) {
        opts[this.context].setSingle = true;
        vlcs[this.context].vlc.playlist.mode = vlcs[this.context].vlc.playlist.Normal;
        this.find(".wcp-prev").hide(0);
        this.find(".wcp-next").hide(0);
    }
    return this;
}

wjs.prototype.next = function() {
    if (this.currentItem() +1 < this.itemCount()) {
        
        var noDisabled = true;
        for (i = this.currentItem() +1; i < this.itemCount(); i++) {
            if (!this.itemDesc(i).disabled) {
                noDisabled = false;
                break;
            }
        }
        if (noDisabled) return false;
        
        if (window.playerApi.tempSel > -1) this.playItem(window.playerApi.tempSel+1);
        else this.playItem(i);

        return this;
    } else return false;
}

wjs.prototype.prev = function() {
    if (this.currentItem() > 0) {
        
        var noDisabled = true;
        for (i = this.currentItem() -1; i > -1; i--) {
            if (!this.itemDesc(i).disabled) {
                noDisabled = false;
                break;
            }
        }
        if (noDisabled) return false;

        if (window.playerApi.tempSel > -1) this.playItem(window.playerApi.tempSel-1);
        else this.playItem(i);
        
        return this;
    } else return false;
}

wjs.prototype.addPlayer = function(wcpSettings) {
    
    if (wcpSettings) newid = (typeof wcpSettings["id"] === "undefined") ? "webchimera" : wcpSettings["id"]; // if no id set, default to "webchimera"
    else newid = "webchimera";
    
    if (window.document.getElementById(newid) !== null) {
        for (i = 2; window.document.getElementById(newid +i) !== null; i++) { }
        newid = newid +i;
    }
    
    if (typeof newid === 'string') {
        if (newid.substring(0,1) == "#") var targetid = ' id="'+newid.substring(1)+'" class="wcp-wrapper"';
        else if (newid.substring(0,1) == ".") { var targetid = ' id="webchimera" class="'+newid.substring(1)+' wcp-wrapper"'; newid = "#webchimera"; }
        else { var targetid = ' id="'+newid+'" class="wcp-wrapper"'; newid = "#"+newid; }
    } else { var targetid = ' id="webchimera" class="wcp-wrapper"'; newid = "#webchimera"; }
    
    vlcs[newid] = {};
    vlcs[newid].events = new events.EventEmitter();

    if (wcpSettings) {
        opts[newid] = wcpSettings;
        vlcs[newid].multiscreen = (typeof wcpSettings["multiscreen"] === "undefined") ? false : wcpSettings["multiscreen"];
    } else {
        opts[newid] = {};
        vlcs[newid].multiscreen = false;
    }
    if (typeof opts[newid].titleBar === 'undefined') opts[newid].titleBar = "fullscreen";
    opts[newid].curSleepOpt = 0;
    opts[newid].uiHidden = false;
    opts[newid].subDelay = 0;
    opts[newid].lastItem = -1;
    opts[newid].aspectRatio = "Default";
    opts[newid].crop = "Default";
    opts[newid].zoom = 1;
    opts[newid].lastact = new Date().getTime();
    
    opts[newid].splashInterval1 = setInterval(function() { logoAnim(); },1000);
    opts[newid].splashInterval2 = setInterval(function() { logoAnim(); },1600);
    opts[newid].splashInterval3 = setInterval(function() { logoAnim(); },2700);

    if (typeof opts[newid].allowFullscreen === 'undefined') opts[newid].allowFullscreen = true;
    
    playerbody = '<div' + targetid + ' style="height: 100%"><div class="wcp-center" style="overflow: hidden"><canvas class="wcp-canvas wcp-center"></canvas></div><div class="wcp-center wcp-splash-screen" style="overflow: hidden"><div><div style="position: absolute; width: 100%; top: 15px; line-height: 8px; z-index: 10"><div class="wcp-logo-ball-holder"><div class="wcp-logo-ball"></div></div><br><div class="wcp-logo-ball-holder"><div class="wcp-logo-ball"></div></div><div class="wcp-logo-ball-holder"><div class="wcp-logo-ball"></div></div><br><div class="wcp-logo-ball-holder"><div class="wcp-logo-ball"></div></div><div class="wcp-logo-ball-holder"><div class="wcp-logo-ball"></div></div><div class="wcp-logo-ball-holder"><div class="wcp-logo-ball"></div></div><br><div class="wcp-logo-ball-holder"><div class="wcp-logo-ball"></div></div><div class="wcp-logo-ball-holder"><div class="wcp-logo-ball"></div></div><div class="wcp-logo-ball-holder"><div class="wcp-logo-ball"></div></div><div class="wcp-logo-ball-holder"><div class="wcp-logo-ball"></div></div></div><img class="wcp-img" src="'+relbase+'/images/icon_h.png"><img class="wcp-img-back" src="'+relbase+'/images/icon.png"></div><span class="wcp-opening-text"></span></div><div class="wcp-surface"></div><div class="wcp-menu wcp-playlist wcp-center"><div class="wcp-menu-close"></div><div class="wcp-menu-title">Playlist Menu</div><ul class="wcp-menu-items wcp-playlist-items"></ul><a class="wcp-add-url" href="#open-url" style="color: #c0c0c0"><div class="wcp-playlist-menu-but">Add URL</div></a><div class="wcp-playlist-menu-but wcp-add-video">Add Video</div><div class="wcp-playlist-menu-but wcp-scan-library">Scan Library</div><div class="wcp-playlist-menu-but wcp-scan-server">Scan Server</div></div><div class="wcp-menu wcp-subtitles wcp-center"><div class="wcp-menu-close"></div><div class="wcp-menu-title">Subtitle Menu</div><ul class="wcp-menu-items wcp-subtitles-items"></ul><div class="wcp-playlist-menu-but wcp-add-subtitle">Add File</div><div class="wcp-playlist-menu-but wcp-set-encodings">Set Encoding</div></div><div class="wcp-menu wcp-settings-menu wcp-center"><div class="wcp-menu-close"></div><div class="wcp-menu-title">Player Settings</div><ul class="wcp-menu-items wcp-settings-items"></ul></div><div class="wcp-menu wcp-encodings-menu wcp-center"><div class="wcp-menu-close"></div><div class="wcp-menu-title">Subtitle Encoding</div><ul class="wcp-menu-items wcp-encodings-items"></ul></div><div class="wcp-menu wcp-dlna-clients-menu wcp-center"><div class="wcp-menu-close"></div><div class="wcp-menu-title">Known DLNA Devices</div><ul class="wcp-menu-items wcp-dlna-clients-items"></ul></div><div class="wcp-menu wcp-sleep-menu wcp-center"><div class="wcp-menu-close"></div><div class="wcp-menu-title">Sleep Timer Settings</div><ul class="wcp-menu-items wcp-sleep-items"></ul></div><div class="wcp-menu wcp-folder-menu wcp-center"><div class="wcp-menu-close"></div><div class="wcp-menu-title">Manage Folders</div><ul class="wcp-menu-items wcp-folder-items"></ul></div><div class="wcp-pause-anim wcp-center"><i class="wcp-anim-basic wcp-anim-icon-play"></i></div><div class="wcp-titlebar"><span class="wcp-title"></span></div><div class="wcp-agent-container"><div class="wcp-agent-dummy"></div><div class="wcp-agent"></div></div><div class="wcp-toolbar"><div class="wcp-progress-bar"><div class="wcp-progress-seen"></div><div class="wcp-progress-pointer"></div><div class="wcp-progress-cache"></div></div><div class="wcp-button wcp-left wcp-prev" style="display: none"></div><div class="wcp-button wcp-left wcp-pause"></div><div class="wcp-button wcp-left wcp-next" style="display: none"></div><div class="wcp-button wcp-left wcp-vol-button wcp-volume-medium"></div><div class="wcp-vol-control"><div class="wcp-vol-bar"><div class="wcp-vol-bar-full"></div><div class="wcp-vol-bar-pointer"></div></div></div><div class="wcp-time"><span class="wcp-time-current"></span><span class="wcp-time-total"></span></div><div class="wcp-button wcp-right wcp-maximize"';
    if (!opts[newid].allowFullscreen) playerbody += ' style="cursor: not-allowed; color: rgba(123,123,123,0.6);"';
    playerbody += '></div><div class="wcp-button wcp-right wcp-playlist-but"></div><div class="wcp-button wcp-right wcp-subtitle-but"></div></div><div class="wcp-status"></div><div class="wcp-notif"></div><div class="wcp-subtitle-text"></div><div class="wcp-tooltip"><div class="wcp-tooltip-arrow"></div><div class="wcp-tooltip-inner">00:00</div></div><div class="wcp-settings-but"><i class="wcp-settings-icon"></i></div><div class="wcp-center wcp-dlna-buttons"><div style="height: 174px"></div><div class="wcp-dlna-button wcp-dlna-rescan" style="margin-right: 11px">Rescan</div><div class="wcp-dlna-button wcp-dlna-devices">Known Devices</div></div></div>';
    
    opts[newid].currentSub = 0;
    opts[newid].trackSub = -1;
    opts[newid].setSingle = true;
    
    $(this.context).each(function(ij,el) { if (!$(el).hasClass("webchimeras")) $(el).addClass("webchimeras"); el.innerHTML = playerbody; });
    
    $(".wcp-subtitle-but").hide(0);
    $(".wcp-status").hide(0);
    
    if (vlcs[newid].multiscreen) {
        vlcs[newid].multiscreen = (typeof wcpSettings["multiscreen"] === "undefined") ? false : wcpSettings["multiscreen"];
        $(newid).find(".wcp-toolbar").hide(0);
        $(newid).find(".wcp-tooltip").hide(0);
        $(newid).find(".wcp-settings-but").hide(0);
        wjs(newid).wrapper.css({cursor: 'pointer'});
    }

    // drag and drop logic
    
    var holder = window.document.getElementById('player_wrapper');
    holder.ondragover = function () {
        players["#"+$(this).find(".wcp-wrapper").attr("id")].notify("Drop to Add File");
        $(this).addClass('wcp-drag-hover');
        return false;
    };
    holder.ondragleave = function () {
        $(this).removeClass('wcp-drag-hover');
        return false;
    };
    holder.ondrop = function (nid) {
        return function(e) {
          e.preventDefault();
          window.win.gui.focus();
          
          if (e.dataTransfer.files.length == 1 && ["sub","srt","vtt"].indexOf(e.dataTransfer.files[0].path.split('.').pop().toLowerCase()) > -1) {
              if (e.dataTransfer.files[0].path.indexOf("/") > -1) {
                  newString = '{"'+e.dataTransfer.files[0].path.split('/').pop()+'":"'+e.dataTransfer.files[0].path+'"}';
              } else {
                  newString = '{"'+e.dataTransfer.files[0].path.split('\\').pop()+'":"'+e.dataTransfer.files[0].path.split('\\').join('\\\\')+'"}';
              }
              newSettings = players[nid].vlc.playlist.items[players[nid].currentItem()].setting;
              if (window.utils.isJsonString(newSettings)) {
                  newSettings = JSON.parse(newSettings);
                  if (newSettings.subtitles) {
                      oldString = JSON.stringify(newSettings.subtitles);
                      newString = oldString.substr(0,oldString.length -1)+","+newString.substr(1);
                  }
              } else newSettings = {};
              newSettings.subtitles = JSON.parse(newString);
              players[nid].vlc.playlist.items[players[nid].currentItem()].setting = JSON.stringify(newSettings);
              players[nid].subTrack(players[nid].subCount()-1);
              players[nid].notify("Subtitle Loaded");
          } else {
              window.load.dropped(e.dataTransfer.files);
              players[nid].notify("Added to Playlist");
          }
          
          $(this).removeClass('wcp-drag-hover');
          players[nid].refreshPlaylist();
          return false;
        }
    }(newid);
    
    // end drag and drop logic

    wjs(newid).canvas = $(newid)[0].firstChild.firstChild;

    // resize video when window is resized
    if (firstTime) {
        firstTime = false;
        window.onresize = function(i) { autoResize(); };
        $(window).bind("mouseup",function(i) {
            return function(event) {
                mouseClickEnd.call(players[i],event);
            }
        }(newid)).bind("mousemove",function(i) {
            return function(event) {
                if (window.allowMouseMove) mouseMoved.call(players[i],event);
            }
        }(newid));
    }
    
    wjs(newid).wrapper.find('.wcp-add-url').click(window.ui.modals.openUrlModal);
    
    wjs(newid).wrapper.find(".wcp-add-video").click(function() {
        window.chooseFile('#addPlaylistDialog');
    });
    
    wjs(newid).wrapper.find(".wcp-scan-server").click(function() {
        window.scan.server();
    });

    wjs(newid).wrapper.find(".wcp-scan-library").click(function() {
        window.scan.library();
    });

    wjs(newid).wrapper.find(".wcp-set-encodings").click(function() {
        showEncodings.call(getContext(this));
    });
    
    wjs(newid).wrapper.find(".wcp-add-subtitle").click(function() {
        window.chooseFile('#subtitleDialog');
    });
    
    wjs(newid).wrapper.find(".wcp-dlna-rescan").click(function() {
        wjsPlayer = getContext(this);
        wjsPlayer.find(".wcp-subtitle-text").html("");
        var wjsContext = wjsPlayer.context;
        opts[wjsContext].currentSub = 0;
        if (opts[wjsContext].splashInterval1) {
            resetLogo();
            clearInterval(opts[wjsContext].splashInterval1);
            clearInterval(opts[wjsContext].splashInterval2);
            clearInterval(opts[wjsContext].splashInterval3);
        }
        if (window.dlna.notFoundTimer) clearTimeout(window.dlna.notFoundTimer);
        if (window.dlna.bestMatches && window.dlna.bestMatches.length) window.dlna.bestMatches = [];
        opts[wjsContext].splashInterval1 = setInterval(function() { logoAnim(); },1000);
        opts[wjsContext].splashInterval2 = setInterval(function() { logoAnim(); },1600);
        opts[wjsContext].splashInterval3 = setInterval(function() { logoAnim(); },2700);
        window.dlna.findClient();
    });
    
    wjs(newid).wrapper.find(".wcp-dlna-devices").click(function() {
        wjsPlayer = getContext(this);
        showDlnaDevices.call(wjsPlayer);
    });
    
    wjs(newid).wrapper.find(".wcp-menu-close").click(function() {
        wjsPlayer = getContext(this);
        if (wjsPlayer.find(".wcp-playlist").is(":visible")) {
            wjsPlayer.find(".wcp-playlist-items").sortable("destroy");
            wjsPlayer.find(".wcp-playlist").hide(0);
        } else if (wjsPlayer.find(".wcp-subtitles").is(":visible")) {
            wjsPlayer.find(".wcp-subtitles").hide(0);
        } else if (wjsPlayer.find(".wcp-settings-menu").is(":visible")) {
            wjsPlayer.find(".wcp-settings-menu").hide(0);
        } else if (wjsPlayer.find(".wcp-sleep-menu").is(":visible")) {
            wjsPlayer.find(".wcp-sleep-menu").hide(0);
        } else if (wjsPlayer.find(".wcp-folder-menu").is(":visible")) {
            wjsPlayer.find(".wcp-folder-menu").hide(0);
        } else if (wjsPlayer.find(".wcp-encodings-menu").is(":visible")) {
            wjsPlayer.find(".wcp-encodings-menu").hide(0);
        } else if (wjsPlayer.find(".wcp-dlna-clients-menu").is(":visible")) {
            wjsPlayer.find(".wcp-dlna-clients-menu").hide(0);
        }
    });
    
    wjs(newid).wrapper.find(".wcp-settings-but").mouseenter(function() {
        $(this).css("opacity","1");
    }).mouseleave(function() {
        $(this).css("opacity","0.7");
    });

    // toolbar button actions
    wjs(newid).wrapper.find(".wcp-button").click(function() {
        wjsPlayer = getContext(this);
        vlc = wjsPlayer.vlc;
        buttonClass = this.className.replace("wcp-button","").replace("wcp-left","").replace("wcp-vol-button","").replace("wcp-right","").split(" ").join("");

        if (["wcp-play","wcp-pause","wcp-replay","wcp-prev","wcp-next"].indexOf(buttonClass) > -1 && wjsPlayer.state() == "stopping") {
            if (window.dlna.castData.casting == 1) return;
            if (!window.dlna.castData.casting && window.dlna.instance.initiated) {
                wjsPlayer.notify("Unavailable");
                return;
            }
        }

        if (buttonClass == "wcp-playlist-but") {
            if ($(this).parents(".wcp-wrapper").find(".wcp-playlist").is(":visible")) hidePlaylist.call(wjsPlayer);
            else showPlaylist.call(wjsPlayer);
        }
        if (buttonClass == "wcp-subtitle-but") {
            if ($(this).parents(".wcp-wrapper").find(".wcp-subtitles").is(":visible")) hideSubtitles.call(wjsPlayer);
            else showSubtitles.call(wjsPlayer);
        }
        if (buttonClass == "wcp-prev") wjsPlayer.prev();
        else if (buttonClass == "wcp-next") wjsPlayer.next();
        if ([3,4,6].indexOf(vlc.state) > -1) {
            if (buttonClass == "wcp-play") wjsPlayer.play().animatePause();
            else if (buttonClass == "wcp-pause") wjsPlayer.pause().animatePause();
            else if (buttonClass == "wcp-replay") { vlc.stop(); wjsPlayer.play().animatePause(); }
            else if (["wcp-volume-low","wcp-volume-medium","wcp-volume-high","wcp-mute"].indexOf(buttonClass) > -1) wjsPlayer.toggleMute();
        }
        if ([5].indexOf(vlc.state) > -1 && buttonClass == "wcp-play") if (wjsPlayer.itemCount() > 0) wjsPlayer.play().animatePause();
        if (buttonClass == "wcp-minimize") fullscreenOff.call(wjsPlayer);
        else if (buttonClass == "wcp-maximize") fullscreenOn.call(wjsPlayer);
    });
    
    wjs(newid).wrapper.find(".wcp-settings-but").click(function() {
        wjsPlayer = getContext(this);
        if (wjsPlayer.find(".wcp-settings-menu").is(":visible")) hideSettings.call(wjsPlayer);
        else showSettings.call(wjsPlayer);
    });
    // surface click actions
    wjs(newid).wrapper.find(".wcp-surface").click(function() {
        wjsPlayer = getContext(this);

        if ((window.localStorage.clickPause == "fullscreen" && wjsPlayer.fullscreen()) || window.localStorage.clickPause == "both") {
            if (wjsPlayer.state() == "stopping") {
                if (!window.dlna.castData.casting && window.dlna.instance.initiated) return;
                if (window.dlna.castData.casting == 1) return;
            }
            if (wjsPlayer.stateInt() == 6) {
                wjsPlayer.find(".wcp-replay").trigger("click");
                return;
            }
            if ([3,4].indexOf(wjsPlayer.stateInt()) > -1) {
                if (vlcs[wjsPlayer.context].multiscreen && window.document.webkitFullscreenElement == null) {
                    wjsPlayer.fullscreen(true);
                    if (wjsPlayer.wrapper.css('cursor') == 'none') wjsPlayer.wrapper.css({cursor: 'default'});
                    if (wjsPlayer.mute()) wjsPlayer.mute(false);
                } else wjsPlayer.togglePause().animatePause();
            }
            if ([5].indexOf(wjsPlayer.vlc.state) > -1 && !wjsPlayer.playing() && wjsPlayer.itemCount() > 0) wjsPlayer.play().animatePause();
        }
    });
    
    wjs(newid).wrapper.find(".wcp-surface").dblclick(function() {
        wjsPlayer = getContext(this);
        if (opts[wjsPlayer.context].allowFullscreen) {
            wjsPlayer.find(".wcp-anim-basic").finish();
            wjsPlayer.find(".wcp-pause-anim").finish();
            wjsPlayer.toggleFullscreen();
        }
    });
    
    wjs(newid).wrapper.parent().bind("mousemove",function(e) {
        if (window.allowMouseMove) {
            wjsPlayer = getContext(this);
            if (opts[wjsPlayer.context].uiHidden === false) {
                if (vlcs[wjsPlayer.context].multiscreen && window.document.webkitFullscreenElement == null) {
                    wjsPlayer.wrapper.css({cursor: 'pointer'});
                } else {
                    clearTimeout(vlcs[wjsPlayer.context].hideUI);
                    wjsPlayer.wrapper.css({cursor: 'default'});
                    
                    if (!window.dlna.instance.initiated) {
                        if (window.document.webkitFullscreenElement == null) {
                            if (opts[wjsPlayer.context].titleBar == "both" || opts[wjsPlayer.context].titleBar == "minimized") {
                                wjsPlayer.find(".wcp-titlebar").stop().show(0);
                                if (wjsPlayer.find(".wcp-status").css("top") == "10px") wjsPlayer.find(".wcp-status").css("top", "35px");
                                if (wjsPlayer.find(".wcp-notif").css("top") == "10px") wjsPlayer.find(".wcp-notif").css("top", "35px");
                            }
                        } else {
                            if (opts[wjsPlayer.context].titleBar == "both" || opts[wjsPlayer.context].titleBar == "fullscreen") {
                                wjsPlayer.find(".wcp-titlebar").stop().show(0);
                                if (wjsPlayer.find(".wcp-status").css("top") == "10px") wjsPlayer.find(".wcp-status").css("top", "35px");
                                if (wjsPlayer.find(".wcp-notif").css("top") == "10px") wjsPlayer.find(".wcp-notif").css("top", "35px");
                            }
                        }
                    }
        
                    wjsPlayer.find(".wcp-toolbar").stop().show(0);
                    wjsPlayer.find(".wcp-settings-but").stop().show(0);
                    if (wjsPlayer.find(".wcp-agent").html() != "") wjsPlayer.find(".wcp-agent-container").stop().show(0);

                    if (!volDrag && !seekDrag) {
                        if ($(wjsPlayer.find(".wcp-toolbar").selector + ":hover").length > 0) {
                            vlcs[wjsPlayer.context].hideUI = setTimeout(function(i) { return function() { hideUI.call(players[i]); } }(wjsPlayer.context),3000);
                            vlcs[wjsPlayer.context].timestampUI = Math.floor(Date.now() / 1000);
                        } else vlcs[wjsPlayer.context].hideUI = setTimeout(function(i) { return function() { hideUI.call(players[i]); } }(wjsPlayer.context),3000);
                    }
                }
            } else wjsPlayer.wrapper.css({cursor: 'default'});
        }
    });
    
    /* Progress and Volume Bars */
    wjs(newid).wrapper.find(".wcp-progress-bar").hover(function(arg1) {
        return progressHoverIn.call(getContext(this),arg1);
    }, function(e) {
        if (!seekDrag) sel.call(this,".wcp-tooltip").hide(0);
    });
    
    wjs(newid).wrapper.find(".wcp-progress-bar").bind("mousemove",function(arg1) {
        return progressMouseMoved.call(getContext(this),arg1);
    });

    wjs(newid).wrapper.find(".wcp-progress-bar").bind("mousedown", function(e) {
        seekDrag = true;
        var rect = $(this).parents(".wcp-wrapper")[0].getBoundingClientRect();
        p = (e.pageX - rect.left) / $(this).width();
        sel.call(this,".wcp-progress-seen").css("width", (p*100)+"%");
    });

    wjs(newid).wrapper.find(".wcp-vol-bar").bind("mousedown", function(e) {
        volDrag = true;
        var rect = sel.call(this,".wcp-vol-bar")[0].getBoundingClientRect();
        p = (e.pageX - rect.left) / $(this).width();
        getContext(this).volume(Math.floor(p*200)+5);
    });

    wjs(newid).wrapper.find(".wcp-vol-button").hover(function() {
        $(sel.call(this,".wcp-vol-control")).animate({ width: 133 },200);
    },function() {
        if (!$($(sel.call(this,".wcp-vol-control")).selector + ":hover").length > 0 && !volDrag) {
            $(sel.call(this,".wcp-vol-control")).animate({ width: 0 },200);
        }
    });
    
    wjs(newid).wrapper.find('.wcp-vol-control').mouseout(function() {
        if (!$(sel.call(this,".wcp-vol-button").selector + ":hover").length > 0 && !$(sel.call(this,".wcp-vol-bar").selector + ":hover").length > 0 && !$(sel.call(this,".wcp-vol-control").selector + ":hover").length > 0 && !volDrag) {
            sel.call(this,".wcp-vol-control").animate({ width: 0 },200);
        }
    });
    
    // set initial status message font size
    fontSize = calcFontSize(wjs(newid));

    wjs(newid).wrapper.find(".wcp-status").css('fontSize', fontSize);
    wjs(newid).wrapper.find(".wcp-notif").css('fontSize', fontSize);
    wjs(newid).wrapper.find(".wcp-subtitle-text").css('fontSize', (fontSize*subSize));

    // create player and attach event handlers
    wjsPlayer = wjs(newid);
    vlcs[newid].hideUI = setTimeout(function(i) { return function() { hideUI.call(players[i]); } }(newid),6000);
    vlcs[newid].timestampUI = 0;
    vlcs[newid].renderer = require("wcjs-renderer");
    
    // set default network-caching to 10 seconds
    if (!wcpSettings["buffer"]) wcpSettings["buffer"] = 10000;
    
    if (!wcpSettings["vlcArgs"]) wcpSettings["vlcArgs"] = ["--network-caching="+wcpSettings["buffer"]];
    else {
        var checkBuffer = wcpSettings["vlcArgs"].some(function(el,ij) {
            if (el.indexOf("--network-caching") == 0) return true;
        });
        if (!checkBuffer) wcpSettings["vlcArgs"].push("--network-caching="+wcpSettings["buffer"]);
    }

    if (wcpSettings && wcpSettings["vlcArgs"]) vlcs[newid].vlc = vlcs[newid].renderer.init(wjs(newid).canvas,wcpSettings["vlcArgs"]);
    else vlcs[newid].vlc = vlcs[newid].renderer.init(wjs(newid).canvas);
    
    vlcs[newid].vlc.events.on("FrameSetup",function(i) {
        return function(width, height, pixelFormat, videoFrame) {
            vlcs[i].events.emit('FrameSetup', width, height, pixelFormat, videoFrame);
            
            singleResize.call(players[i], width, height, pixelFormat, videoFrame);
        }
    }(newid));

    vlcs[newid].vlc.onPositionChanged = function(i) {
        return function(event) {
            positionChanged.call(players[i],event);
        }
    }(newid);

    vlcs[newid].vlc.onTimeChanged = function(i) {
        return function(event) {
            timePassed.call(players[i],event);
        }
    }(newid);

    vlcs[newid].vlc.onMediaChanged = function(i) {
        return function() {
            wjsPlayer = players[i];
            isMediaChanged.call(wjsPlayer);
            if (!wjsPlayer.find(".wcp-splash-screen").is(":visible") && !wjsPlayer.isLocal()) {
                wjsPlayer.find(".wcp-splash-screen").show(0);
                if (opts[i].splashInterval1) {
                    resetLogo();
                    clearInterval(opts[i].splashInterval1);
                    clearInterval(opts[i].splashInterval2);
                    clearInterval(opts[i].splashInterval3);
                }
                opts[i].splashInterval1 = setInterval(function() { logoAnim(); },1000);
                opts[i].splashInterval2 = setInterval(function() { logoAnim(); },1600);
                opts[i].splashInterval3 = setInterval(function() { logoAnim(); },2700);
            }
        }
    }(newid);
    
    vlcs[newid].vlc.onNothingSpecial = function(i) {
        return function() {
            if (vlcs[i].lastState != "idle") {
                vlcs[i].lastState = "idle";
                vlcs[i].events.emit('StateChanged','idle');
                vlcs[i].events.emit('StateChangedInt',0);
            }
        }
    }(newid);
    
    vlcs[newid].vlc.onOpening = function(i) {
        return function() {
            if (vlcs[i].lastState != "opening") {
                vlcs[i].lastState = "opening";
                vlcs[i].events.emit('StateChanged','opening');
                vlcs[i].events.emit('StateChangedInt',1);
            }
            isOpening.call(players[i]);
        }
    }(newid);

    vlcs[newid].vlc.onBuffering = function(i) {
        return function(event) {
            if (vlcs[i].lastState != "buffering") {
                vlcs[i].lastState = "buffering";
                vlcs[i].events.emit('StateChanged','buffering');
                vlcs[i].events.emit('StateChangedInt',2);
            }
            isBuffering.call(players[i],event);
        }
    }(newid);

    vlcs[newid].vlc.onPlaying = function(i) {
        return function() {
            if (vlcs[i].lastState != "playing") {
                vlcs[i].lastState = "playing";
                vlcs[i].events.emit('StateChanged','playing');
                vlcs[i].events.emit('StateChangedInt',3);
            }
            
            wjsPlayer = players[i];
            isPlaying.call(wjsPlayer);
            
            preventSleep();
            if (wjsPlayer.find(".wcp-splash-screen").is(":visible")) {
                if (window.powGlobals.torrent && window.powGlobals.torrent.engine) {
                    window.stopPrebuf = true;
                    if (window.powGlobals.lists && window.powGlobals.lists.media && window.powGlobals.lists.media[wjsPlayer.currentItem()] && window.powGlobals.lists.media[wjsPlayer.currentItem()].isAudio) {
                        wjsPlayer.setOpeningText("Loading Audio");
                    } else {
                        wjsPlayer.setOpeningText("Opening Video");
                    }
                } else {
                    wjsPlayer.find(".wcp-splash-screen").hide(0);
                    if (opts[i].splashInterval1) {
                        clearInterval(opts[i].splashInterval1);
                        clearInterval(opts[i].splashInterval2);
                        clearInterval(opts[i].splashInterval3);
                    }
                }
            }
        }
    }(newid);
    
    vlcs[newid].vlc.onLengthChanged = function(i) {
        return function(length) {
            wjsPlayer = players[i];
            if (length > 0) {
                if (wjsPlayer.find(".wcp-time-current").text() == "") wjsPlayer.find(".wcp-time-current").text("00:00");
                wjsPlayer.find(".wcp-time-total").text(" / "+wjsPlayer.parseTime(length));
                window.remote.updateVal("length",length);
            } else wjsPlayer.find(".wcp-time-total").text("");
        }
    }(newid);

    vlcs[newid].vlc.onPaused = function(i) {
        return function() {
            if (vlcs[i].lastState != "paused") {
                vlcs[i].lastState = "paused";
                vlcs[i].events.emit('StateChanged','paused');
                vlcs[i].events.emit('StateChangedInt',4);
                
                allowSleep();
            }
        }
    }(newid);
    
    vlcs[newid].vlc.onStopped = function(i) {
        return function() {
            if (vlcs[i].lastState != "stopping") {
                vlcs[i].lastState = "stopping";
                vlcs[i].events.emit('StateChanged','stopping');
                vlcs[i].events.emit('StateChangedInt',5);
            }
            opts[i].keepHidden = true;
            players[i].zoom(0);
            this.renderer.clearCanvas();
            if (this.wrapper.css("backgroundImage") != "none") this.wrapper.css("backgroundImage","none");

            allowSleep();
        }
    }(newid);
    
    vlcs[newid].vlc.onEndReached = function(i) {
        return function() {
            if (vlcs[i].lastState != "ended") {
                vlcs[i].lastState = "ended";
                vlcs[i].events.emit('StateChanged','ended');
                vlcs[i].events.emit('StateChangedInt',6);
            }
            hasEnded.call(players[i]);
            
            allowSleep();
        }
    }(newid);
    
    vlcs[newid].vlc.onEncounteredError = function(i) {
        return function() {
            if (vlcs[i].lastState != "error") {
                vlcs[i].lastState = "error";
                vlcs[i].events.emit('StateChanged','error');
                vlcs[i].events.emit('StateChangedInt',7);
            }
            
            allowSleep();
        }
    }(newid);
    
    // set playlist mode to single playback, the player has it's own playlist mode feature
    vlcs[newid].vlc.playlist.mode = vlcs[newid].vlc.playlist.Normal;
    
    players[newid] = new wjs(newid);
    
    attachHotkeys.call(players[newid]);

    return players[newid];
}

wjs.prototype.replaceMRL = function(newX,newMRL) {
    this.addPlaylist(newMRL);
    
    newDifference = this.itemCount() -1;
    swapDifference = this.itemCount() - newX -1;
    
    if (newX == this.currentItem()) {
        this.advanceItem(newDifference,swapDifference*(-1));
        this.playItem(newX);
    } else this.advanceItem(newDifference,swapDifference*(-1));

    this.removeItem(newX+1);
}

// function to add playlist items
wjs.prototype.addPlaylist = function(playlist) {
     if (this.itemCount() > 0) {
         this.find(".wcp-prev").show(0);
         this.find(".wcp-next").show(0);
     }
     // convert all strings to json object
     if (Array.isArray(playlist) === true) {
         var item = 0;
         for (item = 0; typeof playlist[item] !== 'undefined'; item++) {
             if (typeof playlist[item] === 'string') {
                 var tempPlaylist = playlist[item];
                 delete playlist[item];
                 playlist[item] = { url: tempPlaylist };
             }
         }
     } else if (typeof playlist === 'string') {         
         var tempPlaylist = playlist;
         delete playlist;
         playlist = [];
         playlist.push({ url: tempPlaylist });
         delete tempPlaylist;
     } else if (typeof playlist === 'object') {
         var tempPlaylist = playlist;
         delete playlist;
         playlist = [];
         playlist.push(tempPlaylist);
         delete tempPlaylist;
     }
     // end convert all strings to json object

     if (Array.isArray(playlist) === true && typeof playlist[0] === 'object') {
         var item = 0;
         for (item = 0; item < playlist.length; item++) {
              window.remote.updateVal("itemCount",(this.vlc.playlist.itemCount+1))
              if (playlist[item].vlcArgs) {
                  if (!Array.isArray(playlist[item].vlcArgs)) {
                      if (playlist[item].vlcArgs.indexOf(" ") > -1) {
                          playlist[item].vlcArgs = playlist[item].vlcArgs.split(" ");
                      } else playlist[item].vlcArgs = [playlist[item].vlcArgs];
                  }
                  this.vlc.playlist.addWithOptions(playlist[item].url,playlist[item].vlcArgs);
              } else this.vlc.playlist.add(playlist[item].url);
              if (playlist[item].title) this.vlc.playlist.items[this.itemCount()-1].title = "[custom]"+playlist[item].title;
              this.vlc.playlist.items[this.itemCount()-1].setting = "{}";
              var playerSettings = {};
              if (typeof playlist[item].aspectRatio !== 'undefined') {
                  if (item == 0) opts[this.context].aspectRatio = playlist[item].aspectRatio;
                  playerSettings.aspectRatio = playlist[item].aspectRatio;
              }
              if (typeof playlist[item].crop !== 'undefined') {
                  if (item == 0) opts[this.context].crop = playlist[item].crop;
                  playerSettings.crop = playlist[item].crop;
              }
              if (typeof playlist[item].zoom !== 'undefined') {
                  if (item == 0) opts[this.context].zoom = playlist[item].zoom;
                  playerSettings.zoom = playlist[item].zoom;
              }
              if (typeof playlist[item].defaultSub !== 'undefined') playerSettings.defaultSub = playlist[item].defaultSub;
              if (typeof playlist[item].subtitles !== 'undefined') playerSettings.subtitles = playlist[item].subtitles;
              if (Object.keys(playerSettings).length > 0) this.vlc.playlist.items[this.itemCount()-1].setting = JSON.stringify(playerSettings);
              if (playlist[item].disabled) this.vlc.playlist.items[this.itemCount()-1].disabled = true;
          }
     }

    if (this.state() == "idle") {
        if (opts[this.context].autoplay || opts[this.context].autostart) this.playItem(0);
        if ((opts[this.context].mute || opts[this.context].multiscreen) && !this.mute()) this.mute(true);
    }
    
    if (this.find(".wcp-playlist").is(":visible")) printPlaylist.call(this);
    if (this.itemCount() > 0) this.find(".wcp-playlist-but").css({ display: "block" });

    return this;
}
// end function to add playlist items

wjs.prototype.refreshPlaylist = function() {
    if (this.find(".wcp-playlist").is(":visible")) printPlaylist.call(this);
}

// function to Get Subtitle Description
wjs.prototype.subDesc = function(getDesc) {
    // check if it is a number then return description
    if (!isNaN(getDesc)) {
        if (getDesc < this.vlc.subtitles.count) {
            wjsResponse = {};
            wjsResponse.language = this.vlc.subtitles[getDesc];
            wjsResponse.type = "internal";
            return wjsResponse;
        } else {
            var itemSetting = {};
            itemSetting = this.itemDesc(this.currentItem()).setting;
            if (itemSetting.subtitles) {
                itemSubtitles = itemSetting.subtitles;
                wjsIndex = this.vlc.subtitles.count;
                if (wjsIndex == 0) wjsIndex = 1;
                for (var newDesc in itemSubtitles) if (itemSubtitles.hasOwnProperty(newDesc)) {
                    if (getDesc == wjsIndex) {
                        wjsResponse = {};
                        wjsResponse.language = newDesc;
                        wjsResponse.type = "external";
                        wjsResponse.url = itemSubtitles[newDesc];
                        wjsResponse.ext = itemSubtitles[newDesc].split('.').pop().toLowerCase();
                        if (wjsResponse.ext.indexOf('[') > -1) wjsResponse.ext = wjsResponse.ext.substr(0,wjsResponse.ext.indexOf('['));
                        return wjsResponse;
                    }
                    wjsIndex++;
                }
                return;
            }
        }
        return;
    } else return console.error("Value sent to .subDesc() needs to be a number.");
}
// end function to Get Subtitle Description

// function to Get Subtitle Count
wjs.prototype.subCount = function() {
    wjsIndex = this.vlc.subtitles.count;
    var itemSetting = this.itemDesc(this.currentItem()).setting;
    if (itemSetting.subtitles) {
        itemSubtitles = itemSetting.subtitles;
        if (wjsIndex == 0) wjsIndex = 1;
        for (var newDesc in itemSubtitles) if (itemSubtitles.hasOwnProperty(newDesc)) wjsIndex++;
        return wjsIndex;
    }
    return wjsIndex;
}
// end function to Get Subtitle Count

// function to Get/Set Subtitle Track
wjs.prototype.subTrack = function(newTrack) {
    if (["opening","buffering"].indexOf(this.state()) > -1) {
        opts[this.context].setSub = newTrack;
        opts[this.context].currentSub = newTrack;
        window.remote.updateVal("subTrack",newTrack);
        printSubtitles.call(this);
    } else {
        if (typeof newTrack === 'number') {
            if (newTrack == 0) {
                this.vlc.subtitles.track = 0;
                window.remote.updateVal("subTrack",0);
                opts[this.context].currentSub = 0;
                clearSubtitles.call(this);
            } else {
                if (newTrack < this.vlc.subtitles.count) {
                    this.find(".wcp-subtitle-text").html("");
                    opts[this.context].subtitles = [];
                    this.vlc.subtitles.track = newTrack;
                } else {
                    this.find(".wcp-subtitle-text").html("");
                    opts[this.context].subtitles = [];
                    
                    if (this.vlc.subtitles.track > 0) this.vlc.subtitles.track = 0;
                    if (this.vlc.subtitles.count > 0) newSub = newTrack - this.vlc.subtitles.count +1;
                    else newSub = newTrack - this.vlc.subtitles.count;
                    
                    itemSubtitles = this.itemDesc(this.currentItem()).setting.subtitles;
                    for (var k in itemSubtitles) if (itemSubtitles.hasOwnProperty(k)) {
                        newSub--;
                        if (newSub == 0) {
                            loadSubtitle.call(this,itemSubtitles[k]);
                            break;
                        }
                    }
                }
                opts[this.context].currentSub = newTrack;
                window.remote.updateVal("subTrack",newTrack);
                printSubtitles.call(this);
            }
        } else return opts[this.context].currentSub;
    }
    return this;
}
// end function to Get/Set Subtitle Track

wjs.prototype.subDelay = function(newDelay) {
    if (typeof newDelay === 'number') {
        this.vlc.subtitles.delay = newDelay;
        opts[this.context].subDelay = newDelay;
    } else return opts[this.context].subDelay;
    return this;
}

wjs.prototype.audioTrack = function(newTrack) {
    if (typeof newTrack === 'number') this.vlc.audio.track = newTrack;
    else return this.vlc.audio.track;
    return this;
}
wjs.prototype.audioDesc = function(getDesc) {
    if (typeof getDesc === 'number') return this.vlc.audio[getDesc];
    return this;
}
wjs.prototype.audioDelay = function(newDelay) {
    if (typeof newDelay === 'number') {
        this.vlc.audio.delay = newDelay;
        window.remote.updateVal('audioDelay',newDelay);
    } else return this.vlc.audio.delay;
    return this;
}

wjs.prototype.audioChan = function(newChan) {
    if (typeof newChan === 'string') {
        if (defaults.audioChan[newChan]) {
            this.vlc.audio.channel = defaults.audioChan[newChan];
            window.remote.updateVal('audioChanInt',defaults.audioChan[newChan]);
            window.remote.updateVal('audioChan',newChan);
        } else return false;
    } else {
        if (defaults.audioChanInt[this.vlc.audio.channel.toString()]) return defaults.audioChanInt[this.vlc.audio.channel.toString()];
    }
    return this;
}

wjs.prototype.audioChanInt = function(newChan) {
    if (typeof newChan === 'number') {
        this.vlc.audio.channel = newChan;
        window.remote.updateVal('audioChanInt',newChan);
        if (defaults.audioChanInt[newChan.toString()]) window.remote.updateVal('audioChan',defaults.audioChanInt[newChan.toString()]);
    } else return this.vlc.audio.channel;
    return this;
}

wjs.prototype.deinterlace = function(newMode) {
    if (typeof newMode === 'string') {
        if (newMode == 'disabled') this.vlc.video.deinterlace.disable();
        else this.vlc.video.deinterlace.enable(newMode);
    } else return false;
    return this;
}

wjs.prototype.mute = function(newMute) {
    if (typeof newMute === "boolean") {
        if (this.vlc.mute !== newMute) {
            if (!this.vlc.mute) players[this.context].volume(0);
            else {
                if (opts[this.context].lastVolume <= 15) opts[this.context].lastVolume = 100;
                this.volume(opts[this.context].lastVolume);
            }
        } else return false;
    } else return this.vlc.mute;
}

wjs.prototype.volume = function(newVolume) {
    if (typeof newVolume !== 'undefined' && !isNaN(newVolume) && newVolume >= 0 && newVolume <= 5) {
        opts[this.context].lastVolume = this.vlc.volume;
        this.vlc.volume = 0;
        vlcs[this.context].events.emit('VolumeChanged',0);
        window.remote.updateVal('volume',0);
        if (!this.vlc.mute) {
            this.find(".wcp-vol-button").removeClass("wcp-volume-medium").removeClass("wcp-volume-high").removeClass("wcp-volume-low").addClass("wcp-mute");
            this.vlc.mute = true;
        }
        this.find(".wcp-vol-bar-full").css("width", "0px");
    } else if (newVolume && !isNaN(newVolume) && newVolume > 5 && newVolume <= 200) {
        if (this.vlc.mute) this.vlc.mute = false;

        if (newVolume > 150) this.find(".wcp-vol-button").removeClass("wcp-mute").removeClass("wcp-volume-medium").removeClass("wcp-volume-low").addClass("wcp-volume-high");
        else if (newVolume > 50) this.find(".wcp-vol-button").removeClass("wcp-mute").removeClass("wcp-volume-high").removeClass("wcp-volume-low").addClass("wcp-volume-medium");
        else this.find(".wcp-vol-button").removeClass("wcp-mute").removeClass("wcp-volume-medium").removeClass("wcp-volume-high").addClass("wcp-volume-low");

        this.find(".wcp-vol-bar-full").css("width", (((newVolume/200)*parseInt(this.find(".wcp-vol-bar").css("width")))-parseInt(this.find(".wcp-vol-bar-pointer").css("width")))+"px");
        this.vlc.volume = parseInt(newVolume);
        window.remote.updateVal('volume',parseInt(newVolume));
        vlcs[this.context].events.emit('VolumeChanged',parseInt(newVolume));
    } else return this.vlc.volume;
    return this;
}

wjs.prototype.time = function(newTime) {
    if (typeof newTime === 'number') {
        this.vlc.time = newTime;
        this.find(".wcp-time-current").text(this.parseTime(newTime,this.vlc.length));
        this.find(".wcp-progress-seen")[0].style.width = (newTime/(this.vlc.length)*100)+"%";
    } else return this.vlc.time;
    return this;
}

wjs.prototype.position = function(newPosition) {
    if (typeof newPosition === 'number') {
        this.vlc.position = newPosition;
        this.find(".wcp-time-current").text(this.parseTime(this.vlc.length*newPosition,this.vlc.length));
        this.find(".wcp-progress-seen")[0].style.width = (newPosition*100)+"%";
    } else return this.vlc.position;
    return this;
}

wjs.prototype.rate = function(newRate) {
    if (typeof newRate === 'number') {
        this.vlc.input.rate = newRate;
        window.remote.updateVal('rate',newRate);
    } else return this.vlc.input.rate;
    return this;
}

wjs.prototype.currentItem = function(i) {
    if (typeof i !== 'undefined') {
        if (i != this.vlc.playlist.currentItem) {
            if (i < this.itemCount() && i > -1) {
                if (this.itemDesc(i).disabled) {
                    this.vlc.playlist.items[i].disabled = false;
                    if (this.find(".wcp-playlist").is(":visible")) {
                        this.find(".wcp-playlist-items:eq("+i+")").removeClass("wcp-disabled");
                    }
                    this.find(".wcp-playlist").find(".wcp-menu-selected").removeClass("wcp-menu-selected");
                    this.find(".wcp-playlist-items:eq("+i+")").addClass("wcp-menu-selected");
                }
                opts[this.context].keepHidden = true;
                this.zoom(0);
                this.renderer.clearCanvas();
                
                wjsButton = this.find(".wcp-play");
                if (wjsButton.length != 0) wjsButton.removeClass("wcp-play").addClass("wcp-pause");
                
                wjsButton = this.find(".wcp-replay");
                if (wjsButton.length != 0) wjsButton.removeClass("wcp-replay").addClass("wcp-pause");
        
                this.vlc.playlist.currentItem = i;
        
                positionChanged.call(this,0);
                this.find(".wcp-time-current").text("");
                this.find(".wcp-time-total").text("");
            }
        }
    } else return this.vlc.playlist.currentItem;
    return this;
}

wjs.prototype.itemDesc = function(getDesc) {
    if (typeof getDesc === 'number') {
        if (getDesc > -1 && getDesc < this.itemCount()) {
            wjsDesc = JSON.stringify(this.vlc.playlist.items[getDesc]);
            return JSON.parse(wjsDesc.replace('"title":"[custom]','"title":"').split('\\"').join('"').split('"{').join('{').split('}"').join('}'));
        } else return false;
    }
    return false;
}

wjs.prototype.state = function() {
    reqState = this.vlc.state;
    if (reqState == 0) return "idle";
    else if (reqState == 1) return "opening";
    else if (reqState == 2) return "buffering";
    else if (reqState == 3) return "playing";
    else if (reqState == 4) return "paused";
    else if (reqState == 5) return "stopping";
    else if (reqState == 6) return "ended";
    else if (reqState == 7) return "error";
    return false;
}

wjs.prototype.aspectRatio = function(newRatio) {
    if (typeof newRatio === 'string') {
        opts[this.context].crop = "Default";
        if (opts[this.context].zoom > 0) opts[this.context].zoom = 1;
        opts[this.context].aspectRatio = newRatio;
        autoResize();
        window.remote.updateVal('aspectRaio',newRatio);
    } else return opts[this.context].aspectRatio;
    return this;
}

wjs.prototype.crop = function(newCrop) {
    if (typeof newCrop === 'string') {
        opts[this.context].aspectRatio = "Default";
        if (opts[this.context].zoom > 0) opts[this.context].zoom = 1;
        opts[this.context].crop = newCrop;
        autoResize();
        window.remote.updateVal('crop',newCrop);
    } else return opts[this.context].crop;
    return this;
}

wjs.prototype.zoom = function(newZoom) {
    if (typeof newZoom === 'number') {
        opts[this.context].aspectRatio = "Default";
        opts[this.context].crop = "Default";
        opts[this.context].zoom = newZoom;
        autoResize();
        window.remote.updateVal('zoom',newZoom);
    } else return opts[this.context].zoom;
    return this;
}

wjs.prototype.advanceItem = function(newX,newY) {
    if (typeof newX === 'number' && typeof newY === 'number') {
        this.vlc.playlist.advanceItem(newX,newY);
        if (this.find(".wcp-playlist").is(":visible")) printPlaylist.call(this);
    } else return false;
    return this;
}

wjs.prototype.removeItem = function(remItem) {
    if (typeof remItem === 'number') {
         if (this.itemCount() <= 2) {
             if (this.vlc.playlist.removeItem(remItem)) {
                 this.find(".wcp-prev").hide(0);
                 this.find(".wcp-next").hide(0);
             }
         } else this.vlc.playlist.removeItem(remItem);
        if (this.find(".wcp-playlist").is(":visible")) printPlaylist.call(this);
        // hide playlist button if less then 2 playlist items
        if (this.itemCount() < 1) this.find(".wcp-playlist-but").css({ display: "none" });
    } else return false;
    return this;
}

wjs.prototype.clearPlaylist = function() {
    this.stop();
    this.vlc.playlist.clear();
    this.find(".wcp-time-total").text("");
    if (this.find(".wcp-playlist").is(":visible")) printPlaylist.call(this);
    if (this.find(".wcp-playlist-but").is(":visible")) this.find(".wcp-playlist-but").css({ display: "none" });
    return this;
}

function progressHoverIn(e) {
    if (!window.dlna.instance.initiated) {
        if (this.vlc.length) {
            var rect = this.wrapper[0].getBoundingClientRect();
            if (e.pageX >= rect.left && e.pageX <= rect.right) {
                var newtime = Math.floor(this.vlc.length * ((e.pageX - rect.left) / this.wrapper.width()));
                if (newtime > 0) {
                    this.find(".wcp-tooltip-inner").text(this.parseTime(newtime));
                    var offset = Math.floor(this.find(".wcp-tooltip").width() / 2);
                    secset = 0;
                    if (!this.fullscreen()) secset += 6;
                    if (e.pageX >= (offset + rect.left) && e.pageX <= (rect.right - offset -1)) {
                        this.find(".wcp-tooltip").css("left",(e.pageX - rect.left - offset)+"px");
                    } else if (e.pageX < (rect.left + offset)) this.find(".wcp-tooltip").css("left", (rect.left - secset)+"px");
                    else if (e.pageX > (rect.right - offset -1)) this.find(".wcp-tooltip").css("left",(rect.right - this.find(".wcp-tooltip").width() - secset)+"px");
                    this.find(".wcp-tooltip").show(0);
                }
            } else this.find(".wcp-tooltip").hide(0);
        }
    } else {
        if (window.dlna.castData.castLength) {
            var rect = this.wrapper[0].getBoundingClientRect();
            if (e.pageX >= rect.left && e.pageX <= rect.right) {
                var newtime = Math.floor(window.dlna.castData.castLength * ((e.pageX - rect.left) / this.wrapper.width()));
                if (newtime > 0) {
                    this.find(".wcp-tooltip-inner").text(this.parseTime(newtime));
                    var offset = Math.floor(this.find(".wcp-tooltip").width() / 2);
                    secset = 0;
                    if (!this.fullscreen()) secset += 6;
                    if (e.pageX >= (offset + rect.left) && e.pageX <= (rect.right - offset -1)) {
                        this.find(".wcp-tooltip").css("left",(e.pageX - rect.left - offset)+"px");
                    } else if (e.pageX < (rect.left + offset)) this.find(".wcp-tooltip").css("left",(rect.left - secset)+"px");
                    else if (e.pageX > (rect.right - offset -1)) this.find(".wcp-tooltip").css("left",(rect.right - this.find(".wcp-tooltip").width() - secset)+"px");
                    this.find(".wcp-tooltip").show(0);
                }
            } else this.find(".wcp-tooltip").hide(0);
        }
    }
}

function progressMouseMoved(e) {
    if (!window.dlna.instance.initiated) {
        if (this.vlc.length) {
            var rect = this.wrapper[0].getBoundingClientRect();
            if (e.pageX >= rect.left && e.pageX <= rect.right) {
                var newtime = Math.floor(this.vlc.length * ((e.pageX - rect.left) / this.wrapper.width()));
                if (newtime > 0) {
                    this.find(".wcp-tooltip-inner").text(this.parseTime(newtime));
                    var offset = Math.floor(this.find(".wcp-tooltip").width() / 2);
                    secset = 0;
                    if (!this.fullscreen()) secset += 6;
                    if (e.pageX >= (offset + rect.left) && e.pageX <= (rect.right - offset - 1)) {
                        this.find(".wcp-tooltip").css("left",(e.pageX - rect.left - offset)+"px");
                    } else if (e.pageX < (rect.left + offset)) this.find(".wcp-tooltip").css("left",(rect.left - secset)+"px");
                    else if (e.pageX > (rect.right - offset - 1)) this.find(".wcp-tooltip").css("left",(rect.right - this.find(".wcp-tooltip").width() - secset)+"px");
                    this.find(".wcp-tooltip").show(0);
                }
            } else this.find(".wcp-tooltip").hide(0);
        }
    } else {
        if (window.dlna.castData.castLength) {
            var rect = this.wrapper[0].getBoundingClientRect();
            if (e.pageX >= rect.left && e.pageX <= rect.right) {
                var newtime = Math.floor(window.dlna.castData.castLength * ((e.pageX - rect.left) / this.wrapper.width()));
                if (newtime > 0) {
                    this.find(".wcp-tooltip-inner").text(this.parseTime(newtime));
                    var offset = Math.floor(this.find(".wcp-tooltip").width() / 2);
                    secset = 0;
                    if (!this.fullscreen()) secset += 6;
                    if (e.pageX >= (offset + rect.left) && e.pageX <= (rect.right - offset -1)) {
                        this.find(".wcp-tooltip").css("left",(e.pageX - rect.left - offset)+"px");
                    } else if (e.pageX < (rect.left + offset)) this.find(".wcp-tooltip").css("left",(rect.left - secset)+"px");
                    else if (e.pageX > (rect.right - offset -1)) this.find(".wcp-tooltip").css("left",(rect.right - this.find(".wcp-tooltip").width() - secset)+"px");
                    this.find(".wcp-tooltip").show(0);
                }
            } else this.find(".wcp-tooltip").hide(0);
        }
    }
}

function seekDragEnded(e,wjsMulti) {

    var rect = this.wrapper[0].getBoundingClientRect();

    if (wjsMulti) {
        var wjsLogic = (e.pageX >= rect.left && e.pageX <= rect.right && e.pageY >= rect.top && e.pageY <= rect.bottom);
        this.find(".wcp-tooltip").fadeOut();
    } else {
        var wjsLogic = (e.pageX >= rect.left && e.pageX <= rect.right);
        this.find(".wcp-tooltip").hide(0);
    }
    
    if (wjsLogic) {
        p = (e.pageX - rect.left) / (rect.right - rect.left);
        this.find(".wcp-progress-seen").css("width", (p*100)+"%");
        this.find(".wcp-time-current").text(this.find(".wcp-tooltip-inner").text());

        if (!window.dlna.instance.initiated) this.vlc.position = p;
        else if (window.dlna.castData.casting && window.dlna.castData.castLength) {
            window.dlna.instance.controls.seek(parseInt((window.dlna.castData.castLength /1000) *p));
            window.dlna.castData.castingPaused = 0;
            this.setOpeningText("Updating playback position ...");
        }
    }
}

function volDragEnded(e,wjsMulti) {

    if (wjsMulti) {
        var rect = this.wrapper[0].getBoundingClientRect();
        var wjsLogic = (e.pageX >= rect.left && e.pageX <= rect.right && e.pageY >= rect.top && e.pageY <= rect.bottom);
    } else var wjsLogic = true;

    var rect = this.find(".wcp-vol-bar")[0].getBoundingClientRect();
    
    if (wjsLogic) {
        var volControl = this.find(".wcp-vol-control");
        
        if (e.pageX >= rect.right) {
            p = 1;
            setTimeout(function() { volControl.animate({ width: 0 },200); },1500);
        } else if (e.pageX <= rect.left)  {
            p = 0;
            setTimeout(function() { volControl.animate({ width: 0 },200); },1500);
        } else {
            p = (e.pageX - rect.left) / (rect.right - rect.left);
            if (e.pageY < rect.top) setTimeout(function() { volControl.animate({ width: 0 },200); },1500);
            else if (e.pageY > rect.bottom) setTimeout(function() { volControl.animate({ width: 0 },200); },1500);
        }
        this.volume(Math.floor(200* p)+5);
    }
}

function mouseClickEnd(e) {
    clearInterval(vlcs[this.context].hideUI);
    if (this.wrapper.css('cursor') == 'none') this.wrapper.css({cursor: 'default'});

    vlcs[this.context].hideUI = setTimeout(function(i) { return function() { hideUI.call(players[i]); } }(this.context),3000);
    if (seekDrag) {
        seekDrag = false;
        if (window.document.webkitFullscreenElement != null || $(".webchimeras").length == 1) seekDragEnded.call(this,e);
        else $('.webchimeras').each(function(i, obj) { seekDragEnded.call(getContext(obj),e,true); });
    }
    if (volDrag) {
        volDrag = false;
        if (window.document.webkitFullscreenElement != null || $(".webchimeras").length == 1) volDragEnded.call(this,e);
        else $('.webchimeras').each(function(i, obj) { volDragEnded.call(getContext(obj),e,true); });
    }
}

function seekDragMoved(e,wjsMulti) {

    var rect = this.wrapper[0].getBoundingClientRect();

    if (wjsMulti) var wjsLogic = (e.pageX >= rect.left && e.pageX <= rect.right && e.pageY >= rect.top && e.pageY <= rect.bottom);
    else var wjsLogic = (e.pageX >= rect.left && e.pageX <= rect.right);

    if (wjsLogic) {
        p = (e.pageX - rect.left) / (rect.right - rect.left);
        this.find(".wcp-progress-seen").css("width", (p*100)+"%");
        vlc = this.vlc;
        if (window.dlna.instance.initiated && window.dlna.castData.casting && window.dlna.castData.castLength) {
            var newtime = Math.floor(window.dlna.castData.castLength * ((e.pageX - rect.left) / this.wrapper.width()));
        } else {
            var newtime = Math.floor(this.vlc.length * ((e.pageX - rect.left) / this.wrapper.width()));
        }
        if (newtime > 0) {
            this.find(".wcp-tooltip-inner").text(this.parseTime(newtime));
            var offset = Math.floor(this.find(".wcp-tooltip").width() / 2);
            secset = 0;
            if (!this.fullscreen()) secset += 6;
            if (e.pageX >= (offset + rect.left) && e.pageX <= (rect.right - offset -1)) {
                this.find(".wcp-tooltip").css("left",(e.pageX - rect.left - offset)+"px");
            } else if (e.pageX < (rect.left + offset)) this.find(".wcp-tooltip").css("left",(rect.left - secset)+"px");
            else if (e.pageX > (rect.right - offset -1)) this.find(".wcp-tooltip").css("left",(rect.right - this.find(".wcp-tooltip").width() - secset)+"px");
            this.find(".wcp-tooltip").show(0);
        }
    }
}

function volDragMoved(e,wjsMulti) {

    var rect = this.find(".wcp-vol-bar")[0].getBoundingClientRect();

    if (wjsMulti) {
        var rectWrapper = this.wrapper.parent()[0].getBoundingClientRect();
        var wjsLogic = (e.pageX >= rectWrapper.left && e.pageX <= rectWrapper.right && e.pageY >= rectWrapper.top && e.pageY <= rectWrapper.bottom);
    } else var wjsLogic = true;

    if (wjsLogic && e.pageX >= rect.left && e.pageX <= rect.right) {
        p = (e.pageX - rect.left) / (rect.right - rect.left);
        this.volume(Math.floor(200* p)+5);
    }
}

function mouseMoved(e) {
    if (seekDrag) {
        if (window.document.webkitFullscreenElement != null || $(".webchimeras").length == 1) seekDragMoved.call(this,e);
        else $('.webchimeras').each(function(i, obj) { seekDragMoved.call(getContext(obj),e,true); });
    }
    if (volDrag) {
        if (window.document.webkitFullscreenElement != null || $(".webchimeras").length == 1) volDragMoved.call(this,e);
        else $('.webchimeras').each(function(i, obj) { volDragMoved.call(getContext(obj),e,true); });
    }
}

// catch event function
wjs.prototype.catchEvent = function(wjs_event,wjsFunction) {
    var saveContext = this;
    this.vlc.events.on(wjs_event, function(event) { return wjsFunction.call(saveContext,event); } );
    return this;
}
// end catch event function

wjs.prototype.video = function(newBool) {
    if (typeof newBool !== 'undefined') {
        if (newBool === true) {
            if (opts[this.context].zoom == 0) {
                opts[this.context].zoom = opts[this.context].lastZoom;
                delete opts[this.context].lastZoom;
                autoResize();
                return true;
            } else return false;
        } else {
            if (opts[this.context].zoom > 0) {
                opts[this.context].lastZoom = opts[this.context].zoom;
                opts[this.context].zoom = 0;
                autoResize();
                return true;
            } else return false;
        }
    }
}

wjs.prototype.playlist = function(newBool) {
    if (typeof newBool !== 'undefined') {
        if (newBool === true) return showPlaylist.call(this);
        else return hidePlaylist.call(this);
    } else return this.find(".wcp-playlist")[0];
}

wjs.prototype.subtitles = function(newBool) {
    if (typeof newBool !== 'undefined') {
        if (newBool === true) return showSubtitles.call(this);
        else return hideSubtitles.call(this);
    } else return this.find(".wcp-subtitles")[0];
}

wjs.prototype.ui = function(newBool) {
    if (typeof newBool !== 'undefined') {
        if (newBool === true) {
            if (opts[this.context].uiHidden) {
                opts[this.context].uiHidden = false;
                if (!window.dlna.instance.initiated && window.document.webkitFullscreenElement != null) this.find(".wcp-titlebar").stop().show(0);
                this.find(".wcp-toolbar").stop().show(0);
                this.find(".wcp-settings-but").stop().show(0);
                if (this.wrapper.css('cursor') == 'none') this.wrapper.css({cursor: 'default'});
                return true;
            } else return false;
        } else {
            if (!opts[this.context].uiHidden) {
                opts[this.context].uiHidden = true;
                if (window.document.webkitFullscreenElement != null) this.find(".wcp-titlebar").stop().hide(0);
                this.find(".wcp-toolbar").stop().hide(0);
                this.find(".wcp-tooltip").stop().hide(0);
                this.find(".wcp-settings-but").stop().hide(0);
                if (this.wrapper.css('cursor') == 'none') this.wrapper.css({cursor: 'default'});
                return true;
            } else return false;
        }
    } else return opts[this.context].uiHidden;
}

wjs.prototype.notify = function(newMessage) {
    if (!this.fullscreen() && this.find(".wcp-settings-but").is(":visible")) {
        this.find(".wcp-notif").css("right","46px");
    } else this.find(".wcp-notif").css("right","15px");
    this.find(".wcp-notif").html(newMessage);
    this.find(".wcp-notif").stop().show(0);
    if (opts[this.context].notifTimer) clearTimeout(opts[this.context].notifTimer);
    wjsPlayer = this;
    opts[this.context].notifTimer = setTimeout(function() { wjsPlayer.find(".wcp-notif").fadeOut(1500); },1000);
}

wjs.prototype.toggleFullscreen = function() {
    if (window.document.webkitFullscreenElement == null) {
        window.remote.updateVal("fullscreen",true);
        return fullscreenOn.call(this);
    } else {
        window.remote.updateVal("fullscreen",false);
        return fullscreenOff.call(this);
    }
}

wjs.prototype.fullscreen = function(newBool) {
    if (typeof newBool !== 'undefined') {
        if (newBool === true) {
            window.remote.updateVal("fullscreen",true);
            return fullscreenOn.call(this);
        } else {
            window.remote.updateVal("fullscreen",false);
            return fullscreenOff.call(this);
        }
    } else {
        if (window.document.webkitFullscreenElement == null) return false;
        else return true;
    }
}


wjs.prototype.animatePause = function() {
    this.find(".wcp-anim-basic").css("fontSize", "50px");
    this.find(".wcp-anim-basic").css("padding", "7px 27px");
    this.find(".wcp-anim-basic").css("borderRadius", "12px");
    this.find(".wcp-pause-anim").fadeIn(200).fadeOut(200);
    this.find(".wcp-anim-basic").animate({ fontSize: "80px", padding: "7px 30px" },400);
}

wjs.prototype.parseTime = function(t,total) {
    if (typeof total === 'undefined') total = t;
    var tempHour = ("0" + Math.floor(t / 3600000)).slice(-2);
    var tempMinute = ("0" + (Math.floor(t / 60000) %60)).slice(-2);
    var tempSecond = ("0" + (Math.floor(t / 1000) %60)).slice(-2);
    if (total >= 3600000) return tempHour + ":" + tempMinute + ":" + tempSecond;
    else return tempMinute + ":" + tempSecond;
}

wjs.prototype.showSplashScreen = function() {
    if (!this.find(".wcp-splash-screen").is(":visible") && !this.isLocal()) {
        this.find(".wcp-splash-screen").show(0);
        if (opts[this.context].splashInterval1) {
            clearInterval(opts[this.context].splashInterval1);
            clearInterval(opts[this.context].splashInterval2);
            clearInterval(opts[this.context].splashInterval3);
        }
        resetLogo();
        opts[this.context].splashInterval1 = setInterval(function() { logoAnim(); },1000);
        opts[this.context].splashInterval2 = setInterval(function() { logoAnim(); },1600);
        opts[this.context].splashInterval3 = setInterval(function() { logoAnim(); },2700);
    }
}

wjs.prototype.hideSplashScreen = function() {
    splashScreen = this.find(".wcp-splash-screen");
    if (splashScreen.is(":visible")) {
        if (window.stopPrebuf) window.stopPrebuf = false;
        splashScreen.hide(0);
        if (this.zoom() == 0) this.zoom(1);
        if (opts[this.context].splashInterval1) {
            clearInterval(opts[this.context].splashInterval1);
            clearInterval(opts[this.context].splashInterval2);
            clearInterval(opts[this.context].splashInterval3);
        }
        resetLogo();
    }
}

function fullscreenOn() {
    if (window.document.webkitFullscreenElement == null) {
        if (opts[this.context].titleBar == "none" || opts[this.context].titleBar == "minimized") {
            this.find(".wcp-titlebar").hide(0);
            if (this.find(".wcp-status").css("top") == "35px") this.find(".wcp-status").css("top", "10px");
            if (this.find(".wcp-notif").css("top") == "35px") this.find(".wcp-notif").css("top", "10px");
        } else {
            if (this.find(".wcp-status").css("top") == "10px") this.find(".wcp-status").css("top", "35px");
            if (this.find(".wcp-notif").css("top") == "10px") this.find(".wcp-notif").css("top", "35px");
        }
        this.find(".wcp-settings-but").addClass("wcp-settings-but-mini");
        this.find(".wcp-agent-container").addClass("wcp-agent-fullscreen");
        wcpWrapper = this.wrapper[0];
        if (wcpWrapper.webkitRequestFullscreen) wcpWrapper.webkitRequestFullscreen();
        else if (wcpWrapper.requestFullscreen) wcpWrapper.requestFullscreen();
        
        switchClass(this.find(".wcp-maximize"),"wcp-maximize","wcp-minimize");
        return true;
    } else return false;
}

function fullscreenOff() {
    if (window.document.webkitFullscreenElement != null) {
        if (opts[this.context].titleBar == "none" || opts[this.context].titleBar == "fullscreen") {
            this.find(".wcp-titlebar").hide(0);
            if (this.find(".wcp-status").css("top") == "35px") this.find(".wcp-status").css("top", "10px");
            if (this.find(".wcp-notif").css("top") == "35px") this.find(".wcp-notif").css("top", "10px");
        } else {
            if (this.find(".wcp-status").css("top") == "10px") this.find(".wcp-status").css("top", "35px");
            if (this.find(".wcp-notif").css("top") == "10px") this.find(".wcp-notif").css("top", "35px");
        }

        this.find(".wcp-settings-but").removeClass("wcp-settings-but-mini");
        this.find(".wcp-agent-container").removeClass("wcp-agent-fullscreen");

        if (window.document.webkitCancelFullScreen) window.document.webkitCancelFullScreen();
        else if (window.document.cancelFullScreen) window.document.cancelFullScreen();

        switchClass(this.find(".wcp-minimize"),"wcp-minimize","wcp-maximize");
        if (vlcs[this.context].multiscreen) {
            this.find(".wcp-titlebar").hide(0);
            this.find(".wcp-toolbar").hide(0);
            this.find(".wcp-tooltip").hide(0);
            this.find(".wcp-settings-but").hide(0);
            this.wrapper.css({cursor: 'pointer'});
            if (!this.vlc.mute) this.vlc.mute = true;
        }
        return true;
    } else return false;
}

// player event handlers
function timePassed(t) {
    if (opts[this.context].setSingle) {
        if (t > 0 && t < 1000 && !new RegExp(supportedLinks.join("|")).test(this.itemDesc(this.currentItem()).mrl)) {
            vlcs[this.context].vlc.playlist.mode = vlcs[this.context].vlc.playlist.Single;
        }
        opts[this.context].setSingle = false;
    }
    if (t > 0 && t < 1000 && this.find(".wcp-replay").length > 0) {
        if (this.zoom() == 0) this.zoom(1);
        if (this.length() && this.find(".wcp-time-total").text() == "") this.find(".wcp-time-total").text(" / "+this.parseTime(this.length()));

        switchClass(this.find(".wcp-replay"),"wcp-replay","wcp-pause");
        if (this.currentItem() == 0 && this.itemCount() > 0) {
            this.find(".wcp-prev").show(0);
            this.find(".wcp-next").show(0);
        }
    }
    if (t > 0) this.find(".wcp-time-current").text(this.parseTime(t,this.vlc.length));
    else if (this.find(".wcp-time-current").text() != "" && this.find(".wcp-time-total").text() == "") this.find(".wcp-time-current").text("");
    
    if (typeof opts[this.context].subtitles === 'undefined') opts[this.context].subtitles = [];
    
    if (opts[this.context].subtitles.length > 0) {
        // End show subtitle text (external subtitles)
        var nowSecond = (t - opts[this.context].subDelay) /1000;
        if (opts[this.context].trackSub > -2) {
            var subtitle = -1;
            
            var os = 0;
            for (os in opts[this.context].subtitles) {
                if (os > nowSecond) break;
                subtitle = os;
            }
            
            if (subtitle > 0) {
                if(subtitle != opts[this.context].trackSub) {
                    if ((opts[this.context].subtitles[subtitle].t.match(new RegExp("<", "g")) || []).length == 2) {
                        if (!(opts[this.context].subtitles[subtitle].t.substr(0,1) == "<" && opts[this.context].subtitles[subtitle].t.slice(-1) == ">")) {
                            opts[this.context].subtitles[subtitle].t = opts[this.context].subtitles[subtitle].t.replace(/<\/?[^>]+(>|$)/g, "");
                        }
                    } else if ((opts[this.context].subtitles[subtitle].t.match(new RegExp("<", "g")) || []).length > 2) {
                        opts[this.context].subtitles[subtitle].t = opts[this.context].subtitles[subtitle].t.replace(/<\/?[^>]+(>|$)/g, "");
                    }
                    this.find(".wcp-subtitle-text").html(nl2br(opts[this.context].subtitles[subtitle].t));
                    opts[this.context].trackSub = subtitle;
                } else if (opts[this.context].subtitles[subtitle].o < nowSecond) {
                    this.find(".wcp-subtitle-text").html("");
                }
            }
        }
        // End show subtitle text (external subtitles)
    }
}
function positionChanged(position) {
    opts[this.context].lastPos = position;
    if (!seekDrag) {
        if (forceProgress == -1) this.find(".wcp-progress-seen")[0].style.width = (position*100)+"%";
        else this.find(".wcp-progress-seen")[0].style.width = (forceProgress*100)+"%";
    }
}

function isOpening() {
    if (window.playerApi.tempSel) window.playerApi.tempSel = -1;
    if (this.currentItem() != opts[this.context].lastItem) {
        opts[this.context].lastItem = this.currentItem();
        if (this.find(".wcp-playlist").is(":visible")) printPlaylist.call(this);
        this.find(".wcp-title")[0].innerHTML = this.itemDesc(this.currentItem()).title;
    }
    var style = window.getComputedStyle(this.find(".wcp-status")[0]);
    if (style.display === 'none') this.find(".wcp-status").show();
}

function isMediaChanged() {
    if (!window.playerApi.waitForNext) {
        opts[this.context].currentSub = 0;
        opts[this.context].subtitles = [];
    
        this.find(".wcp-subtitle-text").html("");
        if (this.find(".wcp-subtitles").is(":visible")) this.find(".wcp-subtitles").hide(0);
        this.find(".wcp-subtitle-but").hide(0);
        this.find(".wcp-status").text("");
        if (this.wrapper.css("backgroundImage") != "none") this.wrapper.css("backgroundImage","none");
        
        if (window.win.gui.title == "") {
            window.win.title.left(this.itemDesc(this.currentItem()).title);
        }
        
        artwork.stopTimer();
        opts[this.context].firstTime = true;
    }
}

function isBuffering(percent) {
    if (this.find(".wcp-splash-screen").is(":visible")) {
        if (percent == 100) this.hideSplashScreen();
        return;
    }
    if ((new Date().getTime() - opts[this.context].lastact) > 500 || percent == 100) {
        if (window.remote.port && window.remote.secret && window.remote.socket) {
            window.remote.socket.emit('event', { name: 'Buffering', value: percent });
        }
        if (stopForce && percent == 100) {
            stopForce = false;
            forceProgress = -1;
        }
        if (!this.isLocal()) {
            this.find(".wcp-status").text("Buffering "+percent+"%");
            if (!this.find(".wcp-splash-screen").is(":visible")) {
                this.find(".wcp-status").stop().show(0);
                if (percent == 100) this.find(".wcp-status").fadeOut(1200);
            } else if (percent > 0) this.setOpeningText("Buffering "+percent+"%");
            else this.find(".wcp-status").stop().hide(0);
        }
    }
    opts[this.context].lastact = new Date().getTime();
}

function isPlaying() {
    if (nextPlayTime > -1) {
        this.time(nextPlayTime);
        nextPlayTime = -1;
        stopForce = true;
    }
    if (opts[this.context].keepHidden) {
        opts[this.context].keepHidden = false;
        itemSetting = this.itemDesc(this.currentItem()).setting;
        if (itemSetting) {
            if (itemSetting.zoom) {
                opts[this.context].zoom = itemSetting.zoom;
            } else {
                opts[this.context].zoom = 1;
                autoResize();
            }
        }
    }
    if (opts[this.context].firstTime) {
        if (this.fps() == 0) {
            // this is an audio file
            artwork.findArtwork(this);
        }
        if (this.find(".wcp-title").text() != this.itemDesc(this.currentItem()).title) {
            this.find(".wcp-title")[0].innerHTML = this.itemDesc(this.currentItem()).title;
        }
        if (window.win.gui.title != this.itemDesc(this.currentItem()).title) {
            window.win.title.left(this.itemDesc(this.currentItem()).title);
        }
        opts[this.context].firstTime = false;
        
//        this.hideSplashScreen();
        
        if (this.vlc.subtitles.track > 0) this.vlc.subtitles.track = 0;
        opts[this.context].currentSub = 0;
        opts[this.context].trackSub = -1;
        totalSubs = this.vlc.subtitles.count;
        itemSetting = this.itemDesc(this.currentItem()).setting;
        
        // set default aspect ratio
        if (itemSetting.aspectRatio) opts[this.context].aspectRatio = itemSetting.aspectRatio;
        else {
            opts[this.context].aspectRatio = "Default";
            autoResize();
        }
        
        // set default crop
        if (itemSetting.crop) opts[this.context].crop = itemSetting.crop;
        else {
            opts[this.context].crop = "Default";
            autoResize();
        }
        
        // set default zoom
        if (itemSetting.zoom) {
            opts[this.context].zoom = itemSetting.zoom;
        } else {
            opts[this.context].zoom = 1;
            autoResize();
        }

        if (itemSetting.subtitles) totalSubs += Object.keys(itemSetting.subtitles).length;
        
        opts[this.context].subDelay = 0;
        
//        if (totalSubs > 0) this.find(".wcp-subtitle-but").show(0);
        if (window.powGlobals.lists.media[this.currentItem()] && !window.powGlobals.lists.media[this.currentItem()].isAudio) {
            this.find(".wcp-subtitle-but").show(0);
        }
        
        if (this.itemDesc(this.currentItem()).setting.defaultSub) {
            for (gvn = 1; gvn < this.subCount(); gvn++) {
                if (this.subDesc(gvn).language == this.itemDesc(this.currentItem()).setting.defaultSub) {
                    this.subTrack(gvn);
                    break;
                }
            }
        } else {
            if (opts[this.context].setSub) {
                this.subTrack(opts[this.context].setSub);
                delete opts[this.context].setSub;
            }
        }
    }
    var style = window.getComputedStyle(this.find(".wcp-status")[0]);
    if (style.display !== 'none') this.find(".wcp-status").fadeOut(1200);
    if (wjsPlayer.find(".wcp-dlna-buttons").is(":visible")) wjsPlayer.find(".wcp-dlna-buttons").hide(0);
}

function hasEnded() {
    opts[this.context].keepHidden = true;
    this.zoom(0);
    this.renderer.clearCanvas();
    switchClass(this.find(".wcp-pause"),"wcp-pause","wcp-replay");
    if (this.time() > 0) {
        if (opts[this.context].lastPos < 0.95) {
            // Reconnect if connection to server lost
            this.vlc.playlist.currentItem =opts[this.context].lastItem;
            this.vlc.playlist.play();
            this.vlc.position = opts[this.context].lastPos;

            wjsButton = this.find(".wcp-play");
            if (wjsButton.length != 0) wjsButton.removeClass("wcp-play").addClass("wcp-pause");
            
            wjsButton = this.find(".wcp-replay");
            if (wjsButton.length != 0) wjsButton.removeClass("wcp-replay").addClass("wcp-pause");

            positionChanged.call(this,0);
            this.find(".wcp-time-current").text("");
            this.find(".wcp-time-total").text("");
            // End Reconnect if connection to server lost
        } else {
            if (opts[this.context].loop && this.currentItem() +1 == this.itemCount()) this.playItem(0);
            else if (this.currentItem() +1 < this.itemCount()) this.next();
        }
    }
}
// end player event handlers

function singleResize(width,height) {

    this.canvas.width = width;
    this.canvas.height = height;

    var container = $(this.context),
        canvasParent = $(this.canvas).parent()[0];
    
    if (opts[this.context].aspectRatio != "Default" && opts[this.context].aspectRatio.indexOf(":") > -1) {
        var res = opts[this.context].aspectRatio.split(":");
        var ratio = gcd(this.canvas.width,this.canvas.height);
    }
    var destAspect = container.width() / container.height();
    
    if (ratio) var sourceAspect = (ratio * parseFloat(res[0])) / (ratio * parseFloat(res[1]));
    else var sourceAspect = this.canvas.width / this.canvas.height;
    
    if (opts[this.context].crop != "Default" && opts[this.context].crop.indexOf(":") > -1) {
        var res = opts[this.context].crop.split(":");
        var ratio = gcd(this.canvas.width,this.canvas.height);
        var sourceAspect = (ratio * parseFloat(res[0])) / (ratio * parseFloat(res[1]));
    }

    var cond = destAspect > sourceAspect;
    
    if (opts[this.context].crop != "Default" && opts[this.context].crop.indexOf(":") > -1) {
        if (cond) {
            canvasParent.style.height = "100%";
            canvasParent.style.width = ( ((container.height() * sourceAspect) / container.width() ) * 100) + "%";
        } else {
            canvasParent.style.height = ( ((container.width() / sourceAspect) /container.height() ) * 100) + "%";
            canvasParent.style.width = "100%";
        }
        var sourceAspect = this.canvas.width / this.canvas.height;
        futureWidth = ( ((canvasParent.offsetHeight * sourceAspect) / canvasParent.offsetWidth ) *canvasParent.offsetWidth);
        if (futureWidth < canvasParent.offsetWidth) {
            var sourceAspect = this.canvas.height / this.canvas.width;
            this.canvas.style.width = canvasParent.offsetWidth+"px";
            this.canvas.style.height = ( ((canvasParent.offsetWidth * sourceAspect) / canvasParent.offsetHeight ) *canvasParent.offsetHeight) + "px";
        } else {
            this.canvas.style.height = canvasParent.offsetHeight+"px";
            this.canvas.style.width = ( ((canvasParent.offsetHeight * sourceAspect) / canvasParent.offsetWidth ) *canvasParent.offsetWidth) + "px";
        }
    } else {
        if (cond) {
            canvasParent.style.height = (100*opts[this.context].zoom)+"%";
            canvasParent.style.width = ( ((container.height() * sourceAspect) / container.width() ) * 100 *opts[this.context].zoom) + "%";
        } else {
            canvasParent.style.height = ( ((container.width() / sourceAspect) /container.height() ) * 100*opts[this.context].zoom) + "%";
            canvasParent.style.width = (100*opts[this.context].zoom)+"%";
        }
        this.canvas.style.height = "100%";
        this.canvas.style.width = "100%";
    }
}

function autoResize() {
    $('.webchimeras').each(function(i, obj) {
        wjsPlayer = getContext(obj);
        if (wjsPlayer.wrapper[0]) {
            // resize status font size
            fontSize = calcFontSize(wjsPlayer);

            wjsPlayer.find(".wcp-status").css('fontSize', fontSize);
            wjsPlayer.find(".wcp-notif").css('fontSize', fontSize);
            wjsPlayer.find(".wcp-subtitle-text").css('fontSize', (fontSize*subSize));

            singleResize.call(wjsPlayer,wjsPlayer.canvas.width,wjsPlayer.canvas.height);
        }
    });
}

function hideUI() {
    if (!(vlcs[this.context].multiscreen && window.document.webkitFullscreenElement == null)) {
        if (seekDrag || volDrag || ($(this.find(".wcp-toolbar").selector + ":hover").length > 0 && vlcs[this.context].timestampUI + 20 > Math.floor(Date.now() / 1000))) {
            vlcs[this.context].hideUI = setTimeout(function(i) { return function() { hideUI.call(i); } }(this),3000);
            return;
        }
        if (window.document.webkitFullscreenElement == null) {
            if (["both","minimized"].indexOf(opts[this.context].titleBar) > -1) this.find(".wcp-titlebar").stop().fadeOut();
        } else {
            if (["both","fullscreen"].indexOf(opts[this.context].titleBar) > -1) this.find(".wcp-titlebar").stop().fadeOut();
        }
        this.find(".wcp-agent-container").stop().fadeOut();
        this.find(".wcp-toolbar").stop().fadeOut();
        this.find(".wcp-tooltip").stop().fadeOut();
        this.find(".wcp-settings-but").stop().fadeOut();
        this.wrapper.css({cursor: 'none'});
    }
}

function showPlaylist() {
    if (!this.find(".wcp-playlist").is(":visible")) {
        if (this.find(".wcp-subtitles").is(":visible")) this.find(".wcp-subtitles").hide(0);
        else if (this.find(".wcp-settings-menu").is(":visible")) this.find(".wcp-settings-menu").hide(0);
        else if (this.find(".wcp-sleep-menu").is(":visible")) this.find(".wcp-sleep-menu").hide(0);
        else if (this.find(".wcp-folder-menu").is(":visible")) this.find(".wcp-folder-menu").hide(0);
        else if (this.find(".wcp-encodings-menu").is(":visible")) this.find(".wcp-encodings-menu").hide(0);
        else if (this.find(".wcp-dlna-clients-menu").is(":visible")) this.find(".wcp-dlna-clients-menu").hide(0);
        this.find(".wcp-playlist").show(0);
        printPlaylist.call(this);
    }
}

function hidePlaylist() {
    if (this.find(".wcp-playlist").is(":visible")) {
        this.find(".wcp-playlist-items").sortable("destroy");
        this.find(".wcp-playlist").hide(0);
    }
}


function showEncodings() {
    if (!this.find(".wcp-encodings-menu").is(":visible")) {
        if (this.find(".wcp-subtitles").is(":visible")) this.find(".wcp-subtitles").hide(0);
        else if (this.find(".wcp-settings-menu").is(":visible")) this.find(".wcp-settings-menu").hide(0);
        else if (this.find(".wcp-sleep-menu").is(":visible")) this.find(".wcp-sleep-menu").hide(0);
        else if (this.find(".wcp-folder-menu").is(":visible")) this.find(".wcp-folder-menu").hide(0);
        else if (this.find(".wcp-playlist").is(":visible")) this.find(".wcp-playlist").hide(0);
        else if (this.find(".wcp-dlna-clients-menu").is(":visible")) this.find(".wcp-dlna-clients-menu").hide(0);
        this.find(".wcp-encodings-menu").show(0);
        printEncodings.call(this);
    }
}

function showDlnaDevices() {
    if (!this.find(".wcp-dlna-clients-menu").is(":visible")) {
        if (this.find(".wcp-subtitles").is(":visible")) this.find(".wcp-subtitles").hide(0);
        else if (this.find(".wcp-settings-menu").is(":visible")) this.find(".wcp-settings-menu").hide(0);
        else if (this.find(".wcp-sleep-menu").is(":visible")) this.find(".wcp-sleep-menu").hide(0);
        else if (this.find(".wcp-folder-menu").is(":visible")) this.find(".wcp-folder-menu").hide(0);
        else if (this.find(".wcp-playlist").is(":visible")) this.find(".wcp-playlist").hide(0);
        else if (this.find(".wcp-encodings-menu").is(":visible")) this.find(".wcp-encodings-menu").hide(0);
        this.find(".wcp-dlna-clients-menu").show(0);
        printDlnaClients.call(this);
    }
}

function showSleepMenu() {
    if (this.find(".wcp-settings-menu").is(":visible")) this.find(".wcp-settings-menu").hide(0);
    if (!this.find(".wcp-sleep-menu").is(":visible")) {
        this.find(".wcp-sleep-menu").show(0);
        printSleepMenu.call(this);
    }
}

function showFolderMenu() {
    if (this.find(".wcp-settings-menu").is(":visible")) this.find(".wcp-settings-menu").hide(0);
    if (!this.find(".wcp-folder-menu").is(":visible")) {
        this.find(".wcp-folder-menu").show(0);
        printFolderMenu.call(this);
    }
}

function showSettings() {
    if (this.find(".wcp-playlist").is(":visible")) this.find(".wcp-playlist").hide(0);
    else if (this.find(".wcp-subtitles").is(":visible")) this.find(".wcp-subtitles").hide(0);
    else if (this.find(".wcp-sleep-menu").is(":visible")) this.find(".wcp-sleep-menu").hide(0);
    else if (this.find(".wcp-folder-menu").is(":visible")) this.find(".wcp-folder-menu").hide(0);
    else if (this.find(".wcp-encodings-menu").is(":visible")) this.find(".wcp-encodings-menu").hide(0);
    else if (this.find(".wcp-dlna-clients-menu").is(":visible")) this.find(".wcp-dlna-clients-menu").hide(0);
    if (!this.find(".wcp-settings-menu").is(":visible")) {
        this.find(".wcp-settings-menu").show(0);
        printSettings.call(this);
    }
}

function hideSettings() {
    if (this.find(".wcp-settings-menu").is(":visible")) this.find(".wcp-settings-menu").hide(0);
}

function showSubtitles() {
    if (!this.find(".wcp-subtitles").is(":visible")) {
        if (this.find(".wcp-playlist").is(":visible")) {
            this.find(".wcp-playlist-items").sortable("destroy");
            this.find(".wcp-playlist").hide(0);
        } else if (this.find(".wcp-settings-menu").is(":visible")) this.find(".wcp-settings-menu").hide(0);
        else if (this.find(".wcp-sleep-menu").is(":visible")) this.find(".wcp-sleep-menu").hide(0);
        else if (this.find(".wcp-folder-menu").is(":visible")) this.find(".wcp-folder-menu").hide(0);
        else if (this.find(".wcp-encodings-menu").is(":visible")) this.find(".wcp-encodings-menu").hide(0);
        else if (this.find(".wcp-dlna-clients-menu").is(":visible")) this.find(".wcp-dlna-clients-menu").hide(0);
        this.find(".wcp-subtitles").show(0);
        printSubtitles.call(this);
    }
}

function printPlaylist() {
    playlistItems = this.find(".wcp-playlist-items");
    oi = 0;
    if (this.itemCount() > 0) {
        generatePlaylist = "";
        for (oi = 0; oi < this.itemCount(); oi++) {
            if (this.vlc.playlist.items[oi].title.indexOf("[custom]") != 0) {
                var plstring = this.vlc.playlist.items[oi].title;
                if (plstring.indexOf("http://") == 0) {
                    // extract filename from url
                    var tempPlstring = plstring.substring(plstring.lastIndexOf('/')+1);
                    if (tempPlstring.length > 3) plstring = tempPlstring;
                    delete tempPlstring;
                }
                if (plstring.indexOf(".") > -1) {
                    // remove extension
                    var tempPlstring = plstring.replace("."+plstring.split('.').pop(),"");
                    if (tempPlstring.length > 3) plstring = tempPlstring;
                    delete tempPlstring;
                }
                plstring = unescape(plstring);
                plstring = plstring.split('_').join(' ');
                plstring = plstring.split('.').join(' ');
                plstring = plstring.split('  ').join(' ');
                plstring = plstring.split('  ').join(' ');
                plstring = plstring.split('  ').join(' ');
                
                // capitalize first letter
                plstring = plstring.charAt(0).toUpperCase() + plstring.slice(1);
    
                if (plstring != this.itemDesc(oi).title) vlc.playlist.items[oi].title = "[custom]"+plstring;
            }
            generatePlaylist += '<li class="wcp-menu-item wcp-playlist-item';
            if (window.playerApi.tempSel > -1) {
                if (oi == window.playerApi.tempSel) generatePlaylist += ' wcp-menu-selected';
            } else if (window.dlna.instance.initiated) {
                if (oi == window.dlna.instance.lastIndex) generatePlaylist += ' wcp-menu-selected';
            } else {
                if (!window.playerApi.waitForNext && oi == this.currentItem()) generatePlaylist += ' wcp-menu-selected';
                else if (window.playerApi.waitForNext && oi == window.playerApi.tempSel) generatePlaylist += ' wcp-menu-selected';
            }
            if (this.itemDesc(oi).disabled) generatePlaylist += ' wcp-disabled';
            generatePlaylist += '"><img class="wcp-disabler-img" src="'+relbase+'/images/dragger.png" width="6" height="30"><div class="wcp-disabler-hold"><div class="wcp-disabler"><div class="wcp-disabler-dot"></div></div></div>'+this.itemDesc(oi).title+'</li>';
        }
        playlistItems.css('overflowY', 'scroll');
        playlistItems.html("");
        playlistItems.html(generatePlaylist);
        
        if (playlistItems.outerHeight() < (oi* parseInt(playlistItems.find(".wcp-playlist-item").css("height")))) {
            playlistItems.css("cursor","pointer");
        } else playlistItems.css("cursor","default");

        this.find(".wcp-disabler-hold").click(function(e) {
            if (!e) var e = window.event;
            e.cancelBubble = true;
            if (e.stopPropagation) e.stopPropagation();
            plItem = $(this).parent();
            wjsPlayer = getContext(this);
            if (!plItem.hasClass("wcp-menu-selected")) {
                if (!wjsPlayer.itemDesc(plItem.index()).disabled) {
                    plItem.addClass("wcp-disabled");
                    wjsPlayer.vlc.playlist.items[plItem.index()].disabled = true;
                } else {
                    plItem.removeClass("wcp-disabled");
                    wjsPlayer.vlc.playlist.items[plItem.index()].disabled = false;
                }
            }
        });
        this.find(".wcp-playlist-item").click(function() {
            if (!$(this).hasClass("wcp-menu-selected")) {
                if (window.playerApi.waitForNext) window.playerApi.waitForNext = false;
                wjsPlayer = getContext(this);
                if (wjsPlayer.itemDesc($(this).index()).disabled) {
                    wjsPlayer.vlc.playlist.items[$(this).index()].disabled = false;
                    $(this).removeClass("wcp-disabled");
                }
                if (window.dlna.instance.initiated) {
                    window.dlna.instance.lastIndex = $(this).index();
                    window.dlna.play($(this).index());
                    printPlaylist.call(wjsPlayer);
                    return;
                }

                wjsPlayer.playItem(parseInt($(this).index()));
                printPlaylist.call(wjsPlayer);
            }
        });
        this.find(".wcp-playlist-items").sortable({
          placeholder: "sortable-placeholder",
          delay: 250,
          start: function(e,ui) {
              $(ui.item[0]).addClass("sortable-dragging");
              var start_pos = ui.item.index();
              ui.item.data('start_pos', start_pos);
          },
          stop: function(e,ui) {
              $(this).parents(".wcp-wrapper").find(".sortable-dragging").removeClass("sortable-dragging");
          },
          update: function(e,ui) {
              var start_pos = ui.item.data('start_pos');
              var end_pos = ui.item.index();
              var swapItems = [];
              swapItems[0] = start_pos;
              swapItems[1] = (end_pos - start_pos);
              getContext(this).advanceItem(swapItems[0],swapItems[1]);
              if (swapItems[1] < 0) {
                  var tmpVideos = [];
                  window.powGlobals.lists.media.forEach(function(el,ij) {
                      if (ij == (swapItems[0] + swapItems[1])) tmpVideos[ij] = window.powGlobals.lists.media[swapItems[0]];
                      else if (ij > (swapItems[0] + swapItems[1]) && ij <= swapItems[0]) tmpVideos[ij] = window.powGlobals.lists.media[ij-1];
                      else tmpVideos[ij] = el;
                  });
                  setTimeout(function() { window.powGlobals.lists.currentIndex = window.player.currentItem(); },10);
                  window.powGlobals.lists.media = tmpVideos;
              } else if (swapItems[1] > 0) {
                  var tmpVideos = [];
                  window.powGlobals.lists.media.forEach(function(el,ij) {
                      if (ij == swapItems[0] + swapItems[1]) tmpVideos[ij] = window.powGlobals.lists.media[swapItems[0]];
                      else if (ij >= swapItems[0] && ij < (swapItems[0] + swapItems[1])) tmpVideos[ij] = window.powGlobals.lists.media[ij+1];
                      else tmpVideos[ij] = el;
                  });
                  setTimeout(function() { window.powGlobals.lists.currentIndex = window.player.currentItem(); },10);
                  window.powGlobals.lists.media = tmpVideos;
              }
          }
        });
    } else playlistItems.html("");
}

function printSubtitles() {
    playlistItems = this.find(".wcp-subtitles-items");

    generatePlaylist = "";
    generatePlaylist += '<li class="wcp-menu-item wcp-subtitles-item';
    if (opts[this.context].currentSub == 0) generatePlaylist += ' wcp-menu-selected';
    generatePlaylist += '">None</li>';
    if (this.vlc.subtitles.count > 0) {
        for (oi = 1; oi < this.vlc.subtitles.count; oi++) {
            generatePlaylist += '<li class="wcp-menu-item wcp-subtitles-item';
            if (oi == opts[this.context].currentSub) generatePlaylist += ' wcp-menu-selected';
            generatePlaylist += '">'+this.vlc.subtitles[oi]+'</li>';
        }
    } else oi = 1;

    itemSetting = this.itemDesc(this.currentItem()).setting;
    
    if (itemSetting.subtitles) {
        target = itemSetting.subtitles;
        for (var k in target) if (target.hasOwnProperty(k)) {
            generatePlaylist += '<li class="wcp-menu-item wcp-subtitles-item';
            if (oi == opts[this.context].currentSub) generatePlaylist += ' wcp-menu-selected';
            generatePlaylist += '">'+k+'</li>';
            oi++;
        }
    }

    playlistItems.html("");
    playlistItems.html(generatePlaylist);

    if (playlistItems.outerHeight() < (oi* parseInt(playlistItems.find(".wcp-subtitles-item").css("height")))) {
        playlistItems.css("cursor","pointer");
    } else playlistItems.css("cursor","default");
    
    this.find(".wcp-subtitles-item").click(function() {
        wjsPlayer = getContext(this);
        if ($(this).index() == 0) {
            wjsPlayer.vlc.subtitles.track = 0;
            clearSubtitles.call(wjsPlayer);
            wjsPlayer.notify("Subtitle Unloaded");
            window.localStorage.subLang = "None";
        } else if ($(this).index() < wjsPlayer.vlc.subtitles.count) {
            wjsPlayer.find(".wcp-subtitle-text").html("");
            opts[wjsPlayer.context].subtitles = [];
            wjsPlayer.vlc.subtitles.track = $(this).index();
            wjsPlayer.notify("Subtitle: "+wjsPlayer.subDesc($(this).index()).language);
        } else {
            wjsPlayer.find(".wcp-subtitle-text").html("");
            opts[wjsPlayer.context].subtitles = [];
            if (wjsPlayer.vlc.subtitles.track > 0) wjsPlayer.vlc.subtitles.track = 0;
            newSub = $(this).index() - wjsPlayer.vlc.subtitles.count +1;
            itemSubtitles = itemSetting.subtitles;
            for (var k in itemSubtitles) if (itemSubtitles.hasOwnProperty(k)) {
                newSub--;
                if (newSub < 2) {
                    loadSubtitle.call(wjsPlayer,itemSubtitles[k]);
                    wjsPlayer.notify("Subtitle: "+k);
                    if (itemSubtitles[k].indexOf("http://dl.opensubtitles.org/") == 0) if (k.indexOf(" ") > -1) window.localStorage.subLang = k.split(" ")[0];
                    else window.localStorage.subLang = k;
                    break;
                }
            }
        }
        wjsPlayer.find(".wcp-subtitles").hide(0);
        opts[wjsPlayer.context].currentSub = $(this).index();
        opts[wjsPlayer.context].subDelay = 0;
    });
}

function printSleepMenu() {
    wjsPlayer = this;
    settingsItems = this.find(".wcp-sleep-items");

    generatePlaylist = "";
    oi = 0;
    sleepOpts = ['Disabled','15 min','30 min','45 min','1 hour','1 hour 30 min','2 hours'];
    sleepOpts.forEach(function(el,ij) {
        generatePlaylist += '<li class="wcp-menu-item wcp-sleep-item';
        if (opts[wjsPlayer.context].curSleepOpt == ij) generatePlaylist += ' wcp-menu-selected';
        generatePlaylist += '">'+el+'</li>';
        oi++;
    });

    settingsItems.html("");
    settingsItems.html(generatePlaylist);
    
    if (settingsItems.outerHeight() < (oi* parseInt(settingsItems.find(".wcp-sleep-item").css("height")))) {
        settingsItems.css("cursor","pointer");
    } else settingsItems.css("cursor","default");
    
    wjsPlayer.find(".wcp-sleep-item").click(function() {
        if ($(this).text() == "Disabled") sleepTime = 0;
        else if ($(this).text() == "15 min") sleepTime = 900000;
        else if ($(this).text() == "30 min") sleepTime = 1800000;
        else if ($(this).text() == "45 min") sleepTime = 2700000;
        else if ($(this).text() == "1 hour") sleepTime = 3600000;
        else if ($(this).text() == "1 hour 30 min") sleepTime = 5400000;
        else if ($(this).text() == "2 hours") sleepTime = 7200000;
        
        wjsPlayer = getContext(this);

        opts[wjsPlayer.context].curSleepOpt = $(this).index();
        if (opts[wjsPlayer.context].sleepTimer) clearTimeout(opts[wjsPlayer.context].sleepTimer);
        if (sleepTime > 0) {
            opts[wjsPlayer.context].sleepTimer = setTimeout(function() {
                if (wjsPlayer.playing()) wjsPlayer.togglePause();
                if (window.powGlobals.torrent && window.powGlobals.torrent.engine) {
                    if (window.player.fullscreen()) window.player.fullscreen(false);
                    $("#filesList").css("min-height",$("#player_wrapper").height());
                    $('#inner-in-content').animate({ scrollTop: $("#player_wrapper").height() }, "slow");
                    $('#inner-in-content').css("overflow-y","visible");
                }
            },sleepTime);
        }
        wjsPlayer.find(".wcp-sleep-menu").hide(0);
        wjsPlayer.notify("Sleep Timer: "+$(this).text());
    });
}

function printEncodings() {
    wjsPlayer = this;
    settingsItems = this.find(".wcp-encodings-items");

    generatePlaylist = "";
    oi = 0;
    supportedEncoding.forEach(function(el,ij) {
        generatePlaylist += '<li class="wcp-menu-item wcp-encodings-item';
        if (el[1] == window.localStorage.subEncoding) generatePlaylist += ' wcp-menu-selected';
        generatePlaylist += '" >'+el[0]+'</li>';
        oi++;
    });

    settingsItems.html("");
    settingsItems.html(generatePlaylist);
    
    if (settingsItems.outerHeight() < (oi* parseInt(settingsItems.find(".wcp-encodings-item").css("height")))) {
        settingsItems.css("cursor","pointer");
    } else settingsItems.css("cursor","default");
    
    wjsPlayer.find(".wcp-encodings-item").click(function() {
        wjsPlayer = getContext(this);

        window.localStorage.subEncoding = supportedEncoding[$(this).index()][1];
        printEncodings.call(wjsPlayer);
        if (wjsPlayer.subTrack() > 0) wjsPlayer.notify("Reloaded Subtitle");
        else wjsPlayer.notify("Encoding Saved");
        wjsPlayer.subTrack(wjsPlayer.subTrack());
    });
}

function printDlnaClients() {
    wjsPlayer = this;
    settingsItems = this.find(".wcp-dlna-clients-items");

    generatePlaylist = "";
    oi = 0;
    
    if (window.localStorage.lastDlna) {
        generatePlaylist += '<li class="wcp-menu-item wcp-dlna-clients-item" data-item="'+window.localStorage.lastDlna+'">'+window.localStorage.lastDlna+' (Last Used)</li>';
        oi++;
    }
    
    oldClients = JSON.parse(window.localStorage.dlnaClients);
    var voteClients = [];
    for (var k in oldClients) if (oldClients.hasOwnProperty(k)) {
        if (!window.localStorage.lastDlna || k != window.localStorage.lastDlna) {
            oldClients[k] = oldClients[k] +1;
            voteClients.push([k,oldClients[k]]);
        }
    }
    
    if (voteClients.length > 0) {
        var perfect = false;
        while (!perfect) {
            perfect = true;
            for (ij = 0; voteClients[ij]; ij++) {
                if (ij +1 < voteClients.length && voteClients[ij][1] < voteClients[ij+1][1]) {
                    perfect = false;
                    var tempClient = voteClients[ij];
                    voteClients[ij] = voteClients[ij+1];
                    voteClients[ij+1] = tempClient;
                }
            }
        }
    }
    
    voteClients.forEach(function(el,ij) {
        generatePlaylist += '<li class="wcp-menu-item wcp-dlna-clients-item" data-item="'+el[0]+'">'+el[0];
        if (ij == 0) generatePlaylist += ' (Most Used)';
        generatePlaylist += '</li>';
        oi++;
    });

    settingsItems.html("");
    settingsItems.html(generatePlaylist);
    
    if (settingsItems.outerHeight() < (oi* parseInt(settingsItems.find(".wcp-dlna-clients-item").css("height")))) {
        settingsItems.css("cursor","pointer");
    } else settingsItems.css("cursor","default");
    
    wjsPlayer.find(".wcp-dlna-clients-item").click(function() {
        if (window.dlna.notFoundTimer) clearTimeout(window.dlna.notFoundTimer);
        if (window.dlna.bestMatches && window.dlna.bestMatches.length) window.dlna.bestMatches = [];
        window.dlna.instance.clients[0] = $(this).data("item");
        window.dlna.findMyIp();
        wjsPlayer = getContext(this);
        $(wjsPlayer.find(".wcp-menu-close")[0]).trigger("click");
    });
}

function printFolderMenu() {
    wjsPlayer = this;
    settingsItems = wjsPlayer.find(".wcp-folder-items");

    generatePlaylist = "";
    oi = 3;
    generatePlaylist += '<li class="wcp-menu-item wcp-folder-item set-download-folder">Download Folder</li>';
    generatePlaylist += '<li class="wcp-menu-item wcp-folder-item set-library-folder">Library Folder</li>';
    generatePlaylist += '<li class="wcp-menu-item wcp-folder-item back-to-settings">Back to Settings</li>';

    settingsItems.html("");
    settingsItems.html(generatePlaylist);
    
    if (settingsItems.outerHeight() < (oi* parseInt(settingsItems.find(".wcp-folder-item").css("height")))) {
        settingsItems.css("cursor","pointer");
    } else settingsItems.css("cursor","default");
    
    wjsPlayer.find(".set-download-folder").click(function() {
        if (wjsPlayer.fullscreen()) wjsPlayer.toggleFullscreen();
        window.chooseFile('#folderDialog');
    });
    wjsPlayer.find(".set-library-folder").click(function() {
        if (wjsPlayer.fullscreen()) wjsPlayer.toggleFullscreen();
        window.chooseFile('#libraryDialog');
    });
    wjsPlayer.find(".back-to-settings").click(function() {
        showSettings.call(wjsPlayer);
    });
}

function printSettings() {
    wjsPlayer = this;
    settingsItems = wjsPlayer.find(".wcp-settings-items");

    generatePlaylist = "";
    oi = 5;
    if (window.dlna.instance.initiated) generatePlaylist += '<li class="wcp-menu-item wcp-settings-item dlna-off">Stop Streaming to TV</li>';
    else generatePlaylist += '<li class="wcp-menu-item wcp-settings-item dlna-on">Stream to TV (DLNA)</li>';
    if (window.powGlobals.torrent && window.powGlobals.torrent.engine) {
        generatePlaylist += '<li class="wcp-menu-item wcp-settings-item torrent-data-set">View Torrent Data</li>';
        oi++;
    }
    generatePlaylist += '<li class="wcp-menu-item wcp-settings-item set-sleep-timer">Set Sleep Timer</li>';
    generatePlaylist += '<li class="wcp-menu-item wcp-settings-item manage-folders">Manage Folders</li>';
    generatePlaylist += '<li class="wcp-menu-item wcp-settings-item back-to-main-set">Back to Main Menu</li>';
    generatePlaylist += '<li class="wcp-menu-item wcp-settings-item close-powder-set">Close Powder</li>';

    settingsItems.html("");
    settingsItems.html(generatePlaylist);
    
    if (settingsItems.outerHeight() < (oi* parseInt(settingsItems.find(".wcp-settings-item").css("height")))) {
        settingsItems.css("cursor","pointer");
    } else settingsItems.css("cursor","default");
    
    wjsPlayer.find(".dlna-on").click(function() {
        wjsPlayer = getContext(this);
        $(wjsPlayer.find(".wcp-menu-close")[0]).trigger("click");
        window.dlna.findClient();
        wjsPlayer.find(".wcp-subtitle-text").html("");
        var wjsContext = wjsPlayer.context;
        opts[wjsContext].currentSub = 0;
        if (opts[wjsContext].splashInterval1) {
            resetLogo();
            clearInterval(opts[wjsContext].splashInterval1);
            clearInterval(opts[wjsContext].splashInterval2);
            clearInterval(opts[wjsContext].splashInterval3);
        }
        opts[wjsContext].splashInterval1 = setInterval(function() { logoAnim(); },1000);
        opts[wjsContext].splashInterval2 = setInterval(function() { logoAnim(); },1600);
        opts[wjsContext].splashInterval3 = setInterval(function() { logoAnim(); },2700);
    });
    wjsPlayer.find(".dlna-off").click(function() {
        wjsPlayer = getContext(this);
        $(wjsPlayer.find(".wcp-menu-close")[0]).trigger("click");
        var wjsContext = wjsPlayer.context;
        if (opts[wjsContext].splashInterval1) {
            resetLogo();
            clearInterval(opts[wjsContext].splashInterval1);
            clearInterval(opts[wjsContext].splashInterval2);
            clearInterval(opts[wjsContext].splashInterval3);
        }
        window.dlna.stop();
    });
    wjsPlayer.find(".set-sleep-timer").click(function() {
        showSleepMenu.call(wjsPlayer);
    });
    wjsPlayer.find(".manage-folders").click(function() {
        showFolderMenu.call(wjsPlayer);
    });
    wjsPlayer.find(".torrent-data-set").click(function() {
        $(getContext(this).find(".wcp-menu-close")[0]).trigger("click");
        window.ui.goto.torrentData();
    });
    wjsPlayer.find(".back-to-main-set").click(function() {
        $(getContext(this).find(".wcp-menu-close")[0]).trigger("click");
        window.ui.goto.mainMenu();
    });
    wjsPlayer.find(".close-powder-set").click(function() {
        $(getContext(this).find(".wcp-menu-close")[0]).trigger("click");
        window.win.closeProcedure()
    });
}

function clearSubtitles() {
    this.find(".wcp-subtitle-text").html("");
    opts[this.context].currentSub = 0;
    opts[this.context].subtitles = [];
    if (this.vlc.subtitles.track > 0) this.vlc.subtitles.track = 0;
    if (this.find(".wcp-subtitles").is(":visible")) printSubtitles.call(this);
}

function loadSubtitle(subtitleElement) {
    wjsPlayer = this;
    if (subtitleElement.indexOf("[-alt-]") > -1) {
        var altSub = subtitleElement.split("[-alt-]")[1];
        subtitleElement = subtitleElement.split("[-alt-]")[0];
    }

    if (typeof opts[this.context].subtitles === "undefined") opts[this.context].subtitles = [];
    else if (opts[this.context].subtitles.length) opts[this.context].subtitles = [];

    callOpts = {};
    callOpts.host = subtitleElement.replace("http://","").substr(0,subtitleElement.replace("http://","").indexOf("/"));
    callOpts.path = subtitleElement.replace("http://","").substr(subtitleElement.replace("http://","").indexOf("/"));
    if (subtitleElement.replace("http://","").substr(0,subtitleElement.replace("http://","").indexOf("/")) == "dl.opensubtitles.org" && window.subtitles.osCookie) {
        callOpts.headers = { 'cookie': window.subtitles.osCookie };
    } else if (subtitleElement.replace("http://","").substr(0,subtitleElement.replace("http://","").indexOf("/")) == "dl.opensubtitles.org") {
        if (altSub) {
            window.torrent.flood.pause();
            retriever.retrieveSrt("http://dl.opensubtitles.org/en/download/file/"+subtitleElement.split('/').pop(),function(err,res) {
                window.torrent.flood.start();
                processSub.call(wjsPlayer,res,subtitleElement.split('.').pop());
            },{ charset: window.localStorage.subEncoding });
        } else this.notify("Subtitle Error");
        return;
    } else {
        retriever.retrieveSrt(subtitleElement,function(err,res) {
            processSub.call(wjsPlayer,res,subtitleElement.split('.').pop());
        },{ charset: window.localStorage.subEncoding });
        return;
    }
    resData = "";

    window.torrent.flood.pause();
    var req = http.request(callOpts,function(res) {
        if ([501,404].indexOf(res.statusCode) > -1) {
            if (altSub)    {
                retriever.retrieveSrt("http://dl.opensubtitles.org/en/download/file/"+subtitleElement.split('/').pop(),function(err,res) {
                    window.torrent.flood.start();
                    processSub.call(wjsPlayer,res,subtitleElement.split('.').pop());
                },{ charset: window.localStorage.subEncoding });
            } else wjsPlayer.notify("Subtitle Error");
        } else {
            res.on('data', function (data) { resData += data; });
            res.on('end', function() {
                window.torrent.flood.start();
                processSub.call(wjsPlayer,resData,subtitleElement.split('.').pop());
            });
        }
    });
    req.end();
}

function processSub(srt,extension) {
    opts[this.context].subtitles = [];
    
//    console.log(srt);
    
    if (extension.toLowerCase() == "srt" || extension.toLowerCase() == "vtt") {

        srt = strip(srt.replace(/\r\n|\r|\n/g, '\n'));

        var srty = srt.split('\n\n'),
            si = 0;
        
        if (srty[0].substr(0,6).toLowerCase() == "webvtt") si = 1;

        for (s = si; s < srty.length; s++) {
            var st = srty[s].split('\n');
            if (st.length >=2) {
                var n = -1;
                if (st[0].indexOf(' --> ') > -1) var n = 0;
                else if (st[1].indexOf(' --> ') > -1) var n = 1;
//                else if (!st[2]) { console.log("error"); console.log(st[0]); console.log(st[1]); }
                else if (st[2].indexOf(' --> ') > -1)  var n = 2;
                else if (st[3].indexOf(' --> ') > -1)  var n = 3;
                if (n > -1) {
                    stOrigin = st[n]
                    var is = Math.round(toSeconds(strip(stOrigin.split(' --> ')[0])));
                    var os = Math.round(toSeconds(strip(stOrigin.split(' --> ')[1])));
                    var t = st[n+1];
                    if (st.length > n+2) for (j=n+2; j<st.length; j++) t = t + '\n'+st[j];
                    opts[this.context].subtitles[is] = {i:is, o: os, t: t};
                }
            }
        }
//        console.log(opts[this.context].subtitles);
    } else if (extension.toLowerCase() == "sub") {
        srt = srt.replace(/\r\n|\r|\n/g, '\n');
        
        srt = strip(srt);
        var srty = srt.split('\n');

        var s = 0;
        for (s = 0; s < srty.length; s++) {
            var st = srty[s].split('}{');
            if (st.length >=2) {
              var is = Math.round(st[0].substr(1) /10);
              var os = Math.round(st[1].split('}')[0] /10);
              var t = st[1].split('}')[1].replace('|', '\n');
              if (is != 1 && os != 1) opts[this.context].subtitles[is] = {i:is, o: os, t: t};
            }
        }
    }
    opts[this.context].trackSub = -1;
}

function logoAnim() {
    if ($(".wcp-splash-screen").is(":visible")) {
        if ($(".wcp-logo-ball:visible").length < 5) {
            resetLogo();
        } else {
            el = $($(".wcp-logo-ball")[Math.floor((Math.random()*$(".wcp-logo-ball").length)+1)]);
            
            if (!el.is(":animated")) {
                if (!el.is(":visible")) {
                    el.animate({ "width": 8, "height": 8, "borderRadius": 4 },500);
                } else {
                    el.animate({ "width": 0, "height": 0, "borderRadius": 0 },500);
                }
            }
        }
    }
}

// wall of hotkeys
function attachHotkeys() {

    hotkeys = require('hotkeys');

    var dispatcher = new hotkeys.Dispatcher();
    dispatcher.getKeymap();

    wjsContext = this.context;

    $(this.wrapper).bind('mousewheel', function(event) {
        if (shouldHotkey() && !$(".wcp-menu").is(":visible") && window.allowScrollHotkeys) {
            wjsPlayer = players[wjsContext];
            newVolume = (wjsPlayer.volume()*0.625);
    
            if ($(wjsPlayer.find(".wcp-progress-bar").selector + ":hover").length > 0) {
                if (["ended","stopping","error"].indexOf(wjsPlayer.state()) == -1) {

                    if (wjsPlayer.isLocal()) wjsDelay = 200;
                    else wjsDelay = 800;
    
                    if (event.originalEvent.wheelDelta >= 0) wjsPlayer.delayTime((wjsPlayer.length()/120),wjsDelay);
                    else wjsPlayer.delayTime((-1)*(wjsPlayer.length()/120),wjsDelay);

                }
            } else {
    
                if (event.originalEvent.wheelDelta >= 0) newVolume = (Math.round(newVolume/5)*5)+5;
                else newVolume = (Math.round(newVolume/5)*5)-5;
        
                if (newVolume >= 5 && newVolume <= 125) {
                    wjsPlayer.volume(parseInt(newVolume/0.625));
                    wjsPlayer.notify("Volume "+newVolume+"%");
                } else {
                    if (newVolume < 5) {
                        if (wjsPlayer.volume() > 0) wjsPlayer.volume(0);
                        wjsPlayer.notify("Muted");
                    } else wjsPlayer.notify("Volume "+(wjsPlayer.volume()*0.625)+"%");
                }
                
            }
        }
    });
    dispatcher.on('shift + up',function() {
        var subPos = parseInt($(".wcp-subtitle-text").css("bottom"));
        if (subPos < 200) $(".wcp-subtitle-text").css("bottom",(subPos+5)+"px");
    }).on('shift + down',function() {
        var subPos = parseInt($(".wcp-subtitle-text").css("bottom"));
        if (subPos > 0) $(".wcp-subtitle-text").css("bottom",(subPos-5)+"px");
    }).on('ctrl + s',function() {
        window.scan.server();
    }).on('ctrl + d',function() {
        window.win.gui.showDevTools();
    }).on('esc',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            if (window.document.webkitFullscreenElement == null) wjsPlayer.find(".wcp-menu-close")[0].trigger("click");
            else wjsPlayer.fullscreen(false);
        }
    }).on('f',function() {
        if (shouldHotkey()) players[wjsContext].toggleFullscreen();
    }).on('f11',function() {
        if (shouldHotkey()) players[wjsContext].toggleFullscreen();
    }).on('n',function() {
        if (shouldHotkey()) players[wjsContext].find(".wcp-next").trigger("click");
    }).on('ctrl + up',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            newVolume = (wjsPlayer.volume()*0.625);
            newVolume = (Math.round(newVolume/5)*5)+5;
            if (newVolume <= 125) {
                wjsPlayer.volume(parseInt(newVolume/0.625));
                wjsPlayer.notify("Volume "+newVolume+"%");
            } else {
                if (newVolume < 5) {
                    wjsPlayer.notify("Muted");
                } else wjsPlayer.notify("Volume "+(wjsPlayer.volume()*0.625)+"%");
            }
        }
    }).on('ctrl + down',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            newVolume = (wjsPlayer.volume()*0.625);
            newVolume = (Math.round(newVolume/5)*5)-5;
            if (newVolume >= 5) {
                wjsPlayer.volume(parseInt(newVolume/0.625));
                wjsPlayer.notify("Volume "+newVolume+"%");
            } else {
                if (newVolume < 5) {
                    if (wjsPlayer.volume() > 0) wjsPlayer.volume(0);
                    wjsPlayer.notify("Muted");
                } else wjsPlayer.notify("Volume "+(wjsPlayer.volume()*0.625)+"%");
            }
        }
    }).on('space',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            wjsPlayer.find('.wcp-surface').trigger('click');
        }
    }).on('m',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            if (wjsPlayer.mute()) {
                wjsPlayer.mute(false);
                wjsPlayer.notify("Volume "+(wjsPlayer.volume()*0.625)+"%");
            } else {
                wjsPlayer.mute(true);
                wjsPlayer.notify("Muted");
            }
        }
    }).on('p',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            wjsPlayer.time(0);
        }
    }).on('t',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            wjsPlayer.notify(wjsPlayer.find(".wcp-time-current").text()+wjsPlayer.find(".wcp-time-total").text());
        }
    }).on('ctrl + l',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            if ($(this).parents(".wcp-wrapper").find(".wcp-playlist").is(":visible")) hidePlaylist.call(wjsPlayer);
            else showPlaylist.call(wjsPlayer);
        }
    }).on('ctrl + h',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            if (wjsPlayer.ui()) {
                wjsPlayer.ui(true);
                wjsPlayer.notify("UI Visible");
            } else {
                wjsPlayer.ui(false);
                wjsPlayer.notify("UI Hidden");
            }
        }
    }).on('ctrl + right',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            if (["ended","stopping","error"].indexOf(wjsPlayer.state()) == -1) {
                if (wjsPlayer.isLocal()) wjsDelay = 200;
                else wjsDelay = 700;
                wjsPlayer.delayTime(60000,wjsDelay);
            }
        }
    }).on('ctrl + left',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            if (["ended","stopping","error"].indexOf(wjsPlayer.state()) == -1) {
                if (wjsPlayer.isLocal()) wjsDelay = 200;
                else wjsDelay = 700;
                wjsPlayer.delayTime(-60000,wjsDelay);
            }
        }
    }).on('alt + right',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            if (["ended","stopping","error"].indexOf(wjsPlayer.state()) == -1) {
                if (wjsPlayer.isLocal()) wjsDelay = 200;
                else wjsDelay = 700;
                wjsPlayer.delayTime(10000,wjsDelay);
            }
        }
    }).on('alt + left',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            if (["ended","stopping","error"].indexOf(wjsPlayer.state()) == -1) {
                if (wjsPlayer.isLocal()) wjsDelay = 200;
                else wjsDelay = 700;
                wjsPlayer.delayTime(-10000,wjsDelay);
            }
        }
    }).on('shift + right',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            if (["ended","stopping","error"].indexOf(wjsPlayer.state()) == -1) {
                if (wjsPlayer.isLocal()) wjsDelay = 200;
                else wjsDelay = 700;
                wjsPlayer.delayTime(3000,wjsDelay);
            }
        }
    }).on('shift + left',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            if (["ended","stopping","error"].indexOf(wjsPlayer.state()) == -1) {
                if (wjsPlayer.isLocal()) wjsDelay = 200;
                else wjsDelay = 700;
                wjsPlayer.delayTime(-3000,wjsDelay);
            }
        }
    }).on('right',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            if (["ended","stopping","error"].indexOf(wjsPlayer.state()) == -1) {
                if (wjsPlayer.isLocal()) wjsDelay = 200;
                else wjsDelay = 700;
                wjsPlayer.delayTime((wjsPlayer.length()/60),wjsDelay);
            }
        }
    }).on('left',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            if (["ended","stopping","error"].indexOf(wjsPlayer.state()) == -1) {
                if (wjsPlayer.isLocal()) wjsDelay = 200;
                else wjsDelay = 700;
                wjsPlayer.delayTime((-1)*(wjsPlayer.length()/60),wjsDelay);
            }
        }
    }).on('e',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            if (["ended","stopping","error"].indexOf(wjsPlayer.state()) == -1) {
                wjsPlayer.pause();
                wjsPlayer.delayTime(500,0);
                wjsPlayer.notify("Next Frame");
            }
        }
    }).on('a',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            window.ctxMenu.aspectRatios.some(function(el,i) {
                if (opts[wjsContext].aspectRatio == el) {
                    if (i+1 < window.ctxMenu.aspectRatios.length) {
                        window.ctxMenu.selectAspect(i+1);
                        wjsPlayer.notify("Aspect Ratio: "+window.ctxMenu.aspectRatios[i+1]);
                    } else {
                        window.ctxMenu.selectAspect(0);
                        wjsPlayer.notify("Aspect Ratio: Default");
                    }
                    return true;
                }
            });
        }
    }).on('c',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            window.ctxMenu.crops.some(function(el,i) {
                if (opts[wjsContext].crop == el) {
                    if (i+1 < window.ctxMenu.crops.length) {
                        window.ctxMenu.selectCrop(i+1);
                        wjsPlayer.notify("Crop: "+window.ctxMenu.crops[i+1]);
                    } else {
                        window.ctxMenu.selectCrop(0);
                        wjsPlayer.notify("Crop: Default");
                    }
                    return true;
                }
            });
        }
    }).on('z',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            window.ctxMenu.zooms.some(function(el,i) {
                if (opts[wjsContext].zoom == el[1]) {
                    if (i+1 < window.ctxMenu.zooms.length) {
                        window.ctxMenu.selectZoom(i+1,window.ctxMenu.zooms[i+1][1]);
                        wjsPlayer.notify("Zoom: "+window.ctxMenu.zooms[i+1][0]);
                    } else {
                        window.ctxMenu.selectZoom(0,window.ctxMenu.zooms[0][1]);
                        wjsPlayer.notify("Zoom: Default");
                    }
                    return true;
                }
            });
        }
    }).on('g',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            newDelay = wjsPlayer.subDelay()-50;
            wjsPlayer.subDelay(newDelay);
            wjsPlayer.notify("Subtitle Delay: "+newDelay+" ms")
        }
    }).on('h',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            newDelay = wjsPlayer.subDelay()+50;
            wjsPlayer.subDelay(newDelay);
            wjsPlayer.notify("Subtitle Delay: "+newDelay+" ms")
        }
    }).on('j',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            newDelay = wjsPlayer.audioDelay()-50;
            wjsPlayer.audioDelay(newDelay);
            wjsPlayer.notify("Audio Delay: "+newDelay+" ms")
        }
    }).on('k',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            newDelay = wjsPlayer.audioDelay()+50;
            wjsPlayer.audioDelay(newDelay);
            wjsPlayer.notify("Audio Delay: "+newDelay+" ms")
        }
    }).on('alt + up',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            subSize = subSize+0.05;
            fontSize = calcFontSize(wjsPlayer);
            wjsPlayer.wrapper.find(".wcp-subtitle-text").css('fontSize', (fontSize*subSize));
            wjsPlayer.notify("Subtitle Size: "+Math.round(subSize*100)+"%");
        }
    }).on('alt + down',function() {
        if (shouldHotkey()) {
            if ((subSize-0.05) >= 0) {
                wjsPlayer = players[wjsContext];
                subSize = subSize-0.05;
                fontSize = calcFontSize(wjsPlayer);
                wjsPlayer.wrapper.find(".wcp-subtitle-text").css('fontSize', (fontSize*subSize));
            }
            wjsPlayer.notify("Subtitle Size: "+Math.round(subSize*100)+"%");
        }
    }).on('[',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            newRate = 0;
            curRate = wjsPlayer.rate();
            
            if (curRate > 0.25 && curRate <= 0.5) newRate = 0.125;
            if (curRate > 0.5 && curRate <= 1) newRate = 0.25;
            if (curRate > 1 && curRate <= 2) newRate = 0.5;
            if (curRate > 2 && curRate <= 4) newRate = 1;
            if (curRate > 4) newRate = curRate /2;
            if ((curRate + newRate) >= 0.25) wjsPlayer.rate(curRate - newRate);
    
            wjsPlayer.notify("Speed: " + parseFloat(Math.round(wjsPlayer.rate() * 100) / 100).toFixed(2) + "x");
        }
    }).on(']',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            newRate = 0;
            curRate = wjsPlayer.rate();
            
            if (curRate >= 0.25 && curRate < 0.5) newRate = 0.125;
            if (curRate >= 0.5 && curRate < 1) newRate = 0.25;
            if (curRate >= 1 && curRate < 2) newRate = 0.5;
            if (curRate >= 2 && curRate < 4) newRate = 1;
            if (curRate >= 4) newRate = curRate;
            if ((curRate + newRate) < 100) wjsPlayer.rate(curRate + newRate);
    
            wjsPlayer.notify("Speed: " + parseFloat(Math.round(wjsPlayer.rate() * 100) / 100).toFixed(2) + "x");
        }
    }).on('=',function() {
        if (shouldHotkey()) {
            wjsPlayer = players[wjsContext];
            wjsPlayer.rate(1);
            wjsPlayer.notify("Speed: " + parseFloat(Math.round(wjsPlayer.rate() * 100) / 100).toFixed(2) + "x");
        }
    });
}
function shouldHotkey() {
    if ($('#main').css("display") != "table" && $('#inner-in-content').scrollTop() == 0 && !$("#magnetLink").is(":focus")) return true;
    else return false;
}
// end wall of hotkeys

wjs.prototype.delayTime=function(t,d){
    if (!delayedTime) forceProgress = wjsPlayer.position();
    forceProgress = ((forceProgress * wjsPlayer.length()) +t)/wjsPlayer.length();

    if (forceProgress < 0) forceProgress = 0;
    else if (forceProgress > 1) forceProgress = 1;

    positionChanged.call(wjsPlayer,forceProgress);
    wjsPlayer = this;
    
    clearTimeout(vlcs[wjsPlayer.context].hideUI);
    wjsPlayer.wrapper.css({cursor: 'default'});
    wjsPlayer.find(".wcp-toolbar").stop().show(0);
    if (wjsPlayer.find(".wcp-agent").html() != "") wjsPlayer.find(".wcp-agent-container").stop().show(0);
    wjsPlayer.find(".wcp-settings-but").stop().show(0);
    
    if (delayedTime) clearTimeout(delayedTime);
    delayedTime = setTimeout(function() {
        if (["ended","stopping","error"].indexOf(wjsPlayer.state()) > -1) {
            nextPlayTime = parseInt(forceProgress*wjsPlayer.length());
            wjsPlayer.playItem(wjsPlayer.currentItem());
        } else {
            wjsPlayer.time(parseInt(forceProgress*wjsPlayer.length()));
            forceProgress = -1;
        }
        delayedTime = null;

        if ($(wjsPlayer.find(".wcp-toolbar").selector + ":hover").length > 0) {
            vlcs[wjsPlayer.context].hideUI = setTimeout(function(i) { return function() { hideUI.call(players[i]); } }(wjsPlayer.context),3000);
            vlcs[wjsPlayer.context].timestampUI = Math.floor(Date.now() / 1000);
        } else vlcs[wjsPlayer.context].hideUI = setTimeout(function(i) { return function() { hideUI.call(players[i]); } }(wjsPlayer.context),3000);

    },d);

}

// this is just junk..
function calcFontSize(wjsPlayer) {
    if (wjsPlayer.wrapper.width() > 220 && wjsPlayer.wrapper.width() <= 982) {
        fontSize = ((wjsPlayer.wrapper.width() -220) /40) +9;
        if (fontSize < 16) fontSize = 16;
    } else if (wjsPlayer.wrapper.width() > 982 && wjsPlayer.wrapper.width() <= 1600) {
        fontSize = wjsPlayer.wrapper.height()/15;
        if (fontSize > 31) fontSize = 31;
    } else if (wjsPlayer.wrapper.width() > 1600) {
        fontSize = ((wjsPlayer.wrapper.width() - 1600) / 35.5) +31;
    } else fontSize = 20;
    return fontSize;
}
function resetLogo() {
    $(".wcp-logo-ball").animate({ "width": 8, "height": 8, "borderRadius": 4 },500);
}
function preventSleep() {
    powerSaveBlocker?(!sleepId||!powerSaveBlocker.isStarted(sleepId))?sleepId=powerSaveBlocker.start('prevent-display-sleep'):false:sleep.prevent();
}
function allowSleep() {
    powerSaveBlocker?powerSaveBlocker.isStarted(sleepId)?powerSaveBlocker.stop(sleepId):false:sleep.allow();
}
function getContext(el) {
    if ($(el).hasClass("webchimeras")) return players["#"+$(el).find(".wcp-wrapper")[0].id];
    else if ($(el).hasClass("wcp-wrapper")) return players["#"+el.id];
    else return players["#"+$(el).parents(".wcp-wrapper")[0].id];
}
function nl2br(str,is_xhtml) {
    breakTag=(is_xhtml||typeof is_xhtml==='undefined')?'<br />':'<br>';return (str+'').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g,'$1'+breakTag+'$2');
}
function toSeconds(t){s = 0.0;if(t){p=t.split(':');for(i=0;i<p.length;i++)s=s*60+parseFloat(p[i].replace(',', '.'))};return s}
function strip(s){return s.replace(/^\s+|\s+$/g,"")}
function gcd(a,b){if(b>a){temp=a;a=b;b=temp}while(b!=0){m=a%b;a=b;b=m;}return a}
function sel(context){return $($(this).parents(".wcp-wrapper")[0]).find(context)}
function switchClass(el,fclass,sclass){if(el.hasClass(fclass))el.removeClass(fclass).addClass(sclass)}
function hideSubtitles(){if(this.find(".wcp-subtitles").is(":visible"))this.find(".wcp-subtitles").hide(0)}
wjs.prototype.isLocal=function(){if(this.currentItem() > -1 && this.itemDesc(this.currentItem()).mrl.indexOf("file:///")==0){return true;}else{return false;}}
wjs.prototype.isPlaying=function(){return this.vlc.playing}
wjs.prototype.setOpeningText=function(newData){this.find(".wcp-opening-text").text(newData);return this}
wjs.prototype.setDownloaded=function(newData){this.find(".wcp-progress-cache").css("width",(newData*100)+"%");return this}
wjs.prototype.audioCount=function(){return this.vlc.audio.count}
wjs.prototype.itemCount=function(){return this.vlc.playlist.itemCount}
wjs.prototype.playing=function(){return this.vlc.playing}
wjs.prototype.length=function(){return this.vlc.length}
wjs.prototype.fps=function(){return this.vlc.input.fps}
wjs.prototype.width=function(){return this.canvas.width}
wjs.prototype.height=function(){return this.canvas.height}
wjs.prototype.stateInt=function(){return this.vlc.state}
wjs.prototype.find=function(el){return this.wrapper.find(el)}
wjs.prototype.refreshSize=function(d){if(!d)d=0;setTimeout(function(){autoResize()},d);return this}
wjs.prototype.onMediaChanged=function(wjsFunction){this.catchEvent("MediaChanged",wjsFunction);return this}
wjs.prototype.onIdle=function(wjsFunction){this.catchEvent("NothingSpecial",wjsFunction);return this}
wjs.prototype.onOpening=function(wjsFunction){this.catchEvent("Opening",wjsFunction);return this}
wjs.prototype.onBuffering=function(wjsFunction){this.catchEvent("Buffering",wjsFunction);return this}
wjs.prototype.onPlaying=function(wjsFunction){this.catchEvent("Playing",wjsFunction);return this}
wjs.prototype.onPaused=function(wjsFunction){this.catchEvent("Paused",wjsFunction);return this}
wjs.prototype.onForward=function(wjsFunction){this.catchEvent("Forward",wjsFunction);return this}
wjs.prototype.onBackward=function(wjsFunction){this.catchEvent("Backward",wjsFunction);return this}
wjs.prototype.onError=function(wjsFunction){this.catchEvent("EncounteredError",wjsFunction);return this}
wjs.prototype.onEnded=function(wjsFunction){this.catchEvent("EndReached",wjsFunction);return this}
wjs.prototype.onStopped=function(wjsFunction){this.catchEvent("Stopped",wjsFunction);return this}
wjs.prototype.onState=function(wjsFunction){vlcs[this.context].events.on('StateChanged',wjsFunction);return this}
wjs.prototype.onStateInt=function(wjsFunction){vlcs[this.context].events.on('StateChangedInt',wjsFunction);return this}
wjs.prototype.onVolume = function(wjs_function) { vlcs[this.context].events.on('VolumeChanged',wjs_function); return this; }
wjs.prototype.onTime=function(wjsFunction){this.catchEvent("TimeChanged",wjsFunction);return this}
wjs.prototype.onPosition=function(wjsFunction){this.catchEvent("PositionChanged",wjsFunction);return this}
wjs.prototype.onFrameSetup=function(wjsFunction){vlcs[this.context].events.on('FrameSetup',wjsFunction);return this}
module.exports = wjs;