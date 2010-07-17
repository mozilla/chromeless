The `widget` module provides a consistent, unified way for extensions to
expose their user-interface in a way that blends in well with the host
application.

The widgets are displayed on a horizontal bar above the browser status
bar. Expect major changes to the look and feel of the bar, as well as
the location of it, in subsequent releases.

The widget bar can be shown and hidden via the control+shift+U keyboard
shortcut (or cmd+shift+U if on Mac).

## Extended UI

Currently only the small widget view in the bar is supported.
Subsequent releases will allow authors to specify a larger panel
for displaying rich content. You may hook up extended UI via the
supported events, however keep in mind that direct access to the
browser's XUL window DOM, directly or through events, may break
in the very near future, likely in the 0.6 release.

## Permanent vs Transient Widgets

In subsequent releases there may be support for ideas such as "active"
vs "inactive" widgets, or "pinned" widgets, or time-contextual widgets.

Currently the widget author is in charge of managing their widget's
visibility.

## Constructors ##

<tt>widget.**Widget**(*options*)</tt>

Creates a new widget. *options* is an object with
the following keys.  If any option is invalid, an exception is thrown.

<table>
  <tr>
    <td><tt>label</tt></td>
    <td>
      A required string description of the <tt>Widget</tt> used for
      accessibility, title bars, error reporting.
    </td>
  </tr>
  <tr>
    <td><tt>content</tt></td>
    <td>
      An optional string value containing the displayed content of the <tt>Widget</tt>.
      It may contain raw HTML content, or a URL to Web content, or a URL to an image.
      
      Widgets must either have a <tt>content</tt> property or an <tt>image</tt> property.
    </td>
  </tr>
  <tr>
    <td><tt>image</tt></td>
    <td>
      An optional string URL of an image from your package to use
      as the displayed content of the <tt>Widget</tt>.

      See the `self` module for directions on where in your package to store
      your static data files.

      Widgets must either have a <tt>content</tt> property or an <tt>image</tt> property.
    </td>
  </tr>
  <tr>
    <td><tt>width</tt></td>
    <td>
      Width in pixels of the widget. This property can be updated after
      the widget has been created, to resize it.
    </td>
  </tr>
  <tr>
    <td><tt>onClick</tt></td>
    <td>
      An optional function to be called when the <tt>Widget</tt> is clicked.
      It is called as <tt>onClick(<em>event</em>)</tt>. <em>event</em> is the 
      standard DOM event object.
    </td>
  </tr>
  <tr>
    <td><tt>onLoad</tt></td>
    <td>
      An optional function to be called when <tt>Widget</tt> content
      is loaded. If the <tt>Widget</tt>'s content is HTML
      then the <tt>onReady</tt> event is recommended, as it provides
      earlier access.
      
      It is called as <tt>onLoad(<em>event</em>)</tt>. <em>event</em>
      is the standard DOM event object.
    </td>
  </tr> 
  <tr>
    <td><tt>onMouseover</tt></td>
    <td>
      An optional function to be called when the user passes the mouse
      over the <tt>Widget</tt>.
      
      It is called as <tt>onClick(<em>event</em>)</tt>. <em>event</em>
      is the standard DOM event object.
    </td>
  </tr>
  <tr>
    <td><tt>onMouseout</tt></td>
    <td>
      An optional function to be called when the mouse is no longer
      over the <tt>Widget</tt>.
      
      It is called as <tt>onClick(<em>event</em>)</tt>. <em>event</em>
      is the standard DOM event object.
    </td>
  </tr>
  <tr>
    <td><tt>onReady</tt></td>
    <td>
      An optional function to be called when <tt>Widget</tt> content
      that is HTML is loaded. If the <tt>Widget</tt>'s content is an image
      then use the <tt>onLoad</tt> event instead.
      
      It is called as <tt>onReady(<em>event</em>)</tt>. <em>event</em>
      is the standard DOM event object.
    </td>
  </tr> 
</table>

## Functions ##

<tt>widget.**add**(*Widget*)</tt>

Adds a widget to the bar.

<tt>widget.**remove**(*Widget*)</tt>

Removes a widget from the bar.

## Examples ##

    const widgets = require("widget");

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
