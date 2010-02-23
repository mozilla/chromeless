function startApp(jQuery, window) {
  var $ = jQuery;
  var document = window.document;
  var packages = null;
  var currentHash = "";

  const DEFAULT_HASH = "guide/getting-started";
  const BUGZILLA_SHOW = "https://bugzilla.mozilla.org/show_bug.cgi?id=";
  const BUGZILLA_REGEXP = /bug\s+([0-9]+)/;
  const NON_BREAKING_HYPHEN = "\u2011";
  const IDLE_PING_DELAY = 500;
  const CHECK_HASH_DELAY = 100;

  function checkHash() {
    if (window.location.hash.length <= 1)
      window.location.hash = "#" + DEFAULT_HASH;
    if (window.location.hash != currentHash) {
      currentHash = window.location.hash;
      onHash(currentHash.slice(1));
    }
  }

  function setHash(hash) {
    if (hash && hash.length)
      window.location.hash = "#" + hash;
    else
      window.location.hash = "#" + DEFAULT_HASH;
    checkHash();
  }

  function onHash(hash) {
    var parts = hash.split("/");
    switch (parts[0]) {
    case "package":
      showPackageDetail(parts[1]);
      break;
    case "module":
      var pkgName = parts[1];
      var moduleName = parts.slice(2).join("/");
      showModuleDetail(pkgName, moduleName);
      break;
    case "guide":
      showGuideDetail(parts[1]);
      break;
    }
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

  function pkgHasFile(pkg, filename) {
    var parts = filename.split("/");
    var dirNames = parts.slice(0, -1);
    var filePart = parts.slice(-1)[0];
    var dir = pkg.files;
    for (var i = 0; i < dirNames.length; i++) {
      if (dirNames[i] in dir && !('size' in dir[dirNames[i]]))
        dir = dir[dirNames[i]];
      else
        return false;
    }
    return (filePart in dir);
  }

  function insertBugzillaLinks(text) {
    return text.replace(BUGZILLA_REGEXP,
                        "bug [$1](" + BUGZILLA_SHOW + "$1)");
  }

  function markdownToHtml(text) {
    var converter = new Showdown.converter();
    return converter.makeHtml(insertBugzillaLinks(text));
  }

  function getPkgFile(pkg, filename, filter, cb) {
    if (pkgHasFile(pkg, filename)) {
      var options = {
        url: "api/packages/" + pkg.name + "/" + filename,
        dataType: "text",
        success: function(text) {
          if (filter)
            try {
              text = filter(text);
            } catch (e) {
              text = null;
            }
          cb(text);
        },
        error: function() {
          cb(null);
        }
      };
      jQuery.ajax(options);
    } else
      cb(null);
  }

  function transitionInMainContent(query) {
    query.fadeIn();
  }

  function showModuleDetail(pkgName, moduleName) {
    var pkg = packages[pkgName];
    var entry = $("#templates .module-detail").clone();
    var filename = "docs/" + moduleName + ".md";

    entry.find(".name").text(moduleName);
    $("#right-column").empty().append(entry);
    entry.hide();

    getPkgFile(pkg, filename, markdownToHtml,
               function(html) {
                 if (html)
                   entry.find(".docs").html(html);
                 transitionInMainContent(entry);
               });
  }

  function showPackageDetail(name) {
    var pkg = packages[name];
    var entry = $("#templates .package-detail").clone();

    // TODO: Add author info.
    entry.find(".name").text(pkg.name);
    $("#right-column").empty().append(entry);
    entry.hide();
    getPkgFile(pkg, "README.md", markdownToHtml,
               function(html) {
                 if (html)
                   entry.find(".docs").html(html);
                 transitionInMainContent(entry);
               });
  }

  function processPackages(packagesJSON) {
    packages = packagesJSON;

    var sortedPackages = [];
    for (name in packages)
      sortedPackages.push(name);
    sortedPackages.sort();
    var entries = $("<div></div>");
    $("#left-column").append(entries);
    entries.hide();
    sortedPackages.forEach(
      function(name) {
        var pkg = packages[name];
        var entry = $("#templates .package-entry").clone();
        var hash = "package/" + pkg.name;
        entry.find(".name").text(pkg.name);
        entry.find(".name").click(function() { setHash(hash); });
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
            var module = $('<li class="module clickable"></li>');
            var hash = "module/" + pkg.name + "/" + moduleName;
            module.text(moduleName);
            module.click(function() { setHash(hash); });
            modules.append(module);
            modules.append(document.createTextNode(' '));
          });
        entries.append(entry);
      });
    entries.fadeIn();
    checkHash();
  }

  function showGuideDetail(name) {
    var entry = $("#templates .guide-section").clone();

    entry.find(".name").text($("#dev-guide-toc #" + name).text());
    $("#right-column").empty().append(entry);
    entry.hide();
    var options = {
      url: "md/dev-guide/" + name + ".md",
      dataType: "text",
      success: function(text) {
        entry.find(".docs").html(markdownToHtml(text));
        transitionInMainContent(entry);
      },
      error: function(text) {
        transitionInMainContent(entry);
      }
    };
    jQuery.ajax(options);
  }

  function linkDeveloperGuide() {
    $("#dev-guide-toc li").each(
      function() {
        var hash = "guide/" + $(this).attr("id");
        $(this).click(function() { setHash(hash); });
      });
  }

  var isPingWorking = true;

  function sendIdlePing() {
    jQuery.ajax({url:"api/idle",
                 // This success function won't actually get called
                 // for a really long time because it's a long poll.
                 success: scheduleNextIdlePing,
                 error: function() {
                   if (id) {
                     window.clearTimeout(id);
                     id = null;
                     if (isPingWorking) {
                       isPingWorking = false;
                       $("#cannot-ping").slideDown();
                     }
                   }
                   scheduleNextIdlePing();
                 }});
    var id = window.setTimeout(
      function() {
        // This is our "real" success function: basically, if we
        // haven't received an error in IDLE_PING_DELAY ms, then
        // we should assume success and hide the #cannot-ping
        // element.
        if (id) {
          id = null;
          if (!isPingWorking) {
            isPingWorking = true;
            $("#cannot-ping").slideUp();
          }
        }
      }, IDLE_PING_DELAY);
  }

  function scheduleNextIdlePing() {
    window.setTimeout(sendIdlePing, IDLE_PING_DELAY);
  }

  scheduleNextIdlePing();
  window.setInterval(checkHash, CHECK_HASH_DELAY);
  linkDeveloperGuide();
  jQuery.getJSON("api/packages", processPackages);
}

$(window).ready(function() { startApp(jQuery, window); });
