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

  function managePageHeight() {
    // TODO: This is a nasty non-css way of ensuring that the footer
    // appears at the bottom of the page when there isn't enough content
    // to fill the page. Without a doctype in index.html, it's good
    // enough to set the height of #columns to 100%, but with a doctype,
    // it's much harder for some reason.
    var windowHeight = $(window).height();
    var columnHeight = $("#columns").height();
    if (columnHeight < windowHeight)
      $("#columns").css({height: windowHeight});
  }

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
        modules.push(name.slice(0, -3));
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

  function pkgFileUrl(pkg, filename) {
    return "api/packages/" + pkg.name + "/" + filename;
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

  function fixInternalLinkTargets(query) {
    query.find("a").each(
      function() {
        var href = $(this).attr("href");
        if (href && href.length && href[0] == "#")
          $(this).attr("target", "_self");
      });
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
        url: pkgFileUrl(pkg, filename),
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

  function showSidenotes(query) {
    var width = $("#sidenotes").innerWidth();
    var asides = query.find(".aside");
    var newAsides = $("<div></div>");
    $("#sidenotes").empty();
    asides.each(
      function() {
        var pos = $(this).position();
        $(this).remove();
        newAsides.append(this);
        $(this).css({top: pos.top});
      });
    $("#sidenotes").append(newAsides);
    newAsides.hide();
    newAsides.fadeIn();
    newAsides.children().each(
      function() {
        $(this).width(width);
        var margin = $(this).outerWidth() - width;
        $(this).width(width - margin);
      });
  }

  var queuedContent = null;

  function queueMainContent(query) {
    queuedContent = query;
    $("#sidenotes").empty();
    $("#right-column").empty().append(query);
    query.hide();
  }

  function showMainContent(query, url) {
    if (queuedContent != query)
      return;
    if (url)
      $("#view-source").attr("href", url);
    else
      // TODO: This actually just results in a 404.
      $("#view-source").attr("href", "");
    query.fadeIn();
    fixInternalLinkTargets(query);
    showSidenotes(query);
    queuedContent = null;
  }

  function showModuleDetail(pkgName, moduleName) {
    var pkg = packages[pkgName];
    var entry = $("#templates .module-detail").clone();
    var filename = "docs/" + moduleName + ".md";

    entry.find(".name").text(moduleName);
    queueMainContent(entry);
    getPkgFile(pkg, filename, markdownToHtml,
               function(html) {
                 if (html)
                   entry.find(".docs").html(html);
                 showMainContent(entry, pkgFileUrl(pkg, filename));
               });
  }

  function showPackageDetail(name) {
    var pkg = packages[name];
    var entry = $("#templates .package-detail").clone();
    var filename = "README.md";

    // TODO: Add author info.
    // TODO: Add dependency info.
    entry.find(".name").text(pkg.name);
    queueMainContent(entry);
    getPkgFile(pkg, filename, markdownToHtml,
               function(html) {
                 if (html)
                   entry.find(".docs").html(html);
                 showMainContent(entry, pkgFileUrl(pkg, filename));
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
            module.text(moduleName.replace(/-/g, NON_BREAKING_HYPHEN));
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
    var url = "md/dev-guide/" + name + ".md";

    entry.find(".name").text($("#dev-guide-toc #" + name).text());
    queueMainContent(entry);
    var options = {
      url: url,
      dataType: "text",
      success: function(text) {
        entry.find(".docs").html(markdownToHtml(text));
        showMainContent(entry, url);
      },
      error: function(text) {
        showMainContent(entry);
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
                 error: function(req) {
                   if (req.status == 501)
                     // The server isn't implementing idle, just bail
                     // and stop pinging this API endpoint.
                     return;
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

  managePageHeight();
  $(window).resize(managePageHeight);

  scheduleNextIdlePing();
  window.setInterval(checkHash, CHECK_HASH_DELAY);
  linkDeveloperGuide();
  jQuery.getJSON("api/packages", processPackages);
}

$(window).ready(function() { startApp(jQuery, window); });
