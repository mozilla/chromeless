
let file = require("file");
let url = require("url");
let traceback = require("traceback");

let packageData = packaging.options.packageData;
let resourcePackages = packaging.options.resourcePackages;
let id = packaging.jetpackID;
exports.id = id;

// what URI was our Nth parent stack frame loaded from? We use this to
// determine "who" has called our load() or url() methods. This is an
// unpleasant hack that needs to be replaced: the real question to ask is
// "who" did the require("self") call. The "self" module should not be a
// singleton: each invocation of require() could get a separate one. I
// *think* the right level of granularity is that each package gets a
// separate instance: all packages in an XPI bundle will share the same
// ID, but each package will have a separate resource/data directory. So
// package1.moduleA and package1.moduleB will both get the same data when
// they do require("self").data.load("foo.txt"), but package2.moduleC
// will get something different for the same code.

// The biggest problem with using stack introspection at the time of
// load()/url() is confusion: the module is allowed to pass their
// require("self").data object to someone else, with the expectation that
// the recipient is going to get the same data they would have gotten.
// The second biggest problem is confused deputy.

function caller(levels) {
    let callerInfo = traceback.get().slice(-2-levels)[0];
    let info = url.URL(callerInfo.filename);
    let pkgName = resourcePackages[info.host];
    // pkgName is "my-package", suitable for lookup in options["packageData"]
    return pkgName;
}

function getURL(name, level) {
    let pkgName = caller(level+1);
    // packageData[] = "resource://jetpack-JID-PKGNAME-data/"
    if (pkgName in packageData)
        return url.URL(name, packageData[pkgName]).toString();
    throw new Error("No data for package " + pkgName);
}

exports.data = {
    load: function load(name) {
        let data_url = getURL(name, 1);
        let fn = url.toFilename(data_url);
        let data = file.read(fn);
        return data;
    },
    url: function url(name) { return getURL(name, 1); }
}

