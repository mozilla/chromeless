import xml.dom.minidom
import cStringIO as StringIO

class RDFManifest(object):
    def __init__(self, path):
        self.dom = xml.dom.minidom.parse(path)

    def __str__(self):
        buf = StringIO.StringIO()
        self.dom.writexml(buf, encoding="utf-8")
        return buf.getvalue()

    def set(self, property, value):
        elements = self.dom.documentElement.getElementsByTagName(property)
        if not elements:
            raise ValueError("Element with value not found: %s" % property)
        elements[0].firstChild.nodeValue = value

    def get(self, property, default=None):
        elements = self.dom.documentElement.getElementsByTagName(property)
        if not elements:
            return default
        return elements[0].firstChild.nodeValue
