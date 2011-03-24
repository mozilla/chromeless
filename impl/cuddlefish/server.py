import os
import time
import threading
import socket
import urllib
import urllib2
import copy
import mimetypes
import webbrowser
import Queue
import SocketServer
import shutil
import tarfile
import traceback
import markdown
import errno

from cuddlefish import packaging
from cuddlefish import Bunch
from cuddlefish import apiparser
from cuddlefish import apirenderer
from cuddlefish import webdocs
import simplejson as json

try:
    from wsgiref import simple_server
    wsgiref_available = True
except ImportError:
    wsgiref_available = False
    try:
        print ("Warning, wsgiref module not available. httpd operations "
               "will fail.")
    except IOError:
        pass

DEV_SERVER_PORT = 15832
DEFAULT_PORT = 8888
DEFAULT_HOST = '127.0.0.1'
DEFAULT_PAGE = 'dev-guide/welcome.html'

API_PATH = 'api'
IDLE_PATH = 'idle'
IDLE_TIMEOUT = 60
TASK_QUEUE_PATH = 'task-queue'
TASK_QUEUE_SET = 'set'
TASK_QUEUE_GET = 'get'
TASK_QUEUE_GET_TIMEOUT = 1
DAEMONIC_IDLE_TIMEOUT = 60.0
IDLE_WEBPAGE_TIMEOUT = 1.5

_idle_event = threading.Event()

if wsgiref_available:
    class ThreadedWSGIServer(SocketServer.ThreadingMixIn,
                             simple_server.WSGIServer):
        daemon_threads = True

    class QuietWSGIRequestHandler(simple_server.WSGIRequestHandler):
        class NullFile(object):
            def write(self, data):
                pass

            def flush(self):
                pass

        null_file = NullFile()

        def get_stderr(self):
            return self.null_file

        def log_message(self, *args, **kwargs):
            pass

# Due to https://bugzilla.mozilla.org/show_bug.cgi?id=616922,
# per http://bugs.python.org/issue10551, call mimetypes.init with an empty list
# argument to the `files` parameter to force the module to ignore the Windows
# registry, whose consultation can lead to unpredictable results in unit tests.
mimetypes.init(files=[])

def guess_mime_type(url):
    """
    Attempts to guess a MIME type for a given URL.

    Note that some of these are text/plain just so they can be viewed
    easily in Firefox rather than prompted for download.

    Examples:

      >>> guess_mime_type('http://foo.com/blah.json')
      'text/plain'

      >>> guess_mime_type('http://foo.com/blah.cpp')
      'text/plain'

      >>> guess_mime_type('http://foo.com/blah.jpg')
      'image/jpeg'

      >>> guess_mime_type('http://foo.com/blah.goewjg')
      'text/plain'
    """

    MIME_TYPES = dict(json="text/plain",
                      cpp="text/plain",
                      c="text/plain",
                      h="text/plain",
                      css="text/css",
                      js="text/javascript")

    ext = url.split(".")[-1]
    if ext in MIME_TYPES:
        mimetype = MIME_TYPES[ext]
    else:
        mimetype = mimetypes.guess_type(url)[0]
    if not mimetype:
        mimetype = "text/plain"
    return mimetype

