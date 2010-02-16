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

function scheduleNextIdlePing() {
  window.setTimeout(jQuery.ajax({url:"/api/idle",
                                 success: scheduleNextIdlePing,
                                 error: scheduleNextIdlePing}),
                    500);
}

$(window).ready(
  function() {
    scheduleNextIdlePing();
    jQuery.getJSON(
      "/api/packages",
      function(packages) {
        var sortedPackages = [];
        for (name in packages)
          sortedPackages.push(name);
        sortedPackages.sort();
        sortedPackages.forEach(
          function(name) {
            var pkg = packages[name];
            var entry = $("#templates .entry").clone();
            entry.find(".name").text(pkg.name);
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
              });
            $("#container").append(entry);
          });
      });
  });
