The `localization` module provides simple localization functionality.
It makes it possible to retrieve localized versions of the strings in your code.
And it doesn't require you to solicit localizations from localizers or bundle
localizations with your code, as the module retrieves them automatically
from a web service based on the strings your code is using.

<code>localization.**get**(*string*)</code>

Returns the translation of the string in the locale of the program if
the localization is available.

The translation will either be a general translation of the given string or
a translation that is specific to this particular add-on, if one is available.
