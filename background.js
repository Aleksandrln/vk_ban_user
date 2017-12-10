chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
   if (request.method == 'getOptions') {
    sendResponse(opts);
  }else if (request.method == 'updateOptions'){
      saveOptions(request.update);
    }
});


chrome.runtime.onInstalled.addListener(function(details) {
  chrome.tabs.create({ url: 'options.html' });
});


chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {

    if(changeInfo.url != null && changeInfo.url.indexOf('?act=blacklist')) {

        chrome.tabs.sendRequest(tabId, {msg: changeInfo, type:'update'});
    }
});

chrome.browserAction.onClicked.addListener(function () {
    chrome.tabs.create({url:chrome.extension.getURL('options.html')});
});