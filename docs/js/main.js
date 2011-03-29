function startApp(jQuery, window) {
    var $ = jQuery;
    var document = window.document;
    var apidocs = null;
    var currentHash = "";
    var shouldFadeAndScroll = true;
    var converter = new Showdown.converter();

    const DEFAULT_HASH = "guide/welcome";
    const CHECK_HASH_DELAY = 100;
    const DOCUMENT_TITLE_ROOT = "Chromeless Documentation";

    function sortedKeys(obj) {
        var arr = [];
        for (var e in obj) if (obj.hasOwnProperty(e)) arr.push(e);
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
            var moduleName = parts[2];
            var selectedFunction = (parts.length > 3) ? parts.slice(3).join("/") : null;
            showModuleDetail(pkgName, moduleName, selectedFunction);
            documentName = moduleName;
            break;
        case "guide":
            showGuideDetail(parts[1]);
            documentName = $('#' + parts[1]).text();
            break;
        case "apiref":
            var context = (parts.length > 2) ? parts[2] : null;
            showAPIRef(parts[1], context);
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

    function fixInternalLinkTargets(query) {
        query.find("a").each(
            function() {
                var href = $(this).attr("href");
                if (href && href.length && href[0] == "#")
                    $(this).attr("target", "_self");
            });
    }

    function onPkgAPIError(req, where, source_filename) {
        var errorDisplay = $("#templates .module-parse-error").clone();
        errorDisplay.find(".filename").text(source_filename);
        errorDisplay.find(".technical-error").text(req.responseText);
        where.empty().append(errorDisplay);
        errorDisplay.hide();
        errorDisplay.fadeIn();
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
        $("#main-content").hide();
        $("#sidenotes").empty();
        $("#right-column").empty().append(query);
        // prettyPrint code in queuedContent
        queuedContent.find("pre > code").each(function() {
            $(this).html(prettyPrintOne($(this).html()));
        });
        onDone();
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

    // build an object which maps names to indexes for an array of
    // objects which contain a .name property 
    function buildNameToIxMap(arr) {
        var nameToIx = {};
        for (var i = 0; i < arr.length; i++) {
            nameToIx[arr[i].name] = i;
        }
        return nameToIx;
    }

    function sortedNames(arr) {
        var names = [];
        for (var i = 0; i < arr.length; i++) {
            names.push(arr[i].name);
        }
        names.sort();
        return names;
    }

    function setupJSONView(domElem, obj) {
        domElem.click(function() {
            $(".json-display pre").html(prettyPrintOne(JSON.stringify(obj, null, 3)));
            $(".json-display").show('fast');
            console.log("showded");
        });
    }

    function renderParam(param) {
        var p = $('<div class="one-param"><div class="summary"><span class="open"></span><span class="name"></span> : <span class="type"></span><span class="close"></span></div><div class="desc"></div></div>');
        p.find(".name").text(param.name);
        p.find(".type").text(typeofType(param));

        if (param.optional) {
            p.find(".open").text("[ ");
            p.find(".close").text(" ]");
        }

        if (param.desc) {
            var desc = converter.makeHtml(param.desc);
            p.find(".desc").html($("<p/>").html(desc));
        }

        if (param.type && param.type.properties) {
            console.log("oh yeah baby");
            var d = p.find(".desc");
            for (var i = 0; i < param.type.properties.length; i++) {
                d.append(renderParam(param.type.properties[i]));
            }
        }

        return p;
    }

    function typeofType(param) {
        var type = "unknown";
        if (param.type && param.type.name) type = param.type.name;
        else if (param.type) type = param.type;
        return type;
    }

    function populateFunctions(domElem, moduleName, functions) {
        var nameToIx = buildNameToIxMap(functions);
        var sortedMethods = sortedNames(functions);

        for (var f in sortedMethods) {
            var name = sortedMethods[f];
            f = functions[nameToIx[name]];
            var func = $("#templates .one-function").clone();
            func.find(".varname").text(moduleName);
            func.find(".funcName").text(name);
            func.find(".invocation").attr('id', (moduleName + "." + name).split(".").slice(1).join("."));
            if (f.source_lines) {
                func.find(".invocation").attr('startLine', f.source_lines[0])
                    .attr('endLine', f.source_lines[1]);
            }

            setupJSONView(func.find(".invocation > img:last-child"), f);

            if (!f.desc) {
                f.desc = "no documentation available for this function";
            }
            func.find(".description").html(converter.makeHtml(f.desc));

            // insert return value docs
            if (f.returns) {
                if (f.returns.type) {
                    func.find(".invocation .type").text(typeofType(f.returns));
                } else {
                    func.find(".invocation .type").remove();
                }

                if (f.returns.desc) {
                    func.find(".returndoc").html(converter.makeHtml(f.returns.desc));
                } else {
                    func.find(".returnvalue").remove();
                }
            } else {
                func.find(".invocation .type").remove();
                func.find(".returnvalue").remove();
            }

            // insert params into invocation line and documentation
            if (f.params && f.params.length) {
                var ps = func.find(".params");
                var fpd = func.find(".paramdoc");
                for (var i = 0; i < f.params.length; i++) {
                    var param = f.params[i];
                    // add parameter to invocation line
                    var p = $('<span><span class="type"></span><span class="name"></span></span>');
                    if (param.type) p.find(".type").html(typeofType(param));
                    else p.find(".type").remove();
                    if (param.name) p.find(".name").text(param.name);
                    if (ps.children().size()) $("<span>, </span>").appendTo(ps);
                    ps.append(p);

                    // separate parameter documentation
                    fpd.append(renderParam(param));
                }
            } else {
                // remove the parameters section entirely if they don't exist
                func.find(".parameters").remove();
            }

            func.appendTo(domElem);
        }
    }

    function populateProperties(domElem, moduleName, properties) {
        var nameToIx = buildNameToIxMap(properties);
        var sortedProps = sortedNames(properties);

        for (var p in sortedProps) {
            var name = sortedProps[p];
            p = properties[nameToIx[name]];
            var prop = $("#templates .one-property").clone();
            if (p.type) prop.find(".type").text(p.type);
            else prop.find(".type").remove();
            prop.find(".varname").text(moduleName);
            prop.find(".propName").text(name);
            prop.find(".invocation").attr('id', (moduleName + "." + name).split(".").slice(1).join("."));
            if (p.source_lines) {
                prop.find(".invocation").attr('startLine', p.source_lines[0])
                    .attr('endLine', p.source_lines[1]);
            }

            setupJSONView(prop.find(".invocation > img:last-child"), p);

            if (!p.desc) {
                p.desc = "no documentation available for this property";
            }
            prop.find(".description").html(converter.makeHtml(p.desc));
            prop.appendTo(domElem);
        }
    }

    function populateClasses(domElem, moduleName, classes) {
        var nameToIx = buildNameToIxMap(classes);
        var sortedClasses = sortedKeys(nameToIx);

        for (var c in sortedClasses) {
            c = classes[nameToIx[sortedClasses[c]]];

            var t = $("#templates .class-detail").clone();
            t.find(".varname").text(moduleName);
            t.find(".name").text(c.name);

            if (c.desc) {
                t.find(".docs").html(converter.makeHtml(c.desc));
            } else {
                t.find(".docs").remove();
            }

            // XXX: support multiple constructors
            if (c.constructors && c.constructors.length) {
                // we'll treat constructors like a normal functions, but use the classname
                // as the function name
                var classCopy = $.extend(true, {}, c.constructors[0]);
                classCopy.name = c.name;
                populateFunctions(t.find(".constructor"), moduleName, [ classCopy ]);
            } else {
                t.find(".constructor").remove();
            }

            if (c.properties) {
                populateProperties(t.find(".properties"), moduleName + "." + c.name, c.properties);
            } else {
                t.find(".properties").remove();
            }

            if (c.functions) {
                populateFunctions(t.find(".functions"), moduleName + "." + c.name, c.functions);
            } else {
                t.find(".functions").remove();
            }

            // XXX: for when we/if implement nested class support
            // if (c.classes) {
            //   ...
            // } else {
            t.find(".classes").remove();
            // }
            domElem.append(t);
        }
    }

    function populateModuleDocs(domElem, pkgName, module) {
        domElem.find(".package a")
            .text(pkgName)
            .attr('href', "#package/" + pkgName);

        domElem.find(".module").text(module.module);

        if (module.desc) {
            domElem.find(".docs").html(converter.makeHtml(module.desc));
        }

        if (module.functions) {
            var funcs = domElem.find(".functions");
            $("<div class=\"heading\">Functions</div>").appendTo(funcs);
            populateFunctions(funcs, module.module, module.functions);
        }

        if (module.properties) {
            var props = domElem.find(".properties");
            $("<div class=\"heading\">Properties</div>").appendTo(props);
            populateProperties(props, module.module, module.properties);
        }

        if (module.classes) {
            var classes = domElem.find(".classes");
            $("<div class=\"heading\">Classes</div>").appendTo(classes);
            populateClasses(classes, module.module, module.classes);
        }

        // now add links for "go to code"
        var fName = module.filename;
        // the SHA1 tag should be encoded in the apidocs, otherwise we'll use
        // "master"
        var tag = apidocs.version ? apidocs.version : "master";
        var ghURL = "https://github.com/mozilla/chromeless/blob/" + tag + "/packages/" + pkgName + "/lib/" + module.filename + "#L";

        domElem.find(".invocation").each(function() {
            var thisURL = ghURL + $(this).attr('startLine') + "-" + $(this).attr('endLine');
            linkNode($(this).children(":nth-child(2)"), thisURL, "github_codeview");
        });
    }

    function showModuleDetail(pkgName, moduleName, selectedFunction) {
        var module = apidocs[pkgName].modules[moduleName];
        var entry = $("#templates .module-detail").clone();

        populateModuleDocs(entry, pkgName, module);

        queueMainContent(entry, function () {
            showMainContent(entry);

            // shall we set scrolltop?
            if (selectedFunction != null) {
                var sf = "#" + selectedFunction.replace(/\./g, "\\.");
                $(sf).each(function() {
                    // scroll to the selected function
                    $('html, body').animate({scrollTop:$(this).offset().top}, 500);
                    // and highlight it
                    $(this).parent().css('background-color', '#ffc');
                });
            }
        });
    }

    function listModules(pkg, entry) {
        var libs = [];
        if (pkg.modules) {
            libs = sortedKeys(pkg.modules);
        }
        var modules = entry.find(".modules");
        if (libs.length > 0) {
            modules.text("");
        }
        var count = 0;
        for (var x in libs) {
            var moduleName = libs[x];
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
        var pkg = apidocs[name];
        var entry = $("#templates .package-detail").clone();

        entry.find(".name").text(name);

        var libs = [];
        if (pkg.modules) {
            libs = sortedKeys(pkg.modules);
        }
        for (var x in libs) {
            var moduleName = libs[x];
            var n = $("<div/>").addClass("module-name").text(moduleName);
            n.appendTo(entry);
            linkNode(n, "#module/" + name + "/" + moduleName);

            if (pkg.modules[moduleName].desc) {
                $("<div/>").addClass("module-desc")
                    .html(converter.makeHtml(pkg.modules[moduleName].desc)).
                    appendTo(entry);
            }
        }

        queueMainContent(entry, function () {
            showMainContent(entry, null);
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

        // populate version number
        if (apidocs.version) {
            var cv = $("#footer .chromeless_version");
            cv.text(apidocs.version);
            linkNode(cv,  "https://github.com/mozilla/chromeless/tree/" + apidocs.version);
        }
    }

    function showGuideDetail(name) {
        console.log("show guide detail: " + name);
        var entry = $("#templates .guide-section").clone();
        var url = "md/dev-guide/" + name + ".md";

        entry.find(".name").text($("#dev-guide-toc #" + name).text());

        var options = {
            url: url,
            dataType: "text",
            success: function(text) {
                entry.find(".docs").html(markdownToHtml(text));
                queueMainContent(entry, function () {
                    showMainContent(entry, url);
                });
            },
            error: function(text) {
                showMainContent(entry);
            }
        };
        jQuery.ajax(options);
    }

    function linkNode(node, url, tgt) {
        tgt = tgt ? tgt : "_self" ;
        node.replaceWith($('<a target="' + tgt + '"></a>')
                         .attr("href", url)
                         .append(node.clone()));
    }

    function showAPIRef(name, context) {
        if (name === 'api-by-package') {
            var entry = $("#templates .package-list").clone();
            var sortedPackageNames = sortedKeys(apidocs);
            for (var p in sortedPackageNames) {
                p = sortedPackageNames[p];
                var item = $("#templates .one-package").clone();
                item.find(".name a")
                    .attr('href', "#package/" + apidocs[p].name)
                    .text(apidocs[p].name);
                item.find(".description").text(apidocs[p].desc);
                var count = listModules(apidocs[p], item);
                item.find(".number").text(count);
                item.appendTo(entry);
            }
            queueMainContent(entry, function () {
                showMainContent(entry);
            });
        } else if (name === 'api-full-listing') {
            var fullApi = $("#templates .full-api").clone();

            // for now we'll simply concatenate all modules docs onto
            // a single page
            var pkgs = sortedKeys(apidocs);

            for (var p in pkgs) {
                p = pkgs[p];
                var modules = sortedKeys(apidocs[p].modules);
                for (var m in modules) {
                    m = modules[m];
                    var modObj = apidocs[p].modules[m];
                    var entry = $("#templates .module-detail").clone();
                    populateModuleDocs(entry, p, modObj);

                    // let's get linky.  Make module names linkable.
                    entry.find(".name > .module").each(function() {
                        linkNode($(this),  "#module/" + p + "/" + m);
                    });

                    // now link all functions and properties to the proper module
                    // page so a user is one click away from search results to full
                    // module documentation
                    entry.find(".invocation").each(function() {
                        var url = "#module/" + p + "/" + m + "/";
                        docId = $(this).find(".varname").text() + "." + 
                            $(this).find(".propName, .funcName").text();
                        // chomp off the first bit as it makes for an ugly url
                        docId = docId.split(".").slice(1).join(".");
                        url += docId;
                        linkNode($(this).children("span:first-child"), url);
                    });

                    fullApi.append(entry);
                }
            }

            var performSearch = function(keys) {
                var keys = keys.trim().toLowerCase().split(" ");

                // a selector that describes all of the non-atoms.  that is, things to
                // hide when a filter is applied
                var nonAtoms = "#main-content .module-detail > .name," +
                    "#main-content .module-detail > .example," +
                    "#main-content .module-detail > .docs," +
                    "#main-content .module-detail > div > .heading," +
                    "#main-content .class-detail > .classname," +
                    "#main-content .class-detail > .docs," +
                    "#main-content .class-detail .littleheading";

                // if it's the empty string, show everything
                if (keys.length === 1 && "" === keys[0]) {
                    $(nonAtoms).show();
                    $("#main-content .one-function, #main-content .one-property").show();
                    $("#main-content .class-detail").css("margin-left", "2em");

                    // if the last state contained text, then let's add a blank search
                    // to the history
                    var parts = currentHash.split("/");
                    if (parts.length > 2 && parts[2].length > 0) {
                        currentHash = "#apiref/api-full-listing";
                        window.location.hash = currentHash;
                    }
                } else {
                    // search properties
                    function hideIfNotMatch() {
                        var match = true;
                        for (var i = 0; i < keys.length; i++) {
                            match = ($(this).text().toLowerCase().indexOf(keys[i]) >= 0);
                            if (!match) break;
                        }
                        if (match) {
                            $(this).show();
                        } else {
                            $(this).hide();
                        }
                    }
                    // hide all non-atoms
                    $(nonAtoms).each(function() { $(this).hide(); });

                    // a little trick for nested classes, unindent them so they
                    // appear reasonably in searches
                    $("#main-content .class-detail").css("margin-left", "0em");

                    // and check to see if the string sought occurs within
                    // a documented property or function
                    $("#main-content .one-function, #main-content .one-property").each(hideIfNotMatch);
                }
            }

            // update history when/if user clicks on inside listing
            fullApi.click(function(e) {
                text = $(".filter_container input").val().trim();
                if (text.length > 0) {
                    currentHash = "#apiref/api-full-listing/" + text;
                    window.location.hash = currentHash;
                }
            });

            // now a handler for text-change events on the filter box
            fullApi.find(".filter_container input").keyup(function() {
                performSearch($(this).val());
            });

            // make the clear button active
            fullApi.find(".filter_container .clear").click(function() {
                $(".filter_container input").val("");
                performSearch("");
            });

            queueMainContent(fullApi, function () {
                // and start with a search if context is non empty
                if (context != null) {
                    $(".filter_container input").val(context);
                    performSearch(context);
                } else {
                    // ensure filter box is empty, some browsers don't
                }
                showMainContent(fullApi);
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

    // setup json display hide on click
    $(".json-display").click(function() {
        $(this).hide();
    });

    // pull in the json formated api doc database
    jQuery.ajax({url: "packages/apidocs.json",
                 dataType: "json",
                 success: processAPIDocs,
                 error: onPackageError});

    $("a[href]").live("click", function () {
        var href = $(this).attr("href");
        if (href.length && href[0] == "#")
            shouldFadeAndScroll = true;
    });
}

$(window).ready(function() { startApp(jQuery, window); });
