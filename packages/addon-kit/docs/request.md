The `request` module lets you make simple yet powerful network requests.

<api name="Request">
@class
The `Request` object is used to make `GET` or `POST` network requests. It is
constructed with a URL to which the request is sent. Optionally the user may
specify a collection of headers and content to send alongside the request and
a callback which will be executed once the request completes.

Once a `Request` object has been created a `GET` request can be executed by
calling its `get()` method, or a `POST` request by calling its `post()` method.

When the server completes the request, the `Request` object emits a "complete"
event.  Registered event listeners are passed a `Response` object.

Each `Request` object is designed to be used once. Once `GET` or `POST` are
called, attempting to call either will throw an error.

Since the request is not being made by any particular website, requests made
here are not subject to the same-domain restriction that requests made in web
pages are subject to.

With the exception of `response`, all of a `Request` object's properties
correspond with the options in the constructor. Each can be set by simply
performing an assignment. However, keep in mind that the same validation rules
that apply to `options` in the constructor will apply during assignment. Thus,
each can throw if given an invalid value.

The example below shows how to use Request to get the most recent public tweet.

    var Request = require('request').Request;
    var latestTweetRequest = Request({
      url: "http://api.twitter.com/1/statuses/public_timeline.json",
      onComplete: function (response) {
        var tweet = response.json[0];
        console.log("User: " + tweet.user.screen_name);
        console.log("Tweet: " + tweet.text);
      }
    });

    // Be a good consumer and check for rate limiting before doing more.
    Request({
      url: "http://api.twitter.com/1/account/rate_limit_status.json",
      onComplete: function (response) {
        if (response.json.remaining_hits) {
          latestTweetRequest.get();
        } else {
          console.log("You have been rate limited!");
        }
      }
    }).get();

<api name="Request">
@constructor
This constructor creates a request object that can be used to make network
requests. The constructor takes a single parameter `options` which is used to
set several properties on the resulting `Request`.
@param options {object}
    @prop url {string}
    This is the url to which the request will be made.

    @prop [onComplete] {function}
    This function will be called when the request has received a response (or in
    terms of XHR, when `readyState == 4`). The function is passed a `Response`
    object.

    @prop [headers] {object}
    An unordered collection of name/value pairs representing headers to send
    with the request.

    @prop [content] {string,object}
    The content to send to the server. If `content` is a string, it should be
    URL-encoded (use `encodeURIComponent`). If `content` is an object, it
    should be a collection of name/value pairs. Nested objects & arrays should
    encode safely.

    For `GET` requests, the query string (`content`) will be appended to the
    URL. For `POST` requests, the query string will be sent as the body of the
    request.

    @prop [contentType] {string}
    The type of content to send to the server. This explicitly sets the
    `Content-Type` header. The default value is `application/x-www-form-urlencoded`.
</api>

<api name="url">
@property {string}
</api>

<api name="headers">
@property {object}
</api>

<api name="content">
@property {string,object}
</api>

<api name="contentType">
@property {string}
</api>

<api name="response">
@property {Response}
</api>

<api name="get">
@method
Make a `GET` request.
@returns {Request}
</api>

<api name="post">
@method
Make a `POST` request.
@returns {Request}
</api>
</api>


<api name="Response">
@class
The Response object contains the response to a network request issued using a
`Request` object. It is returned by the `get()` or `post()` method of a
`Request` object.

All members of a `Response` object are read-only.
<api name="text">
@property {string}
The content of the response as plain text.
</api>

<api name="json">
@property {object}
The content of the response as a JavaScript object. The value will be `null`
if the document cannot be processed by `JSON.parse`.
</api>

<api name="status">
@property {string}
The HTTP response status code (e.g. *200*).
</api>

<api name="statusText">
@property {string}
The HTTP response status line (e.g. *OK*).
</api>

<api name="headers">
@property {object}
The HTTP response headers represented as key/value pairs.
</api>
</api>
