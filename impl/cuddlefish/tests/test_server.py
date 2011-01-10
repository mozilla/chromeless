import os
import unittest

from cuddlefish import server
from cuddlefish.tests import env_root

class ServerTests(unittest.TestCase):
    def test_generate_static_docs_does_not_smoke(self):
        filename = 'testdocs.tgz'
        if os.path.exists(filename):
            os.remove(filename)
        server.generate_static_docs(env_root, tgz_filename=filename)
        self.assertTrue(os.path.exists(filename))
        os.remove(filename)

class UnprivilegedServerTests(unittest.TestCase):
    def request(self, path, method='GET'):
        app = server.make_wsgi_app(env_root, task_queue=None,
                                   expose_privileged_api=False)

        def start_response(code, headers):
            pass

        environ = {'PATH_INFO': path,
                   'REQUEST_METHOD': method}

        responses = [string for string in app(environ, start_response)]
        return ''.join(responses)

    def test_privileged_api_returns_404(self):
        self.assertEqual(self.request('/api/blah'),
                         '404 Not Found')

    def test_privileged_api_returns_501(self):
        self.assertEqual(self.request('/api/idle'),
                         '501 Not Implemented')
        self.assertEqual(self.request('/api/task-queue'),
                         '501 Not Implemented')

    def test_404(self):
        self.assertEqual(self.request('/bleh'), '404 Not Found')

    def test_api_404(self):
        self.assertEqual(self.request('/api/bleh'), '404 Not Found')

    def test_unknown_package_404(self):
        self.assertEqual(self.request('/packages/bleh'), '404 Not Found')

    def test_package_file_404(self):
        self.assertEqual(self.request('/packages/api-utils/bleh'),
                         '404 Not Found')

    def test_package_file_200(self):
        readme = self.request('/packages/api-utils/README.md')
        self.assertTrue('Jetpack Core' in readme)

    def test_packages_index_json_200(self):
        info = server.json.loads(self.request('/packages/index.json'))
        self.assertEqual(type(info), dict)
        self.assertTrue('api-utils' in info)

    def test_404_on_blank_path(self):
        self.assertEqual(self.request(''), '404 Not Found')

    def test_ensure_index_returned_on_root_path(self):
        self.assertTrue('<html>' in self.request('/'))

if __name__ == '__main__':
    unittest.main()
