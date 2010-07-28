var self = require("self");

function replace_mom(html) {
    return html.replace("World", "Mom");
}
exports.replace_mom = replace_mom;

exports.main = function(options, callbacks) {
    console.log("My ID is " + self.id);

    var hello_html = self.data.load("sample.html");
    // we could now modify this sample data and then display it in a Panel or
    // other UI element. Note that the 0.7pre SDK release does not have Panel
    // yet.. sorry! Watch JEP103 for changes.
    hello_html = replace_mom(hello_html);
    //let p = new Panel(content: hello_html).show();

    // or we can pass a URL directly
    var icon_url = self.data.url("mom.png");
    hello_html.replace("Mom", '<img source="'+icon_url+'">');
    //let p = new Panel(content: hello_html).show();

    callbacks.quit();
}
