<!-- contributed by Drew Willcoxon [adw@mozilla.com]  -->
<!-- edited by Noelle Murata [fiveinchpixie@gmail.com]  -->

The `widget` module provides a consistent, unified way for extensions to
expose their user-interface in a way that blends in well with the host
application.

The widgets are displayed on a horizontal bar above the browser status
bar. Expect major changes to the look and feel of the bar, as well as
the location of it, in subsequent releases.

The widget bar can be shown and hidden via the Control+Shift+U keyboard
shortcut (or Cmd+Shift+U if on Mac).

## Extended UI

Currently only the small widget view in the bar is supported.
Subsequent releases will allow authors to specify a larger panel
for displaying rich content. You may hook up extended UI via the
supported events; however, keep in mind that access to the
browser's XUL window DOM, directly or through events, may break
in the very near future, likely in the 0.7pre release.

## Permanent vs. Transient Widgets

In subsequent releases there may be support for ideas such as "active"
vs. "inactive" widgets, or "pinned" widgets, or time-contextual widgets.

Currently the widget author is in charge of managing their widget's
visibility.

## Constructors ##

<api name="Widget">
@constructor {options}
  Creates a new widget.

@param options {object}
  An object with the following keys:

  @prop label {string}
    A required string description of the widget used for accessibility,
    title bars, and error reporting.

  @prop [content] {string}
    An optional string value containing the displayed content of the widget.
    It may contain raw HTML content, or a URL to Web content, or a URL to an
    image.  Widgets must either have a `content` property or an `image`
    property.

  @prop [image] {string}
    An optional string URL of an image from your package to use as the displayed
    content of the widget.  See the [`self`](#module/jetpack-core/self) module
    for directions on where in your package to store your static data files.
    Widgets must either have a `content` property or an `image` property.

  @prop panel {panel}
    A `Panel` to open when the user clicks on the widget.  See the
    [`panel`](#module/jetpack-core/panel) module for more information about the
    `Panel` objects to which this option can be set and the `reddit-panel`
    example add-on for an example of using this option.  Note: If you also
    specify an `onClick` callback function, it will be called instead of the
    panel being opened.  However, you can then show the panel from the `onClick`
    callback function by calling `panel.show()`.

  @prop [width] {integer}
    Optional width in pixels of the widget. This property can be updated after
    the widget has been created, to resize it. If not given, a default width is
    used.

  @prop [onClick] {callback}
    An optional function to be called when the widget is clicked. It is called
    as `onClick(event)`. `event` is the standard DOM event object.

  @prop [onLoad] {callback}
    An optional function to be called when the widget's content is loaded. If
    the content is HTML then the `onReady` event is recommended, as it provides
    earlier access. It is called as `onLoad(event)`. `event` is the standard DOM
    event object.

  @prop [onMouseover] {callback}
    An optional function to be called when the user passes the mouse over the
    widget. It is called as `onClick(event)`. `event` is the standard DOM event
    object.

  @prop [onMouseout] {callback}
    An optional function to be called when the mouse is no longer over the
    widget. It is called as `onClick(event)`. `event` is the standard DOM event
    object.

  @prop [onReady] {callback}
    An optional function to be called when widget content that is HTML is
    loaded. If the widget's content is an image then use the `onLoad` event
    instead. It is called as `onReady(event)`. `event` is the standard DOM event
    object.
</api>

## Functions ##

<api name="add">
@function
  Adds a widget to the bar.

@param widget {Widget}
  Widget to be added.
</api>


<api name="remove">
@function
  Removes a widget from the bar.

@param Widget {Widget}
  Widget to be removed.
</api>

## Examples ##

    var widgets = require("widget");

    // A basic click-able image widget.
    widgets.add(widgets.Widget({
      label: "Widget with an image and a click handler",
      image: "http://www.google.com/favicon.ico",
      onClick: function(e) e.view.content.location = "http://www.google.com"
    }));

    // A widget that changes display on mouseover.
    widgets.add(widgets.Widget({
      label: "Widget with changing image on mouseover",
      image: "http://www.yahoo.com/favicon.ico",
      onMouseover: function(e) {
        e.target.src = "http://www.bing.com/favicon.ico";
      },
      onMouseout: function(e) {
        e.target.src = this.content;
      }
    }));

    // A widget that updates content on a timer.
    widgets.add(widgets.Widget({
      label: "Widget that updates content on a timer",
      content: "0",
      onReady: function(e) {
        if (!this.timer) {
          var self = this;
          this.timer = require("timer").setInterval(function() {
            self.content++;
          }, 2000);
        }
      }
    }));

    // A widget that loads a random Flickr photo every 5 minutes.
    widgets.add(widgets.Widget({
      label: "Random Flickr Photo Widget",
      content: "http://www.flickr.com/explore/",
      onReady: function(e) {
        var imgNode = e.target.querySelector(".pc_img");
        this.content = imgNode.src;
      },
      onLoad: function(e) {
        var self = this;
        require("timer").setTimeout(function() {
          self.content = "http://www.flickr.com/explore/";
        }, (5 * 60 * 1000));
      },
      onClick: function(e) {
        e.view.content.location = this.content
      }
    }));

    // A widget created with a specified width, that grows.
    widgets.add(widgets.Widget({
      label: "Wide widget that grows wider on a timer",
      content: "I'm getting longer.",
      width: 50,
      onReady: function(e) {
        if (!this.timer) {
          var self = this;
          this.timer = require("timer").setInterval(function() {
            self.width += 10;
          }, 1000);
        }
      }
    }));
