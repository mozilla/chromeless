#Template used by main.js
MAIN_JS = '''\
const widgets = require("widget");
const tabs = require("tabs");

var widget = widgets.Widget({
  label: "Mozilla website",
  contentURL: "http://www.mozilla.org/favicon.ico",
  onClick: function() {
    tabs.open("http://www.mozilla.org/");
  }
});

console.log("The add-on is running.");
'''

#Template used by test-main.js
TEST_MAIN_JS = '''\
const main = require("main");

exports.test_test_run = function(test) {
  test.pass("Unit test running!");
};

exports.test_id = function(test) {
  test.assert(require("self").id.length > 0);
};

exports.test_url = function(test) {
  require("request").Request({
    url: "http://www.mozilla.org/",
    onComplete: function(response) {
      test.assertEqual(response.statusText, "OK");
      test.done();
    }
  }).get();
  test.waitUntilDone(20000);
};

exports.test_open_tab = function(test) {
  const tabs = require("tabs");
  tabs.open({
    url: "http://www.mozilla.org/",
    onReady: function(tab) {
      test.assertEqual(tab.url, "http://www.mozilla.org/");
      test.done();
    }
  });
  test.waitUntilDone(20000);
};
'''

#Template used by main.md
MAIN_JS_DOC = '''\
The main module is a program that creates a widget.  When a user clicks on
the widget, the program loads the mozilla.org website in a new tab.
'''

#Template used by README.md
README_DOC = '''\
This is the %(name)s add-on.  It contains:

* A program (lib/main.js).
* A few tests.
* Some meager documentation.
'''

#Template used by package.json
PACKAGE_JSON = '''\
{
  "name": "%(name)s",
  "fullName": "%(name)s",
  "description": "a basic add-on",
  "author": "",
  "license": "MPL 1.1/GPL 2.0/LGPL 2.1",
  "version": "0.1"
}
'''
