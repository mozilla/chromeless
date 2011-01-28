/**
 * Allows one to interact with the application menu.  The display of
 * this menu is platform specific.  On OSX the menu appears in the top
 * bar as is typical for OSX applications.  On other platforms the
 * menu appears as a toolbar underneath the application's titlebar.
 *
 * Menus are specified via a javascript data structre, here's an
 * example:
 *
 *     [
 *       {
 *         label: "File",
 *         children: [
 *           {
 *             label: "New Window",
 *             shortcut: "n",
 *           },
 *           {
 *             icon: "resource://app/icons/new_tab.png",
 *             label: "New Tab",
 *             shortcut: "t"
 *           }
 *         ]
 *       },
 *       {
 *         label: "View",
 *         children: [
 *           {
 *             label: "toolbars",
 *             icon: "resource://app/icons/toolbar.png",
 *             children: [
 *                ...
 *             ]
 *           }
 *         ]
 *       }
 *     ]
 */

const { getTypeOf } = require('api-utils');
const windows = require('chromeless-sandbox-window');

var menu = [  ];

function populateSubMenu(w, node, data, path) {
  const props = [
    {
      name: "label",
      type: "string",
      required: true
    },
    {
      name: "shortcut",
      type: "string",
      required: false
    },
    {
      name: "icon",
      type: "string",
      required: false
    },
    {
      name: "enabled",
      type: "boolean",
      required: false
    },
    {
      name: "children",
      type: "array",
      required: false
    }
  ];

  data.forEach(function (child) {
    // special case for separator
    if (child === 'separator') {
      node.appendChild(w.document.createElement('menuseparator'));
      return;
    }

    if (typeof(child) !== 'object') {
      throw "Items in 'children' array must be objects or the string 'separator'";
    }

    // verify all known keys
    props.forEach(function(spec) {
      if (child[spec.name] != undefined) {
        if (getTypeOf(child[spec.name]) != spec.type) {
          throw "menu item field, '"+spec.name+"' should be of type " +
            spec.type +", is a " + getTypeOf(child[spec.name]);
        }
      } else if (spec.required) {
        throw "menu item missing required field: " + spec.name;
      }
    });

    // verify no unknown keys
    Object.keys(child).forEach(function(k) {
      if (!props.some(function(p) { return (p.name == k) }))
        throw "unsupported key for menuitem: " + k;
    });

    // now switch on interior and leaf nodes differently 
    if (child.children) {
      // verify proper mutual exclusivity
      var offending = ["shortcut","icon","enabled"].filter(function(f) {
        return child[f] != undefined;
      });
      if (offending.length > 0) {
        throw "menuitems with children may not also have: '" +
          offending.join("' nor '") + "'";
      }

      // generate a menu and a menu popup
      var m = w.document.createElement("menu");
      m.className = 'menu-iconic';
      m.setAttribute('label', child.label);
      var mp = w.document.createElement("menupopup");
      m.appendChild(mp);

      // now pass the children array and the menupopup to a recursive function to
      // populate.
      populateSubMenu(w, mp, child.children, path.concat(child.label));
      node.appendChild(m);

    } else {
      // whew, now build it!
      var m = w.document.createElement("menuitem");
      m.addEventListener('command', (function() {
        var _path = path.concat(child.label);
        return function() {
          deliverCommand(_path);
        };
      })(), true);
      m.className = 'menuitem-iconic';
      m.setAttribute('label', child.label);
      if (child.enabled === false) m.disabled = true;
      if (child.shortcut) m.accessKey = child.shortcut.charAt(0);
      if (child.icon) m.image = child.icon;
      node.appendChild(m);
    }
  });
}

