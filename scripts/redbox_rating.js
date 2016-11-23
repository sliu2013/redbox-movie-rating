var IMDB_API = "https://www.omdbapi.com/?tomatoes=true";

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
Add rating to the cache
*/
function addRatingToCache(title, imdbRating, tomatoUserMeter, imdbID, year, type) {
    title = title.trim();
    imdbRating = imdbRating || null;
    tomatoUserMeter = tomatoUserMeter || null;
    imdbID = imdbID || null;
    year = year || null;
    type = type || null;

    var rating = {
        'title': title,
        'imdbRating': imdbRating,
        'tomatoUserMeter': tomatoUserMeter,
        'imdbID': imdbID,
        'year': year,
        'date': new Date().getTime(),
        'type': type
    };

    CACHE[title] = JSON.stringify(rating);
    return rating;
}


function checkCache(title) {
  if (!(title in CACHE)) {
    return {
      "inCache": false,
      "cachedVal": null
    };
  }

  var cachedVal = JSON.parse(CACHE[title]);
  var inCache = false;
  if (cachedVal !== undefined) {
    inCache = isValidCacheEntry(cachedVal.date);
  }
  return {
    "inCache": inCache,
    "cachedVal": cachedVal
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
Search for the title, first in the CACHE and then through the API
*/
function getRating(title, year, elementId, isHeroImg, isNewReleasesImg) {
    var cached = checkCache(title.trim());
    if (cached.inCache && cached.cachedVal.imdbRating != null) {
      addRatingToRedboxWebpage(cached.cachedVal, false, elementId, isHeroImg, isNewReleasesImg);
      return;
    }

    $.ajax({
        type: 'GET',
        url: getIMDBAPI(title, year),
        dataType:'json',
        success: function(data){
          addRatingToRedboxWebpage(data, true, elementId, isHeroImg, isNewReleasesImg)
        }
    });
}


function addRatingToRedboxWebpage(data, ifAddToCache, elementId, isHeroImg, isNewReleasesImg){
  if(data.imdbRating === null || data.Response === 'False'){
    $('#'+elementId).append("<div class='rating-icon imdb-icon-good transparent'><div class='rating-value'>" + "N/A</div></div>");
  }else{
    if(data.imdbRating >= 7){
      $('#'+elementId).append("<div class='rating-icon imdb-icon-good'><div class='rating-value'>" + data.imdbRating + "</div></div>");
    }else{
      $('#'+elementId).append("<div class='rating-icon imdb-icon-bad'><div class='rating-value'>" + data.imdbRating + "</div></div>");
    }
  }
  if(isHeroImg) {
    $(":first-child", $('#'+elementId)).addClass('kiosk');
  }
  if(isNewReleasesImg) {
    $(":first-child", $('#'+elementId)).addClass('midsize');
  }

  if(data.tomatoUserMeter === null || data.Response === 'False' || data.tomatoUserMeter === 'N/A'){
    $('#'+elementId).append("<div class='rating-icon rt-icon-fresh transparent'><div class='rating-value'>" + "N/A</div></div>");
  }else{
    if(data.tomatoUserMeter >= 70){
      $('#'+elementId).append("<div class='rating-icon rt-icon-fresh'><div class='rating-value'>" + data.tomatoUserMeter + "</div></div>");
    }else{
      $('#'+elementId).append("<div class='rating-icon rt-icon-rotten'><div class='rating-value'>" + data.tomatoUserMeter + "</div></div>");
    }
  }
  if(isHeroImg) {
    $(":first-child", $('#'+elementId)).next().addClass('kiosk');
  }
  if(isNewReleasesImg) {
    $(":first-child", $('#'+elementId)).next().addClass('midsize');
  }

  if((ifAddToCache || data.date === null || (data.imdbRating === null && data.tomatoUserMeter === null)) && (data.Title != null)){
    addRatingToCache(data.Title, data.imdbRating, data.tomatoUserMeter, data.imdbID, data.Year, data.Type);
  }
}


$.fn.hasAttr = function(name) {
    return $(this).attr(name) !== undefined;
};


function getAllRatings() {
    var url = location.href;

    // For redbox.com
    if(url.indexOf('redbox.com') > -1) {
        // For redbox home page
        $('div.default-image-text.ng-binding').each(function(index){
            //console.log(this.textContent + "***" + $(this).prev('div[id^=rr]').length);
            if($(this).prev('div[id^=rr]').length == 0) {
                if ($(this).parent().attr('href').indexOf("http://www.redbox.com/movies") > -1) {
                    var movieTitle = this.textContent.indexOf("(") > -1 ? this.textContent.split("(")[0] : this.textContent;

                    var movieYear = null;
                    if (this.textContent.indexOf("(") > -1) {
                        if (!isNaN(this.textContent.split("(")[1].split(")")[0])) {
                            movieYear = this.textContent.split("(")[1].split(")")[0];
                        }
                    }

                    var $div = $("<div>", {id: "rr" + index});
                    $(this).before($div);

                    getRating(movieTitle, movieYear, ("rr" + index), $(this).parents('.hero-box').length, $(this).parents("[style='width: 228px;']").length);
                }
            }
        });

        // For redbox detail page
        $('img.digital-details-background-image.xs-hidden').each(function(index){
            if(this.outerHTML.indexOf('games-img-not-available') == -1) {
                if ($(this).hasAttr('alt')) {
                    var movieTitle = this.alt.split(",")[0].indexOf("(") > -1 ? this.alt.split(",")[0].split("(")[0] : this.alt.split(",")[0];

                    var movieYear = null;
                    if (this.alt.split(",")[0].indexOf("(") > -1) {
                        if (!isNaN(this.alt.split(",")[0].split("(")[1].split(")")[0])) {
                            movieYear = this.alt.split(",")[0].split("(")[1].split(")")[0];
                        }
                    }

                    var $div = $("<div>", {id: "rr" + index});
                    $(this).before($div);

                    getRating(movieTitle, movieYear, ("rr" + index), $(this).parents('.hero-box').length, $(this).parents("[style='width: 228px;']").length);
                }
            }
        });
    }

    // For vidangel.com
    if(url.indexOf('vidangel.com') > -1) {
        
        var global_index = 0;

        // For vidangel home page
        $('a.poster__label.ng-binding').each(function(index){
            if($(this).prev('div[id^=rr]').length == 0) {
                var movieTitle = this.textContent.indexOf("(") > -1 ? this.textContent.split("(")[0] : this.textContent;

                var movieYear = null;
                if (this.textContent.indexOf("(") > -1) {
                    if (!isNaN(this.textContent.split("(")[1].split(")")[0])) {
                        movieYear = this.textContent.split("(")[1].split(")")[0];
                    }
                }

                var $div = $("<div>", {id: "rr" + index});
                $(this).prev().append($div);

                getRating(movieTitle, movieYear, ("rr" + index), $(this).parents('.hero-box').length, $(this).parents("[style='width: 228px;']").length);

                global_index = index;
            }
        });

        // For vidangel detail page
        $('div.title__title.ng-binding').each(function(index){
            if($(this).prev('div[id^=rr]').length == 0) {
                var movieTitle = this.textContent;

                var movieYear = null;
                if (this.textContent.indexOf("(") > -1) {
                    if (!isNaN(this.textContent.split("(")[1].split(")")[0])) {
                        movieYear = this.textContent.split("(")[1].split(")")[0];
                    }
                }

                var $div = $("<div>", {id: "rr" + (index+global_index)});
                $(this).parent().parent().parent().parent().prev().append($div);

                getRating(movieTitle, movieYear, ("rr" + (index+global_index)), $(this).parents('.hero-box').length, $(this).parents("[style='width: 228px;']").length);
            }
        });
    }
}

// Receive request sent from the onClick action of chrome extension icon
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");
        if (request.requestMsg == "retrieve all ratings") {
            getAllRatings();
            sendResponse({replyMsg: "acknowledged and done"});
        }
    }
);


///////// INIT /////////////
$(window).load(function(){getAllRatings();});
////////////////////////////




///// ***** Try to tackle infinite-scrolling issue, but no luck with the following approach ***** /////
//$('img').load(function(){
//    console.log("hello");
//getAllRatings();});
//
//$(window).bind("load", function(){getAllRatings();});
//
//$('.title-box-odopod.popover.img-loaded').imagesLoaded( { background: true }, function() {
//    console.log('image loading from backgroun=true: (2)');
//});
//
//$('.title-box-odopod.popover.img-loaded').imagesLoaded().always(function() {
//    console.log('image loading from always(): (3)');
//});
//
//$('.title-box-odopod.popover.img-loaded').imagesLoaded( { background: true }, function() {
//    console.log('image loading from backgroun=true: (4)');
//});
//
//$('.title-box-odopod.popover.img-loaded').imagesLoaded().always(function() {
//    console.log('image loading from always(): (5)');
//});
//
//
//$("img").one('load', function() {
//    console.log("answer (6)");
//}).each(function() {
//    if(this.complete) $(this).load();
//});

