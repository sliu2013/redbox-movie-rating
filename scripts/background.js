
chrome.pageAction.onClicked.addListener(function(tab) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {requestMsg: "retrieve all ratings"}, function(response) {
            console.log(response.replyMsg);
        });
    });
});


// Called when the url of a tab changes.
function checkForValidUrl(tabId, changeInfo, tab) {
// If the tabs url contains 'redbox.com'...
    if ((tab.url.indexOf('redbox.com') > -1) ||  (tab.url.indexOf('vidangel.com') > -1)){
// ... show the page action.
        chrome.pageAction.show(tabId);
    }
};

chrome.tabs.onUpdated.addListener(checkForValidUrl);


// 'Browser_action' onclick example
//chrome.browserAction.onClicked.addListener(function(tab) { alert('icon clicked')});
