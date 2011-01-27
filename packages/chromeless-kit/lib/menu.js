/**
 * Allows one to interact with the application menu.  Note that this menu
 * is platform specific.  On OSX the menu appears in the top bar as is
 * typical for OSX applications.  On other platforms the menu appears
 * as a toolbar underneath the application's titlebar.
 *
 * Menus are specified as simple data structures.
 */

var menu = [ "File", "Edit", "View", "History", "Bookmarks" ];

var windows = require("chromeless-sandbox-window");

function updateXULMenus(w) {
  console.log("updating menus for browser");
  var menuBar = w.document.getElementById("theMenuBar");

  // clear out existing kiddies
  while (menuBar.firstChild) menuBar.removeChild(menuBar.firstChild);

  // now add new kiddies
  for (var i in menu) {
    var m = w.document.createElement("menu");
    m.setAttribute('label', menu[i]);
    var mp = w.document.createElement("menupopup");
    m.appendChild(mp);
    menuBar.appendChild(m);
    console.log(menu[i]);
  }
}

exports.set = function(menuData) {
  console.log("set called!");
  menu = menuData;
  for (w in windows.AllWindows) {
    var browser = windows.AllWindows[w]._window;
    updateXULMenus(browser);
  }
};

