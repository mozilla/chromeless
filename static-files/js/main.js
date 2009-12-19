function getModules(fileStruct) {
  var modules = [];
  for (var name in fileStruct) {
    if (name.match(/.*\.js$/))
      modules.push(name.slice(0, -3));
    else if (!('size' in fileStruct[name])) {
      var subModules = getModules(fileStruct[name]);
      if (subModules.length) {
        subModules = [name + "/" + subModule
                      for each (subModule in subModules)];
        modules = modules.concat(subModules);
      }
    }
  }
  return modules;
}

$(window).ready(
  function() {
    jQuery.getJSON(
      "/api/packages",
      function(packages) {
        var sortedPackages = [name for (name in packages)];
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
