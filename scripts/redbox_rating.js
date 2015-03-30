var TMDB_API_KEY = "04a87a053afac639272eefbb94a173e4";
var MASHAPE_API_KEY = "4DZkWJrG7Imsh4ylrlSDYSMnhfOyp171DfIjsnVENEh1Yk8zwR";

var IMDB_API = "http://www.omdbapi.com/?tomatoes=true";
var TMDB_API = "http://api.themoviedb.org/3";
var MASHAPE_API = "https://byroredux-metacritic.p.mashape.com/search/movie";

var TOMATO_LINK = "http://www.rottentomatoes.com/alias?type=imdbid&s=";
var IMDB_LINK = "http://www.imdb.com/title/";
var B3_LINK = "http://netflix.burtonthird.com/count";
var YOUTUBE_TRAILER_LINK = "https://www.youtube.com/watch?v=";

//popup movie selectors
var HOVER_SEL = {
    '.bobbable .popLink': getWIMainTitle, //wi main display movies
    '.mdpLink': getSideOrDVDTitle,
};

/////////// PREFETCHING /////////////
var PREFETCH_CHUNK_SIZE = 5;
var PREFETCH_INTERVAL = 2500;
var PREFETCH_SEL = {
    '.boxShotImg': getImgTitle,
};

var CACHE = localStorage;
var CACHE_LIFE = 1000 * 60 * 60 * 24 * 7 * 2; //two weeks in milliseconds
var UUID_KEY = "uuid";
var DATE_KEY = "created_at";

/////////// HELPERS /////////////

/*
* Generically parse and response from an API
* tries to parse json and returns the defalt on an exception
*/
function parseAPIResponse(res, default_res) {
    try {
        return JSON.parse(res);
    } catch (e) {
        return default_res;
    }
}

/*
Builds a select object where the selector is used to insert the ratings via the given insertFunc. Interval specifies the interval necessary for the popupDelay. imdb and rt classes are extra classes that can be added to a rating.
*/
function makeSelectObject(selector, insertFunc, interval, klassDict) {
    klassDict = klassDict || {};

    return merge({
        'selector': selector,
        'insertFunc': insertFunc,
        'interval': interval,
    }, klassDict);
}

/*
Add the style sheet to the main netflix page.
*/
function addStyle() {
    if (!$('#rating-overlay').length) {
        var url = chrome.extension.getURL('../css/ratings.css');
        $("head").append("<link id='rating-overlay' href='" + url + "' type='text/css' rel='stylesheet' />");
    }
}

function getRatingArgs() {
    return getArgs('rating');
}

function getTrailerArgs() {
    return getArgs('trailer');
}

/*
* Get the arguments for showPopup based on which popup is being overridden
* type: [rating|trailer]
*/
function getArgs(type) {
    var url = document.location.href;
    var key = 'dvd.netflix.com';
    var args;
    if (url.indexOf(key) != -1) { // we are in dvds
        args = POPUP_INS_SEL[type][key];
        args.key = key;
        if (type == 'trailer') {
            args = getTrailerDvdArgs(args, url);
        }
    } else {
        key = 'movies.netflix.com';
        args = POPUP_INS_SEL[type][key];
        args.key = key;
    }
    return args;
}

/*
* Determine the page type to get the correct trailer select object
*/
function getTrailerDvdArgs(args, url) {
    var key = 'Movie';
    if (url.indexOf(key) === -1) {
        key = 'Search';
    }
    args = args[key];
    args.key = key;
    return args;
}

/*
Add rating to the cache
*/
function addCache(title, imdb, tomatoMeter, tomatoUserMeter, imdbID, metacriticScore, metacriticUrl, year, type) {
    imdb = imdb || null;
    tomatoMeter = tomatoMeter || null;
    tomatoUserMeter = tomatoUserMeter || null;
    imdbID = imdbID || null;
    metacriticScore = metacriticScore || null;
    metacriticUrl = metacriticUrl || null;
    year = year || null;
    type = type || null;

    var date = new Date().getTime();
    var rating = {
        'title': title,
        'imdb': imdb,
        'tomatoMeter': tomatoMeter,
        'tomatoUserMeter': tomatoUserMeter,
        'imdbID': imdbID,
        'metacriticScore': metacriticScore,
        'metacriticUrl': metacriticUrl,
        'year': year,
        'date': date,
        'type': type,
    };

    CACHE[title] = JSON.stringify(rating);
    return rating;
}

