(function(global) {
   const Cc = Components.classes;
   const Ci = Components.interfaces;
   const Cu = Components.utils;

   var exports = {
     Loader: function Loader(options) {
       options = {__proto__: options};
       if (options.fs === undefined)
         throw new Error('Must pass options.fs');
       if (options.defaultPrincipal === undefined)
         options.defaultPrincipal = Cc['@mozilla.org/systemprincipal;1']
                                    .createInstance(Ci.nsIPrincipal);
       if (options.modules === undefined)
         options.modules = {};
       if (options.globals === undefined)
         options.globals = {};

       this._fs = options.fs;
       this._modules = options.modules;
       this._globals = options.globals;
       this._defaultPrincipal = options.defaultPrincipal;
     }
   };

   exports.Loader.prototype = {
     _makeRequire: function _makeRequire(rootDir) {
       var self = this;

       return function require(module) {
         module = self._fs.resolveModule(rootDir, module);
         if (!module)
           throw new Error('Module "' + module + '" not found');
         if (!(module in self._modules)) {
           var principal = self._defaultPrincipal;

           var options = self._fs.getFile(module);
           if (options.filename === undefined)
             options.filename = module;
           if (options.lineno === undefined)
             options.lineno = 1;
           if (options.principal)
             principal = options.principal;

           var sandbox = Cu.Sandbox(principal);
           for (name in self._globals)
             sandbox[name] = self._globals[name];
           sandbox.require = self._makeRequire(module);
           sandbox.exports = new Object();
           self._modules[module] = sandbox.exports;
           Cu.evalInSandbox(options.contents,
                            sandbox,
                            '1.8',
                            options.filename,
                            options.lineno);
         }
         return self._modules[module];
       };
     },

     runScript: function runScript(options) {
       options = {__proto__: options};
       if (typeof(options.contents) != 'string')
         throw new Error('Expected string for options.contents');
       if (typeof(options.filename) != 'string')
         options.filename = '<string>';
       if (options.lineno === undefined)
         options.lineno = 1;

       var principal = this._defaultPrincipal;
       if (options.principal)
         principal = options.principal;

       var sandbox = Cu.Sandbox(principal);
       for (name in this._globals)
         sandbox[name] = this._globals[name];
       sandbox.require = this._makeRequire(null);
       Cu.evalInSandbox(options.contents,
                        sandbox,
                        '1.8',
                        options.filename,
                        options.lineno);
     }
   };

   if (global.window) {
     // We're being loaded in a chrome window, or a web page with
     // UniversalXPConnect privileges.
     global.SecurableModuleLoader = exports;
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
