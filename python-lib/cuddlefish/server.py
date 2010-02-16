import os
import time
import threading
import urllib
import urllib2
import mimetypes
import Queue
import SocketServer
from wsgiref import simple_server

from cuddlefish import packaging
from cuddlefish import Bunch
import simplejson as json

DEFAULT_PORT = 8888
DEFAULT_HOST = '127.0.0.1'

API_PATH = 'api'
IDLE_PATH = 'idle'
IDLE_TIMEOUT = 60
TASK_QUEUE_PATH = 'task-queue'
TASK_QUEUE_SET = 'set'
TASK_QUEUE_GET = 'get'
TASK_QUEUE_GET_TIMEOUT = 1

first_idle_received = threading.Event()

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
    def __init__(self, env_root, task_queue):
        self.env_root = env_root
        self.root = os.path.join(self.env_root, 'static-files')
        self.index = os.path.join(self.root, 'html', 'index.html')
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

    def _respond_with_package(self, root_dir):
        self.start_response('200 OK',
                            [('Content-type', 'text/plain')])
        files = self._get_files_in_dir(root_dir)
        yield json.dumps(files)

    def _respond_with_api(self, parts):
        pkg_cfg = packaging.build_config(self.env_root,
                                         Bunch(name='dummy'))
        del pkg_cfg.packages['dummy']

        parts = [part for part in parts
                 if part]

        if parts[0] == TASK_QUEUE_PATH:
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
            if not first_idle_received.isSet():
                first_idle_received.set()
            self.start_response('200 OK',
                                [('Content-type', 'text/plain')])
            time.sleep(IDLE_TIMEOUT)
            return ['Idle complete (%s seconds)' % IDLE_TIMEOUT]
        elif parts[0] == 'packages':
            if len(parts) == 1:
                # TODO: This should really be of JSON's mime type,
                # but Firefox doesn't let us browse this way so
                # we'll just return text/plain for now.
                self.start_response('200 OK',
                                    [('Content-type', 'text/plain')])
                for pkg in pkg_cfg.packages:
                    root_dir = pkg_cfg.packages[pkg].root_dir
                    files = self._get_files_in_dir(root_dir)
                    pkg_cfg.packages[pkg].files = files
                    del pkg_cfg.packages[pkg].root_dir
                return [json.dumps(pkg_cfg.packages)]
            else:
                pkg_name = parts[1]
                if pkg_name not in pkg_cfg.packages:
                    return self._respond('404 Not Found')
                else:
                    root_dir = pkg_cfg.packages[pkg_name].root_dir
                    if len(parts) == 2:
                        return self._respond_with_package(root_dir)
                    else:
                        dir_path = os.path.join(root_dir, *parts[2:])
                        if not (os.path.exists(dir_path) and
                                os.path.isfile(dir_path)):
                            return self._respond('404 Not Found')
                        else:
                            return self._respond_with_file(dir_path)
        else:
            return self._respond('404 Not Found')

    def app(self, environ, start_response):
        self.environ = environ
        self.start_response = start_response

        parts = environ['PATH_INFO'].split('/')[1:]
        if not parts[0]:
            parts = ['html', 'index.html']
        if parts[0] == API_PATH:
            return self._respond_with_api(parts[1:])
        else:
            fullpath = os.path.join(self.root, *parts)
            fullpath = os.path.normpath(fullpath)
            if not (fullpath.startswith(self.root) and
                    os.path.exists(fullpath) and
                    os.path.isfile(fullpath)):
                return self._respond('404 Not Found')
            else:
                return self._respond_with_file(fullpath)

def make_wsgi_app(env_root, task_queue):
    def app(environ, start_response):
        server = Server(env_root, task_queue)
        return server.app(environ, start_response)
    return app

def get_url(host=DEFAULT_HOST, port=DEFAULT_PORT):
    return "http://%s:%d" % (host, port)

def start(env_root, host=DEFAULT_HOST, port=DEFAULT_PORT,
          quiet=False):
    if not quiet:
        print "Starting server at %s." % get_url(host, port)
        print "Press Ctrl-C to exit."
        handler_class = simple_server.WSGIRequestHandler
    else:
        handler_class = QuietWSGIRequestHandler

    tq = Queue.Queue()
    httpd = simple_server.make_server(host, port,
                                      make_wsgi_app(env_root, tq),
                                      ThreadedWSGIServer,
                                      handler_class)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print "Ctrl-C received, exiting."

def run_app(harness_root_dir, harness_options, xpts,
            app_type, binary=None, verbose=False,
            no_quit=False, timeout=None,
            port=DEFAULT_PORT):
    payload = json.dumps(harness_options)
    url = 'http://127.0.0.1:%d/%s/%s/%s' % (port,
                                            API_PATH,
                                            TASK_QUEUE_PATH,
                                            TASK_QUEUE_SET)
    response = urllib2.urlopen(url, payload)
    print response.read()
    return 0

if __name__ == '__main__':
    start(env_root=os.environ['CUDDLEFISH_ROOT'])
