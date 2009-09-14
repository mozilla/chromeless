(function(global) {
   const Cc = Components.classes;
   const Ci = Components.interfaces;
   const Cu = Components.utils;

   var exports = new Object();

   exports.SandboxFactory = function SandboxFactory() {
     // By default, use a principal with limited privileges.
     this._defaultPrincipal = "http://www.mozilla.org";
   },

   exports.SandboxFactory.prototype = {
     createSandbox: function createSandbox(options) {
       var principal = this._defaultPrincipal;
       if (options.principal)
         principal = options.principal;

       return {
         _sandbox: new Cu.Sandbox(principal),
         defineProperty: function defineProperty(name, value) {
           this._sandbox[name] = value;
         },
         evaluate: function evaluate(options) {
           options = {__proto__: options};
           if (typeof(options.contents) != 'string')
             throw new Error('Expected string for options.contents');
           if (options.lineno === undefined)
             options.lineno = 1;
           if (options.jsVersion === undefined)
             options.jsVersion = "1.8";
           if (typeof(options.filename) != 'string')
             options.filename = '<string>';
           return Cu.evalInSandbox(options.contents,
                                   this._sandbox,
                                   options.jsVersion,
                                   options.filename,
                                   options.lineno);
         }
       };
     }
   };

   exports.Loader = function Loader(options) {
     options = {__proto__: options};
     if (options.fs === undefined)
       throw new Error('Must pass options.fs');
     if (options.sandboxFactory === undefined)
       options.sandboxFactory = new exports.SandboxFactory();
     if (options.modules === undefined)
       options.modules = {};
     if (options.globals === undefined)
       options.globals = {};

     this._fs = options.fs;
     this._sandboxFactory = options.sandboxFactory;
     this._modules = options.modules;
     this._globals = options.globals;
   };

   exports.Loader.prototype = {
     _makeRequire: function _makeRequire(rootDir) {
       var self = this;

       return function require(module) {
         var path = self._fs.resolveModule(rootDir, module);
         if (!path)
           throw new Error('Module "' + module + '" not found');
         if (!(path in self._modules)) {
           var options = self._fs.getFile(path);
           if (options.filename === undefined)
             options.filename = path;

           var exports = new Object();
           var sandbox = self._sandboxFactory.createSandbox(options);
           for (name in self._globals)
             sandbox.defineProperty(name, self._globals[name]);
           sandbox.defineProperty('require', self._makeRequire(path));
           sandbox.defineProperty('exports', exports);
           self._modules[path] = exports;
           sandbox.evaluate(options);
         }
         return self._modules[path];
       };
     },

     runScript: function runScript(options) {
       options = {__proto__: options};
       var sandbox = this._sandboxFactory.createSandbox(options);
       for (name in this._globals)
         sandbox.defineProperty(name, this._globals[name]);
       sandbox.defineProperty('require', this._makeRequire(null));
       return sandbox.evaluate(options);
     }
   };

   exports.LocalFileSystem = function LocalFileSystem(root) {
     if (!(root instanceof Ci.nsIFile))
       throw new Error('Expected nsIFile for root');
     this._rootFile = root;
     this._rootURI = this._ios.newFileURI(root);
   };

   exports.LocalFileSystem.prototype = {
     get _ios() {
       return Cc['@mozilla.org/network/io-service;1']
              .getService(Ci.nsIIOService);
     },
     resolveModule: function resolveModule(base, path) {
       path = path + ".js";

       var baseURI;
       var baseFile;
       if (!base || path.charAt(0) != '.') {
         baseURI = this._rootURI;
         baseFile = this._rootFile;
       } else {
         baseURI = this._ios.newURI(base, null, null);
         baseFile = baseURI.QueryInterface(Ci.nsIFileURL).file;
       }
       var newURI = this._ios.newURI(path, null, baseURI);
       var newFile = newURI.QueryInterface(Ci.nsIFileURL).file;
       if (newFile.exists() &&
           newFile.isFile() &&
           newURI.spec.indexOf(this._rootURI.spec) == 0)
         return newURI.spec;
       return null;
     },
     getFile: function getFile(path) {
       var pathURI = this._ios.newURI(path, null, null);
       var pathFile = pathURI.QueryInterface(Ci.nsIFileURL).file;
       var data = new String();
       var fiStream = Cc['@mozilla.org/network/file-input-stream;1']
                      .createInstance(Ci.nsIFileInputStream);
       var siStream = Cc['@mozilla.org/scriptableinputstream;1']
                      .createInstance(Ci.nsIScriptableInputStream);
       fiStream.init(pathFile, 1, 0, false);
       siStream.init(fiStream);
       data += siStream.read(-1);
       siStream.close();
       fiStream.close();
       return {contents: data};
     }
   };

   if (global.window) {
     // We're being loaded in a chrome window, or a web page with
     // UniversalXPConnect privileges.
     global.SecurableModule = exports;
   } else if (global.exports) {
     // We're being loaded in a SecurableModule.
     for (name in exports) {
       global.exports[name] = exports[name];
     }
   } else {
     // We're being loaded in a JS module.
     global.EXPORTED_SYMBOLS = [];
     for (name in exports) {
       global.EXPORTED_SYMBOLS.push(name);
       global[name] = exports[name];
     }
   }
 })(this);
