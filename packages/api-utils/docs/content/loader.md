<!-- contributed by Irakli Gozalishvili [gozala@mozilla.com] -->

Loader
------

Loader is base trait and it provides set of core properties and associated
validations. Trait is useful for all the compositions providing high level
APIs for creating JavaScript contexts that can access web content.

Loader is composed from the [EventEmitter] trait, therefore instances
of Loader and their descendants expose all the public properties
exposed by EventEmitter along with additional public properties:

Value changes on all of the above mentioned properties emit `propertyChange`
events on an instances.

**Example:**

The following code creates a wrapper on hidden frame that reloads a web page
in frame every time `contentURL` property is changed:

    const hiddenFrames = require("hidden-frame");
    const { Loader } = require("content");
    const PageLoader = Loader.compose({
      constructor: function PageLoader(options) {
        options = options || {};
        if (options.contentURL)
          this.contentURL = options.contentURL;
        this.on('propertyChange', this._onChange = this._onChange.bind(this));
        let self = this;
        hiddenFrames.add(hiddenFrames.HiddenFrame({
          onReady: function onReady() {
            let frame = self._frame = this.element;
            self._emit('propertyChange', { contentURL: self.contentURL });
          }
        }));
      },
      _onChange: function _onChange(e) {
        if ('contentURL' in e)
          this._frame.setAttribute('src', this._contentURL);
      }
    });

<api name="Loader">
@class
<api name="contentScriptFile">
@property {array}
The local file URLs of content scripts to load.  Content scripts specified by
this property are loaded *before* those specified by the `contentScript`
property.
</api>

<api name="contentScript">
@property {array}
The texts of content scripts to load.  Content scripts specified by this
property are loaded *after* those specified by the `contentScriptFile` property.
</api>

<api name="contentScriptWhen">
@property {string}
When to load the content scripts.
Possible values are "start" (default), which loads them as soon as
the window object for the page has been created, and "ready", which loads
them once the DOM content of the page has been loaded.
</api>

<api name="contentURL">
@property {string}
The URL of the content loaded.
</api>

<api name="allow">
@property {object}
Permissions for the content, with the following keys:
@prop script {boolean}
  Whether or not to execute script in the content.  Defaults to true.
</api>
</api>

