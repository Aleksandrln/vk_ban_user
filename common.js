var opts = {chats:{}};
var applicationKey = 'ban_user';
function debounce(f, ms) {

    var state = null;

    var COOLDOWN = 1;

    return function() {
        if (state) return;

        f.apply(this, arguments);

        state = COOLDOWN;

        setTimeout(function() { state = null }, ms);
    }

}

function ge(e) {
  return document.getElementById(e);
}
function geByClass(c, n) {
  return Array.prototype.slice.call((n || document).getElementsByClassName(c));
}
function geByClass1(c, n) {
  return (n || document).getElementsByClassName(c)[0];
}

function qu(c, n) {
  return ( n || document).querySelector(c);
}

function injectScript(files) {
    files.forEach((file) => {
        file = chrome.extension.getURL(file);
        let th = document.head;
        let s = document.createElement('script');
        s.setAttribute('type', 'text/javascript');
        s.setAttribute('charset', 'utf-8');
        s.setAttribute('src', file);
        s.async = false;
        th.appendChild(s)
    });
}

function injectStyle(files) {
    files.forEach((file) => {
        var style = document.createElement('link');
        style.rel = 'stylesheet';
        style.type = 'text/css';
        style.href = chrome.extension.getURL(file);
        (document.head || document.documentElement).appendChild(style);
    });
}


function loadOptions(defaults) {
  for (var key in defaults) {
    opts[key] = localStorage[key] ? JSON.parse(localStorage[key]) : defaults[key];
  }
}
function saveOptions(update, silent) {
  if (update) {
    for (var key in update) {
      opts[key] = update[key];
      localStorage[key] = JSON.stringify(update[key]);
    }
  }
  if (!silent) {
    chrome.extension.sendRequest({ method: 'updateOptions', update: update });
  }
}
loadOptions({
  accessToken: false,
  secret: false
});

function defApi(method, params) {
    return new Promise((resolve, reject) => api(method, params, resolve, reject));
}

function api(method, params, callback, errorCall) {
  var arr = ['access_token=' + opts.accessToken];
  for (var k in params) {
    arr.push(k + '=' + encodeURIComponent(params[k]));
  }
  //arr.push('sig=' + MD5('/method/' + method + '?' + arr.join('&') + opts.secret));

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200) {
      var res = (typeof this.response == 'string') ? JSON.parse(this.response) : this.response;
      if (res.error) {
        errorCall(res.error);
       window.postMessage({type:'errorApi',error:res.error, method: method}, '*');
      } else {
       callback(res.response);
      }
    }
  };
  xhr.open('POST', 'https://api.vk.com/method/' + method);
  xhr.responseType = 'json';
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhr.send(arr.join('&'));
}


function get_block_comments(func) { // извлекаем из кода функции содержимое блоковых комментариев
    var FRegEx = /function[^\(]*\(\s*([^\)]*?)\s*\)[^\{]*\{([\s\S]+)\}/i;
    var fn = isFunction(func) ? func : eval('window.' + func);
    if (!fn)
        console.log.log('Inj_Error: "' + func + '" not found', 1);
    var res = fn ? String(fn).match(FRegEx) : ['', '', ''];
    //res[2] = res[2].replace(/\r?\n/g, " ");
    var code = res[2];
    var obj_rx = /\*([a-z0-9_]+):\s*([\s\S]+?)\s*\*\//ig; // при нахождении /*comment_name: содержимое */ всё будет распарсенно в объект {comment_name: содержимое}
    var arr_rx = /\*(\s*)([\s\S]+?)\s*\*\//g;             // иначе всё будет в виде массива
    var is_obj = obj_rx.test(code);
    var comments = is_obj ? {} : [];
    code.replace(is_obj ? obj_rx : arr_rx, function (s, name, comment) { // просто взял replace вместо while..regexp.exec
        if (is_obj)
            comments[name] = comment;
        else
            comments.push(comment);
        return s;
    });
    return comments;
};

function tpl_process(tpl, values) {
    return (tpl || '').replace(/\{([a-z]+)\.([a-z0-9_-]+)\}/ig, function (s, type, id) {
        switch (type.toLowerCase()) {
            case 'vals':
                return (values && typeof values[id] != 'undefined') ? values[id] : s;
            case 'lng':
                return lngs[id];
            default:
                return s;
        }

    })
}