/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Jetpack.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

(function(global) {
   const Cc = Components.classes;
   const Ci = Components.interfaces;
   const Cu = Components.utils;
   const Cr = Components.results;

   var exports = {};

   // Load the SecurableModule prerequisite.
   var securableModule;
   var myURI = Components.stack.filename.split(" -> ").slice(-1)[0];

   if (global.require)
     // We're being loaded in a SecurableModule.
     securableModule = require("securable-module");
   else {
     var ios = Cc['@mozilla.org/network/io-service;1']
               .getService(Ci.nsIIOService);
     var securableModuleURI = ios.newURI("securable-module.js", null,
                                         ios.newURI(myURI, null, null));
     if (securableModuleURI.scheme == "chrome") {
       // The securable-module module is at a chrome URI, so we can't
       // simply load it via Cu.import(). Let's assume we're in a
       // chrome-privileged document and use mozIJSSubScriptLoader.
       var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
                    .getService(Ci.mozIJSSubScriptLoader);

       // Import the script, don't pollute the global scope.
       securableModule = {__proto__: global};
       loader.loadSubScript(securableModuleURI.spec, securableModule);
       securableModule = securableModule.SecurableModule;
     } else {
       securableModule = {};
       try {
         Cu.import(securableModuleURI.spec, securableModule);
       } catch (e if e.result == Cr.NS_ERROR_ILLEGAL_VALUE) {
         Cu.reportError("Failed to load " + securableModuleURI.spec);
       }
     }
   }

   var localFS = new securableModule.LocalFileSystem(myURI);
   var es5path = localFS.resolveModule(null, "es5");
   var es5code = exports.es5code = localFS.getFile(es5path);

   es5code.filename = es5path;

   function unloadLoader(reason) {
     this.require("unload").send(reason);
   }

   function maybeLoadMainInJetpackProcess(delegate, packaging) {
     return function getModuleExports(basePath, module) {     
       if (module == packaging.options.main) {
         var mainURL = this.fs.resolveModule(basePath, module);
         var mainInfo = packaging.getModuleInfo(mainURL);
         if (!mainInfo.needsChrome) {
           var loader = this;
           return {
             main: function main(options, callbacks) {
               var e10s = loader.require("e10s");
               var process = e10s.AddonProcess();
               loader.console.log("starting main in remote process.");
               process.send("startMain", options.main);
             }
           };
         } else
           return null;
       }
       return (delegate ? delegate.call(this, basePath, module) : null);
     };
   }

   function makeGetModuleExports(delegate) {
     return function getModuleExports(basePath, module) {
       switch (module) {
       case "chrome":
         var chrome = { Cc: Components.classes,
                        Ci: Components.interfaces,
                        Cu: Components.utils,
                        Cr: Components.results,
                        Cm: Components.manager,
                        components: Components };
         return chrome;
       case "parent-loader":
         return this;
       default:
         return (delegate ? delegate.call(this, basePath, module) : null);
       }
     };
   }

   function modifyModuleSandbox(sandbox, options) {
     sandbox.evaluate(es5code);
     var filename = options.filename ? options.filename : null;
     sandbox.defineProperty("__url__", filename);
   }

   function makeManifestChecker(packaging) {
     var mc = {
       _allow: function _allow(loader, basePath, module, module_info) {
         if (!basePath) {
           return true; /* top-level import */
         }
         let mi = packaging.getModuleInfo(basePath);
         if (mi.needsChrome)
           /* The module requires chrome, it can import whatever it 
            * wants. */
           return true;
         if (!mi.dependencies) {
           /* the parent isn't in the manifest: we know nothing about it */
         } else {
           if (mi.dependencies[module]) {
             /* they're on the list: the require() is allowed, but let's
                check that they're loading the right thing */
             let parent_mi = packaging.getModuleInfo(basePath);
             // parent_mi is the parent, who invoked require()
             // module_info is the child, the output of resolveModule
             var should_load = parent_mi.dependencies[module].url;
             var is_loading = module_info.filename;
             if (!should_load) {
               /* the linker wasn't able to find the target module when the
               XPI was constructed. */
               loader.console.warn("require("+ module +") (called from " +
                                   basePath + ") is loading " + is_loading +
                                   ", but the manifest couldn't find it");
             } else if (should_load != is_loading) {
               loader.console.warn("require(" + module + ") (called from " +
                                   basePath + ") is loading " + is_loading +
                                   ", but is supposed to be loading " + 
                                   should_load);
               //return false; // enable this in 0.9
             }
             return true; 
           }
         }
         loader.console.warn("undeclared require(" + module + 
                             ") called from " + basePath);
         //return false;  // enable this in 0.9
         return true;
       },
       allowEval: function allowEval(loader, basePath, module, module_info) {
         return this._allow(loader, basePath, module, module_info);
       },

       allowImport: function allowImport(loader, basePath, module, module_info,
                                         exports) {
         if (module == "chrome") {
           let parent_mi = packaging.getModuleInfo(basePath);
           if (parent_mi.needsChrome)
             return true; /* chrome is on the list, allow it */
           loader.console.warn("undeclared require(chrome) called from " +
                               basePath);
           //return false;  // enable this in 0.9
           return true;
         }

         return this._allow(loader, basePath, module, module_info);
       }
     };
     return mc;
   }

   var Loader = exports.Loader = function Loader(options) {
     var globals = {};

     if (options.globals)
       for (var name in options.globals)
         globals[name] = options.globals[name];

     if (options.console)
       globals.console = options.console;
     if (options.memory)
       globals.memory = options.memory;

     if ('modules' in options)
       throw new Error('options.modules is no longer supported');

     var getModuleExports = makeGetModuleExports(options.getModuleExports);

     var manifestChecker = undefined;
     if (options.packaging) {
       manifestChecker = makeManifestChecker(options.packaging);
       if (options.packaging.enableE10s)
         getModuleExports = maybeLoadMainInJetpackProcess(getModuleExports,
                                                          options.packaging);
     }

     var loaderOptions = {rootPath: options.rootPath,
                          rootPaths: options.rootPaths,
                          fs: options.fs,
                          defaultPrincipal: "system",
                          globals: globals,
                          modifyModuleSandbox: modifyModuleSandbox,
                          securityPolicy: manifestChecker,
                          getModuleExports: getModuleExports};

     var loader = new securableModule.Loader(loaderOptions);

     if (!globals.console) {
       var console = loader.require("plain-text-console");
       globals.console = new console.PlainTextConsole(options.print);
     }
     if (!globals.memory)
       globals.memory = loader.require("memory");

     loader.console = globals.console;
     loader.memory = globals.memory;
     loader.unload = unloadLoader;

     return loader;
   };

   if (global.window) {
     // We're being loaded in a chrome window, or a web page with
     // UniversalXPConnect privileges.
     global.Cuddlefish = exports;
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
