function addElementInList() {
    clearTimeout(addElementInList.timer);
    let page_block = qu('.page_block_header .page_block_header_extra');
    if (window.location.href.indexOf('?act=blacklist') !== -1) {
        if (!page_block) {
            addElementInList.timer = setTimeout(addElementInList, 10);
        } else {
            if (!qu('._vk_ban_button')) {
                let elem = document.createElement('button');
                elem.className = 'flat_button _vk_ban_button';
                elem.textContent = 'Масс бан';

                page_block.appendChild(elem);

                elem.onclick = function (event) {
                    window.postMessage({
                        type: 'OpenDialogVK',
                        key: applicationKey,
                        tmpl: chrome.extension.getURL('banUser.html')
                    }, "*");
                };


            }
        }
    }
}

window.addEventListener('message', function (event) {
    if (event.data && typeof event.data === 'object' && event.data.key === applicationKey) {
        let data = event.data;
        switch (data.type) {
            case 'closeDialog':

                break;
            case 'request':
                switch (data.action) {
                    case 'ban':
                        var idsInfo = {};
                        var alias = {};
                        defApi('groups.getMembers', {
                            group_id: data.group_id,
                            filter: 'managers', fields: 'screen_name, role'
                        })
                            .then((responseManagerInfo) => {
                                responseManagerInfo.users.forEach((item) => idsInfo[item.uid] = {
                                    uid: item.uid,
                                    screen_name: item.screen_name,
                                    managers: true,
                                    ban:false
                                });

                                return defApi('users.get', {user_ids: data.ids.concat([1]), fields: 'screen_name'});
                            })
                            .then((response) => {
                                var resultIds = [];
                                response.map((item) => {
                                    if (item.uid == 1) return; //todo костыль,что бы можно было передавать кривые id
                                    if (!idsInfo[item.uid]) {
                                        idsInfo[item.uid] = {
                                            uid: item.uid,
                                            screen_name: item.screen_name,
                                            managers: false
                                        };
                                        resultIds.push(item.uid);
                                    }
                                   if (idsInfo[item.uid]['screen_name']){
                                       alias[idsInfo[item.uid]['screen_name']] = item.uid;
                                   }
                                });
                                return resultIds;
                            })
                            .then((resultIds) => {
                                let code = ' var ms =[]; \n ' + resultIds.map((userId) => {
                                    return 'ms.push(API.groups.banUser({obs}));'.replace('{obs}', JSON.stringify({
                                        group_id: data.group_id,
                                        user_id: userId,
                                        end_date: data.end_date,
                                        reason: data.reason,
                                        comment: data.comment,
                                        comment_visible: data.comment_visible
                                    }));
                                }).join('\n');
                                api('execute',  {code: code + ' return ms;', version:'5.69'}, (banResult)=> {
                                    for(let i=0; i < banResult.length; i++){
                                        idsInfo[resultIds[i]]['ban'] = banResult[i];
                                    }
                                    setResponse(data.random, {idsInfo, alias});
                                });
                            });
                        break;
                }
                break;
        }
    }
});

function setResponse(random, data) {
    window.postMessage({
        type: 'response',
        key: applicationKey,
        random: random,
        data: data
    }, "*");
}

chrome.extension.onRequest.addListener((req) => {
    req.type ==='update' &&  addElementInList();
});


chrome.extension.sendRequest({ method: 'getOptions'}, function (opts) {
    saveOptions(opts);
});



injectScript(['inject.js']);
injectStyle(['style.css']);
addElementInList();
