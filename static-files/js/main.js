function startApp(jQuery, window) {
  var $ = jQuery;
  var document = window.document;
  var packages = null;
  var currentHash = "";

  const NON_BREAKING_HYPHEN = "\u2011";
  const IDLE_PING_DELAY = 500;
  const CHECK_HASH_DELAY = 100;

  function checkHash() {
    if (window.location.hash != currentHash) {
      currentHash = window.location.hash;
      if (currentHash.length > 1)
        onHash(currentHash.slice(1));
      else
        onHash(null);
    }
  }

  function setHash(hash) {
    if (hash && hash.length)
      window.location.hash = "#" + hash;
    else
      window.location.hash = "";
    checkHash();
  }

  function onHash(hash) {
    if (hash)
      showPackageDetail(hash);
    else
      $("#middle-column").empty();
  }

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

  function getReadmeHtml(pkg, cb) {
    if ('README.md' in pkg.files)
      jQuery.ajax({url: "/api/packages/" + pkg.name + "/README.md",
                   dataType: "text",
                   success: function(text) {
                     var converter = new Showdown.converter();
                     cb(converter.makeHtml(text));
                   }
                  });
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

  function showPackageDetail(name) {
    var pkg = packages[name];
    var entry = $("#templates .package-detail").clone();

    // TODO: Add author info.
    entry.find(".name").text(pkg.name);
    entry.find(".files").append(makeDirTree(pkg.files));
    $("#middle-column").empty().append(entry);
    getReadmeHtml(pkg, function(html) {
                    entry.find(".docs").html(html);
                  });
  }

  function processPackages(packagesJSON) {
    packages = packagesJSON;

    var sortedPackages = [];
    for (name in packages)
      sortedPackages.push(name);
    sortedPackages.sort();
    sortedPackages.forEach(
      function(name) {
        var pkg = packages[name];
        var entry = $("#templates .entry").clone();
        entry.find(".name").text(pkg.name);
        entry.find(".name").click(function() { setHash(pkg.name); });
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
    checkHash();
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
  window.setInterval(checkHash, CHECK_HASH_DELAY);
  jQuery.getJSON("/api/packages", processPackages);
}

$(window).ready(function() { startApp(jQuery, window); });
