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
    var url = "api/packages/file/" + pkg.name + "/" + filename;
    return url;
  }

  function pkgAPIUrl(pkg, filename) {
    return "api/packages/docs/" + pkg.name + "/" + filename;
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

  function renderInterleavedAPIDocs(where, hunks) {
    var i, hunk;
    $(where).empty();
    for([i,hunk] in Iterator(hunks)) {
      if (hunk[0] == "markdown") {
        var nh = $("<span>" + markdownToHtml(hunk[1]) + "</span>");
        nh.appendTo(where);
      } else if (hunk[0] == "api-json") {
        //var id = "apidoc-hunk-%s".replace(/%s/, i);
        //$("<span id='%s'/>\n".replace(/%s/, id)).appendTo(where);
        //var el = $("<span/>").attr({id: id}).appendTo(where);
        var $el = $("<div class='api'/>").appendTo(where);
        renderDocumentationJSON(hunk[1], $el);
      }
    }
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

  function renderPkgAPI(pkg, filename, where, donecb) {
    if (pkgHasFile(pkg, filename)) {
      var options = {
        url: pkgAPIUrl(pkg, filename),
        dataType: "json",
        success: function(json) {
          try {
            renderInterleavedAPIDocs(where, json);
          } catch (e) {
            $(where).html("Oops, API docs renderer failed: " + e);
          }
          donecb("success");
        },
        error: function() {
          alert("getPkgAPI failure: " + filename);
          donecb(null);
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
    renderPkgAPI(pkg, filename, entry.find(".docs"),
                 function(success) {
                   if (success)
                     showMainContent(entry, pkgFileUrl(pkg, filename));
                 });
  }

  function showPackageDetail(name) {
    var pkg = packages[name];
    var entry = $("#templates .package-detail").clone();
    var filename = "README.md";

    var authors = [];
    if (pkg.author)
      authors.push(pkg.author);
    if (pkg.contributors)
      authors = authors.concat(pkg.contributors);

    var dependencies = pkg.dependencies;

    entry.find(".name").text(pkg.name);
    if (authors.length)
      entry.find(".authors").text(authors.join("\n"));
    if (pkg.license)
      entry.find(".license").text(pkg.license);
    if (pkg.version)
      entry.find(".version").text(pkg.version);
    if (dependencies && dependencies.length)
      entry.find(".dependencies").text(dependencies.join("\n"));
    else
      entry.find(".dependencies").parent().parent().remove();

    queueMainContent(entry);
    getPkgFile(pkg, filename, markdownToHtml,
               function(html) {
                 if (html)
                   entry.find(".docs").html(html);
                 showMainContent(entry, pkgFileUrl(pkg, filename));
               });
  }

  function onPackageError(req) {
    if (req.status == 500) {
      var errorDisplay = $('<div class="technical-error"></div>');
      errorDisplay.text(req.responseText);
      $("#left-column").append(errorDisplay);
      errorDisplay.hide();
      errorDisplay.fadeIn();
    }
    finalizeSetup();
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
    finalizeSetup();
  }

  function finalizeSetup() {
    checkHash();
    window.setInterval(checkHash, CHECK_HASH_DELAY);
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
        if ($(this).children().length == 0) {
          var hash = "#guide/" + $(this).attr("id");
          var hyperlink = $('<a target="_self"></a>');
          hyperlink.attr("href", hash).text($(this).text());
          $(this).text("");
          $(this).append(hyperlink);
        }
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

  scheduleNextIdlePing();
  linkDeveloperGuide();
  jQuery.ajax({url: "api/packages",
               dataType: "json",
               success: processPackages,
               error: onPackageError});
}

$(window).ready(function() { startApp(jQuery, window); });