class Server(object):
    def __init__(self, env_root, \
                 webdocs, task_queue, expose_privileged_api=True):
        self.env_root = env_root
        self.expose_privileged_api = expose_privileged_api
        self.root = os.path.join(self.env_root, 'static-files')
        self.index = os.path.join(self.root, 'index.html')
        self.task_queue = task_queue
        self.web_docs = webdocs

    def _error(self, message):
        self.start_response(message, [('Content-type', 'text/plain')])
        yield message

    def _respond(self, parts):
        response = ''
        mimetype = 'text/html'
        try:
            if parts[0] == 'dev-guide':
                path = os.path.join(self.env_root, \
                                    'static-files', 'md', *parts)
                response = self.web_docs.create_guide_page(path)
            elif parts[0] == 'packages':
                 if len(parts) > 1 and parts[1] == 'index.json':
                     mimetype = 'text/plain'
                     response = json.dumps(self.web_docs.packages_json)
                 elif self._is_package_file_request(parts):
                     path = os.path.join(self.env_root, *parts)
                     response = self.web_docs.create_package_page(path)
                 else:
                     path = os.path.join(self.env_root, *parts)
                     response = self.web_docs.create_module_page(path)
            else:
                path = os.path.join(self.root, *parts)
                url = urllib.pathname2url(path)
                mimetype = guess_mime_type(url)
                response = open(path, 'r').read()
        except IOError, e:
            if e.errno==errno.ENOENT:
                return self._error('404 Not Found')
            else:
                return self._error('500 Internal Server Error')
        except:
                return self._error('500 Internal Server Error')
        else:
            self.start_response('200 OK', [('Content-type', mimetype)])
            return [response]

    def _is_package_file_request(self, parts):
        # format of a package file request is always:
        # "packages/<package_name>/<package_name>.html"
        if len(parts) != 3:
            return False
        return (parts[0] == 'packages') and ((parts[1] + '.html') == parts[2])

    def _respond_with_api(self, parts):
        parts = [part for part in parts
                 if part]

        if parts[0] == TASK_QUEUE_PATH:
            if not self.expose_privileged_api:
                return self._error('501 Not Implemented')
            if len(parts) == 2:
                if parts[1] == TASK_QUEUE_SET:
                    if self.environ['REQUEST_METHOD'] != 'POST':
                        return self._error('400 Bad Request')
                    input = self.environ['wsgi.input']
                    try:
                        clength = int(self.environ['CONTENT_LENGTH'])
                        content = input.read(clength)
                        content = json.loads(content)
                    except ValueError:
                        return self._error('400 Bad Request')
                    self.task_queue.put(content)
                    self.start_response('200 OK',
                                        [('Content-type', 'text/plain')])
                    return ['Task queued.']
                elif parts[1] == TASK_QUEUE_GET:
                    self.start_response('200 OK',
                                        [('Content-type', 'text/plain')])
                    try:
                        task = self.task_queue.get(
                            block=True,
                            timeout=TASK_QUEUE_GET_TIMEOUT
                            )
                    except Queue.Empty:
                        return ['']
                    return [json.dumps(task)]
                else:
                    return self._error('404 Not Found')
            else:
                return self._error('404 Not Found')
        elif parts[0] == IDLE_PATH:
            if not self.expose_privileged_api:
                return self._error('501 Not Implemented')
            if not _idle_event.isSet():
                _idle_event.set()
            return
        else:
            return self._error('404 Not Found')

    def app(self, environ, start_response):
        self.environ = environ
        self.start_response = start_response
        parts = environ['PATH_INFO'].split('/')[1:]
        if not parts:
            # Expect some sort of rewrite rule, etc. to always ensure
            # that we have at least a '/' as our path.
            return self._error('404 Not Found')
        if not parts[0]:
            parts = DEFAULT_PAGE.split('/')
        if parts[0] == API_PATH:
            return self._respond_with_api(parts[1:])
        return self._respond(parts)

def make_wsgi_app(env_root, webdocs, task_queue, expose_privileged_api=True):
    def app(environ, start_response):
        server = Server(env_root, webdocs, task_queue, expose_privileged_api)
        return server.app(environ, start_response)
    return app

def get_url(host=DEFAULT_HOST, port=DEFAULT_PORT):
    return "http://%s:%d" % (host, port)

def make_httpd(env_root, host=DEFAULT_HOST, port=DEFAULT_PORT,
               quiet=True):
    if not quiet:
        handler_class = simple_server.WSGIRequestHandler
    else:
        handler_class = QuietWSGIRequestHandler

    tq = Queue.Queue()
    web_docs = webdocs.WebDocs(env_root)
    httpd = simple_server.make_server(host, port,
                                      make_wsgi_app(env_root, web_docs, tq),
                                      ThreadedWSGIServer,
                                      handler_class)
    return httpd

