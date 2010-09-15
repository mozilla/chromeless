// This is a content script.  It executes inside the context of the Reddit page
// loaded into the panel and has access to that page's window object and other
// global objects (although the page does not have access to globals defined by
// this script unless they are explicitly attached to the window object).
//
// This content script is injected into the context of the Reddit page
// by the Panel API, which is accessed by the main add-on script in lib/main.js.
// See that script for more information about how the panel is created.

$(window).click(function (event) {
  var t = event.target;

  // Don't intercept the click if it isn't on a link.
  if (t.nodeName != "A")
    return;

  // Don't intercept the click if it was on one of the links in the header
  // or next/previous footer, since those links should load in the panel itself.
  if ($(t).parents('#header').length || $(t).parents('.nextprev').length)
    return;

  // Intercept the click, passing it to the addon, which will load it in a tab.
  event.stopPropagation();
  event.preventDefault();
  postMessage(t.toString());
});
