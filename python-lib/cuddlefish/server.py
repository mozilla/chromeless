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

from cuddlefish import packaging
from cuddlefish import Bunch
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

DEFAULT_PORT = 8888
DEFAULT_HOST = '127.0.0.1'

API_PATH = 'api'
IDLE_PATH = 'idle'
IDLE_TIMEOUT = 60
TASK_QUEUE_PATH = 'task-queue'
TASK_QUEUE_SET = 'set'
TASK_QUEUE_GET = 'get'
TASK_QUEUE_GET_TIMEOUT = 1
DAEMONIC_IDLE_TIMEOUT = 8.0
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

def guess_mime_type(url):
    if url.endswith(".json"):
        mimetype = "text/plain"
    else:
        mimetype = mimetypes.guess_type(url)[0]
    if not mimetype:
        mimetype = "text/plain"
    return mimetype

class Server(object):
    def __init__(self, env_root, task_queue, expose_privileged_api=True):
        self.env_root = env_root
        self.expose_privileged_api = expose_privileged_api
        self.root = os.path.join(self.env_root, 'static-files')
        self.index = os.path.join(self.root, 'index.html')
        self.task_queue = task_queue

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

    def _get_files_in_dir(self, path):
        data = {}
        files = os.listdir(path)
        for filename in files:
            fullpath = os.path.join(path, filename)
            if os.path.isdir(fullpath):
                data[filename] = self._get_files_in_dir(fullpath)
            else:
                info = os.stat(fullpath)
                data[filename] = dict(size=info.st_size)
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
            return [str(e)]

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
                if not (dir_path.startswith(root_dir) and
                        os.path.exists(dir_path) and
                        os.path.isfile(dir_path)):
                    return self._respond('404 Not Found')
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

def make_wsgi_app(env_root, task_queue, expose_privileged_api=True):
    def app(environ, start_response):
        server = Server(env_root, task_queue, expose_privileged_api)
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
    httpd = simple_server.make_server(host, port,
                                      make_wsgi_app(env_root, tq),
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
            #print ("Web browser is no longer viewing %s, "
            #       "shutting down server." % get_url(host, port))
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

def generate_static_docs(env_root, tgz_filename):
    import shutil
    import tarfile

    server = Server(env_root=env_root,
                    task_queue=None,
                    expose_privileged_api=False)
    root_dir = os.path.join(server.root, 'packages')

    if os.path.exists(root_dir):
        shutil.rmtree(root_dir)

    pkg_cfg = server.build_pkg_cfg()

    os.mkdir(root_dir)

    index = json.dumps(server.build_pkg_index(pkg_cfg))
    index_path = os.path.join(root_dir, 'index.json')
    open(index_path, 'w').write(index)

    for pkg_name, pkg in pkg_cfg['packages'].items():
        dir_made = False
        src_dir = pkg.root_dir
        dest_dir = os.path.join(root_dir, pkg_name)

        # TODO: This is a DRY violation from main.js. We should
        # really move the common logic/names to cuddlefish.packaging.
        default_items = ['README.md', 'docs']

        for item in default_items:
            item_src = os.path.join(src_dir, item)
            item_dest = os.path.join(dest_dir, item)
            if os.path.exists(item_src):
                if not dir_made:
                    os.mkdir(dest_dir)
                    dir_made = True
                if os.path.isdir(item_src):
                    shutil.copytree(item_src, item_dest)
                else:
                    shutil.copyfile(item_src, item_dest)

    tgz = tarfile.open(tgz_filename, 'w:gz')
    tgz.add(server.root, 'jetpack-sdk-docs')
    tgz.close()

    shutil.rmtree(root_dir)

def run_app(harness_root_dir, harness_options, xpts,
            app_type, binary=None, profiledir=None, verbose=False,
            no_quit=False, timeout=None,
            host=DEFAULT_HOST,
            port=DEFAULT_PORT):
    payload = json.dumps(harness_options)
    url = 'http://%s:%d/%s/%s/%s' % (host, port,
                                     API_PATH,
                                     TASK_QUEUE_PATH,
                                     TASK_QUEUE_SET)
    response = urllib2.urlopen(url, payload)
    print response.read()
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
