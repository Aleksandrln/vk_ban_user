(function () {

    var applicationKey = 'ban_user';
    window.addEventListener('message', (event) => {
        if (event.data && typeof event.data === 'object' && event.data.key === applicationKey) {
            let data = event.data;
            switch (data.type) {
                case 'OpenDialogVK':
                    if (data.tmpl) {
                        var req = new XMLHttpRequest();
                        req.open('GET', data.tmpl, false);
                        req.onreadystatechange = function () {
                            if (req.readyState === 4 && req.status === 200) {
                                stManager.add(['page.css', 'ui_controls.css', 'ui_controls.js'], ()=> {
                                    OpenDialogVK(req.responseText);
                                    OpenDialogVK.openning = true;
                                });
                            }
                        };
                        req.send(null);
                    } else {
                        console.log('error');
                    }
                    break;
                case 'response':
                    let resolve = postMessage.state[data.random];
                    if (resolve){
                        delete postMessage.state[data.random];
                        resolve(data);
                    }
                    break;
            }
        }
    });


    function postMessage(data) {
        return new Promise((resolve, reject) => {
            let random =postMessage.random();
            postMessage.state[random] = resolve;
            window.postMessage(Object.assign({type:'request', key: applicationKey, random: random}, data), '*');
        }).catch((err) => {throw err;})
    }

    postMessage.state = {};
    postMessage.random = function () {
        let result = Math.floor(Math.random() * 101);
        return !this.state[result] ? result : postMessage.random();
    };


    function OpenDialogVK(tmpl) {
        var params = {maxArchiveCount: 0, maxArchiveMegabytes: 0, minRange: 0, maxRange: 0};

        // OpenDialogVK.htmlElement=document.createElement('div');
        OpenDialogVK.contentBox = new MessageBox({
            title: 'Блокировка пользователей', onHide: function () {
               /* OpenDialogVK.contentBox = null;*/
                OpenDialogVK.openning = false;
                window.postMessage({type: 'closeDialog', data: {save: false}, key: applicationKey}, '*');
            },
            width: 800
        });
        OpenDialogVK.contentBox.content(tmpl).show();

        let setAttr = (elem) => {
            elem.setAttribute('autocapitalize', "none");
            elem.setAttribute('autocomplete', "");
            elem.setAttribute('autofocus', false);
            return elem;
        };

        let getTimeUnban = (addHours) => {
            let time = new Date();
            time.setHours(time.getHours() + addHours);
            return 'Разблокировка ' + time.toLocaleString('ru', {});
        };

        let timeBlock = setAttr(geByClass1('vk_time_block', OpenDialogVK.contentBox.bodyNode));
        let reasonBlock = setAttr(geByClass1('vk_reason_block', OpenDialogVK.contentBox.bodyNode));


        OpenDialogVK.timeBlockSelector = new Dropdown(timeBlock, [[0, "Навсегда", "Разблокировка администратором"], [1, "На год", getTimeUnban(8760)], [2, "На месяц", getTimeUnban(720)], [3, "На неделю", getTimeUnban(168)], [4, "На день", getTimeUnban(24)], [5, "На час", getTimeUnban(1)]], {
            width: OpenDialogVK.contentBox.bodyNode.offsetWidth * 55 / 100,
            big: 1,
            selectedItems: [0]
        });


        OpenDialogVK.reasonBlockSelector = new Dropdown(reasonBlock, [[0, "Другое"], [1, "Спам"], [2, "Оскорбление граждан"], [3, "Нецензурные выражения"], [4, "Телеграммы не по адресу"]], {
            width: OpenDialogVK.contentBox.bodyNode.offsetWidth * 35 / 100,
            big: 1,
            selectedItems: [0]
        });

        OpenDialogVK.contentBox.removeButtons();
        OpenDialogVK.contentBox.addButton('Закрыть', function () {
            OpenDialogVK.contentBox.hide();
            OpenDialogVK.contentBox = null;
            OpenDialogVK.openning = false;
            window.postMessage({type: 'closeDialog', key: applicationKey}, '*');
        }, 'yes', true);

        OpenDialogVK.contentBox.addButton('Забанить', function () {
            let idsText = geByClass1('js_textarea-action', OpenDialogVK.contentBox.bodyNode).value ;
            let ids = getNormalizeVkId(idsText);
            postMessage({
                ids: ids.filter((value) => typeof value === 'string'),
                action: 'ban',
                group_id: cur.gid,
                end_date: getTimeBlock(OpenDialogVK.timeBlockSelector.val()),
                reason: OpenDialogVK.reasonBlockSelector.val(),
                comment: ge('group_blb_comment').value,
                comment_visible: ge('group_blb_comment_vis').getAttribute('aria-checked') === 'true'
            }).then((result) => {
                OpenDialogVK.resultMessageBox = new MessageBox({title: 'Готово', width: 800}).content(getCode(idsText, ids, result['data'])).show();
            });
            //debugger;


        });

        return;
    }

    function getCode(idsText, ids, returnResult) {
        let banCount= 0 ;
        let returnIds = returnResult['idsInfo'];
        let alias = returnResult['alias'];
        let blackIds = idsText.split('\n');
        let div = document.createElement('div');
        div.innerHTML ='<div class="ban_info">Забанено:</div><div class="error_info">Ошибок:</div>';

        ids.forEach((id, index) => {
            debugger;
            let elInfo = document.createElement('div');
            elInfo.className ='group_l_position';
            let blackId = blackIds[index];
            let info = returnIds[id] || returnIds[alias[id]];
            if (!info) {
                elInfo.innerHTML =
                    '<span class="">Исходная строка:  </span><a href="'+blackId+'" class="">' + blackId + '</a>' +
                    '<span class=""> Ошибка: id не существует.</span>';
                div.appendChild(elInfo);
            } else if (!info.ban) {
                elInfo.innerHTML =
                    '<span class="">Исходная строка: </span><a href="'+blackId+'" class="">' + blackId + '</a>' +
                    '<span class="">  vk uid: </span><a href="https://vk.com/id'+info.uid+'" class="">' + info.uid + '</a>' +
                    '<span class=""> Причина ошибки: ' + (info.managers ? 'Пользователь состоит в админке сообщества' : 'vk api вернул отрицательный результат. Возможно пользователь уже забанен.') + '</span>';
                div.appendChild(elInfo);
            } else {
                banCount++;
            }

        });
        div.querySelector('.ban_info').innerText = 'Забанено: ' + banCount;
        div.querySelector('.error_info').innerText = 'Ошибок: ' + (ids.length - banCount);
        return div.innerHTML;
    }

    function getNormalizeVkId(text) {
        getNormalizeVkId.errors = [];
        return text.split('\n').map((value, index) => {
            let result = value.match(/vk\.com\/(.+?)$/);
            if (result) return result[1];
            if (value.search('http') == -1) return value;
            getNormalizeVkId.errors.push(index);
            return {error: 'not valid', value: value, index: index};
        });
    }

    function getTimeBlock(valVkTimeSelector) {
        let time = new Date();
        switch(valVkTimeSelector){
            case '0': //Навсегда
                return null;
                break;
            case '1'://На год
                time.setFullYear(time.getFullYear() + 1);
                break;
            case '2'://На месяц
                time.setMonth(time.getMonth() + 1);
                break;
            case '3'://На неделю
                time.setDate(time.getDate() + 7);
                break;
            case '4'://"На день
                time.setDate(time.getDate() + 1);
                break;
            case '5'://На час
                time.setHours(time.getHours() + 1);
                break;
        }
        return time.getTime()/1000
    }

    var CircularProgress = (function () {

        // List of 2D context properties
        var ctxProperties = ['fillStyle', 'font', 'globalAlpha', 'globalCompositeOperation',
            'lineCap', 'lineDashOffset', 'lineJoin', 'lineWidth',
            'miterLimit', 'shadowBlur', 'shadowColor', 'shadowOffsetX',
            'shadowOffsetY', 'strokeStyle', 'textAlign', 'textBaseLine'];

        // Autoscale function from https://github.com/component/autoscale-canvas
        var autoscale = function (canvas) {
            var ctx = canvas.getContext('2d'),
                ratio = window.devicePixelRatio || 1;

            if (1 !== ratio) {
                canvas.style.width = canvas.width + 'px';
                canvas.style.height = canvas.height + 'px';
                canvas.width *= ratio;
                canvas.height *= ratio;
                ctx.scale(ratio, ratio);
            }

            return canvas;
        };

        // Utility function to extend a 2D context with some options
        var extendCtx = function (ctx, options) {
            for (var i in options) {
                if (ctxProperties.indexOf(i) === -1) continue;

                ctx[i] = options[i];
            }
        };

        // Main CircularProgress object exposes on global context
        var CircularProgress = function (options) {
            var ctx, i, property;

            options = options || {};
            this.el = document.createElement('canvas');

            this.options = options;

            options.text = options.text || {};
            options.text.value = options.text.value || null;

            ctx = this.el.getContext('2d');

            for (i in ctxProperties) {
                property = ctxProperties[i];
                options[property] = typeof options[property] !== 'undefined' ? options[property] : ctx[property];
            }

            if (options.radius) this.radius(options.radius);
        };

        // Update with a new `percent` value and redraw the canvas
        CircularProgress.prototype.update = function (value) {
            this._percent = value;
            this.draw();
            return this;
        };

        // Specify a new `radius` for the circle
        CircularProgress.prototype.radius = function (value) {
            var size = value * 2;
            this.el.width = size;
            this.el.height = size;
            autoscale(this.el);
            return this;
        };

        // Draw the canvas
        CircularProgress.prototype.draw = function () {
            var tw, text, fontSize,
                options = this.options,
                ctx = this.el.getContext('2d'),
                percent = Math.min(this._percent, 100),
                ratio = window.devicePixelRatio || 1,
                angle = Math.PI * 2 * percent / 100,
                size = this.el.width / ratio,
                half = size / 2,
                x = half,
                y = half;

            ctx.clearRect(0, 0, size, size);

            // Initial circle
            if (options.initial) {
                extendCtx(ctx, options);
                extendCtx(ctx, options.initial);

                ctx.beginPath();
                ctx.arc(x, y, half - ctx.lineWidth, 0, 2 * Math.PI, false);
                ctx.stroke();
            }

            // Progress circle
            extendCtx(ctx, options);

            ctx.beginPath();
            ctx.arc(x, y, half - ctx.lineWidth, 0, angle, false);
            ctx.stroke();

            // Text
            if (options.text) {
                extendCtx(ctx, options);
                extendCtx(ctx, options.text);
            }

            text = options.text.value === null ? (percent | 0) + '%' : options.text.value;
            tw = ctx.measureText(text).width;
            fontSize = ctx.font.match(/(\d+)px/);
            fontSize = fontSize ? fontSize[1] : 0;

            ctx.fillText(text, x - tw / 2 + 1, y + fontSize / 2 - 1);

            return CircularProgress;
        };
        return CircularProgress;
    })();
})();
