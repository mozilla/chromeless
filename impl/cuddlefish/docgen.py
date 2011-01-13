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

from cuddlefish import packaging
from cuddlefish import Bunch
from cuddlefish import apiparser
from cuddlefish import apirenderer
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
                      h="text/plain")

    ext = url.split(".")[-1]
    if ext in MIME_TYPES:
        mimetype = MIME_TYPES[ext]
    else:
        mimetype = mimetypes.guess_type(url)[0]
    if not mimetype:
        mimetype = "text/plain"
    return mimetype

class DocGen(object):
    def __init__(self, env_root, expose_privileged_api=True):
        self.env_root = env_root
        self.expose_privileged_api = expose_privileged_api
        self.root = os.path.join(self.env_root, 'docs')
        self.index = os.path.join(self.root, 'index.html')

    def _respond(self, message):
        self.start_response(message,
                            [('Content-type', 'text/plain')])
        yield message

    def _respond_with_file(self, path):
        url = urllib.pathname2url(path)
        mimetype = guess_mime_type(url)
        self.start_response('200 OK',
                            [('Content-type', mimetype)])
        yield open(path, 'r').read()

    def _respond_with_apidoc_json(self, path):
        docs_md = open(path, 'r').read()
        try:
            parsed = list(apiparser.parse_hunks(docs_md))
            self.start_response('200 OK',
                                [('Content-type', "text/plain")])
            return [json.dumps(parsed)]
        except apiparser.ParseError, e:
            self.start_response('500 Parse Error',
                                [('Content-type', "text/plain")])
            return [str(e)]

    def _respond_with_apidoc_div(self, path):
        docs_md = open(path, 'r').read()
        try:
            parsed = apirenderer.md_to_div(path)
            self.start_response('200 OK',
                                [('Content-type', "text/html")])
            return [parsed]
        except apirenderer.ParseError, e:
            self.start_response('500 Parse Error',
                                [('Content-type', "text/plain")])
            return [str(e)]

    def _get_files_in_dir(self, path):
        data = {}
        files = os.listdir(path)
        for filename in files:
            fullpath = os.path.join(path, filename)
            if os.path.isdir(fullpath):
                data[filename] = self._get_files_in_dir(fullpath)
            else:
                try:
                    info = os.stat(fullpath)
                    data[filename] = dict(size=info.st_size)
                except OSError:
                    pass
        return data

    def build_pkg_index(self, pkg_cfg):
        pkg_cfg = copy.deepcopy(pkg_cfg)
        for pkg in pkg_cfg.packages:
            root_dir = pkg_cfg.packages[pkg].root_dir
            files = self._get_files_in_dir(root_dir)
            pkg_cfg.packages[pkg].files = files
            del pkg_cfg.packages[pkg].root_dir
        return pkg_cfg.packages

    def build_pkg_cfg(self):
        pkg_cfg = packaging.build_config(self.env_root,
                                         Bunch(name='dummy'))
        del pkg_cfg.packages['dummy']
        return pkg_cfg

    def _respond_with_pkg_file(self, parts):
        if not parts:
            return self._respond('404 Not Found')

        try:
            pkg_cfg = self.build_pkg_cfg()
        except packaging.Error, e:
            self.start_response('500 Internal Server Error',
                                [('Content-type', 'text/plain')])
            return [traceback.format_exc()]

        if parts[0] == 'index.json':
            # TODO: This should really be of JSON's mime type,
            # but Firefox doesn't let us browse this way so
            # we'll just return text/plain for now.
            self.start_response('200 OK',
                                [('Content-type', 'text/plain')])
            return [json.dumps(self.build_pkg_index(pkg_cfg))]

        pkg_name = parts[0]
        if pkg_name not in pkg_cfg.packages:
            return self._respond('404 Not Found')
        else:
            root_dir = pkg_cfg.packages[pkg_name].root_dir
            if len(parts) == 1:
                return self._respond('404 Not Found')
            else:
                dir_path = os.path.join(root_dir, *parts[1:])
                dir_path = os.path.normpath(dir_path)
                parse_json = False
                parse_div = False
                if dir_path.endswith(".md.json"):
                    parse_json = True
                    dir_path = dir_path[:-len(".json")]
                if dir_path.endswith(".md.div"):
                    parse_div = True
                    dir_path = dir_path[:-len(".div")]
                if not (dir_path.startswith(root_dir) and
                        os.path.exists(dir_path) and
                        os.path.isfile(dir_path)):
                    return self._respond('404 Not Found')
                else:
                    if parse_json:
                        return self._respond_with_apidoc_json(dir_path)
                    elif parse_div:
                        return self._respond_with_apidoc_div(dir_path)
                    else:
                        return self._respond_with_file(dir_path)

    def _respond_with_api(self, parts):
        parts = [part for part in parts
                 if part]

        if parts[0] == TASK_QUEUE_PATH:
            if not self.expose_privileged_api:
                return self._respond('501 Not Implemented')
            if len(parts) == 2:
                if parts[1] == TASK_QUEUE_SET:
                    if self.environ['REQUEST_METHOD'] != 'POST':
                        return self._respond('400 Bad Request')
                    input = self.environ['wsgi.input']
                    try:
                        clength = int(self.environ['CONTENT_LENGTH'])
                        content = input.read(clength)
                        content = json.loads(content)
                    except ValueError:
                        return self._respond('400 Bad Request')
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
                    return self._respond('404 Not Found')
            else:
                return self._respond('404 Not Found')
        elif parts[0] == IDLE_PATH:
            if not self.expose_privileged_api:
                return self._respond('501 Not Implemented')
            # TODO: Yuck, we're accessing a protected property; any
            # way to wait for a second w/o doing this?
            sock = self.environ['wsgi.input']._sock
            sock.settimeout(1.0)
            for i in range(IDLE_TIMEOUT):
                try:
                    sock.recv(1)
                except socket.timeout:
                    pass
                if not _idle_event.isSet():
                    _idle_event.set()
            self.start_response('200 OK',
                                [('Content-type', 'text/plain')])
            return ['Idle complete (%s seconds)' % IDLE_TIMEOUT]
        else:
            return self._respond('404 Not Found')

    def app(self, environ, start_response):
        self.environ = environ
        self.start_response = start_response

        parts = environ['PATH_INFO'].split('/')[1:]
        if not parts:
            # Expect some sort of rewrite rule, etc. to always ensure
            # that we have at least a '/' as our path.
            return self._respond('404 Not Found')
        if not parts[0]:
            parts = ['index.html']
        if parts[0] == API_PATH:
            return self._respond_with_api(parts[1:])
        elif parts[0] == 'packages':
            return self._respond_with_pkg_file(parts[1:])
        else:
            fullpath = os.path.join(self.root, *parts)
            fullpath = os.path.normpath(fullpath)
            if not (fullpath.startswith(self.root) and
                    os.path.exists(fullpath) and
                    os.path.isfile(fullpath)):
                return self._respond('404 Not Found')
            else:
                return self._respond_with_file(fullpath)