/*
* Add a trailer to cache
*/
function addTrailerCache(title, trailerId) {
    trailerId = trailerId || null;
    var cachedVal = JSON.parse(CACHE[title]);

    if (cachedVal === undefined) {
        cachedVal = {
            'title': title,
            'trailerId': trailerId,
        };
    } else {
        cachedVal.trailerId = trailerId;
    }

    CACHE.date = new Date().getTime();
    CACHE[title] = JSON.stringify(cachedVal);
    return cachedVal;
}

/*
* Add metacritic score to cache
*/
function addMetacriticCache(title, metacriticScore, metacriticUrl) {
    metacriticScore = metacriticScore || null;
    metacriticUrl = metacriticUrl || null;

    var cachedVal = JSON.parse(CACHE[title]);

    if (cachedVal === undefined) {
        cachedVal = {
            'title': title,
            'metacriticScore': metacriticScore,
            'metacriticUrl': metacriticUrl,
        };
    } else {
        cachedVal.metacriticScore = metacriticScore;
        cachedVal.metacriticUrl = metacriticUrl;
    }

    CACHE.date = new Date().getTime();
    CACHE[title] = JSON.stringify(cachedVal);
    return cachedVal;
}

function checkCache(title) {
    if (!(title in CACHE)) {
        return {
            'inCache': false,
            'cachedVal': null,
            'hasTrailer': false,
        };
    }

    var cachedVal = JSON.parse(CACHE[title]);
    var inCache = false;
    if (cachedVal !== undefined) {
        inCache = isValidCacheEntry(cachedVal.date);
    }
    return {
        'inCache': inCache,
        'cachedVal': cachedVal,
        'hasTrailer': cachedVal.trailerId !== undefined,
    };
}

/*
* returns whether a date exceeds the CACHE_LIFE
*/
function isValidCacheEntry(date) {
    var now = new Date().getTime();
    var lifetime = now - date;
    return lifetime <= CACHE_LIFE;
}

/*
Helper to generalize the parser for side titles and DVD titles
*/
function getWrappedTitle(e, key, regex) {
    var title = $(e.target).attr('alt');
    if (title === undefined) {
        var url = $(e.target).context.href;
        if (typeof url === "undefined") {
            return "";
        }
        url = url.split('/');
        title = url[url.indexOf(key) + 1];
        title = title.replace(regex, ' ');
    }
    return title;
}

/*
Clear old ratings and unused content. Differs for different popups
*/
function clearOld(type, args) {
    var $target = $('#BobMovie');
    if (args.key in POPUP_INS_SEL[type]['movies.netflix.com']) {
        $target.find('p.label').contents().remove();
    }
    if (type === 'rating') {
        $target.find('.rating-link').remove();
        $target.find('.label').remove();
        $target.find('.ratingPredictor').remove();
        $target.find('.bobMovieActions').remove();
    } else if (type === 'trailer') {
        $target.find('.trailer-label').remove();
    }
}

function getTomatoClass(score) {
    return score < 59 ? 'rotten' : 'fresh';
}

function getMetacriticClass(score) {
    var klass;
    if (score > 60) klass = 'favorable';
    else if (score > 40) klass = 'average';
    else klass = 'unfavorable';
    return 'metacritic-' + klass;
}

///////////////// URL BUILDERS ////////////////

/*
Builds and returns the imdbAPI url
*/
function getIMDBAPI(title, year) {
    var url = IMDB_API + '&t=' + title;
    if (year !== null) {
        url += '&y=' + year;
    }
    return url;
}

/*
Build the url for the imdbLink
*/
function getIMDBLink(title) {
    return IMDB_LINK + title;
}

/*
Build the url for the rtLink
*/
function getTomatoLink(imdbID) {
    imdbID = imdbID.slice(2); //convert tt123456 -> 123456
    return TOMATO_LINK + imdbID;
}

/*
* Build the url for the user counting
*/
function getB3Link() {
    return B3_LINK;
}

/*
* TMDB API urls
*/

/*
* type: [movie|tv]
* query: title string
*/
function getTMDBSearch(type, query, year) {
    var url = TMDB_API + "/search/" + type;
    url = appendTMDBAPIKey(url);
    url += "&query=" + query;
    if (year !== null) {
        url += '&year=' + year;
    }
    return url;
}

function getTMDBItemUrl(type, item_id) {
    if (type === 'movie') {
        return getTMDBMovie(item_id);
    }
    return getTMDBTV(item_id);
}

/*
* item_id: movie id
*/
function getTMDBMovie(item_id) {
    var url = TMDB_API + "/movie/" + item_id;
    url = appendTMDBAPIKey(url);
    url += "&append_to_response=trailers";
    return url;
}

/*
* item_id: movie id
*/
function getTMDBTV(item_id) {
    var url = TMDB_API + "/movie/" + item_id + "/videos";
    url = appendTMDBAPIKey(url);
    url += "&append_to_response=trailers";
    return url;
}

