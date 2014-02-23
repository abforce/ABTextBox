/*
*  Project: ABTextBox
*  Description: A simple and light weight WYSIWYG text editor which optimized and evolved for a single line text editor
*               Also supports many features by it's plugins such as: auto complete, multi line, ...
*  Version: 1.0.0
*  Start Date: 23 Aug 2013
*  End Date: 
*  License: This project is going to be released under MIT license
*  Home Page: http://www.abtextbox.com
*/

; (function (window, document) {

    var ABTextBox = function (context, modules) {
        var editor, node;

        if (typeof context === 'string') {
            node = d('#' + context).get();
        } else if (typeof context === 'object') {
            node = context;
        } else {
            ABTextBox.error('TypeError', 'variable type mismatch1');
            return;
        }

        if (node) {
            if (node.nodeName.toLowerCase() === 'input') {
                editor = ABTextBox.replace(node, modules);

            } else if (node.nodeName.toLowerCase() === 'textarea') {
                editor = ABTextBox.replace(node, ABTextBox.extend({
                    'multiline': true
                }, modules));

            } else {
                editor = ABTextBox.appendTo(node, modules);
            }
        }

        return editor;
    }, d, w, pEvent, pMethod, pInit, pModule;

    ABTextBox.version = '1.0';

    ABTextBox.document = document;
    ABTextBox.window = window;

    ABTextBox.environment = {
        gecko: /Gecko/.test(navigator.userAgent),
        ie: /MSIE/.test(navigator.userAgent)
    };

    ABTextBox.util = {
        linesCount: function (node) {
            var html = d(node).html(),
                matched = html.match(/<br>/gi),
                count;
            count = matched ? matched.length : 0;
            if (!ABTextBox.environment.gecko) {
                count += 1;
            }
            return count;
        },
        forEach: function (container, callback) {
            if (typeof container.length !== 'undefined') {
                for (var i = 0, len = container.length; i < len; i++) {
                    if (callback(container[i], i) === false) {
                        return;
                    }
                }
            } else {
                for (var i in container) {
                    if (callback(container[i], i) === false) {
                        return;
                    }
                }
            }
        },
        isArray: function (obj) {
            if (Array.isArray) {
                return Array.isArray(obj);
            } else {
                return Object.prototype.toString.call(obj) === '[object Array]';
            }
        },
        camelize: function (name) {
            return name.replace(/-([a-z])/ig, function (part, firstletter) {
                return firstletter.toUpperCase();
            });
        },
        contains: function (container, item) {
            var found = false;

            if (typeof container.indexOf !== 'undefined') {
                found = container.indexOf(item) !== -1;
            } else if (typeof container.length !== 'undefined') {
                for (var i = 0, len = container.length; i < len; i++) {
                    if (container[i] === item) {
                        found = true;
                        break;
                    }
                }
            } else {
                found = item in container;
            }

            return found;
        }
    };

    ABTextBox.namespace = function (ns_string, context) {
        var parts = ns_string.split('.'),
            part = context || ABTextBox;

        for (var i = 0, len = parts.length; i < len; i++) {
            if (typeof part[parts[i]] === 'undefined') {
                part[parts[i]] = {};
            }
            part = part[parts[i]];
        }

        return part;
    }

    ABTextBox.extend = function () {
        var sources = Array.prototype.slice.call(arguments),
            addition = sources.pop();

        for (var item in addition) {
            if (addition.hasOwnProperty(item)) {
                for (var i = 0, len = sources.length; i < len; i++) {
                    sources[i][item] = addition[item];
                }
            }
        }

        return sources[0];
    };

    ABTextBox.define = function (type) {
        var returnObject;

        switch (type) {
            case 'module':
                returnObject = new ABTextBox.define.Module();
                break;

            case 'method':
                returnObject = new ABTextBox.define.Method();
                break;

            case 'event':
                returnObject = new ABTextBox.define.Event();
                break;

            case 'init':
                returnObject = new ABTextBox.define.Init();
                break;
        }
        return returnObject;
    };

    ABTextBox.define.Event = function () {}
    pEvent = ABTextBox.define.Event.prototype;
    ABTextBox.define.Method = function () {}
    pMethod = ABTextBox.define.Method.prototype;
    ABTextBox.define.Module = function () {}
    pModule = ABTextBox.define.Module.prototype;
    ABTextBox.define.Init = function () { }
    pInit = ABTextBox.define.Init.prototype;

    ABTextBox.extend(pEvent, pMethod, pModule, pInit, {
        name: function (name) {
            this.name = name;
            return this;
        }
    });

    ABTextBox.extend(pEvent, pModule, {
        initEditor: function (func) {
            this.initEditor = func;
            return this;
        },

        initGlobal: function (func) {
            this.initGlobal = func;
            return this;
        }
    });

    ABTextBox.extend(pEvent, {
        bind: function (func) {
            this.bind = func;
            return this;
        },

        unbind: function (func) {
            this.unbind = func;
            return this;
        },

        apply: function () {
            var obj = this,
                eventObject = {},
                contains = ABTextBox.util.contains,
                globalBlock = ABTextBox.namespace(obj.name, ABTextBox.Event.custom.data),
                event = function (editor, bind) {
                    var editorBlock = ABTextBox.namespace('event_' + obj.name, editor.data);

                    if (bind) {
                        obj.initEditor.call(editor, editorBlock, globalBlock);
                        obj.bind.call(editor, editorBlock, globalBlock);
                    } else {
                        // clean up
                        obj.unbind.call(editor, editorBlock, globalBlock);
                    }
                };

            ABTextBox.Event.register(obj.name);
            eventObject[obj.name] = event;
            ABTextBox.extend(ABTextBox.Event.custom.events, eventObject);

            obj.initGlobal(globalBlock);
        }
    });

    ABTextBox.extend(pMethod, {
        implementation: function (func) {
            this.implementation = func;
            return this;
        },

        beforeEvent: function (name) {
            this.beforeEvent = name;
            return this;
        },

        afterEvent: function (name) {
            this.afterEvent = name;
            return this;
        },

        apply: function () {
            var obj = this,
                methodObject = {},
                beforeEventResult,
                afterEventResult,
                beforeEvent = obj.hasOwnProperty('beforeEvent') && obj.beforeEvent,
                afterEvent = obj.hasOwnProperty('afterEvent') && obj.afterEvent;

            methodObject[obj.name] = function () {
                var editor = w(this), returnValue;

                beforeEventResult = beforeEvent;
                if (typeof beforeEventResult === 'function') {
                    beforeEventResult = beforeEventResult.apply(editor, arguments);
                }

                ABTextBox.Event.register(beforeEventResult);
                
                if (beforeEventResult && (editor.fire(beforeEventResult) === false)) {
                    return;
                }

                returnValue = obj.implementation.apply(editor, arguments);

                afterEventResult = afterEvent;
                if (typeof afterEventResult === 'function') {
                    afterEventResult = afterEventResult.apply(editor, arguments);
                }

                ABTextBox.Event.register(afterEventResult);

                if (afterEventResult) {
                    editor.fire(afterEventResult);
                }

                return returnValue;
            }

            ABTextBox.extend(ABTextBox.methods, methodObject);
        }
    });

    ABTextBox.extend(pModule, {
        handleParam: function (func) {
            this.handleParam = func;
            return this;
        },

        apply: function () {
            var obj = this,
                moduleObject = {},
                globalBlock = ABTextBox.namespace(obj.name, ABTextBox.modules.data),
                module = function (editor, value) {
                    var editorBlock = ABTextBox.namespace('module_' + obj.name, editor.data);

                    if (!editorBlock._initialized) {
                        obj.initEditor.call(editor, editorBlock, globalBlock);
                        editorBlock._initialized = true;
                    }
                    obj.handleParam.call(editor, value, editorBlock, globalBlock);
                }

            moduleObject[obj.name] = module;
            ABTextBox.extend(ABTextBox.modules.contents, moduleObject);

            obj.initGlobal(globalBlock);
        }
    });

    ABTextBox.extend(pInit, {
        implementation: function (func) {
            this.implementation = func;
            return this;
        },

        apply: function () {
            var obj = this, initObject = {};

            initObject[obj.name] = obj.implementation;
            ABTextBox.extend(ABTextBox.inits, initObject);
        }
    });

    ABTextBox.Event = function (event) {

    };

    ABTextBox.extend(ABTextBox.Event, {
        util: {
            stopPropagation: function (event) {
                event = event || window.event;
                if (typeof event.stopPropagation === 'function') {
                    event.stopPropagation();
                }
                if (typeof event.cancelBubble !== 'undefined') {
                    event.cancelBubble = true;
                }
            },

            preventDefault: function (event) {
                event = event || window.event;
                if (typeof event.preventDefault === 'function') {
                    event.preventDefault();
                }
                if (typeof event.returnValue !== 'undefined') {
                    event.returnValue = false;
                }
            },

            target: function (event) {
                event = event || window.event;
                return event.target || event.srcElement;
            }
        },

        attach: function (editor, type, handler, data) {
            var queue = ABTextBox.Event.queue,
                proxy = ABTextBox.Event.proxy,
                contains = ABTextBox.util.contains,
                forEach = ABTextBox.util.forEach,
                custom = ABTextBox.Event.custom,
                count = 0;

            queue.push({ editor: editor.core, type: type, handler: handler, data: data });

            forEach(queue, function (item) {
                if (item.editor === editor.core && item.type === type) {
                    count += 1;
                }
            });

            if (count === 1) { // native binding if we are first
                if (contains(custom.names, type)) {
                    custom.on(editor, type);
                } else {
                    d(editor.body).on(type, proxy);
                }
            }
        },

        detach: function (editor, type, handler) {
            var queue = ABTextBox.Event.queue,
                proxy = ABTextBox.Event.proxy,
                contains = ABTextBox.util.contains,
                forEach = ABTextBox.util.forEach,
                custom = ABTextBox.Event.custom,
                count = 0;

            forEach(queue, function (item, index) {
                if (item.editor === editor.core && item.type === type) {
                    queue.splice(index, 1);
                    return false;
                }
            });

            forEach(queue, function (item) {
                if (item.editor === editor.core && item.type === type) {
                    count += 1;
                }
            });

            if (count === 0) { // native unbinding if we are last
                if (contains(custom.names, type)) {
                    custom.off(editor, type);
                } else {
                    d(editor.body).off(type, proxy);
                }
            }
            
        },

        fire: function (editor, type, event) {
            var queue = ABTextBox.Event.queue,
                forEach = ABTextBox.util.forEach,
                event = new ABTextBox.Event(event);

            //d('#log').get().innerHTML += '<br/>' + type;

            forEach(queue, function (item) {
                var returnValue;

                if (item.type === type && item.editor === editor) {
                    event.data = event.data || item.data;
                    returnValue = item.handler.call(editor, event);
                    if (typeof returnValue !== 'undefined' && !returnValue) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    if (event.stopped) {
                        return false;
                    }
                }
            });

        },

        register: function (name) {
            var contains = ABTextBox.util.contains,
                names = ABTextBox.Event.custom.names;

            if (name && !contains(names, name)) {
                names.push(name);
            }
        },

        unregister: function (name) {
            var forEach = ABTextBox.util.forEach,
                names = ABTextBox.Event.custom.names;

            forEach(names, function (item, index) {
                if (item === name) {
                    names.splice(index, 1);
                    return false;
                }
            });
        },

        proxy: function (event) { //native event
            var fire = ABTextBox.Event.fire,
                editor = this.editor,
                type = event.type;

            return fire(editor, type, event);
        },

        queue: [],

        custom: {
            on: function (editor, type) {
                var events = ABTextBox.Event.custom.events,
                    contains = ABTextBox.util.contains;

                if (contains(events, type)) {
                    events[type](editor, true);
                }
            },

            off: function (editor, type) {
                var events = ABTextBox.Event.custom.events,
                    contains = ABTextBox.util.contains;

                if (contains(events, type)) {
                    events[type](editor, false);
                }
            },

            names: [],

            events: {},

            data: {}
        }
    });

    ABTextBox.defaults = {
        modules: {
            multiline: false,
            spellcheck: false,
            vscrollbar: false,
            hscrollbar: false
        }
    };

    ABTextBox.error = function (name, message) {
        throw new Error(name + ':' + message);
    };

    d = ABTextBox.dom = function (value, context) {
        if (typeof value === 'string') {
            if (typeof context === 'undefined') {
                d.stack.push(d.document.querySelectorAll(value)); //IE7 not supported
            }
            else {
                d.stack.push(context.querySelectorAll(value)); //IE7 not supported
            }
        } else {
            d.stack.push(value);
        }
        return d;
    };
    d.stack = [];
    d.document = ABTextBox.document;
    d.setDoc = function (document) {
        d.document = document;
    }
    ABTextBox.extend(d, {

        get: function () {
            var base = d.stack.pop();
            if (base.length) {
                return base.item(0);
            }
        },

        getAll: function () {
            var base = d.stack.pop();
            return base;
        },

        remove: function () {
            var base = d.stack.pop();
            if (base.parentNode) {
                base.parentNode.removeChild(base);
            }
        },

        empty: function () {
            var base = d.stack.pop(), forEach = ABTextBox.util.forEach;
            forEach(d(base).children(), function (child) {
                d(child).remove();
            });
        },

        append: function (node) {
            var base = d.stack.pop();
            if (base) {
                base.appendChild(node);
            }
        },

        prepend: function (node) {
            var base = d.stack.pop();
            if (base) {
                base.insertBefore(node, base.firstChild);
            }
        },

        replace: function (node) {
            var base = d.stack.pop();
            if (base.parentNode) {
                base.parentNode.replaceChild(node, base);
            }
        },

        children: function (option) {
            var base = d.stack.pop(), children;

            if (option === 'first') {
                children = base.firstChild;
            } else if (option === 'last') {
                children = base.lastChild;
            } else {
                children = base.childNodes;
            }
            return children;
        },

        createNode: function (type) {
            var base = d.stack.pop();
            return base.createElement(type);
        },

        createTextNode: function (text) {
            var base = d.stack.pop();
            return base.createTextNode(text);
        },

        createFragment: function () {
            var base = d.stack.pop();
            return base.createDocumentFragment();
        },

        attr: function (attribute) {
            var base = d.stack.pop();
            if (typeof attribute === 'string') {
                return base.getAttribute(attribute)
            } else {
                for (var name in attribute) {
                    if (attribute.hasOwnProperty(name)) {
                        base.setAttribute(name, attribute[name]);
                    }
                }
            }
        },

        style: function (style) {
            var base = d.stack.pop(),
                forEach = ABTextBox.util.forEach,
                camelize = ABTextBox.util.camelize;

            if (typeof style === 'string') {
                style = camelize(style);
                return base.style[style] || base.ownerDocument.defaultView.getComputedStyle(base)[style];
            } else {
                forEach(style, function (value, name) {
                    base.style[camelize(name)] = value;
                });
            }
        },

        index: function () {
            var base = d.stack.pop(), index = -1;

            if (base.parentNode) {
                if (Array.prototype.indexOf) { // IE8 fails
                    index = Array.prototype.indexOf.call(base.parentNode.childNodes, base);
                } else {
                    for (var i = 0, children = base.parentNode.childNodes; i < children.length; i++) {
                        if (children[i] === base) {
                            index = i;
                            break;
                        }
                    }
                }
            }
            return index;
        },

        next: function () {
            var base = d.stack.pop();
            return base.nextSibling;
        },

        previous: function () {
            var base = d.stack.pop();
            return base.previousSibling;
        },

        insertBefore: function (node) {
            var base = d.stack.pop();
            if (node.parentNode) {
                node.parentNode.insertBefore(base, node);
            }
        },

        text: function (value) {
            var base = d.stack.pop(), type = base.nodeType, text = '';

            if (value) {
                d(base).empty();
                d(base).append(d(base.ownerDocument).createTextNode(value));

            } else {

                if (type === 1 || type === 9 || type === 11) {
                    if (typeof base.textContent === "string") {
                        text = base.textContent;
                    } else {
                        for (base = base.firstChild; base; base = base.nextSibling) {
                            text += d(base).text();
                        }
                    }
                } else if (type === 3 || type === 4) {
                    text = base.nodeValue;
                }
                return text;
            }
        },

        html: function (value) {
            var base = d.stack.pop();

            if (value) {
                base.innerHTML = value;
            } else {
                return base.innerHTML;
            }

        },

        addClass: function () {
            var base = d.stack.pop(),
                classes = Array.prototype.slice.call(arguments),
                forEach = ABTextBox.util.forEach;

            forEach(classes, function (classname) {
                if (base.classList) {
                    base.classList.add(classname);
                } else {
                    if (base.className.indexOf(classname) === -1) {
                        base.className += ' ' + classname;
                    }
                }
            });
        },

        removeClass: function () {
            var base = d.stack.pop(),
                classes = Array.prototype.slice.call(arguments),
                forEach = ABTextBox.util.forEach;

            forEach(classes, function (classname) {
                if (base.classList) {
                    base.classList.remove(classname);
                } else {
                    if (base.className.indexOf(classname) !== -1) {
                        base.className = base.className.replace(classname, '');
                    }
                }
            });
        },

        hasClass: function (node, classname) {
            var base = d.stack.pop();
            if (base.classList) {
                return base.classList.contains(classname);
            } else {
                return base.className.indexOf(classname) !== -1;
            }
        },

        on: function (type, handler) {
            var base = d.stack.pop();
            
            if (ABTextBox.document.addEventListener) {
                base.addEventListener(type, handler, false);
            } else if (ABTextBox.document.attachEvent) {
                base.attachEvent('on' + type, handler);
            } else {
                base['on' + type] = handler;
            }
        },

        off: function (type, handler) {
            var base = d.stack.pop();
            if (document.removeEventListener) {
                base.removeEventListener(type, handler, false);
            } else if (document.detachEvent) {
                base.detachEvent('on' + type, handler);
            } else {
                base['on' + type] = null;
            }
        }
    });

    w = ABTextBox.wrapper = function (editor) {
        if (editor instanceof ABTextBox.wrapper.Maker) {
            return editor;
        } else {
            ABTextBox.wrapper.Maker.prototype = editor;
            return new ABTextBox.wrapper.Maker(editor);
        }
    };

    ABTextBox.wrapper.Maker = function (editor) {
        var frame, doc;
        frame = d('iframe', editor._private.node).get();
        doc = frame.contentDocument || editor._private.window.document;
        ABTextBox.extend(this, {
            core: editor,
            node: editor._private.node,
            win: editor._private.window,
            doc: doc,
            body: doc.body,
            frame: frame,
            customEvents: editor._private.customEvents,
            data: editor._private.data,
            modules: editor._private.modules
        });
    };

    ABTextBox.createStyleNode = function (document, value) {
        var node = d(document).createNode('style'), textCSS, sheet, head,
            forEach = ABTextBox.util.forEach;

        head = document.head || document.getElementsByTagName('head')[0]; //IE8
        d(head).append(node);
        sheet = node.sheet || node.styleSheet;

        forEach(value, function (styles, selector) {
            textCSS = '';
            forEach(styles, function (propValue, propName) {
                textCSS += propName + ':' + propValue + ';';
            });
            if (sheet.insertRule) {
                sheet.insertRule(selector + '{' + textCSS + '}', 0);
            } else if (sheet.addRule) {
                sheet.addRule(selector, textCSS, 0);
            }
        });
            
        return node;
    };

    ABTextBox.replace = function (node, modules) {
        var value = node.value, editor, position = d(node).index(), parent = node.parentNode;
        d(node).remove();
        editor = new ABTextBox.Editor(parent, position, modules);
        editor.text(value);
        return editor;
    };

    ABTextBox.appendTo = function (node, modules) {
        var value = node.value, editor = new ABTextBox.Editor(node.parentNode, node.parentNode.length, modules);
        editor.text(value);
        return editor;

    };

    ABTextBox.Editor = function (parentNode, position, modules) {
        var length = d(parentNode).children().length, frame, editor, doc, forEach = ABTextBox.util.forEach;

        if (!(this instanceof ABTextBox.Editor)) {
            return new ABTextBox.Editor();
        }
        this._private = {};
        this._private.node = d(ABTextBox.document).createNode('div');

        frame = d(ABTextBox.document).createNode('iframe');

        d(this._private.node).append(frame);

        if (length && position < length) {
            d(this._private.node).insertBefore(d(parentNode).children()[position]);
        } else {
            d(parentNode).append(this._private.node);
        }

        ABTextBox.extend(this._private, {
            window: frame.contentWindow,
            modules: {},
            data: {},
            customEvents: {}
        });

        doc = frame.contentDocument || frame.contentWindow.document;

        d(frame).attr({
            frameborder: '0',
            tabindex: '0',
            src: '',
            allowtransparency: true
        });

        d(frame).style({
            width: '100%',
            height: '100%'
        });

        d(frame).addClass('ABTextBox-frame');

        doc.open();
        doc.write('<!DOCTYPE html>');
        doc.close();

        editor = w(this);
        editor.body.editor = this;

        d(editor.node).addClass('ABTextBox');

        d(editor.body).attr({
            spellcheck: false,
            contenteditable: true
        });

        d(editor.body).addClass('ABTextBox-editablebody');

        ABTextBox.createStyleNode(editor.doc, {
            html: {
                height: '100%',
                cursor: 'text'
            },
            body: {
                margin: 0,
                height: '100%'
            },
            'body p': {
                margin: 0,
                padding: 0
            },
            br: {
                display: 'inline'
            }
        });

        forEach(ABTextBox.inits, function (init) {
            init.call(editor);
        });

        modules = ABTextBox.extend(ABTextBox.defaults.modules, modules);

        for (var item in modules) {
            if (modules.hasOwnProperty(item) && ABTextBox.modules.contents.hasOwnProperty(item)) {
                ABTextBox.modules.contents[item](editor, modules[item]);
            }
        }
    };

    ABTextBox.Editor.prototype = ABTextBox.namespace('methods');
    ABTextBox.namespace('inits');
    ABTextBox.namespace('modules.data');
    ABTextBox.namespace('modules.contents');

    ABTextBox.define('method')
        .name('skin')
        .beforeEvent('beforeSkinChange')
        .afterEvent('afterSkinChange')
        .implementation(function (value) {
            if (value === 'default') {
                d(this.node).addClass('ABTextBox-skin-default');
            } else if (typeof value === 'string') {

            }
        })
        .apply();

    ABTextBox.define('method')
        .name('set')
        .beforeEvent('beforeModuleChange')
        .afterEvent('afterModuleChange')
        .implementation(function (option, value) {
            if (option && typeof value !== 'undefined'
            && ABTextBox.modules.contents.hasOwnProperty(option)) {
                ABTextBox.modules.contents[option](this, value);
            }
        })
        .apply();
        
    ABTextBox.define('method')
        .name('html')
        .beforeEvent(function (value) {
            if (value) {
                return 'beforeSetHTML';
            } else {
                return 'beforeGetHTML';
            }
        })
        .afterEvent(function (value) {
            if (value) {
                return 'afterSetHTML';
            } else {
                return 'afterGetHTML';
            }
        })
        .implementation(function (value) {
            return d(this.body).html(value);
        })
        .apply();
   
    ABTextBox.define('method')
        .name('text')
        .beforeEvent(function (value) {
            if (value) {
                return 'beforeSetText';
            } else {
                return 'beforeGetText';
            }
        })
        .afterEvent(function (value) {
            if (value) {
                return 'afterSetText';
            } else {
                return 'afterGetText';
            }
        })
        .implementation(function (value) {
            return d(this.body).text(value);
        })
        .apply();

    ABTextBox.define('method')
        .name('focus')
        .implementation(function () {
            this.body.focus();
        })
        .apply();

    ABTextBox.define('method')
        .name('blur')
        .implementation(function () {
            this.body.blur();
        })
        .apply();

    ABTextBox.define('method')
        .name('style')
        .beforeEvent(function (value, param) {
            if (typeof value === 'object' || value && param) {
                return 'beforeSetStyle';
            } else {
                return 'beforeGetStyle';
            }
        })
        .afterEvent(function (value, param) {
            if (typeof value === 'object' || value && param) {
                return 'afterSetStyle';
            } else {
                return 'afterGetStyle';
            }
        })
        .implementation(function (value, param) {
            if (typeof value === 'object') {
                if (value.hasOwnProperty('width')) {
                    this.width(value['width']);
                    delete value['width'];
                }
                if (value.hasOwnProperty('height')) {
                    this.height(value['height']);
                    delete value['height'];
                }
                d(this.body).style(value);
            } else if (typeof value === 'string' && typeof param === 'string') {
                if (value === 'width') {
                    this.width(param);
                    return;
                }
                if (value === 'height') {
                    this.height(param);
                    return;
                }
                d(this.body).style(JSON.parse('{"' + value + '":"' + param + '"}'));
            } else if (typeof value === 'string') {
                if (value === 'width') {
                    return this.width();
                } else if (value === 'height') {
                    return this.height();
                } else {
                    return d(this.body).style(value);
                }
            }
        })
        .apply();

    ABTextBox.define('method')
        .name('length')
        .implementation(function () {
            return this.text().length;
        })
        .apply();

    ABTextBox.define('method')
        .name('frameStyle')
        .implementation(function (value, param) {
            if (typeof value === 'object') {
                d(this.node).style(value);
            } else if (typeof value === 'string' && typeof param === 'string') {
                d(this.node).style(JSON.parse('{"' + value + '":"' + param + '"}'));
            } else if (typeof value === 'string') {
                return d(this.node).style(value);
            }
        })
        .apply();

    ABTextBox.define('method')
        .name('show')
        .implementation(function () {
            this.frameStyle('display', this.data.olddisplay || 'inline-block');
        })
        .apply();

    ABTextBox.define('method')
        .name('hide')
        .implementation(function () {
            this.data.olddisplay = this.style('display') || 'inline-block';
            this.frameStyle('display', 'none');
        })
        .apply();

    ABTextBox.define('method')
        .name('remove')
        .beforeEvent('beforeRemove')
        .implementation(function () {
            d(this.node).remove();
        })
        .apply();

    ABTextBox.define('method')
        .name('width')
        .implementation(function (value) {
            if (typeof value === 'number') {
                d(this.node).style({ width: value + 'px' });
            } else if (typeof value === 'string') {
                d(this.node).style({ width: value });
            } else {
                return this.node.offsetWidth;
            }
        })
        .apply();

    ABTextBox.define('method')
        .name('height')
        .implementation(function (value) {
            if (typeof value === 'number') {
                d(this.node).style({ height: value + 'px' });
            } else if (typeof value === 'string') {
                d(this.node).style({ height: value });
            } else {
                return this.node.offsetHeight;
            }
        })
        .apply();

    ABTextBox.define('method')
        .name('on')
        .beforeEvent('beforeAttachEvent')
        .afterEvent('afterAttachEvent')
        .implementation(function (event, handler, data) {
            ABTextBox.Event.attach(this, event, handler, data);
        })
        .apply();

    ABTextBox.define('method')
        .name('off')
        .beforeEvent('beforeDetachEvent')
        .afterEvent('afterDetachEvent')
        .implementation(function (event, handler) {
            ABTextBox.Event.detach(this, event, handler);
        })
        .apply();

    ABTextBox.define('method')
        .name('fire')
        .implementation(function (event, eventObject) {
            ABTextBox.Event.fire(this.core, event, eventObject);
        })
        .apply();

    ABTextBox.define('method')
        .name('readonly')
        .beforeEvent(function (value) {
            if (typeof value === 'boolean') {
                return 'beforeReadonlyChange';
            }
        })
        .afterEvent(function (value) {
            if (typeof value === 'boolean') {
                return 'afterReadonlyChange';
            }
        })
        .implementation(function (value) {
            if (typeof value === 'boolean') {
                d(this.body).attr({ contenteditable: !value });
            } else {
                return d(this.body).attr('contenteditable') === 'false';
            }
        })
        .apply();

    ABTextBox.define('method')
        .name('enable')
        .beforeEvent(function (value) {
            if (typeof value === 'boolean') {
                return 'beforeEnableChange';
            }
        })
        .afterEvent(function (value) {
            if (typeof value === 'boolean') {
                return 'afterEnableChange';
            }
        })
        .implementation(function (value) {
            if (typeof value === 'boolean') {
                
            } else {
                
            }
        })
        .apply();

    ABTextBox.define('method')
        .name('linesCount')
        .implementation(function () {
            return ABTextBox.util.linesCount(this.body);
        })
        .apply();
   
    ABTextBox.define('event')
        .name('change')
        .initEditor(function (editorBlock) {
            editorBlock.previousText = this.text();
        })
        .initGlobal(function (globalBlock) {
            globalBlock.check = function (event, delayed) { // callback
                var nativeEditor = this,
                    editor = w(nativeEditor),
                    editorBlock = event.data.editorBlock,
                    fire = ABTextBox.Event.fire;

                if (!delayed && ['drop'].indexOf(event.type) > -1) {
                    setTimeout(function () {
                        globalBlock.check.call(elem, event, true);
                    }, 1);
                    return;
                }
                if (editor.text() !== editorBlock.previousText) {
                    editorBlock.previousText = editor.text();
                    fire(editor.core, 'change');
                }
            }
        })
        .bind(function (editorBlock, globalBlock) {
            var forEach = ABTextBox.util.forEach,
                editor = this;

            forEach(['keypress', 'keyup', 'paste', 'cut', 'drop'], function (event) {
                editor.on(event, globalBlock.check, { editorBlock: editorBlock });
            });
        })
        .unbind(function (editorBlock, globalBlock) {
            var forEach = ABTextBox.util.forEach,
                editor = this;

            forEach(['keypress', 'keyup', 'paste', 'cut', 'drop'], function (event) {
                editor.off(event, globalBlock.check);
            });
        })
        .apply();

    ABTextBox.define('init')
        .name('focusBlurManager')
        .implementation(function () {
            var editor = this;
            d(this.body).on('focusout', function () {
                var sel, range, data = editor.data;
                if (editor.win.getSelection) {
                    sel = editor.win.getSelection();
                    if (sel.rangeCount) {
                        range = sel.getRangeAt(0).cloneRange();
                        data.savedRange = range;
                    }
                }
                else if (editor.doc.selection) {
                    range = editor.doc.selection.createRange();
                    range = range.duplicate();
                    data.savedRange = range;
                }
            });

            d(this.body).on('focusin', function () {
                var data = editor.data, sel, node, range;
                if (data.savedRange) {
                    if (editor.win.getSelection) {
                        sel = editor.win.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(data.savedRange);
                    }
                    else if (editor.doc.selection) {
                        data.savedRange.select();
                    }
                } else {
                    if (d(editor.body).children().length) {
                        node = d(editor.body).children('last');
                        if (editor.win.getSelection) {
                            sel = editor.win.getSelection();
                            range = editor.doc.createRange();
                            range.selectNode(node);
                            range.collapse(false);
                            sel.removeAllRanges();
                            sel.addRange(range);
                        } else {
                            range = editor.body.createTextRange();
                            range.moveToElementText(node);
                            range.collapse(false);
                            range.select();
                        }
                    }
                }
            });

        })
        .apply();

    ABTextBox.define('init')
        .name('lineBreakManager')
        .implementation(function () {
            var editor = this;
            if (ABTextBox.environment.gecko) {
                d(this.body).append(d(this.doc).createNode('br'));
            }

            d(this.body).on('keypress', function (event) {
                var keycode = event.which || event.keyCode,
                    sel, range, textnode, br;
                if (keycode === 13) {
                    if (editor.win.getSelection) {
                        sel = editor.win.getSelection();
                        range = sel.getRangeAt(0);
                        br = d(editor.doc).createNode('br');
                        range.insertNode(br);
                        range.setEndAfter(br);
                        range.setStartAfter(br);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    } else if (editor.doc.selection) {
                        range = editor.doc.selection.createRange();
                        range.pasteHTML('<br>');
                        range.select();
                    }
                    ABTextBox.Event.util.preventDefault(event);
                    return false;
                }
            });
        })
        .apply();

    ABTextBox.define('module')
        .name('accept')
        .initEditor(function (editorBlock, globalBlock) {
            this.on('change', globalBlock.check, { editorBlock: editorBlock });
            this.on('beforeStyleChange', globalBlock.updateCallback, { editorBlock: editorBlock });
        })
        .initGlobal(function (globalBlock) {
            globalBlock.updateOriginalStyle = function (editor, editorBlock) {
                var forEach = ABTextBox.util.forEach,
                    originalStyle = ABTextBox.namespace('originalStyle', editorBlock);

                forEach(editorBlock.acceptStyle, function(value, name){
                    originalStyle[name] = editor.style(name);
                });        
            }
            
            globalBlock.updateCallback = function (event) {
                globalBlock.updateOriginalStyle(this, event.data.editorBlock);
            }

            globalBlock.check = function (event) {
                var words = event.data.editorBlock.words,
                    acceptStyle = event.data.editorBlock.acceptStyle,
                    originalStyle = event.data.editorBlock.originalStyle,
                    text = this.text().trim(),
                    match = false,
                    editor = w(this);

                for (var i = 0, len = words.length; i < len && !match; i++) {
                    if (typeof words[i] === 'string') {
                        match = words[i] === text;
                    } else if (typeof words[i] === 'object') {
                        match = words[i].test(text);
                    }
                }

                if (match) {
                    editor.style(acceptStyle);
                    editor.fire('accept');
                } else {
                    editor.style(originalStyle);
                    editor.doc.execCommand('removeformat'); // for IE
                }
            }
            ABTextBox.Event.register('accept');
        })
        .handleParam(function (value, editorBlock, globalBlock) {
            var words, acceptStyle,
                isArray = ABTextBox.util.isArray;

            if (value === 'disable') {
                
            } else if (isArray(value)) {
                words = value;
                acceptStyle = { 'background-color': 'yellowgreen' };
            } else if (typeof value === 'object') {
                if (value.hasOwnProperty('words') && value.hasOwnProperty('style')) {
                    words = value.words;
                    acceptStyle = value.style;
                }
            }

            if (words && acceptStyle) {
                editorBlock.words = words;
                editorBlock.acceptStyle = acceptStyle;
                globalBlock.updateOriginalStyle(this, editorBlock);
            }
        })
        .apply();

    this.ABTextBox = ABTextBox;
})(this, this.document);
