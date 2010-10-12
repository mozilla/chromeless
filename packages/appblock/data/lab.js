var gLoader = null;

function clearConsole() {
  document.getElementById("console").textContent = "";
}

function printToConsole(message) {
  document.getElementById("console").textContent += message;
}

function maybeUnloadLoader() {
  if (gLoader) {
    gLoader.unload();
    gLoader = null;
  }
}

function runCode() {
  maybeUnloadLoader();
  clearConsole();

  if (!window.packaging)
    throw new Error("window.packaging is not available");

  var jsm = {};
  Components.utils.import(packaging.options.loader, jsm);

  gLoader = new jsm.Loader({rootPaths: packaging.options.rootPaths.slice(),
                            print: printToConsole,
                            globals: {packaging: packaging}});

  try {
    var code = document.getElementById("code").value;
    if (code)
      gLoader.runScript(code);
  } catch (e) {
    gLoader.console.exception(e);
  }
}

window.addEventListener("unload", maybeUnloadLoader, false);
