import unittest
import xml.dom.minidom

from cuddlefish import rdf


class RDFTests(unittest.TestCase):
    def testBug567660(self):
        obj = rdf.RDF()
        data = u'\u2026'.encode('utf-8')
        x = '<?xml version="1.0" encoding="utf-8"?><blah>%s</blah>' % data
        obj.dom = xml.dom.minidom.parseString(x)
        self.assertEqual(obj.dom.documentElement.firstChild.nodeValue,
                         u'\u2026')
        self.assertEqual(str(obj).replace("\n",""), x.replace("\n",""))
