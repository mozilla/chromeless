## Saving Data

Applications built on Chromeless have access to
[HTML5 Web Storage](http://dev.w3.org/html5/webstorage/)
(commonly known as "localStorage")
as well as an implementation of
[IndexedDB](https://developer.mozilla.org/en/IndexedDB).

For reference, there's also a small [example
application](https://github.com/mozilla/chromeless/tree/master/examples/localstorage)
which uses Web Storage in the chromeless environment (just as it works
on the web!).

All data is stored in a user scoped, platform specific, "profile directory".
The [`app-paths`](#module/chromeless-kit/app-paths/profileDir) module
allows you to programattically discover where this data resides on disk.
