import xml.dom.minidom
import cStringIO as StringIO

RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
EM_NS = "http://www.mozilla.org/2004/em-rdf#"

class RDF(object):
    def __str__(self):
        buf = StringIO.StringIO()
        self.dom.writexml(buf, encoding="utf-8")
        return buf.getvalue()

class RDFUpdate(RDF):
    def __init__(self):
        impl = xml.dom.minidom.getDOMImplementation()
        self.dom = impl.createDocument(RDF_NS, "RDF", None)
        self.dom.documentElement.setAttribute("xmlns", RDF_NS)
        self.dom.documentElement.setAttribute("xmlns:em", EM_NS)

    def _make_node(self, name, value, parent):
        elem = self.dom.createElement(name)
        elem.appendChild(self.dom.createTextNode(value))
        parent.appendChild(elem)
        return elem

    def add(self, manifest, update_link):
        desc = self.dom.createElement("Description")
        desc.setAttribute(
            "about",
            "urn:mozilla:extension:%s" % manifest.get("em:id")
            )
        self.dom.documentElement.appendChild(desc)

        updates = self.dom.createElement("em:updates")
        desc.appendChild(updates)

        seq = self.dom.createElement("Seq")
        updates.appendChild(seq)

        li = self.dom.createElement("li")
        seq.appendChild(li)

        li_desc = self.dom.createElement("Description")
        li.appendChild(li_desc)

        self._make_node("em:version", manifest.get("em:version"),
                        li_desc)

        apps = manifest.dom.documentElement.getElementsByTagName(
            "em:targetApplication"
            )

        for app in apps:
            target_app = self.dom.createElement("em:targetApplication")
            li_desc.appendChild(target_app)

            ta_desc = self.dom.createElement("Description")
            target_app.appendChild(ta_desc)

            for name in ["em:id", "em:minVersion", "em:maxVersion"]:
                elem = app.getElementsByTagName(name)[0]
                self._make_node(name, elem.firstChild.nodeValue, ta_desc)
            
            self._make_node("em:updateLink", update_link, ta_desc)

class RDFManifest(RDF):
    def __init__(self, path):
        self.dom = xml.dom.minidom.parse(path)

    def set(self, property, value):
        elements = self.dom.documentElement.getElementsByTagName(property)
        if not elements:
            raise ValueError("Element with value not found: %s" % property)
        if not elements[0].firstChild:
            elements[0].appendChild(self.dom.createTextNode(value))
        else:
            elements[0].firstChild.nodeValue = value

    def get(self, property, default=None):
        elements = self.dom.documentElement.getElementsByTagName(property)
        if not elements:
            return default
        return elements[0].firstChild.nodeValue

if __name__ == "__main__":
    import os

    print "Running smoke test."
    install_rdf = os.path.join(os.path.dirname(__file__), 'app-extension',
                               'install.rdf')
    manifest = RDFManifest(install_rdf)
    update = RDFUpdate()
    update.add(manifest, "https://foo.com/foo.xpi")
    exercise_str = str(manifest) + str(update)
    for tagname in ["em:targetApplication", "em:version", "em:id"]:
        if not len(update.dom.getElementsByTagName(tagname)):
            raise Exception("tag does not exist: %s" % tagname)
        if not update.dom.getElementsByTagName(tagname)[0].firstChild:
            raise Exception("tag has no children: %s" % tagname)
    print "Success!"
