const {Cc,Ci,Cm,Cr,Cu} = require("chrome");

const path = require("path"),
        fs = require("fs");

/* Load JS Ctypes Javascript module */
ctypes = {};
Cu.import("resource://gre/modules/ctypes.jsm", ctypes);
ctypes = ctypes.ctypes;

exports.getString = function() {
    var curPath = require("url").toFilename(__url__);
    var pathToLib = undefined;
    [ "libmylib.so", "libmylib.dylib", "mylib.dll" ].forEach(function(x) {
        var candidate = path.join(path.dirname(curPath), x);
        if (fs.exists(candidate)) pathToLib = candidate;
        console.log("looking for candidate: " + candidate);
    });
    if (!pathToLib) throw "cannot find compiled library.  boo.";

    let lib = ctypes.open(pathToLib);
    let getStr = lib.declare("gettaStringFromNativeCode",
                             ctypes.default_abi,
                             ctypes.char.ptr);
    let rv = getStr().readString();
    lib.close();
    return rv;
};
