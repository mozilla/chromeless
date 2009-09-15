(function(global) {
   const Cc = Components.classes;
   const Ci = Components.interfaces;
   const Cu = Components.utils;
   const Cr = Components.results;

   var exports = new Object();

   var ios = Cc['@mozilla.org/network/io-service;1']
             .getService(Ci.nsIIOService);

   // The base URI to we use when we're given relative URLs, if any.
   var baseURI = null;
   if (global.window)
     baseURI = ios.newURI(global.location.href, null, null);
   exports.baseURI = baseURI;

   exports.SandboxFactory = function SandboxFactory(defaultPrincipal) {
     if (defaultPrincipal === undefined)
       // By default, use a principal with limited privileges.
       defaultPrincipal = "http://www.mozilla.org";
     if (defaultPrincipal == "system")
       defaultPrincipal = Cc["@mozilla.org/systemprincipal;1"]
                          .createInstance(Ci.nsIPrincipal);
     this._defaultPrincipal = defaultPrincipal;
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
           if (typeof(options) == 'string')
             options = {contents: options};
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
     if (options.fs === undefined) {
       var rootPath = options.rootPath ? options.rootPath : null;
       if (!rootPath && !baseURI)
         throw new Error("Need a root path for module filesystem");
       var fsRoot = ios.newURI(rootPath, null, baseURI);
       options.fs = new exports.LocalFileSystem(fsRoot);
     }
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

     require: function require(module) {
       return (this._makeRequire(null))(module);
     },

     runScript: function runScript(options) {
       if (typeof(options) == 'string')
         options = {contents: options};
       options = {__proto__: options};
       var sandbox = this._sandboxFactory.createSandbox(options);
       for (name in this._globals)
         sandbox.defineProperty(name, this._globals[name]);
       sandbox.defineProperty('require', this._makeRequire(null));
       return sandbox.evaluate(options);
     }
   };

   exports.LocalFileSystem = function LocalFileSystem(root) {
     if (typeof(root) == 'string')
       root = ios.newURI(root, null, baseURI);
     if (root instanceof Ci.nsIFile)
       root = ios.newFileURI(root);
     if (!(root instanceof Ci.nsIURI))
       throw new Error('Expected nsIFile, nsIURI, or string for root');

     // TODO: This feels hacky, and like there will be edge cases.
     var rootDir = root.spec.slice(0, root.spec.lastIndexOf("/") + 1);

     this._rootURI = root;
     this._rootURIDir = rootDir;
   };

   exports.LocalFileSystem.prototype = {
     resolveModule: function resolveModule(base, path) {
       path = path + ".js";

       var baseURI;
       if (!base || path.charAt(0) != '.')
         baseURI = this._rootURI;
       else
         baseURI = ios.newURI(base, null, null);
       var newURI = ios.newURI(path, null, baseURI);
       if (newURI.spec.indexOf(this._rootURIDir) == 0) {
         var channel = ios.newChannelFromURI(newURI);
         try {
           channel.open().close();
         } catch (e if e.result == Cr.NS_ERROR_FILE_NOT_FOUND) {
           return null;
         }
         return newURI.spec;
       }
       return null;
     },
     getFile: function getFile(path) {
       var channel = ios.newChannel(path, null, null);
       var iStream = channel.open();
       var siStream = Cc['@mozilla.org/scriptableinputstream;1']
                      .createInstance(Ci.nsIScriptableInputStream);
       siStream.init(iStream);
       var data = new String();
       data += siStream.read(-1);
       siStream.close();
       iStream.close();
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