def fault_tolerant_make_httpd(env_root, host=DEFAULT_HOST, port=DEFAULT_PORT):
    listening = False
    attempts_left = 10
    while not listening:
        try:
            httpd = make_httpd(env_root, host, port, quiet=True)
            listening = True
        except socket.error, e:
            print "Couldn't create server at %s:%d (%s)." % (host, port, e)
            attempts_left -= 1
            if attempts_left:
                port += 1
                print "Trying %s:%d." % (host, port)
            else:
                raise

    return (httpd, port)

def maybe_open_webpage(host=DEFAULT_HOST, port=DEFAULT_PORT):
    _idle_event.wait(IDLE_WEBPAGE_TIMEOUT)
    url = get_url(host, port)
    if _idle_event.isSet():
        print "Web browser appears to be viewing %s." % url
    else:
        print "Opening web browser to %s." % url
        webbrowser.open(url)

def start_daemonic(httpd, host=DEFAULT_HOST, port=DEFAULT_PORT):
    thread = threading.Thread(target=httpd.serve_forever)
    thread.setDaemon(True)
    thread.start()

    maybe_open_webpage(host, port)

    while True:
        _idle_event.wait(DAEMONIC_IDLE_TIMEOUT)
        if _idle_event.isSet():
            _idle_event.clear()
        else:
#            print ("Web browser is no longer viewing %s, "
#                   "shutting down server." % get_url(host, port))
            break

def start(env_root=None, host=DEFAULT_HOST, port=DEFAULT_PORT,
          quiet=False, httpd=None):
    if not httpd:
        httpd = make_httpd(env_root, host, port, quiet)
    if not quiet:
        print "Starting server at %s." % get_url(host, port)
        print "Press Ctrl-C to exit."
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print "Ctrl-C received, exiting."

