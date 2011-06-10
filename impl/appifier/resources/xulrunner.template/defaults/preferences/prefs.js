// Allow dump() calls to work.
pref("browser.dom.window.dump.enabled", true);

// Enable JS strict mode.
pref("javascript.options.strict", true);

pref("nglayout.debug.disable_xul_cache", true);
pref("javascript.options.showInConsole", true);
pref("extensions.logging.enabled", true);
pref("nglayout.debug.disable_xul_fastload", true);
pref("dom.report_all_js_exceptions", true);
pref("browser.xul.error_pages.enabled", true);

// This is here just because of the window.open issue -- see https://github.com/mozilla/chromeless/issues/43
pref("browser.chromeURL", "chrome://chromeless/content/chromeless.xul");

