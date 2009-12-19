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
            $("#container").append(entry);
          });
      });
  });
