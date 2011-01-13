
(function (global) {
  const BUGZILLA_SHOW = "https://bugzilla.mozilla.org/show_bug.cgi?id=";
  const BUGZILLA_REGEXP = /bug\s+([0-9]+)/g;
  const DOCTEST_REGEXP = />>>.+/g;
  const DOCTEST_BLANKLINE_REGEXP = /<BLANKLINE>/g;

  function insertBugzillaLinks(text) {
    return text.replace(BUGZILLA_REGEXP,
                        "bug [$1](" + BUGZILLA_SHOW + "$1)");
  }

  function removePyDoctestCode(text) {
    return text.replace(DOCTEST_REGEXP, "")
               .replace(DOCTEST_BLANKLINE_REGEXP, "");
  }

  function markdownToHtml(text) {
    var converter = new Showdown.converter();
    text = removePyDoctestCode(insertBugzillaLinks(text));
    return converter.makeHtml(text);
  }

  global.markdownToHtml = markdownToHtml;

})(this);
