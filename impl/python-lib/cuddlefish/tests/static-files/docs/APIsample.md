# Title #

Some text here

<api name="test">
@method
This is a function which does nothing in particular.
@returns {object}
  @prop firststring {string} First string
  @prop firsturl {url} First URL
@param argOne {string} This is the first argument.
@param [argTwo] {bool} This is the second argument.
@param [argThree=default] {uri}
       This is the third and final argument. And this is
       a test of the ability to do multiple lines of
       text.
@param [options] Options Bag
  @prop [style] {string} Some style information.
  @prop [secondToLastOption=True] {bool} The last property.
  @prop [lastOption] {uri}
        And this time we have
        A multiline description
        Written as haiku
</api>

This text appears between the API blocks.

<api name="append">
@method
This is a list of options to specify modifications to your slideBar instance.
@param options
       Pass in all of your options here.
  @prop [icon] {uri} The HREF of an icon to show as the method of accessing your features slideBar
  @prop [html] {string/xml}
        The content of the feature, either as an HTML string,
        or an E4X document fragment (e.g., <><h1>Hi!</h1></>)
  @prop [url] {uri} The url to load into the content area of the feature
  @prop [width] {int} Width of the content area and the selected slide size
  @prop [persist] {bool}
        Default slide behavior when being selected as follows:
        If true: blah; If false: double blah.
  @prop [autoReload] {bool} Automatically reload content on select
  @prop [onClick] {function} Callback when the icon is clicked
  @prop [onSelect] {function} Callback when the feature is selected
  @prop [onReady] {function} Callback when featured is loaded
</api>

Wooo, more text.

<api name="cool-func.dot">
@constructor
@returns {string} A value telling you just how cool you are.
A boa-constructor!
This description can go on for a while, and can even contain
some **realy** fancy things. Like `code`, or even
~~~~{.javascript}
// Some code!
~~~~
@param howMuch {string} How much cool it is.
@param [double=true] {bool}
       In case you just really need to double it.
@param [options] An object-bag of goodies.
  @prop callback {function} The callback
  @prop [random] {bool} Do something random?
@param [onemore] {bool} One more paramater
@param [options2]
       This is a full description of something
       that really sucks. Because I now have a multiline
       description of this thingy.
  @prop monkey {string} You heard me right
  @prop [freak=true] {bool}
        Yes, you are a freak.
</api>

<api name="random">
@method
A function that returns a random integer between 0 and 10.
@returns {int} The random number.
</api>

Some more text here.

