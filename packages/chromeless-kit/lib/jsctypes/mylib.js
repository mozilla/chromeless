const {Cc,Ci,Cm,Cr,Cu} = require("chrome");

const path = require("path");

/* Load JS Ctypes Javascript module */
ctypes = {};
Cu.import("resource://gre/modules/ctypes.jsm", ctypes);
ctypes = ctypes.ctypes;

exports.getString = function() {
    let pathToLib = require("url").toFilename(__url__);
    pathToLib = path.join(path.dirname(pathToLib), 'libmylib.dylib');
    let lib = ctypes.open(pathToLib);
    let getStr = lib.declare("gettaStringFromNativeCode",
                             ctypes.default_abi,
                             ctypes.char.ptr);
    let rv = getStr().readString();
    lib.close();
    return rv;
};