function appendTMDBAPIKey(url) {
    return url + "?api_key=" + TMDB_API_KEY;
}

function getYouTubeTrailerLink(trailerId) {
    return YOUTUBE_TRAILER_LINK + trailerId;
}

/*
* MASHAPE API url
*/

function getMashapeAPIUrl() {
    return MASHAPE_API;
}


///////////////// USER COUNT ////////////////
function generateUUID() {
    return 'xxxxxxxx-xxxx-3xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function hasUUID() {
    return UUID_KEY in CACHE && DATE_KEY in CACHE;
}

/*
* Checks if the uuid is older than CACHE_LIFE
*/
function uuidIsExpired() {
    var date = CACHE[DATE_KEY];
    if (date === undefined) {
        return true;
    }
    date = Date.parse(date); // convert to ms
    return !isValidCacheEntry(date);
}

function setUUID() {
    if (!(UUID_KEY in CACHE)) {
        CACHE[UUID_KEY] = generateUUID();
    }
    setUUIDDate();
}

function setUUIDDate() {
    CACHE[DATE_KEY] = new Date(); // just a string, must be parsed for cmp
}

function getUUID() {
    if (!hasUUID()) {
        setUUID();
    } else if (uuidIsExpired()) {
        setUUIDDate();
    }
    return CACHE[UUID_KEY];
}

function clearUUIDCache() {
    delete CACHE[UUID_KEY];
    delete CACHE[DATE_KEY];
}

function getSrc() {
    return "chrome";
}

function countUser() {
    if (hasUUID() && !uuidIsExpired()) {
        return;
    }
    $.post(getB3Link(), {
        'uuid': getUUID(),
        'src': getSrc(),
    }, function(res) {
        if (!res.success) {
            clearUUIDCache();
        }
    }).fail(function(res) {
        clearUUIDCache();
    });
}

///////////////// TITLE PARSERS ////////////////
/*
parses form: http://movies.netflix.com/WiPlayer?movieid=70171942&trkid=7103274&t=Archer
*/
function getWIMainTitle(e) {
    return $(e.target).siblings('img').attr('alt');
}

/*
Cleanup recently watched title
*/
function getRecentTitle(title) {
    var index = title.indexOf('%3A');
    if (index !== -1) {
        title = title.slice(0, index);
    }
    return title;
}

/*
Instant Queue and dvd popups use the same selector but different parsers
*/
function getSideOrDVDTitle(e) {
    var url = document.location.href;
    if (url.indexOf('Search') != -1) { //no popups on search page.
        return $(e.target).text(); // but still cache the title
    }

    var key = 'dvd.netflix.com';
    if (url.indexOf(key) != -1) { // we are in dvds now
        return getDVDTitle(e);
    }
    return getSideTitle(e);
}

function getSideTitle(e) {
    var key = "WiMovie";
    var regex = /_/g;
    return getWrappedTitle(e, key, regex);
}

function getDVDTitle(e) {
    var key = "Movie";
    var regex = /-/g;
    return getWrappedTitle(e, key, regex);
}

/*
* Parse a title given an element, not event
*/
function getImgTitle(el) {
    return el.alt;
}

function parseYear($target) {
    $target = $target || $('.year');
    var year = null;
    if ($target.length) {
        year = $target.text().split('-')[0];
    }
    return year;
}

/*
Parse the search title for a given search result
*/
function parseSearchTitle($target) {
    return $target.find('.title').children().text();
}

function parseMovieTitle($target) {
    return $target.find('.title').text();
}

/////////// RATING HANDLERS ////////////

/*
* Find all of the elements with the given selector and try to
* prefetch the title information. This should reduce lag once we cache everything.
*/
function prefetchHandler(selector, parser) {
    var start = 0;
    var end = PREFETCH_CHUNK_SIZE;
    var delay = PREFETCH_INTERVAL;
    var $targets = $(selector);
    var $slice;
    while (end < $targets.size()) {
        $slice = $targets.slice(start, end);
        setTimeout(function() {
            prefetchChunkProcessor($slice, parser);
        }, delay);
        start = end;
        end += PREFETCH_CHUNK_SIZE;
        end = Math.min(end, $targets.size());
        delay += PREFETCH_INTERVAL;
    }
}

function prefetchChunkProcessor($slice, parser) {
    $.each($slice, function(index, element) {
        var title = parser(element);
        getRating(title, null, null, function() {
            //wait until we fill the cache
            getTrailer(title, null, null, null);
        });
    });
}