def generate_static_docs(env_root, tgz_filename, base_url = ''):
    web_docs = webdocs.WebDocs(env_root, base_url)
    server = Server(env_root, web_docs,
                    task_queue=None,
                    expose_privileged_api=False)
    staging_dir = os.path.join(env_root, "addon-sdk-docs")
    if os.path.exists(staging_dir):
        shutil.rmtree(staging_dir)

    # first, copy static-files
    shutil.copytree(server.root, staging_dir)
    # py2.5 doesn't have ignore=, so we delete tempfiles afterwards. If we
    # required >=py2.6, we could use ignore=shutil.ignore_patterns("*~")
    for (dirpath, dirnames, filenames) in os.walk(staging_dir):
        for n in filenames:
            if n.endswith("~"):
                os.unlink(os.path.join(dirpath, n))

    # then copy docs from each package
    os.mkdir(os.path.join(staging_dir, "packages"))

    pkg_cfg = packaging.build_pkg_cfg(server.env_root)

    # starting with the (generated) index file
    index = json.dumps(packaging.build_pkg_index(pkg_cfg))
    index_path = os.path.join(staging_dir, "packages", 'index.json')
    open(index_path, 'w').write(index)

    # and every doc-like thing in the package
    for pkg_name, pkg in pkg_cfg['packages'].items():
        src_dir = pkg.root_dir
        dest_dir = os.path.join(staging_dir, "packages", pkg_name)
        if not os.path.exists(dest_dir):
            os.mkdir(dest_dir)

        # TODO: This is a DRY violation from main.js. We should
        # really move the common logic/names to cuddlefish.packaging.
        src_readme = os.path.join(src_dir, "README.md")
        if os.path.exists(src_readme):
            shutil.copyfile(src_readme,
                            os.path.join(dest_dir, "README.md"))

        # create the package page
        package_doc_html = web_docs.create_package_page(src_dir)
        open(os.path.join(dest_dir, pkg_name + ".html"), "w")\
            .write(package_doc_html)

        docs_src_dir = os.path.join(src_dir, "docs")
        docs_dest_dir = os.path.join(dest_dir, "docs")
        if not os.path.exists(docs_dest_dir):
            os.mkdir(docs_dest_dir)
        for (dirpath, dirnames, filenames) in os.walk(docs_src_dir):
            assert dirpath.startswith(docs_src_dir)
            relpath = dirpath[len(docs_src_dir)+1:]
            for dirname in dirnames:
                dest_path = os.path.join(docs_dest_dir, relpath, dirname)
                if not os.path.exists(dest_path):
                    os.mkdir(dest_path)
            for filename in filenames:
                if filename.endswith("~"):
                    continue
                src_path = os.path.join(dirpath, filename)
                dest_path = os.path.join(docs_dest_dir, relpath, filename)
                shutil.copyfile(src_path, dest_path)
                if filename.endswith(".md"):
                    # parse and JSONify the API docs
                    docs_md = open(src_path, 'r').read()
                    docs_parsed = list(apiparser.parse_hunks(docs_md))
                    docs_json = json.dumps(docs_parsed)
                    open(dest_path + ".json", "w").write(docs_json)
                    # write the HTML div files
                    docs_div = apirenderer.json_to_div(docs_parsed, src_path)
                    open(dest_path + ".div", "w").write(docs_div)
                    # write the standalone HTML files
                    docs_html = web_docs.create_module_page(src_path)
                    open(dest_path[:-3] + ".html", "w").write(docs_html)

    dev_guide_src = os.path.join(server.root, 'md/dev-guide')
    dev_guide_dest = os.path.join(staging_dir, 'dev-guide')
    if not os.path.exists(dev_guide_dest):
        os.mkdir(dev_guide_dest)
    for (dirpath, dirnames, filenames) in os.walk(dev_guide_src):
        assert dirpath.startswith(dev_guide_src)
        relpath = dirpath[len(dev_guide_src)+1:]
        for dirname in dirnames:
            dest_path = os.path.join(dev_guide_dest, relpath, dirname)
            if not os.path.exists(dest_path):
                os.mkdir(dest_path)
        for filename in filenames:
            if filename.endswith("~"):
                continue
            src_path = os.path.join(dirpath, filename)
            dest_path = os.path.join(dev_guide_dest, relpath, filename)
            if filename.endswith(".md"):
                # write the standalone HTML files
                docs_html = web_docs.create_guide_page(src_path)
                open(dest_path[:-3] + ".html", "w").write(docs_html)

    # make /md/dev-guide/welcome.html the top level index file
    shutil.copy(os.path.join(dev_guide_dest, 'welcome.html'), \
                os.path.join(staging_dir, 'index.html'))


    # finally, build a tarfile out of everything
    tgz = tarfile.open(tgz_filename, 'w:gz')
    tgz.add('addon-sdk-docs', 'addon-sdk-docs')
    tgz.close()
    shutil.rmtree(staging_dir)

def run_app(harness_root_dir, harness_options,
            app_type, binary=None, profiledir=None, verbose=False,
            timeout=None, logfile=None, addons=None,
            host=DEFAULT_HOST,
            port=DEV_SERVER_PORT):
    payload = json.dumps(harness_options)
    url = 'http://%s:%d/%s/%s/%s' % (host, port,
                                     API_PATH,
                                     TASK_QUEUE_PATH,
                                     TASK_QUEUE_SET)
    try:
        response = urllib2.urlopen(url, payload)
        print response.read()
    except urllib2.URLError, e:
        print "ERROR: %s while attempting to load %s" % (e, url)
        print "Is 'cfx develop' running?\n"
        raise e
    return 0

if __name__ == '__main__':
    import sys

    env_root=os.environ['CUDDLEFISH_ROOT']

    if len(sys.argv) > 1:
        if sys.argv[1] == 'daemonic':
            httpd, port = fault_tolerant_make_httpd(env_root)
            start_daemonic(httpd=httpd, port=port)
        elif sys.argv[1] == 'safe':
            app = make_wsgi_app(env_root, task_queue=None,
                                expose_privileged_api=False)
            httpd = simple_server.make_server(DEFAULT_HOST,
                                              DEFAULT_PORT, app)
            start(httpd=httpd)
        else:
            raise Exception('unrecognized command "%s"' % sys.argv[1])
    else:
        start(env_root)
