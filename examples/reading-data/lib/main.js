var self = require("self");
var panels = require("panel");
var widgets = require("widget");

function replaceMom(html) {
  return html.replace("World", "Mom");
}
exports.replaceMom = replaceMom;

exports.main = function(options, callbacks) {
  console.log("My ID is " + self.id);

  // Load the sample HTML into a string.
  var helloHTML = self.data.load("sample.html");

  // Let's now modify it...
  helloHTML = replaceMom(helloHTML);

  // ... and then create a panel that displays it.
  var myPanel = panels.Panel({
    contentURL: "data:text/html," + helloHTML
  });

  // Load the URL of the sample image.
  var iconURL = self.data.url("mom.png");

  // Create a widget that displays the image.  We'll attach the panel to it.
  // When you click the widget, the panel will pop up.
  var myWidget = widgets.Widget({
    label: "Mom",
    image: iconURL,
    panel: myPanel
  });
  widgets.add(myWidget);

  // If you run cfx with --static-args='{"quitWhenDone":true}' this program
  // will automatically quit Firefox when it's done.
  if (options.staticArgs.quitWhenDone)
    callbacks.quit();
}