function popupHandler(e) {
    var title = e.data(e); //title parse funtion
    if ($('.label').contents() !== '') { //the popup isn't already up
        //null year, null addArgs
        getRating(title, null, null, function(rating) {
            showPopupRating(rating, getRatingArgs());
        });

        getTrailer(title, null, null, function(trailer) {
            showPopupTrailer(trailer, getTrailerArgs());
        });
    }
}

/*
Search for the title, first in the CACHE and then through the API
*/
function getTrailer(title, year, addArgs, callback) {
    var cached = checkCache(title);
    if (cached.hasTrailer) {
        if (callback) {
            callback(cached.cachedVal, addArgs);
        }
        return;
    }
    if (cached.cachedVal === null || title === '') return; // we need the type!
    if (!('type' in cached.cachedVal)) {
        delete CACHE[title]; // update structure
        return;
    }
    var type = getTMDBSearchType(cached.cachedVal.type);
    addTrailerCache(title);
    // ok first find the stupid id.
    $.get(getTMDBSearch(type, title, year), function(res) {
        if (res.results.length === 0) {
            return null;
        }
        var item_id = res.results[0].id; //just grab the first. meh.
        // now we can finally get the trailer
        $.get(getTMDBItemUrl(type, item_id), function(res) {
            var trailer_link = cleanYouTubeId(extractTrailerId(type, res));
            var trailer = addTrailerCache(title, trailer_link);
            if (callback) {
                callback(trailer, addArgs);
            }
        });
    });
}

/*
* Convert the type given by OMDB_API
* to what TMDB_API expects
*/
function getTMDBSearchType(type) {
    if (type === "movie") return "movie";
    return "tv";
}


/*
* Extracts a youtube trailer id or returns null
*/
function extractTrailerId(type, res) {
    if (type === 'movie') {
        var youtube = res.trailers.youtube;
        if (youtube.length === 0) return null;
        return youtube[0].source;
    } else {
        for (var result in res.results) {
            if (result.site === "YouTube") {
                return result.key;
            }
        }
        return null;
    }
}
/*
Search for the title, first in the CACHE and then through the API
*/
function getRating(title, year, elementId, isKioskImg) {

    addCache(title);
    var omdbRes = {
        'Response': 'False',
    };

    var metaRes = {
        'result': false,
    };

    $.ajax({
        type: 'GET',
        url: getIMDBAPI(title, year),
        dataType:'json',
        success: function (data) {
            if(data.imdbRating === null | data.Response === 'False'){
                $('#'+elementId).append("<div class='rating-icon imdb-icon-good transparent'>" + "N/A</div>");
            }else{
                if(data.imdbRating >= 7){
                    $('#'+elementId).append("<div class='rating-icon imdb-icon-good'>" + data.imdbRating + "</div>");
                }else{
                    $('#'+elementId).append("<div class='rating-icon imdb-icon-bad'>" + data.imdbRating + "</div>");
                }
            }
            if(isKioskImg) {
                $(":first-child", $('#'+elementId)).addClass('kiosk');
            }

            if(data.tomatoUserMeter === null | data.Response === 'False' | data.tomatoUserMeter === 'N/A'){
                $('#'+elementId).append("<div class='rating-icon rt-icon-fresh transparent'>" + "N/A</div>");
            }else{
                if(data.tomatoUserMeter >= 60){
                    $('#'+elementId).append("<div class='rating-icon rt-icon-fresh'>" + data.tomatoUserMeter + "</div>");
                }else{
                    $('#'+elementId).append("<div class='rating-icon rt-icon-rotten'>" + data.tomatoUserMeter + "</div>");
                }
            }
            if(isKioskImg) {
                $(":first-child", $('#'+elementId)).next().addClass('kiosk');
            }
       }
    });
}


$.fn.hasAttr = function(name) {
    return $(this).attr(name) !== undefined;
};

///////// INIT /////////////
$(window).load(function() {

    $('img[class*="box-art box-hover"]').each(function(index){
        if($(this).hasAttr('alt')){
            var movieTitle = this.alt.split(",")[0].indexOf("(") > -1 ? this.alt.split(",")[0].split("(")[0] : this.alt.split(",")[0];
            var movieYear = null;
            if (this.alt.split(",")[0].indexOf("(") > -1){
                if(!isNaN(this.alt.split(",")[0].split("(")[1].split(")")[0])){
                   movieYear = this.alt.split(",")[0].split("(")[1].split(")")[0];
                }
            }
            var $div = $("<div>", {id: "rr" + index});
            getRating(movieTitle, movieYear, "rr"+index, $(this).parents('.hero-box').length);
            $(this).before($div);
        }
    });
});