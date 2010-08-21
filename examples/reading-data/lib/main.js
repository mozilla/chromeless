var self = require("self");
var panels = require("panel");
var widgets = require("widget");

function replace_mom(html) {
    return html.replace("World", "Mom");
}
exports.replace_mom = replace_mom;

exports.main = function(options, callbacks) {
    console.log("My ID is " + self.id);

    // Load the sample HTML into a string.
    var hello_html = self.data.load("sample.html");

    // Let's now modify it...
    hello_html = replace_mom(hello_html);

    // ... and then create a panel that displays it.
    var my_panel = panels.Panel({
        contentURL: "data:text/html," + hello_html
    });

    // Load the URL of the sample image.
    var icon_url = self.data.url("mom.png");

    // Create a widget that displays the image.  We'll attach the panel to it.
    // When you click the widget, the panel will pop up.
    var my_widget = widgets.Widget({
        label: "Mom",
        image: icon_url,
        panel: my_panel
    });
    widgets.add(my_widget);
}
