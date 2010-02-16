function startApp(jQuery, window) {
  var $ = jQuery;
  var document = window.document;

  const NON_BREAKING_HYPHEN = "\u2011";
  const IDLE_PING_DELAY = 500;

  function getModules(fileStruct) {
    var modules = [];
    for (var name in fileStruct) {
      if (name.match(/.*\.js$/))
        modules.push(name.slice(0, -3).replace(/-/g, NON_BREAKING_HYPHEN));
      else if (!('size' in fileStruct[name])) {
        var subModules = getModules(fileStruct[name]);
        subModules.forEach(
          function(subModule) {
            modules.push(name + "/" + subModule);
          });
      }
    }
    return modules;
  }

  function makeDirTree(fileStruct) {
    var info = $('<div class="directory"></div>');
    for (name in fileStruct) {
      if ('size' in fileStruct[name]) {
        var entry = $('<div class="file"></div>');
        entry.text(name);
        info.append(entry);
      } else {
        var entry = $('<div class="file"></div>');
        entry.text(name + "/");
        info.append(entry);
        info.append(makeDirTree(fileStruct[name]));
      }
    }
    return info;
  }

  function showPackageInfo(pkg) {
    var entry = $("#templates .package-detail").clone();
    entry.find(".name").text(pkg.name);
    entry.find(".files").append(makeDirTree(pkg.files));
    $("#middle-column").empty().append(entry);
  }

  function processPackages(packages) {
    var sortedPackages = [];
    for (name in packages)
      sortedPackages.push(name);
    sortedPackages.sort();
    sortedPackages.forEach(
      function(name) {
        var pkg = packages[name];
        var entry = $("#templates .entry").clone();
        entry.find(".name").text(pkg.name);
        entry.find(".name").click(function() { showPackageInfo(pkg); });
        entry.find(".description").text(pkg.description);
        var libs = [];
        if (pkg.lib) {
          pkg.lib.forEach(
            function(libDir) {
              var modules = getModules(pkg.files[libDir]);
              libs = libs.concat(modules);
            });
        }
        var modules = entry.find(".modules");
        libs.sort();
        libs.forEach(
          function(moduleName) {
            var module = $('<li class="module"></li>');
            module.text(moduleName);
            modules.append(module);
            modules.append(document.createTextNode(' '));
          });
        $("#left-column").append(entry);
      });
  }

  function sendIdlePing() {
    jQuery.ajax({url:"/api/idle",
                 success: scheduleNextIdlePing,
                 error: scheduleNextIdlePing});
  }

  function scheduleNextIdlePing() {
    window.setTimeout(sendIdlePing, IDLE_PING_DELAY);
  }

  scheduleNextIdlePing();
  jQuery.getJSON("/api/packages", processPackages);
}

$(window).ready(function() { startApp(jQuery, window); });
