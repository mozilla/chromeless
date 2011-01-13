This section is a very quick overview of some of the APIs provided in the SDK.
We've grouped them into four categories according to their function:

 1. Building a UI
 2. Interacting with the Web
 3. Interacting with the Browser
 4. Dealing with Data

## Building a UI ##

The SDK provides four modules to help you build a UI.

### [panel](#module/addon-kit/panel) ###

A panel is a dialog. Its content is specified as HTML. You can execute scripts
in the panel's context to interact with the content and send messages back to
the main add-on code.

You can use a panel anywhere your application needs to display a dialog.

### [widget](#module/addon-kit/widget) ###

A widget is a small piece of HTML content which is displayed in the Firefox 4
[add-on bar](https://developer.mozilla.org/en/The_add-on_bar).

Widgets are generally used in one of two different contexts:

* to display compact content that should always be visible to the user, such as
the time in a selected time zone or the weather

* to provide a way for the user to access other parts of an add-on's user
interface. For example, a widget might display only an icon, but open a
settings dialog when the user clicks it.

To simplify your code in the latter case, you can attach a panel object to
your widget: then, when the user clicks the widget, the widget will display
the panel. The `reddit-panel` example demonstrates this.

### [context-menu](#module/addon-kit/context-menu) ###

The `context-menu` module lets you add items and submenus to the browser's
context menu.

You can define the context in which the item is shown using any
of a number of predefined contexts (for example, when some content on the page
is selected) or define your own contexts using scripts.

### [notifications](#module/addon-kit/notifications) ###

This module enables an add-on to display transient messages to the user.

## Interacting with the Web ##

As you might expect, the SDK provides several APIs for interacting with the
Web. Some of them, like `page-mod` and `selection`, interact with web pages
the user visits, while APIs like `page-worker` and `request` enable you to
fetch web content for yourself.

### [page-mod](#module/addon-kit/page-mod) ###

The `page-mod` module enables you to execute scripts in the context of selected
web pages, effectively rewriting the pages inside the browser.

You supply a set of scripts to the page-mod and a [`match
pattern`](#module/api-utils/match-pattern) which identifies, by URL, a set of
web pages. When the user visits these pages the scripts are attached and
executed.

This is the module you should use if you need to modify web pages or simply to
retrieve content from pages the user visits.

### [selection](#module/addon-kit/selection) ###

Using this module your add-on can get and set any selection in the active web
page, either as text or HTML.

### [page-worker](#module/addon-kit/page-worker) ###

Using a page worker, an add-on can load a page and access its DOM without
displaying it to the user.

This is the module to use if you want to interact with a page's DOM without
the user's involvement.

### [request](#module/addon-kit/request) ###

This module enables you to make XMLHttpRequests from your add-on.

## Interacting with the Browser ##

These APIs enable your add-on to interact with the browser itself.

### [clipboard](#module/addon-kit/clipboard) ###

The `clipboard` module enables you to get and set the contents of the system
clipboard.

### [private-browsing](#module/addon-kit/private-browsing) ###

`private-browsing` enables your add-on to start and stop private browsing mode,
and to be notified when the browser starts or stops private browsing
mode.

You should use these notifications to ensure your add-on respects private
browsing.

### [tabs](#module/addon-kit/tabs) ###

This module enables you to interact with the currently open tabs and to open
new tabs.

You can get the list of open tabs and the current active tab, and get
notified of tabs opening and closing, or becoming active and inactive.

You can retrieve each tab and get certain information about it such as its URL.

Note that you can't access the content hosted by the tab using this API: if you
want to do this, use the [`page-mod`](#module/addon-kit/page-mod) API.

### [windows](#module/addon-kit/windows) ###

Like the `tabs` module, but for windows: this module enables you to
interact with currently open windows and to open new windows.

You can get the list of open windows, the current active window, and get
notified of windows opening and closing, or becoming active and inactive.

You can retrieve each window and get certain information about it such as the
list of tabs it hosts.

Again: you can't access the content hosted by the window using this API, and if
you want to do this use the [`page-mod`](#module/addon-kit/page-mod) API.

## Dealing with Data ##

### [simple-storage](#module/addon-kit/simple-storage) ###

This module provides your add-on with persistent storage.

### [self](#module/api-utils/self) ###

Using this module you can access any files you have included in your add-on's
`data` directory.

For example: if your add-on uses [content
scripts](#guide/web-content) and you have chosen to supply them as separate
files, you use `self` to retrieve them. Similarly, if your add-on includes an
icon or some HTML content to display in a [`panel`](#module/addon-kit/panel)
you can store the files in your `data` directory and retrieve them using
`self`.

This module also gives your add-on access to its [Program
ID](#guide/program-id).

Note that this module is in the [`api-utils`](#package/api-utils) package.
