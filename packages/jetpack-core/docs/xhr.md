The `xhr` module provides access to `XMLHttpRequest`
functionality, also known as AJAX.

## Exports ##

<code>xhr.**XMLHttpRequest**()</code>

Creates an `XMLHttpRequest`. This is a constructor, so its use
should always be preceded by the `new` operator. For more information,
see the MDC page on [Using XMLHttpRequest].

<code>xhr.**getRequestCount**()</code>

Returns the number of `XMLHttpRequest` objects that are alive
(i.e., currently active or about to be).

## Limitations ##

The `XMLHttpRequest` object is currently fairly limited, and does not
yet implement the `addEventListener()` or `removeEventListener()`
methods. It also doesn't yet implement the `upload` property.

Furthermore, the `XMLHttpRequest` object does not currently support
the `mozBackgroundRequest` property. All security UI, such as
username/password prompts, are automatically suppressed, so if
required authentication information isn't passed to the `open()`
method, the request will fail.

## Resource Use ##

Whenever this module is unloaded, all in-progress requests are immediately
aborted.

## Security Concerns ##

By default, the `XMLHttpRequest` object grants full access to any
protocol scheme, which means that it can be used to read from (but not
write to) the host system's entire filesystem. It also has unfettered
access to any local area networks, VPNs, and the internet.

### Threat Model ###

The `XMLHttpRequest` object can be used by an extension to "phone
home" and transmit potentially sensitive user data to third
parties.

If access to the filesystem isn't prevented, it could easily be used
to access sensitive user data, though this may be inconsequential if
the client can't access the network.

If access to local area networks isn't prevented, malicious Jetpack
code could access sensitive data.

If transmission of cookies isn't prevented, malicious Jetpack code
could access sensitive data.

Attenuating access based on a regular expression may be ineffective if
it's easy to write a regular expression that *looks* safe but contains
a special character or two that makes it far less secure than it seems
at first glance.

### Possible Attenuations ###

<span class="aside">
We may also want to consider attenuating further based on domain name
and possibly even restricting the protocol to `https:` only, to reduce
risk.
</span>

Before being exposed to unprivileged Jetpack code, this object needs
to be attenuated in such a way that, at the very least, it can't
access the user's filesystem. This can probably be done most securely
by white-listing the protocols that can be used in the URL passed to
the `open()` method, and limiting them to `http:`, `https:`, and
possibly a special scheme that can be used to access the Jetpack
extension's packaged, read-only resources.

Finally, we need to also consider attenuating http/https requests such
that they're "sandboxed" and don't communicate potentially sensitive
cookie information.

  [Using XMLHttpRequest]: https://developer.mozilla.org/En/Using_XMLHttpRequest
