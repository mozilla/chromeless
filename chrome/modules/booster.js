(function(global) {
   const Cc = Components.classes;
   const Ci = Components.interfaces;
   const Cu = Components.utils;

   var exports = new Object();

   exports.SandboxFactory = function SandboxFactory() {
     this._defaultPrincipal = Cc['@mozilla.org/systemprincipal;1']
                              .createInstance(Ci.nsIPrincipal);
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
         module = self._fs.resolveModule(rootDir, module);
         if (!module)
           throw new Error('Module "' + module + '" not found');
         if (!(module in self._modules)) {
           var options = self._fs.getFile(module);
           if (options.filename === undefined)
             options.filename = module;

           var exports = new Object();
           var sandbox = self._sandboxFactory.createSandbox(options);
           for (name in self._globals)
             sandbox.defineProperty(name, self._globals[name]);
           sandbox.defineProperty('require', self._makeRequire(module));
           sandbox.defineProperty('exports', exports);
           self._modules[module] = exports;
           sandbox.evaluate(options);
         }
         return self._modules[module];
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
       if (typeof(root) != 'string')
         throw new Error('Expected string for root');
       this._root = root;
   };

   exports.LocalFileSystem.prototype = {
     resolveModule: function resolveModule(base, path) {

     },
     getFile: function getFile(path) {

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
