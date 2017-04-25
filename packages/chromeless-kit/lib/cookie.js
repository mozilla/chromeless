const {Cc, Ci} = require("chrome");
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

let cookieManager = Cc["@mozilla.org/cookiemanager;1"].
                        getService(Ci.nsICookieManager);


exports.remove = function( host, name, path, blocked)
{
    cookieManager.remove(host, name, path, blocked);
};
exports.removeAll = function()
{
    cookieManager.removeAll();
};
exports.getAllCookies = function() {
    var cookies = [],
        enumerator = cookieManager.enumerator;
    while(enumerator.hasMoreElements()) {
        cookies.push(enumerator.getNext().QueryInterface(Ci.nsICookie));
    }
    return cookies;
};