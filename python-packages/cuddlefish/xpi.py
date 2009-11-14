import os
import zipfile
import uuid

import simplejson as json
import cuddlefish.rdfutils

def build_xpi(template_root_dir, target_cfg, xpi_name,
              harness_options, xpts):
    install_rdf = os.path.join(template_root_dir, "install.rdf")
    manifest = cuddlefish.rdfutils.RDFManifest(install_rdf)

    manifest.set("em:id",
                 target_cfg.get('id', '{%s}' % str(uuid.uuid4())))
    manifest.set("em:version",
                 target_cfg.get('version', '1.0'))
    manifest.set("em:name",
                 target_cfg['name'])
    manifest.set("em:description",
                 target_cfg.get("description", ""))
    manifest.set("em:creator",
                 target_cfg.get("author", ""))

    print "Exporting extension to %s." % xpi_name

    zf = zipfile.ZipFile(xpi_name, "w", zipfile.ZIP_DEFLATED)

    open('.install.rdf', 'w').write(str(manifest))
    zf.write('.install.rdf', 'install.rdf')
    os.remove('.install.rdf')

    harness_component = os.path.join(template_root_dir, 'components',
                                     'harness.js')
    zf.write(harness_component, os.path.join('components',
                                             'harness.js'))
    for abspath in xpts:
        zf.write(str(abspath),
                 str(os.path.join('components',
                                  os.path.basename(abspath))))

    IGNORED_FILES = [".hgignore", "install.rdf", xpi_name]
    IGNORED_DIRS = [".svn", ".hg"]

    new_resources = {}
    for resource in harness_options['resources']:
        base_arcpath = os.path.join('resources', resource)
        new_resources[resource] = ['resources', resource]
        abs_dirname = harness_options['resources'][resource]
        for dirpath, dirnames, filenames in os.walk(abs_dirname):
            goodfiles = [filename for filename in filenames
                         if filename not in IGNORED_FILES]
            for filename in goodfiles:
                abspath = os.path.join(dirpath, filename)
                arcpath = abspath[len(abs_dirname)+1:]
                arcpath = os.path.join(base_arcpath, arcpath)
                zf.write(str(abspath), str(arcpath))
            dirnames[:] = [dirname for dirname in dirnames
                           if dirname not in IGNORED_DIRS]
    harness_options['resources'] = new_resources

    open('.options.json', 'w').write(json.dumps(harness_options))
    zf.write('.options.json', 'harness-options.json')
    os.remove('.options.json')

    zf.close()
