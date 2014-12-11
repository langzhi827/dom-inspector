(function (window, document) {
    'use strict';

    /*解决js数组Array不存在indexOf的方法*/
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (obj, start) {
            for (var i = (start || 0); i < this.length; i++) {
                if (this[i] === obj) {
                    return i;
                }
            }
            return -1;
        };
    }
    /*工具类*/
    var util = (function () {

        /*事件绑定*/
        function addEvent(elem, evt, fn) {
            if (window.addEventListener) {
                elem.addEventListener(evt, fn, false);
            } else {
                elem.attachEvent('on' + evt, fn);
            }
        }

        /*
         事件委托
         selector: 选择器
         excludeId: 过滤id为此值的dom元素
         */
        var delegatedEvents = [];

        function addEventDelegate(elem, evt, fn, selector, except) {
            var handler = function (e) {
                var target = e.target || window.event.srcElement,
                    sel = selector.substr(1),
                    delegate = false;
                //其祖先元素id为excludeId则阻止事件冒泡
                if (except) {
                    var node = target;
                    var mark = except.substring(0, 1);
                    var except_copy = except.substring(1);
                    if (mark == '#') {
                        while (node !== document) {
                            if (node.id == except_copy) {
                                return;
                            }
                            node = node.parentNode;
                        }
                    } else if (mark == '.') {
                        while (node !== document) {
                            if (node.className.indexOf(except_copy) !== -1) {
                                return;
                            }
                            node = node.parentNode;
                        }
                    }

                }
                //为elem子节点selector绑定相应事件
                if (selector.indexOf('#') == 0) { // ID
                    delegate = target.id == sel;
                } else if (selector.indexOf('.') == 0) { // class
                    delegate = target.className.indexOf(sel) !== -1;
                } else if (selector == '*') { // all
                    delegate = true;
                } else { // tag name
                    delegate = target.nodeName.toLowerCase() == selector;
                }
                //如果符合#id/.className/elementName/* ，则可执行绑定方法
                if (delegate) {
                    fn.call(this, e);
                }
            }
            delegatedEvents.push({
                'handle': handler,
                'elem': elem,
                'fn': fn,
                'evt': evt
            });
            /*事件绑定*/
            addEvent(elem, evt, handler);
        }

        /*移除事件*/
        function removeEvent(elem, evt, fn, isDelegated) {
            var stored = null;
            if (isDelegated) {
                for (var i = 0, len = delegatedEvents.length; i < len; ++i) {
                    stored = delegatedEvents[i];
                    if (stored.elem === elem && stored.evt === evt && stored.fn === fn) {
                        fn = stored.handle; //-------------
                        delegatedEvents.splice(i, 1);
                        break;
                    }
                }
            }

            if (window.addEventListener) {
                elem.removeEventListener(evt, fn, false);
            } else {
                elem.detachEvent('on' + evt, fn);
            }
        }

        /*停止事件传播，防止默认行为*/
        function pauseEvent(e) {
            e = e || window.event;
            /*停止事件传播*/
            if (e.stopPropagation) {
                e.stopPropagation();
            } else {
                e.cancelBubble = true;
            }
            /*防止默认行为*/
            if (e.preventDefault) {
                e.preventDefault();
            } else {
                e.returnValue = false;
            }
            return false;
        }

        /*创建元素*/
        function newElement(elem, attrs) {
            var el = document.createElement(elem);
            attrs = attrs || {};
            for (var attr in attrs) {
                if (attrs.hasOwnProperty(attr)) {
                    el.setAttribute(attr, attrs[attr]);
                }
            }
            return el;
        }

        /*添加类*/
        function addClass(elem, cls) {
            if (typeof cls == 'string') {
                cls = [cls];
            }
            for (var i = 0, len = cls.length; i < len; i++) {
                elem.className += ' ' + cls[i];
            }
            return elem;
        }

        /*删除类*/
        function removeClass(elem, cls) {
            if (typeof cls == 'string') {
                cls = [cls];
            }
            var clazz = elem.className.split(' '),
                count;
            for (var i = 0; i < cls.length; i++) {
                if ((count = clazz.indexOf(cls[i])) > -1) {
                    clazz = clazz.slice(0, count).concat(cls.slice(++count));
                }
            }
            elem.className = clazz.join(' ');

            return elem;
        }

        return {
            addEvent: addEvent,
            addEventDelegate: addEventDelegate,
            removeEvent: removeEvent,
            pauseEvent: pauseEvent,
            newElement: newElement,
            addClass: addClass,
            removeClass: removeClass
        }
    })();

    var DomInspector = function () {
        var Node = window.Node || {
            ELEMENT_NODE: 1, //---
            ATTRIBUTE_NODE: 2,
            TEXT_NODE: 3, //---
            CDATA_SECTION_NODE: 4,
            ENTITY_REFERENCE_NODE: 5,
            ENTITY_NODE: 6,
            PROCESSING_INSTRUCTION_NODE: 7,
            COMMENT_NODE: 8, //---
            DOCUMENT_NODE: 9, //---
            DOCUMENT_TYPE_NODE: 10,
            DOCUMENT_FRAGMENT_NODE: 11,
            NOTATION_NODE: 12
        };
        var options = {
            nodeTypes: [1, 3, 8], //1--ELEMENT_NODE, 3--TEXT_NODE, 8--COMMENT_NODE, 9--DOCUMENT_NODE
            height: 260,
            split: 70
        };

        /*检查当前节点是否为（子节点是否只包含）文本节点或者注释节点 checkChildren-是否包含子节点*/
        /*
         ELEMENT_NODE: 1, //元素节点
         ATTRIBUTE_NODE: 2, //属性节点
         TEXT_NODE: 3, //文本节点
         CDATA_SECTION_NODE: 4, //文档中的 CDATA 区段
         ENTITY_REFERENCE_NODE: 5, //实体引用节点
         ENTITY_NODE: 6, //实体节点
         PROCESSING_INSTRUCTION_NODE: 7, //处理指令节点
         COMMENT_NODE: 8, //注释节点
         DOCUMENT_NODE: 9, //Dom树的根节点
         DOCUMENT_TYPE_NODE: 10, //文档定义的实体提供接口
         DOCUMENT_FRAGMENT_NODE: 11, //轻量级的 Document 对象，其中容纳了一部分文档
         NOTATION_NODE: 12 //DTD 中声明的符号
         */
        function containsOnlyText(elem, checkChildren) {
            checkChildren = checkChildren || false;
            var result = false;
            if (checkChildren) {
                for (var i = 0, l = elem.childNodes.length; i < l; i++) {
                    result = elem.childNodes[i].nodeType == Node.TEXT_NODE || elem.childNodes[i].nodeType == Node.COMMENT_NODE;
                    //如果有一个子节点不是文本节点或者注释节点那么返回false
                    if (!result) {
                        break;
                    }
                }
            } else {
                result = elem.nodeType == Node.TEXT_NODE || elem.nodeType == Node.COMMENT_NODE;
            }
            return result;
        }

        /*检查文本节点是否为空文本*/
        function isEmptyTextNode(node) {
            var text = node.innerText || node.textContent;
            return /^\s*$/.test(text);
        }

        /*获取元素cssPath和jsPath*/
        function getElemPath(elem) {
            var css = '',
                js = '',
                parent = null;
            while (elem != document) {
                /*===== jsPath ======*/
                parent = elem.parentNode;
                for (var i = 0, l = parent.childNodes.length; i < l; i++) {
                    if (parent.childNodes[i] == elem) {
                        js = i + ',' + js;
                        break;
                    }
                }
                /*===== cssPath ======*/
                var cssTmp = elem.nodeName;
                if (elem.id) {
                    cssTmp += '#' + elem.id;
                }
                if (elem.className) {
                    var classList = elem.classList || elem.className.split(' ');
                    for (var i = 0, len = classList.length; i < len; ++i) {
                        cssTmp += '.' + classList[i];
                    }
                }
                css = cssTmp + ' ' + css;

                elem = elem.parentNode;
            }
            js = js.slice(0, -1).split(','); //截掉最后面的那个“，”然后转化成数组

            return {
                cssPath: css.toLowerCase(),
                jsPath: js
            }
        }

        /*获取dom属性,并拼写成key="value"形式*/
        function getAttributes(elem) {
            var domAttr = '';
            var attrs = elem.attributes;
            for (var i = 0, l = attrs.length; i < l; i++) {
                if (attrs[i].nodeValue) {
                    domAttr = attrs[i].nodeName.toLowerCase() + '="' + attrs[i].nodeValue.toLowerCase() + '" ' + domAttr;
                }
            }
            return domAttr;
        }

        /*====================================================== start ================================================*/

        var u = util;

        var container = null;
        var horizontal = null;
        var toolbar = null;
        var search = null;
        var swit = null;
        var content = null;
        var treeView = null;
        var treeTitle = null;
        var treeBody = null;
        var treeList = null;
        var vertical = null;
        var cssView = null;
        var cssTitle = null;
        var cssBody = null;

        /*渲染UI视图*/
        function drawUI() {
            container = u.newElement('div', {
                'class': 'dom-container'
            });
            horizontal = u.newElement('div', {
                'class': 'dom-horizontal'
            });
            toolbar = u.newElement('div', {
                'class': 'dom-toolbar'
            });
            search = u.newElement('span', {
                'class': 'dom-search'
            });
            search.innerHTML = '查找';
            swit = u.newElement('span', {
                'class': 'dom-switch'
            });
            swit.innerHTML = '最小化';
            content = u.newElement('div', {
                'class': 'dom-content'
            });
            treeView = u.newElement('div', {
                'class': 'dom-tree-view'
            });
            treeTitle = u.newElement('div', {
                'class': 'dom-tree-title'
            });
            treeBody = u.newElement('div', {
                'class': 'dom-tree-body'
            });
            treeList = u.newElement('ul', {
                'class': 'dom-tree-list'
            });
            vertical = u.newElement('div', {
                'class': 'dom-vertical'
            });
            cssView = u.newElement('div', {
                'class': 'dom-css-view'
            });
            cssTitle = u.newElement('div', {
                'class': 'dom-css-title'
            });
            cssTitle.innerHTML = 'styles';
            cssBody = u.newElement('div', {
                'class': 'dom-css-body'
            });

            container.appendChild(horizontal);
            container.appendChild(toolbar);
            container.appendChild(content);

            toolbar.appendChild(search);
            toolbar.appendChild(swit);

            content.appendChild(treeView);
            content.appendChild(vertical);
            content.appendChild(cssView);

            treeView.appendChild(treeTitle);
            treeView.appendChild(treeBody);

            cssView.appendChild(cssTitle);
            cssView.appendChild(cssBody);

            treeBody.appendChild(treeList);
            /*生成dom树*/
            drawDom(document, treeList);

            document.getElementsByTagName('body')[0].appendChild(container);

        }
        /*设置UI尺寸*/
        function setSize() {

            treeBody.style.height = options.height + 'px';
            cssBody.style.height = options.height + 'px';

            treeView.style.width = options.split + '%';
            cssView.style.width = (100 - options.split) + '%';
            vertical.style.left = options.split + '%';

            document.getElementsByTagName('body')[0].style.paddingBottom = options.height + 'px';
        }

        /*创建dom树节点*/
        function newTreeNode(elem) {
            var withChildren = elem.hasChildNodes(); //当前节点是否存在子节点
            var omit = false; //当前节点是否为空文本节点
            var node = u.newElement('li', {
                'class': (withChildren ? 'dom-open' : '')
            });
            if (withChildren) {
                var span = u.newElement('span', {
                    'class': 'dom-node-trigger'
                });
                node.appendChild(span);
            }
            if (elem.nodeType == Node.TEXT_NODE) {
                omit = isEmptyTextNode(elem); //是否为空文本节点
            }
            //如果不是空文本节点
            if (!omit) {
                var path = getElemPath(elem);
                var nodeStart = u.newElement('span', {
                    'data-css-path': path.cssPath,
                    'data-js-path': JSON.stringify(path.jsPath)
                });
                var nodeEnd = null;
                /*当前节点是否为文本或者注释等节点*/
                if (containsOnlyText(elem)) {
                    if (elem.nodeType == Node.COMMENT_NODE) {
                        u.addClass(nodeStart, 'dom-comment-node');
                        if (typeof nodeStart.innerText == 'string') {
                            nodeStart.innerText = '<!-- ' + elem.nodeValue + ' -->';
                        } else {
                            nodeStart.textContent = '<!-- ' + elem.nodeValue + ' -->';
                        }
                    } else {
                        u.addClass(nodeStart, 'dom-text-node');
                        if (typeof nodeStart.innerText == 'string') {
                            nodeStart.innerText = elem.nodeValue;
                        } else {
                            nodeStart.textContent = elem.nodeValue;
                        }
                    }
                } else {
                    u.addClass(nodeStart, 'dom-normal-node');
                    if (elem.nodeType != Node.DOCUMENT_NODE) { //不为根节点
                        var attr = '';
                        if (getAttributes(elem) != '') {
                            attr = ' ' + getAttributes(elem);
                        }
                        nodeStart.innerHTML = '&lt;' + elem.nodeName.toLowerCase() + attr + '&gt;';
                        //如果存在子节点
                        if (withChildren) {
                            nodeEnd = u.newElement('span', {
                                'class': 'dom-end-node'
                            });
                            nodeEnd.innerHTML = '&lt;/' + elem.nodeName.toLowerCase() + '&gt;';
                        }
                    } else {
                        nodeStart.innerHTML = elem.nodeName.toLowerCase();
                    }
                }

                node.appendChild(nodeStart);
                if (nodeEnd) {
                    node.appendChild(nodeEnd);
                }

                return node;
            } else {
                return null;
            }

        }

        /*渲染dom树视图*/
        function drawDom(root, elem) {
            var newNode = null;
            var rootChilds = root.childNodes;

            for (var i = 0, l = rootChilds.length; i < l; i++) {
                var node = rootChilds[i];
                var withChildren = node.hasChildNodes();
                if (options.nodeTypes.indexOf(node.nodeType) != -1) {
                    newNode = newTreeNode(node);
                    if (newNode) {
                        if (withChildren) {
                            var ul = u.newElement('ul');
                            newNode.insertBefore(ul, newNode.lastChild);
                        }
                        elem.appendChild(newNode);
                        if (withChildren) {
                            drawDom(node, newNode.querySelector('ul'));
                        }
                    }
                }
            }
        }

        /*dom树折叠*/
        function domFold(e) {
            var target = e.target || window.event.srcElement;
            var parent = target.parentNode;
            var clazz = parent.className;
            if (clazz.indexOf('dom-open') > -1) {
                u.removeClass(parent, 'dom-open');
            } else {
                u.addClass(parent, 'dom-open');
            }
        }
        /*点击dom树节点*/
        function domClick(e) {
            var target = e.target || window.event.srcElement;
            var actives = content.querySelectorAll('.dom-node-active');
            if (actives) {
                for (var i = 0, l = actives.length; i < l; i++) {
                    u.removeClass(actives[i], 'dom-node-active');
                }
            }
            var childs = target.parentNode.childNodes;
            var end = null;
            for (var j = 0, len = childs.length; j < len; j++) {
                if (childs[j].className && childs[j].className.indexOf('dom-end-node') > -1) {
                    end = childs[j];
                }
            }
            u.addClass(target, 'dom-node-active');
            if (end) {
                u.addClass(end, 'dom-node-active');
            }

            drawCssPath(target);
        }
        /*渲染css路径*/
        function drawCssPath(elem) {
            var cssPaths = elem.getAttribute("data-css-path").split(" ").reverse().join("< ").slice(1);
            treeTitle.innerHTML = cssPaths;
        }
        /*拖动分割线*/

        var horizResizing = false;
        var vertResizing = false;
        var yPos = 0;

        function splitResize(e) {
            e = e || window.event;
            if (horizResizing) {
                document.documentElement.style.cursor = 'n-resize';
                options.height = options.height - (e.clientY - yPos);
                yPos = e.clientY;
            }
            if (vertResizing) {
                document.documentElement.style.cursor = 'e-resize';
                options.split = e.clientX / content.clientWidth * 100;
            }
            if (options.split > 0 && options.split < 100) {
                setSize();
            }
        }
        /*隐藏/显示dom树*/
        function toggleDomTree(e) {
            var target = e.target || window.event.srcElement;
            if (target.className.indexOf('dom-tree-toggle') !== -1) {
                treeView.style.display = 'block';
                cssView.style.display = 'block';
                u.removeClass(target, 'dom-tree-toggle');
            } else {
                treeView.style.display = 'none';
                cssView.style.display = 'none';
                u.addClass(target, 'dom-tree-toggle');
            }
        }
        /*查找dom元素*/
        var oldStyle = null;
        var searchToggle = true;

        function searchDom(e) {
            var target = e.target || window.event.srcElement;
            if (target.className.indexOf('dom-search') !== -1) {
                if (searchToggle) {

                    searchToggle = false;
                    u.addEventDelegate(document.body, 'mouseover', searchDom, '*', '.dom-container');
                    u.addEventDelegate(document.body, 'mouseout', searchDom, '*', '.dom-container');
                    u.addEventDelegate(document.body, 'click', searchDom, '*', '.dom-container');

                    u.addClass(target, 'dom-search-toggle');

                } else {
                    searchToggle = true;
                    u.removeEvent(document.body, 'mouseover', searchDom, true);
                    u.removeEvent(document.body, 'mouseout', searchDom, true);
                    u.removeEvent(document.body, 'click', searchDom, true);

                    u.removeClass(target, 'dom-search-toggle');
                }
            } else {
                if (e.type == 'mouseover') {
                    oldStyle = target.getAttribute('style') || '';
                    target.setAttribute('style', 'outline: 1px dashed #000; ' + oldStyle);

                } else if (e.type == 'mouseout') {
                    if (oldStyle != '') {
                        target.setAttribute('style', oldStyle);
                    } else {
                        target.removeAttribute('style');
                    }
                } else {
                    searchToggle = true;

                    u.removeEvent(document.body, 'mouseover', searchDom, true);
                    u.removeEvent(document.body, 'mouseout', searchDom, true);
                    u.removeEvent(document.body, 'click', searchDom, true);

                    u.removeClass(target, 'dom-search-toggle');

                    if (oldStyle != '') {
                        target.setAttribute('style', oldStyle);
                    } else {
                        target.removeAttribute('style');
                    }

                    var path = getElemPath(target);
                    var normal_nodes = treeBody.querySelectorAll('.dom-normal-node');
                    var curr_node = null;
                    for (var i = 0, len = normal_nodes.length; i < len; i++) {
                        if (normal_nodes[i].getAttribute('data-js-path') == JSON.stringify(path.jsPath)) {
                            curr_node = normal_nodes[i];
                            break;
                        }
                    }

                    if (curr_node) {
                        curr_node.click();
                    } else {
                        return;
                    }
                    /*
                        当前节点距离顶部位置大于等于容器高度，或者小于等于滚动条滚动的高度
                    */
                    if (curr_node.offsetTop >= treeBody.clientHeight || curr_node.offsetTop <= treeBody.scrollTop) {
                        treeBody.scrollTop = curr_node.offsetTop - (Math.floor(treeBody.clientHeight / 2));
                    }

                    u.pauseEvent(e);
                }
            }

        }


        function init() {
            drawUI();
            setSize();
            /*dom树折叠处理*/
            u.addEventDelegate(content, 'click', domFold, '.dom-node-trigger');
            /*点击dom树节点*/
            u.addEventDelegate(content, 'click', domClick, '.dom-normal-node');
            /*拖动分割线*/
            u.addEvent(vertical, 'mousedown', function () {
                vertResizing = true;
            });
            u.addEvent(vertical, 'mousemove', splitResize);
            u.addEvent(vertical, 'mouseup', function () {
                vertResizing = false;
            });

            u.addEvent(horizontal, 'mousedown', function (e) {
                horizResizing = true;
                yPos = e.clientY;
            });
            u.addEvent(horizontal, 'mousemove', splitResize);
            u.addEvent(horizontal, 'mouseup', function () {
                horizResizing = false;
            });

            u.addEvent(document, 'mousemove', splitResize);
            u.addEvent(document, 'mouseup', function (e) {
                vertResizing = false;
                horizResizing = false;
                document.documentElement.style.cursor = 'default';
            });
            /*隐藏/显示dom树*/
            u.addEvent(swit, 'click', toggleDomTree);
            /*查找dom元素*/
            u.addEvent(search, 'click', searchDom);

        }

        init();
    }

    window.onload = function () {
        DomInspector();
    }

})(window, document);