def generate_static_docs(env_root, output_dir):
    docgen = DocGen(env_root=env_root,
                    expose_privileged_api=False)

    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)

    # first, copy static-files
    shutil.copytree(docgen.root, output_dir)
    # py2.5 doesn't have ignore=, so we delete tempfiles afterwards. If we
    # required >=py2.6, we could use ignore=shutil.ignore_patterns("*~")
    for (dirpath, dirnames, filenames) in os.walk(output_dir):
        for n in filenames:
            if n.endswith("~"):
                os.unlink(os.path.join(dirpath, n))

    # then copy docs from each package
    os.mkdir(os.path.join(output_dir, "packages"))

    pkg_cfg = docgen.build_pkg_cfg()

    # starting with the (generated) index file
    index = json.dumps(docgen.build_pkg_index(pkg_cfg))
    index_path = os.path.join(output_dir, "packages", 'index.json')
    open(index_path, 'w').write(index)

    # and every doc-like thing in the package
    for pkg_name, pkg in pkg_cfg['packages'].items():
        src_dir = pkg.root_dir
        dest_dir = os.path.join(output_dir, "packages", pkg_name)
        if not os.path.exists(dest_dir):
            os.mkdir(dest_dir)

        # TODO: This is a DRY violation from main.js. We should
        # really move the common logic/names to cuddlefish.packaging.
        src_readme = os.path.join(src_dir, "README.md")
        if os.path.exists(src_readme):
            shutil.copyfile(src_readme,
                            os.path.join(dest_dir, "README.md"))

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
                    open(dest_path + ".div.html", "w").write(docs_div)
                    # write the standalone HTML files
                    docs_html = apirenderer.json_to_html(docs_parsed, src_path)
                    open(dest_path + ".html", "w").write(docs_html)

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
    response = urllib2.urlopen(url, payload)
    print response.read()
    return 0
