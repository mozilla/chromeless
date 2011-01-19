function startApp(jQuery, window) {
  var $ = jQuery;
  var document = window.document;
  var packages = null;
  var apidocs = null;
  var currentHash = "";
  var shouldFadeAndScroll = true;

  const DEFAULT_HASH = "guide/welcome";
  const IDLE_PING_DELAY = 500;
  const CHECK_HASH_DELAY = 100;
  const DOCUMENT_TITLE_ROOT = "Chromeless Documentation";

  function sortedKeys(obj) {
    var arr = [];
    for (e in obj) if (obj.hasOwnProperty(e)) arr.push(e);
    arr.sort();
    return arr;
  }

  function checkHash() {
    var hash = window.location.hash;
    if (hash.length <= 1)
      hash = "#" + DEFAULT_HASH;
    if (hash != currentHash) {
      currentHash = hash;
      onHash(currentHash.slice(1));
    }
  }

  function onHash(hash) {
    var parts = hash.split("/");
    documentName = "";
    switch (parts[0]) {
    case "package":
      showPackageDetail(parts[1]);
      documentName = parts[1];
      break;
    case "module":
      var pkgName = parts[1];
      var moduleName = parts.slice(2).join("/");
      showModuleDetail(pkgName, moduleName);
      documentName = moduleName;
      break;
    case "guide":
      showGuideDetail(parts[1]);
      documentName = $('#' + parts[1]).text();
      break;
    case "apiref":
      showAPIRef(parts[1]);
      documentName = $('#' + parts[1]).text();
    }
    if (documentName.length > 0) {
      document.title = documentName + " - " + DOCUMENT_TITLE_ROOT;
    }
    else {
      document.title = DOCUMENT_TITLE_ROOT;
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
    return "packages/" + pkg.name + "/" + filename;
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

  function onPkgAPIError(req, where, source_filename) {
    var errorDisplay = $("#templates .module-parse-error").clone();
    errorDisplay.find(".filename").text(source_filename);
    errorDisplay.find(".technical-error").text(req.responseText);
    where.empty().append(errorDisplay);
    errorDisplay.hide();
    errorDisplay.fadeIn();
  }

  function renderPkgAPI(pkg, source_filename, div_filename, where, donecb) {
    console.log("render pkg api");
    if (pkgHasFile(pkg, source_filename)) {
      var options = {
        url: pkgFileUrl(pkg, div_filename) + ".html",
        dataType: "html",
        success: function(div_text) {
          try {
            $(where).empty();
            $(div_text).appendTo(where)
          } catch (e) {
            $(where).text("Oops, API docs renderer failed: " + e);
          }
          donecb("success");
        },
        error: function (req) {
          onPkgAPIError(req, where, source_filename);
          donecb("show_error");
        }
      };
      jQuery.ajax(options);
      console.log("fetching: " + options.url);
    } else {
      donecb(null);
    }
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
    newAsides.children().each(
      function() {
        $(this).width(width);
        var margin = $(this).outerWidth() - width;
        $(this).width(width - margin);
      });
  }

  var queuedContent = null;

  function queueMainContent(query, onDone) {
    queuedContent = query;
    function doIt() {
      $("#sidenotes").empty();
      $("#right-column").empty().append(query);
      onDone();
    }
    if (shouldFadeAndScroll) {
      scrollToTop(function () {
        $("#main-content").fadeOut(100, doIt);
      });
    }
    else {
      $("#main-content").hide();
      doIt();
    }
  }

  function scrollToTop(onDone) {
    var interval = window.setInterval(function () {
      if (window.scrollY == 0) {
        window.clearInterval(interval);
        onDone();
      }
      else
        window.scrollBy(0, -Math.max(window.scrollY / 10, 10));
    }, 10);
  }

  function showMainContent(query, url) {
    if (queuedContent != query)
      return;
    if (url)
      $("#view-source").attr("href", url);
    else
      // TODO: This actually just results in a 404.
      $("#view-source").attr("href", "");
    if (shouldFadeAndScroll)
      $("#main-content").fadeIn(400);
    else
      $("#main-content").show();
    shouldFadeAndScroll = false;
    fixInternalLinkTargets(query);
    showSidenotes(query);
    queuedContent = null;
  }

  function showModuleDetail(pkgName, moduleName) {
    var module = apidocs.classmap[moduleName];
    var entry = $("#templates .module-detail").clone();

    entry.find(".package a")
      .text(module.module)
      .attr('href', "#package/" + pkgName);

    entry.find(".module").text(module.shortname);

    var converter = new Showdown.converter();

    if (module.description) {
      entry.find(".docs").html(converter.makeHtml(module.description));      
    }

    if (module.methods) {
      var funcs = entry.find(".functions");
      $("<h2>Functions</h2>").appendTo(funcs);

      var sortedMethods = sortedKeys(module.methods);
      for (var f in sortedMethods) {
        var name = sortedMethods[f];
        f = module.methods[name];
        var func = $("#templates .one-function").clone();        
        func.find(".varname").text(moduleName);
        func.find(".funcName").text(name);
        if (!f.description) {
          f.description = "no documentation available for this function";
        }
        func.find(".description").html(converter.makeHtml(f.description));
        
        // extract return type.  hokey, yuidoc parser should do this for us
        try {
          var rv = f.returns.match(/^{([^}]*)}/)[1]
          func.find(".returnValue").text(rv);
        } catch(e) {
          func.find(".type").remove();
        }

        // insert params into invocation line and documentation
        if (f.params && f.params.length) {
          var ps = func.find(".params");
          for (var i = 0; i < f.params.length; i++) {
            var param = f.params[i];
            console.log(param);
            var p = $('<span><span class="type"></span><span class="name"></span></span>');
            if (param.type) p.find(".type").text(param.type);
            else p.find(".type").remove();
            if (param.name) p.find(".name").text(param.name);
            console.log(ps.length);
            if (ps.children().size()) $("<span>, </span>").appendTo(ps);
            ps.append(p);
          }
        }
        
        func.appendTo(funcs);
      }
      funcs.appendTo(entry);
      
    }

    if (module.properties) {
      var props = entry.find(".properties");
      $("<h2>Properties</h2>").appendTo(props);
      for (var p in module.properties) {
        var name = p;
        p = module.properties[p];
        var prop = $("#templates .one-property").clone();        
        if (p.type) prop.find(".type").text(p.type);
        prop.find(".varname").text(moduleName);
        prop.find(".propName").text(name);
        if (!p.description) {
          p.description = "no documentation available for this property";
        }
        prop.find(".description").text(p.description);
        prop.appendTo(props);
      }
      props.appendTo(entry);
    }

    queueMainContent(entry, function () {
      showMainContent(entry);
    });
  }

  function listModules(pkg, entry) {
    var libs = [];
    if (pkg.lib) {
      for (var x in pkg.lib) { 
        libDir = pkg.lib[x];
        var modules = getModules(pkg.files[libDir]);
        libs = libs.concat(modules);
      }
    }
    var modules = entry.find(".modules");
    if (libs.length > 0) {
      modules.text("");
    }
    libs.sort();
    var count = 0;
    for (var x in libs) {
      moduleName = libs[x];
      var module = $('<li class="module"></li>');
      var hash = "#module/" + pkg.name + "/" + moduleName;
      $('<a target="_self"></a>')
        .attr("href", hash)
        .text(moduleName)
        .appendTo(module);
      modules.append(module);
      modules.append(document.createTextNode(' '));
      count++
    }
    return count;
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

    listModules(pkg, entry);

    queueMainContent(entry, function () {
      getPkgFile(pkg, filename, markdownToHtml,
                 function(html) {
                   if (html)
                     entry.find(".docs").html(html);
                   showMainContent(entry, pkgFileUrl(pkg, filename));
                 });
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

  function processAPIDocs(apidocsJSON) {
    apidocs = apidocsJSON;
    finalizeSetup();
  }

  function processPackages(packagesJSON) {
    packages = packagesJSON;
    jQuery.ajax({url: "packages/apidocs.json",
                 dataType: "json",
                 success: processAPIDocs,
                 error: onPackageError});
  }

  function finalizeSetup() {
    checkHash();
    if ("onhashchange" in window) {
      window.addEventListener("hashchange", checkHash, false);
    } else {
      window.setInterval(checkHash, CHECK_HASH_DELAY);
    }

    $('#hide-dev-guide-toc').click(function() {
      if ($(this).text() == 'hide') {
        $(this).text('show');
        $('#dev-guide-toc').hide('fast');
      } else {
        $(this).text('hide');
        $('#dev-guide-toc').show('fast');
      }
    });
  }

  function showGuideDetail(name) {
    var entry = $("#templates .guide-section").clone();
    var url = "md/dev-guide/" + name + ".md";

    entry.find(".name").text($("#dev-guide-toc #" + name).text());
    queueMainContent(entry, function () {
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
    });
  }

  function showAPIRef(name) {
      if (name === 'api-by-package') {
        var entry = $("#templates .package-list").clone();
        var sortedPackageNames = sortedKeys(packages);
        for (p in sortedPackageNames) {
          p = sortedPackageNames[p];
          var item = $("#templates .one-package").clone();
          item.find(".name a")
            .text(packages[p].name)
            .attr('href', "#package/" + packages[p].name);
          item.find(".description").text(packages[p].description);
          var count = listModules(packages[p], item);
          item.find(".number").text(count);
          item.appendTo(entry);
        }
        queueMainContent(entry, function () {
          showMainContent(entry);
        });
      } else if (name === 'api-full-listing') {
        var entry = $("#templates .full-api").clone();
        queueMainContent(entry, function () {
          showMainContent(entry);
        });
      }
  }

  function linkDeveloperGuide() {
    $(".link").each(
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

  function linkAPIReference() {
    $(".apiref").each(
      function() {
        if ($(this).children().length == 0) {
          var hash = "#apiref/" + $(this).attr("id");
          var hyperlink = $('<a target="_self"></a>');
          hyperlink.attr("href", hash).text($(this).text());
          $(this).text("");
          $(this).append(hyperlink);
        }
      });
  }

  linkDeveloperGuide();
  linkAPIReference();

  // XXX: we should combine output into a single json file
  jQuery.ajax({url: "packages/index.json",
               dataType: "json",
               success: processPackages,
               error: onPackageError});

  $("a[href]").live("click", function () {
    var href = $(this).attr("href");
    if (href.length && href[0] == "#")
      shouldFadeAndScroll = true;
  });
}

$(window).ready(function() { startApp(jQuery, window); });
