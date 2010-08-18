const widgets = require("widget");
const panels = require("panel");
const data = require("self").data;

widgets.add(widgets.Widget({
  label: "Reddit",
  image: "http://www.reddit.com/static/favicon.ico",
  panel: panels.Panel({
    width: 240,
    height: 320,
    contentURL: "http://www.reddit.com/.mobile?keep_extension=True",
    contentScriptURL: [data.url("jquery-1.4.2.min.js"), data.url("panel.js")],
    contentScriptWhen: "ready",
    onMessage: function(message, callback) {
      require("tab-browser").addTab(message);
    }
  })
}));
