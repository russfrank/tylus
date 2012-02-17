Tylus - Titanium Stylus
=======================

Note: Device conditionals now work as expected.

Note 2: if you need a newline, use `<br>`.

New: experimental support for less css engine!

Install tylus with npm

    git clone git://github.com/russfrank/tylus.git
    npm install tylus

Make a test .styl file

    Label
      #hello
        textAlign center
        color #00ffff
        font
          fontSize 20
          fontWeight bold
        [device=iphone]
          text 'Hello from iPhone'
        [device=ipad]
          text 'Hello from iPad'

and place it in your Titanium Resources directory.  Then run

    tylus path/to/Resources

and you'll have a style.js file.  Copy tylus/lib/tylus.js into your Resources
directory, then, in app.js:

    Ti.include('tylus.js');
    var win, label ;
    win = T.Window();
    label = T.Label({tyle: '#hello'});
    win.add(label);
    win.open();

and you're good to go.  Note that the property is `tyle`, not `style`, to
avoid a conflict with Titanium properties called `style`.

Features
--------

Supports creation
of objects with a `tyle` property or with id, class, classNames, or classes
property:

    label = T.Label({tyle: '#mylabel .special'});
    win = T.Window({id: 'Settings'});

Conditioning on device type:

    Label
      [device=iphone]
        text 'iphone'
      [device=ipad]
        text 'ipad'

and in your app.js:

    label = T.Label();
    // will say 'iphone' on iphone and 'ipad' on ipad

Object properties are also supported:

    Label
      font
        fontSize 20
        fontWeight bold

even though it doesn't make sense from a css standpoint, it's still quite
intuitive.

And, of course, all of the awesome features of [Stylus](http://learnboost.github.com/stylus/)

### JS Evaluation

If you need to have a style consist of javascript, wrap it in quotes and
backticks:

    Table
        .grouped
            [device=iphone]
                style "`Ti.UI.iPhone.TableViewStyle.GROUPED`"
                backgroundColor transparent
                rowBackgroundColor white

The javascript will be evaluated the first time the style is looked up.

### String Interpolation

If tylus can find underscore.js, underscore's string interpolation will be
applied to your objects' `title` and `text` properties.  You specify the
strings in a `strings` object passed into the constructor.  For example:

```
Label
   .special
      text "This special label says <%=message%>!"
```

meanwhile, in some javascript file

```
var stuff = T.Label({tyle: '.special', strings: {message: 'awesome stuff'}});
```

### Augmented factory methods of all Ti.UI objects in the T namespace

These much nicer looking constructors are not only a reasonable length but
also will lookup styles before generating the object.

    T.Dash()
    T.Table()
    T.TableRow()
    T.Label()
    T.Button()
    T.Image()
    T.Tab()
    T.Window()
    T.ScrollAble()
    T.AlertDialog()

They also provide nicer functions for add/removeEventListener and fireEvent:

    object.on('event', handler);
    object.off('event', handler);
    object.fire('event');

The `.on` function will also wrap the handler in an exception handler. This
exception handler will simply `alert()` the exception when it is caught. When
exceptions occur in an event callback, Titanium logs an error to the console
but does not display an error message; this can make debugging on a device
difficult.  The `T` object exposes a function `setDebugMode()` which can be
used to enable or disable this feature.  It's disabled by default.

This feature will make removing event handlers slow, since we have to lookup
the wrapper function that was created when the event handler was added. Make
sure to disable it in production modes, unless you're okay with a small
performance hit when removing handlers in exchange for the exception handling.

See tylus.js in lib/ (ie, the file that should be in your Titanium Resources
directory) for the map of nice names to crappy Titanium names.  Some are
slightly modified.  'View' is usually removed.  The matrices specify dimension
on the end.  PickerColumn is shortened to PickerCol, etc.

Unfortunately, replacing constructors like this *will cause some problems*.
The Titanium build system attempts to detect which portions of the framework
you are using by essentially greping your source for the 
`Ti.xx.createSomeObject` factory methods.  Since you're using the factory
methods I provide in `T`, Titanium will think you aren't using those
components.  So, in some file of your project, simply list out the
constructors you'll need.  You can do this per-file or once in a single file
of your project:

    Ti.UI.createLabel
    Ti.UI.createTableView
    Ti.UI.createTableViewRow

These references to Javascript functions will be ignored by the interpreter
on the device, but will let the Ti build system know to include those
parts of the framework in the build.

Titanium Build Plugin
---------------------

Assuming you have Tylus setup correctly in your path, you can use the plugin in
the plugins/ directory of the source tree with Titanium to automate the stylus
compilation every time Titanium compiles your app.  To use this, copy the
plugins directory into your application project directory.  It should be next
to Resources and your tiapp.xml:

    Resources
    build
    plugins
    tiapp.xml
    manifest

etc.  Then, edit your tiapp.xml, adding the following into your <ti:app>:

    <plugins>
          <plugin version="0.0">tylus</plugin> 
    </plugins>

Now, when you compile your app, your .styl files will be compiled into 
style.js!


Manual Compilation
-------------------

You can manually compile styles by running `tylus` with your Resources
directory as the parameter:

    tylus Resources

Example
--------------

    #myitem
      [device=phone]
        top 84
        width 85
      [device=ipad]
        top 90
        width 90
      font
        fontSize 13
        fontWeight bold
        fontFamily 'Helvetica Neue'
    
    Label
       width 100
       height 200
       [device=iphone]
          text "This is an iPhone!"
       [device=ipad]
          text "this is an ipad!"
       #myid
         text "some id label thing"

License
-------

MIT.
