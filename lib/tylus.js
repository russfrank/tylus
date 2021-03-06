(function () {

var _;
// try to require underscore
try { _ = require('/vendor/underscore'); } catch (e) {}
try { _ = require('/underscore'); } catch (e) {}
try { _ = require('../underscore'); } catch (e) {}
try { _ = require('../../underscore'); } catch (e) {}
try { _ = require('/vendor/lodash'); } catch (e) {}
try { _ = require('/lodash'); } catch (e) {}

/* Class: T
 * Main tylus namespace.
 */

var T = (function () {
  var exports = {},
     styles = {},
     device,
     density,
     ctorMap,
     debugMode = false,
     properties = {};   // these can be conditional'd with [prop=val]
                        // in the source, such as [device=iphone]

  var hooks = {};
  var posts = {};

  var screenInfo = function () {  
    var screenWidth = Ti.Platform.displayCaps.platformWidth;
    var screenHeight = Ti.Platform.displayCaps.platformHeight;
    var dpi = Ti.Platform.displayCaps.dpi;

    var info = {
      px: {
        x: screenWidth,
        y: screenHeight
      },
      dp: {
        x: screenWidth / (dpi / 160),
        y: screenHeight / (dpi / 160)
      },
      inches: {
        x: screenWidth / dpi,
        y: screenHeight / dpi
      },
      // calculate the diagonal
      diag: Math.sqrt(
        Math.pow((screenWidth / dpi), 2) + Math.pow((screenHeight / dpi), 2)
      ),
      dpi: dpi,
      density: Ti.Platform.displayCaps.density,

      dp2px: function (dp) { return dp * (dpi/160); },
      px2dp: function (px) { return px / (dpi/160); }
    };

    if (info.px.y == '568' && exports.os === 'iphone') info.iphone5 = true;

    return info;
  };

  // try to get ti props.  In an exception handler so we can do testing
  // in node with vows.

  try {
    var info = screenInfo();

    if (info.diag > 6) properties.formfactor = 'tablet';
    else if (info.diag > 2.5) properties.formfactor = 'phone';
    else properties.formfactor = 'tinyphone';

    if (info.iphone5) properties.iphone5 = 'true';

    properties.device = properties.osname = Ti.Platform.osname;
    properties.density = Ti.Platform.displayCaps.density;
    properties.dpi = Ti.Platform.displayCaps.dpi;
    properties.username = Ti.Platform.username;

    // make version a number becuase the css compilers will do the same thing
    // with the value in the css, ie version=5.0 will be converted to version=5
    // because it actually parseInt()s it, so we'll do the same
    properties.version = parseInt(Ti.Platform.version, 10);
  } catch (e) {
    properties.device = 'iphone';
    properties.density = 'high';
    properties.dpi = 320;
    properties.username = 'iPhone Simulator';
    properties.version = 5;
  }
  // map nice names to ugly titanium factory names
  ctorMap = {
    Matrix2D   : 'create2DMatrix',
    Matrix3D   : 'create3DMatrix',
    Indicator  : 'createActivityIndicator',
    AlertDialog : 'createAlertDialog',
    Animation  : 'createAnimation',
    Button    : 'createButton',
    ButtonBar  : 'createButtonBar',
    CoverFlow  : 'createCoverFlow',
    DashItem   : 'createDashboardItem',
    Dash      : 'createDashboardView',
    EmailDialog : 'createEmailDialog',
    Image     : 'createImageView',
    OptionDialog: 'createOptionDialog',
    Label     : 'createLabel',
    Picker    : 'createPicker',
    PickerRow  : 'createPickerRow',
    PickerCol  : 'createPickerColumn',
    ProgressBar : 'createProgressBar',
    Scroll    : 'createScrollView',
    Scrollable  : 'createScrollableView',
    SearchBar  : 'createSearchBar',
    Slider    : 'createSlider',
    Switch    : 'createSwitch',
    Tab      : 'createTab', 
    TabGroup   : 'createTabGroup',
    TabbedBar  : 'createTabbedBar',
    Table     : 'createTableView',
    TableRow   : 'createTableViewRow',
    TableSection: 'createTableViewSection',
    TextArea   : 'createTextArea',
    TextField  : 'createTextField',
    Toolbar    : 'createToolbar',
    View      : 'createView',
    Web      : 'createWebView',
    Window    : 'createWindow'
  };

  /* Function: combineSelectors
   * Combines selectors into a string to use for searching with getStyles
   *
   * Parameters:
   *   type    - *string* type of the item, such as Label, DashItem, Window,
   *          etc
   *   args    - *object* with id, className, classes, or classNames
   *          properties which will be used to resolve to styles
   *
   * Returns:
   *   *array* of selectors to be searched in the style tree
   */  

  function combineSelectors (type, args) {
    var out = [];
    out.push(type);
    if (args.id) {
      out.push('#' + args.id);
    }
    if (args.className) {
      out.push('.' + args.className);
    }
  
    var c = args.classes;
    if (args.classes || args.classNames) {
      c.forEach(function (value) {
        out.push('.' + value);
      });
    }
    return out;
  }

  /* Function: extend
   * Extends an object with the properties of another.  
   *
   * Parameters:
   *   to   - *object* to put properties into
   *   from  - *object* to take properties from
   */

  function extend (to, from) {
    var item;
    for (item in from) {
      if (from.hasOwnProperty(item)) {
        if (typeof from[item] === 'object' && from[item] !== null) {
          to[item] = to[item] || {}; 
          extend(to[item], from[item]); // recurse
        } else {
          to[item] = from[item];
        }  
      }      
    }
  }   

  /* Function: weakExtend
   * Extends an object with the properties of another.  Does not recurse,
   * which is important because recursing into Titanium proxies will break
   * those proxies.
   *
   * Parameters:
   *   to   - *object* to put properties into
   *   from  - *object* to take properties from
   */

  function weakExtend (to, from) {
    var item;
    for (item in from) {
      if (from.hasOwnProperty(item)) {
        to[item] = from[item];
      }
    }
  }

  /* Function: wrapEmitter
   * Wraps an emitter with alternative names for event functions. In debug
   * mode
   *
   * Parameters:
   *   emitter  - *object* the emitter to wrap.  This parameter will be
   *          modified.
   */

  function wrapEmitter (emitter) {
    // if we're in debug mode we'll wrap event handlers with a try/catch.

    if (debugMode) {
      emitter.on = function (event, handler) {
        var wrapper = function (ev) {
          try {
            handler(ev);
          } catch (e) {
            Ti.App.fireEvent('unhandledException', {error: e, event: event});
          }
        };

        // we have to remember which handlers map to which wrappers.
        // can't just use a hash because we can't index the hash with a
        // function.

        emitter.__registry = emitter.__registry || [];
        emitter.__registry.push({wrapper: wrapper, handler: handler});
        emitter.addEventListener(event, wrapper);
        return emitter;
      };

      emitter.off = function (event, handler) {
        var item;
        emitter.__registry.forEach(function (item) {
          if (handler === item.handler) {
            emitter.removeEventListener(item.wrapper);
          }
        });
        emitter.removeEventListener(item.wrapper);
        return emitter;
      };
    } 

    else {
      emitter.on = function (event, handler) {
        emitter.addEventListener(event, handler);
        return emitter;
      };

      emitter.off = emitter.removeListener = function (name, handler) {
        emitter.removeEventListener(name, handler);
        return emitter;
      };
    }

    // emitter.fire = emitter.removeEventListner doesnt work, I've tried it
    emitter.fire = emitter.emit = function (name, data) {
      emitter.fireEvent(name, data);
    };

    return emitter;
  }

  /* Function: getStyles
   * Gets the properties for a given type and argument string.  If args.style
   * is specified, uses that for the search (should look like
   * '#id .class1 .class2'.  If args.style is undefined, uses combineSelectors
   * to find a list of selectors to use.  Then, searches the tree for styles
   * and returns them.
   *
   * Parameters:
   *   type    - *string* type of the item, such as Label, DashItem, Window
   *   args    - *string* args passed to factory, should have either style
   *          property or id/classes/classNames/className for style
   *          retreival.
   *
   * Returns:
   *   *object* properties to be added into the new object.
   */

  function getStyles (type, args) {
    var selectors, out = {}, i, j, curr, style, selStr, styleVal, prop, match,
       beginIdx, currIdx;
    if (typeof args.tyle === 'string') {
      selectors = args.tyle.split(' ');
      selectors.unshift(type);
    } else {
      selectors = combineSelectors(type, args);
    }

    // memoize function
    selStr = selectors.join('|');
    getStyles.memo = getStyles.memo || {};
    if (getStyles.memo[selStr]) {
      return getStyles.memo[selStr];
    }

    for (beginIdx = 0; beginIdx < selectors.length; beginIdx++) {
      currIdx = beginIdx;
      curr = selectors[currIdx];
      style = styles;

      while (style) {

        // if we find a device or density conditional, we copy everything
        // in it into its parent.  This has the affect of 'applying' the
        // conditional.  Then, we continue processing as normal.

        // in order to handle nested conditionals, we need to check each
        // property in a loop until nothing matches.  Each time we loop
        // we've resolved one conditional and copied it into the current
        // style.

        match = true;

        // do the following as long as a match was found at some point
        while (match) {

          match = false;
          // for each property
          for (prop in properties) if (properties.hasOwnProperty(prop)) {

            // if this property exists in the current node and
            // matches the _actual_ value of the property (like iphone)
            if (style[prop] && style[prop][properties[prop]]) {

              // copy everything in the matching conditional into
              // the current node (ie, 'resolve' the conditional)
              extend(style, style[prop][properties[prop]]);

              // there was a match, so we'll have to loop again incase
              // there was a conditional inside of the conditional we
              // just resolved.
              match = true;
            }

            // delete the conditional node out of the style as it has
            // been resolved now
            delete style[prop];
          }
        }

        if (style.self !== undefined) {
          extend(out, style.self);
        }

        // walk down the tree
        style = style[curr];
        // move to the next selector
        currIdx += 1;
        curr = selectors[currIdx];
      }
    }

    if (out.text) {
      out.text = out.text.replace(/<br>/g, "\n"); 
    }

    getStyles.memo[selStr] = out;
    return out;
  }

  /* Function: load
   * Loads styles into the object
   *
   * Parameters:
   *   input    - *object* parsed styles
   */

  function load (input) {
    if (input) {
      styles = input;
      return true;
    }
    return false;
  }

  // tries to parse input as a number. If it is, returns input as type number
  function tryNumber (input) {
    var test = parseInt(input, 10);

    if (test.toString() === input) return test;
    else return input;
  }

  // tries to parse input as a bool. If it is, returns input as type bool
  function tryBoolean (input) {
    if (input === "true") return true;
    else if (input === "false") return false;
    else return input;
  }


  /* Function: getProps
   * Gets the styles for a property, then does string interpolation on the
   * results.  Returned styles will be the complete styles for the object.
   *
   * Parameters:
   *   type  - *string* type of Ti object
   *   args  - *object* args the constructor was called with
   */

  function getProps (type, args) {
    var ret, computedStyle, newStyle;
    args = args || {};
    computedStyle = getStyles(type, args);
    newStyle = {};

    // copy styles from the computed styles first, then from the args
    // this way, computed styles are the 'defaults' and can be
    // overwritten by arguments

    // we can't just extend computedStyle with args because that would
    // overwrite the computed computedStyle in the memo of the getStyles function

    // we have to use weakExtend on Titanium objects because recursing
    // into them will likely break them.

    // string interpolation via underscore.js, if we found it
    if (_) {
      var strings = _.clone(args.strings || {});
      _.defaults(strings, _.clone(properties));
      for (var prop in computedStyle) if (computedStyle.hasOwnProperty(prop)) {
        // we replace the computed style string with a template function
        // this way we generate the template function once instead of
        // every time

        if (typeof(computedStyle[prop]) == "string") {
          computedStyle[prop] = _.template(computedStyle[prop]);
        }

        // now apply the template function or if it's not a template
        // function then just assign it into newStyle

        var test;

        if (typeof(computedStyle[prop]) == "function") {
          test = computedStyle[prop](strings);
        } else {
          test = computedStyle[prop];
        }

        // Try parsing input as Number and Boolean
        test = tryNumber(test);
        test = tryBoolean(test);

        newStyle[prop] = test;
      }
    }

    weakExtend(newStyle, args);

    return newStyle;
  }

  /* Function: makeCtor
   * Makes a functional constructor for a Titanium object, getting properties
   * first from the style information
   *
   * Parameters:
   *   name    - *string* nice name of the Titanium object
   *
   * Returns:
   *   *function (args)* factory method which tries to get properties first
   */

  function makeCtor (name) { return function (args, strings) {
    if (typeof(args) == "string") {
      args = {tyle: args, strings: strings};
    }

    var style = getProps(name, args);

    if (hooks[name]) for (var i = 0; i < hooks[name].length; i++) {
      var hookret = hooks[name][i](style, name);
      if (hookret) style = hookret;
    }

    // actually construct the damn thing
    var ret = Ti.UI[ctorMap[name]](style);

    wrapEmitter(ret);

    if (posts[name]) for (var j = 0; j < posts[name].length; j++) {
      var postret = posts[name][j](ret, style, name);
      if (postret) ret = postret;
    }


    return ret;
  }; }

  /* Function: apply
   * Applies style information into obj.
   *
   * Parameters:
   *   obj    - *object* to add properties into
   *   type    - *string* type of ti object, like Label
   *   style   - *object* describing styles to be inserted.  Should look
   *          like {style: '#id .class1'} or {id: 'someid', className: 
   *          'class1'}.
   */

  function apply (obj, type, style) {
    if (typeof(style) == 'string') style = {tyle: style};
    if (!style) style = {tyle: ''};
    style = getStyles(type, style);
    extend(obj, style);
  }

  function setDebugMode (value) {
    debugMode = value;
  }

  function setProperty (prop, value) {
    properties[prop] = value;
  }

  function addHook (names, hookfn) {
    if (typeof names == "string") names = [names];
    names.forEach(function (name) {
      hooks[name] = hooks[name] || [];
      hooks[name].push(hookfn);
    });
  }

  function addPost (names, hookfn) {
    if (typeof names == "string") names = [names];
    names.forEach(function (name) {
      posts[name] = posts[name] || [];
      posts[name].push(hookfn);
    });
  }


  var name;
  for (name in ctorMap) if (ctorMap.hasOwnProperty(name)) {
    exports[name] = makeCtor(name);
  }

  exports.setProperty = setProperty;
  exports.apply = apply;
  exports.load = load;
  exports.getStyles = getStyles;
  exports.getProps = getProps;
  exports.setDebugMode = setDebugMode;
  exports.wrapEmitter = wrapEmitter;
  exports.getProps = getProps;
  exports.addHook = addHook;
  exports.addPost = addPost;

  try {
    try { styles = require('style').styles; throw 'stop'; } catch(e) { }
    try { styles = require('../style').styles; throw 'stop'; } catch(e) { }
    try { styles = require('/style').styles; throw 'stop'; } catch(e) { }
  } catch (e) {}

  return exports;
}());

// add to exports if we were required
try {
  module.exports = T;
} catch (e) {}

}());