function updateXULMenus(w, menuData) {
  if (getTypeOf(menuData) != 'array') {
    throw "menu must be an *array* of objects";
  }

  // we'll not make any changes until the whole menudata
  // structure has been parsed and validated.  This way
  // client error won't leave the menu in an odd state
  var newMenus = [ ];

  // now add new kiddies
  for (var i in menuData) {
    var mo = menuData[i];

    if (getTypeOf(mo) != 'object')
      throw "top level menu items must be objects: arg[" + i + "]";

    const topLevelKeys = ["label", "children"];

    // validate all required fields are present
    topLevelKeys.forEach(function(k) {
      if (mo[k] == undefined)
        throw "toplevel menu object missing '" + k + "' property ";
    });

    // validate only allowed fields are present
    Object.keys(mo).forEach(function(k) {
      if (topLevelKeys.indexOf(k) == -1)
        throw "invalid property in top level object ("+mo.label+"): "+k;
    });

    if (getTypeOf(mo.children) !== 'array')
      throw "'children' property on '"+mo.label+"' must be an array";

    // generate a menu and a menu popup
    var m = w.document.createElement("menu");
    m.className = 'menu-iconic';
    m.setAttribute('label', mo.label);
    var mp = w.document.createElement("menupopup");
    m.appendChild(mp);

    // now pass the children array and the menupopup to a recursive function to
    // populate.
    populateSubMenu(w, mp, mo.children, [ mo.label ]);

    newMenus.push(m);
  }

  // clear out existing kiddies
  var menuBar = w.document.getElementById("theMenuBar");
  while (menuBar.firstChild) menuBar.removeChild(menuBar.firstChild);

  // append new menus
  while (newMenus.length) menuBar.appendChild(newMenus.shift());
}

/**
 * @property {object} appMenu
 * A read/write property containing the application's menu
 */
exports.__defineGetter__("appMenu", function() {
  return menu;
});

exports.__defineSetter__("appMenu", function(menuData) {
  for (w in windows.AllWindows) {
    var browser = windows.AllWindows[w]._window;
    updateXULMenus(browser, menuData);
  }
  menu = menuData;
});

var listeners = {
};

/**
 * Provide a callback that should be invoked when a user
 * selects something from application menus
 */
exports.addListener = function(path, cb) {
  // the one argument form supports omission of the
  // path argument (equivalent to a wildcard)
  if (cb === undefined && typeof(path) === 'function') {
    cb = path;
    path = [ "*" ];
  }

  var curMap = listeners;
  while (path.length > 0) {
    if (curMap[path[0]] == undefined) curMap[path[0]] = {};
    curMap = curMap[path.shift()];
  }
  if (curMap['__listeners__'] == undefined) {
    curMap['__listeners__'] = [];
  }
  curMap['__listeners__'].push(cb);
};


function removeListenerRecurse(curMap, cb) {
  var kids = 0;
  Object.keys(curMap).forEach(function(k) {
    if (k === '__listeners__') return;
    var num = 0;
    if (curMap[k]['__listeners__']) {
      curMap[k]['__listeners__'] =
        curMap[k]['__listeners__'].filter(function(cb2) { return cb != cb2; });
      num += curMap[k]['__listeners__'].length;
    }
    num += removeListenerRecurse(curMap[k], cb);

    if (num === 0) delete curMap[k];
    kids += num;
  });
  return kids;
}

/**
 * remove a listener previously set with 'addListener'
 */
exports.removeListener = function(cb) {
  // start recursion, if there's no children, then clean up
  if (0 == removeListenerRecurse(listeners, cb)) {
    listeners = { };
  }
};

function deliverCommand(path) {
  var curMap = listeners;

  for (var i = 0; i < path.length ; i++) {
    // deliver to all wildcards
    if (curMap['*'] && curMap['*']['__listeners__'])
      curMap['*']['__listeners__'].forEach(function(f) { f(path); });

    if (curMap[path[i]] == undefined) return;
    curMap = curMap[path[i]];
  }
  if (curMap['__listeners__']) {
    curMap['__listeners__'].forEach(function(f) { f(path); });
  }
}