import os
import urllib
import mimetypes
from wsgiref import simple_server

from cuddlefish import packaging
from cuddlefish import Bunch
import simplejson as json

DEFAULT_PORT = 8888

def guess_mime_type(url):
    if url.endswith(".json"):
        mimetype = "text/plain"
    else:
        mimetype = mimetypes.guess_type(url)[0]
    if not mimetype:
        mimetype = "text/plain"
    return mimetype

class Server(object):
    def __init__(self, env_root):
        self.env_root = env_root
        self.root = os.path.join(self.env_root, 'static-files')
        self.index = os.path.join(self.root, 'html', 'index.html')

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

        if parts[0] == 'packages':
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
        if parts[0] == 'api':
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

def start(env_root, host='127.0.0.1', port=DEFAULT_PORT):
    print "Starting server on %s:%d." % (host, port)
    print "Press Ctrl-C to exit."
    server = Server(env_root)
    httpd = simple_server.make_server(host, port, server.app)
    httpd.serve_forever()
