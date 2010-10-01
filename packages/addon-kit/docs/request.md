The `request` module lets you make simple, yet powerful network requests.


## Constructors ##

<api name="Request">
@constructor
This constructor creates a request object that can be used to make network
requests. The constructor takes a single parameter `options` which is used to
set several properties on the resulting `Request`.

Each `Request` object is designed to be used once. Once `get` or `post` are
called, attempting to call either will throw an error. Since the request is not
being made by any particular website, requests made here are not subject to the
same-domain restriction that requests made in web pages are subject to.

@param options {object}
    @prop url {string}
    This is the url to which the request will be made.

    @prop onComplete {callback}
    This function will be called when the request has received a response. In
    terms of XHR, when `readyState == 4`. The request object is available as
    `this` inside the callback. So in order to use the response, you'll need to
    access `this.response`

    @prop [headers] {object}
    An unordered collection of name/value pairs representing headers to send
    with the request.

    @prop [content] {string,object}
    The content to send to the server. If `content` is a string, it should be
    URL-encoded (use `encodeURIComponent`). If `content` is an object, it should
    be a collection of name/value pairs. Nested objects & arrays should encode
    safely.

    For `GET` requests, the query string (`content`) will be appended to the URL.
    For `POST` requests, the query string will be sent as the body of the request.

    @prop [contentType] {string}
    The type of content to send to the server. This explicitly sets the
    `Content-Type` header. The default value is `application/x-www-form-urlencoded`.
</api>


## Request Objects ##

### Members ###

With the exception of *response*, all of a *Request* object's members correspond
with the options in the constructor. Each can be set by simply performing an
assignment. However, keep in mind that the same validation rules that apply to
`options` in the constructor will apply during assignment. Thus, each can throw
if given an invalid value.

<api name="url">
@property {string}
</api>

<api name="onComplete">
@property {function}
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

### Methods ###

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


## Response Objects ##

### Members ###

All members of a `Response` object are read-only.

<api name="text">
@property {string}
The content of the response as plain text.
</api>

<api name="xml">
@property {DOM}
The content of the response as a DOM document (for text/xml responses). The
value will be `null` if the document cannot be processed as XML.
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


## Examples

### Getting the Most recent Public Tweet ###

    var latestTweetRequest = Request({
      url: "http://api.twitter.com/1/statuses/public_timeline.json",
      onComplete: function () {
        var tweet = this.response.json[0];
        console.log("User: " + tweet.user.screen_name);
        console.log("Tweet: " + tweet.text);
      }
    });
    // Be a good consumer and check for rate limiting before doing more.
    Request({
      url: "http://api.twitter.com/1/account/rate_limit_status.json",
      onComplete: function () {
        if (this.response.json.remaining_hits) {
          latestTweetRequest.get();
        } else {
          console.log("You have been rate limited!");
        }
      }
    }).get();