
import os, shutil
import simplejson as json
import unittest
import hashlib
import base64
from cuddlefish import preflight
from StringIO import StringIO

class Util(unittest.TestCase):
    def get_basedir(self):
        return os.path.join("_test_tmp", self.id())
    def make_basedir(self):
        basedir = self.get_basedir()
        if os.path.isdir(basedir):
            here = os.path.abspath(os.getcwd())
            assert os.path.abspath(basedir).startswith(here) # safety
            shutil.rmtree(basedir)
        os.makedirs(basedir)
        return basedir

    def test_base32(self):
        for l in range(1, 100):
            text = "a" * l
            encoded = preflight.my_b32encode(text)
            decoded = preflight.my_b32decode(encoded)
            self.assertEqual(text, decoded, (text, encoded, decoded))

    def test_base62(self):
        for i in range(1000):
            h = hashlib.sha1(str(i)).digest()
            s1 = base64.b64encode(h, "AB").strip("=")
            s2 = base64.b64encode(h).strip("=").replace("+","A").replace("/","B")
            self.failUnlessEqual(s1, s2)

    def test_remove_prefix(self):
        self.assertEqual(preflight.remove_prefix("jid0-stuff", "jid0-", "err"),
                         "stuff")
        self.assertRaises(ValueError, preflight.remove_prefix,
                          "missing-prefix", "jid0-", "errmsg")

    def write(self, config):
        basedir = self.get_basedir()
        fn = os.path.join(basedir, "package.json")
        open(fn,"w").write(config)
    def read(self):
        basedir = self.get_basedir()
        fn = os.path.join(basedir, "package.json")
        return open(fn,"r").read()

    def get_cfg(self):
        cfg = json.loads(self.read())
        if "name" not in cfg:
            # the cfx parser always provides a name, even if package.json
            # doesn't contain one
            cfg["name"] = "pretend name"
        return cfg

    def parse(self, keydata):
        fields = {}
        fieldnames = []
        for line in keydata.split("\n"):
            if line.strip():
                k,v = line.split(":", 1)
                k = k.strip() ; v = v.strip()
                fields[k] = v
                fieldnames.append(k)
        return fields, fieldnames

    def test_no_name(self):
        basedir = self.make_basedir()
        fn = os.path.join(basedir, "package.json")
        keydir = os.path.join(basedir, "keys")

        # empty config is not ok: need id (name is automatically supplied)
        config_orig = "{}"
        self.write(config_orig)
        out = StringIO()
        cfg = self.get_cfg()
        config_was_ok, modified = preflight.preflight_config(cfg, fn,
                                                             stderr=out,
                                                             keydir=keydir)
        self.failUnlessEqual(config_was_ok, False)
        self.failUnlessEqual(modified, True)
        backup_fn = os.path.join(basedir, "package.json.backup")
        config_backup = open(backup_fn,"r").read()
        self.failUnlessEqual(config_backup, config_orig)
        config = json.loads(self.read())
        self.failIf("name" in config)
        self.failUnless("id" in config)
        self.failUnlessEqual(out.getvalue().strip(),
                             "No 'id' in package.json: creating a new keypair for you.")
        jid = str(config["id"])
        keyfile = os.path.join(keydir, jid)
        fields, fieldnames = self.parse(open(keyfile).read())
        self.failUnlessEqual(fieldnames[0], "private-key")
        privkey = fields["private-key"]
        self.failUnless(privkey.startswith("private-jid0-"), privkey)
        self.failUnlessEqual(fields["jid"], jid)
        self.failUnlessEqual(fields["name"], "pretend name")
        os.unlink(backup_fn)

        # just a name? we add the id
        config_orig = '{"name": "my-awesome-package"}'
        self.write(config_orig)
        out = StringIO()
        cfg = self.get_cfg()
        config_was_ok, modified = preflight.preflight_config(cfg, fn,
                                                             stderr=out,
                                                             keydir=keydir)
        self.failUnlessEqual(config_was_ok, False)
        self.failUnlessEqual(modified, True)
        backup_fn = os.path.join(basedir, "package.json.backup")
        config_backup = open(backup_fn,"r").read()
        self.failUnlessEqual(config_backup, config_orig)
        config = json.loads(self.read())
        self.failUnlessEqual(config["name"], "my-awesome-package")
        self.failUnless("id" in config)
        self.failUnlessEqual(out.getvalue().strip(),
                             "No 'id' in package.json: creating a new keypair for you.")
        jid = str(config["id"])
        keyfile = os.path.join(keydir, jid)
        fields, fieldnames = self.parse(open(keyfile).read())
        privkey = fields["private-key"]
        self.failUnless(privkey.startswith("private-jid0-"), privkey)
        self.failUnlessEqual(fields["jid"], jid)
        self.failUnlessEqual(fields["name"], "my-awesome-package")

        # name and valid id? great! ship it!
        config2 = '{"name": "my-awesome-package", "id": "%s"}' % jid
        self.write(config2)
        out = StringIO()
        cfg = self.get_cfg()
        config_was_ok, modified = preflight.preflight_config(cfg, fn,
                                                             stderr=out,
                                                             keydir=keydir)
        self.failUnlessEqual(config_was_ok, True)
        self.failUnlessEqual(modified, False)
        config2a = self.read()
        self.failUnlessEqual(config2a, config2)
        self.failUnlessEqual(out.getvalue().strip(), "")

        # name and invalid id? tell them to get a new one
        os.unlink(keyfile)
        self.write(config2)
        out = StringIO()
        cfg = self.get_cfg()
        config_was_ok, modified = preflight.preflight_config(cfg, fn,
                                                             stderr=out,
                                                             keydir=keydir)
        self.failUnlessEqual(config_was_ok, False)
        self.failUnlessEqual(modified, False)
        out = out.getvalue().strip()
        self.failUnless("Your package.json says our ID is" in out, out)
        self.failUnless("But I don't have a corresponding private key in"
                        in out, out)
        self.failUnless("If you are the original developer" in out, out)
        self.failUnless("Otherwise, if you are a new developer" in out, out)


if __name__ == '__main__':
    unittest.main()
