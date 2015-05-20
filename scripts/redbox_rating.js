var IMDB_API = "http://www.omdbapi.com/?tomatoes=true";

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
function addRatingToCache(title, imdb, tomatoMeter, tomatoUserMeter, imdbID, year, type) {
    imdb = imdb || null;
    tomatoMeter = tomatoMeter || null;
    tomatoUserMeter = tomatoUserMeter || null;
    imdbID = imdbID || null;
    year = year || null;
    type = type || null;

    var rating = {
        'title': title,
        'imdb': imdb,
        'tomatoMeter': tomatoMeter,
        'tomatoUserMeter': tomatoUserMeter,
        'imdbID': imdbID,
        'year': year,
        'date': date,
        'type': type
    };

    rating.date = new Date().getTime();
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
    var cached = checkCache(title);
    if (cached.inCache) {
      return;
    }

    addRatingToCache(title);

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
            if(isHeroImg) {
                $(":first-child", $('#'+elementId)).addClass('kiosk');
            }
            if(isNewReleasesImg) {
                $(":first-child", $('#'+elementId)).addClass('midsize');
            }

            if(data.tomatoUserMeter === null | data.Response === 'False' | data.tomatoUserMeter === 'N/A'){
                $('#'+elementId).append("<div class='rating-icon rt-icon-fresh transparent'>" + "N/A</div>");
            }else{
                if(data.tomatoUserMeter >= 70){
                    $('#'+elementId).append("<div class='rating-icon rt-icon-fresh'>" + data.tomatoUserMeter + "</div>");
                }else{
                    $('#'+elementId).append("<div class='rating-icon rt-icon-rotten'>" + data.tomatoUserMeter + "</div>");
                }
            }
            if(isHeroImg) {
                $(":first-child", $('#'+elementId)).next().addClass('kiosk');
            }
            if(isNewReleasesImg) {
                $(":first-child", $('#'+elementId)).next().addClass('midsize');
            }
       }
    });
}


$.fn.hasAttr = function(name) {
    return $(this).attr(name) !== undefined;
};

///////// INIT /////////////
$(window).load(function() {

    $('img.box-art.box-hover').each(function(index){
        if($(this).hasAttr('alt')){
            var movieTitle = this.alt.split(",")[0].indexOf("(") > -1 ? this.alt.split(",")[0].split("(")[0] : this.alt.split(",")[0];
            var movieYear = null;
            if (this.alt.split(",")[0].indexOf("(") > -1){
                if(!isNaN(this.alt.split(",")[0].split("(")[1].split(")")[0])){
                   movieYear = this.alt.split(",")[0].split("(")[1].split(")")[0];
                }
            }
            var $div = $("<div>", {id: "rr" + index});
            getRating(movieTitle, movieYear, "rr"+index, $(this).parents('.hero-box').length, $(this).parents("[style='width: 228px;']").length);
            $(this).before($div);
        }
    });
});

