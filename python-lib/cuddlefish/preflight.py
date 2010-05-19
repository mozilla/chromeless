import os, sys
import base64
import hashlib
import simplejson as json

def my_b32encode(bytes):
    # a paddingless prettier base32 encoder
    return base64.b32encode(bytes).lower().strip("=")

def my_b32decode(s):
    # add "=" until we have a multiple of 8 characters (i.e. 40 bits / 5 bytes)
    padding = "=" * ((8-len(s)%8)%8)
    return base64.b32decode(s.upper()+padding)

def remove_prefix(s, prefix, errormsg):
    if not s.startswith(prefix):
        raise ValueError(errormsg)
    return s[len(prefix):]

def vk_to_keyid(vk):
    """Return 'jid0-XYZ', where 'XYZ' is a string that securely identifies
    a specific public key. To get a suitable add-on ID, append '@jetpack'
    to this string.
    """
    # per https://developer.mozilla.org/en/Install_Manifests#id all XPI id
    # values must either be in the form of a 128-bit GUID (crazy braces
    # and all) or in the form of an email address (crazy @ and all).
    # Firefox will refuse to install an add-on with an id that doesn't
    # match one of these forms. The actual regexp is at:
    # http://mxr.mozilla.org/mozilla-central/source/toolkit/mozapps/extensions/XPIProvider.jsm#130
    # So the JID needs an @-suffix, and the only legal punctuation is
    # "-._". So we start with a base64 encoding, and replace the
    # punctuation (+/) with letters (AB), losing a few bits of integrity.

    # even better: windows has a maximum path length limitation of 256
    # characters:
    #  http://msdn.microsoft.com/en-us/library/aa365247%28VS.85%29.aspx
    # (unless all paths are prefixed with "\\?\", I kid you not). The
    # typical install will put add-on code in a directory like:
    # C:\Documents and Settings\<username>\Application Data\Mozilla\Firefox\Profiles\232353483.default\extensions\$JID\...
    # (which is 108 chars long without the $JID).
    # Then the unpacked XPI contains packaged resources like:
    #  resources/$JID-jetpack-core-lib/main.js   (35 chars plus the $JID)
    #
    # We hash the pubkey into a 160 bit string, base64 encode that (with
    # AB instead of +/ to be path-safe), then bundle it into
    # "jid0-XYZ@jetpack". This gives us 40 characters. The resulting
    # main.js will have a path length of 224 characters, leaving us 32
    # characters of margin.

    # if length were no issue, we'd prefer to use this:
    # s = base64.b64encode(vk.to_string()).strip("=")
    h = hashlib.sha256("jetpack-id-v0:"+vk.to_string()).digest()[:160/8]
    s = base64.b64encode(h, "AB").strip("=")
    jid = "jid0-" + s
    return jid

def keyid_to_jid(keyid):
    return keyid + "@jetpack"

def create_key(keydir, name):
    # return jid
    from ecdsa import SigningKey, NIST256p
    sk = SigningKey.generate(curve=NIST256p)
    sk_text = "private-jid0-%s" % my_b32encode(sk.to_string())
    vk = sk.get_verifying_key()
    vk_text = "public-jid0-%s" % my_b32encode(vk.to_string())
    keyid = vk_to_keyid(vk)
    jid = keyid + "@jetpack"
    # save privkey to ~/.jetpack-keys/$id
    f = open(os.path.join(keydir, keyid), "w")
    f.write("private-key: %s\n" % sk_text)
    f.write("public-key: %s\n" % vk_text)
    f.write("jid: %s\n" % jid)
    f.write("name: %s\n" % name)
    f.close()
    return jid

def jid_to_keyid(jid):
    assert jid.endswith("@jetpack")
    keyid = jid[:-len("@jetpack")]
    return keyid

def check_for_privkey(keydir, jid, stdout):
    keyid = jid_to_keyid(jid)
    keypath = os.path.join(keydir, keyid)
    if not os.path.isfile(keypath):
        msg = """\
Your package.json says our Program ID is:
  %(jid)s
But I don't have a corresponding private key in:
  %(keypath)s

If you are the original developer of this package and have recently copied
the source code from a different machine to this one, you need to copy the
private key into the file named above.

Otherwise, if you are a new developer who has made a copy of an existing
package to use as a starting point, you need to remove the 'id' property
from package.json, so that we can generate a new id and keypair. This will
disassociate our new package from the old one.
"""
        print >>stdout, msg % {"jid": jid, "keypath": keypath}
        return None
    keylines = open(keypath, "r").readlines()
    keydata = {}
    for line in keylines:
        line = line.strip()
        if line:
            k,v = line.split(":", 1)
            keydata[k.strip()] = v.strip()
    if "private-key" not in keydata:
        raise ValueError("invalid keydata: can't find 'private-key' line")
    sk_s = remove_prefix(keydata["private-key"], "private-jid0-",
                         errormsg="unable to parse private-key data")
    from ecdsa import SigningKey, VerifyingKey, NIST256p
    sk = SigningKey.from_string(my_b32decode(sk_s), curve=NIST256p)
    vk = sk.get_verifying_key()

    jid_2 = keyid_to_jid(vk_to_keyid(vk))
    if jid_2 != jid:
        raise ValueError("invalid keydata: private-key in %s does not match"
                         " public key for %s" % (keypath, jid))
    vk_s = remove_prefix(keydata["public-key"], "public-jid0-",
                         errormsg="unable to parse public-key data")
    vk2 = VerifyingKey.from_string(my_b32decode(vk_s), curve=NIST256p)
    if vk.to_string() != vk2.to_string():
        raise ValueError("invalid keydata: public-key mismatch")
    return sk

def preflight_config(target_cfg, filename, stdout=sys.stdout, keydir=None):
    # check the top-level package.json for missing keys. We generate anything
    # that we can, and ask the user for the rest.
    if keydir is None:
        keydir = os.path.expanduser("~/.jetpack/keys")
    modified = False
    config = json.load(open(filename, 'r'))

    name = target_cfg["name"] # defaults to parentdir if not set

    if "id" not in config:
        print >>stdout, ("No 'id' in package.json: creating a new"
                         " keypair for you.")
        if not os.path.isdir(keydir):
            os.makedirs(keydir, 0700) # not world readable
        
        jid = create_key(keydir, name)
        config["id"] = jid
        modified = True

    # make sure we have the privkey: this catches the case where developer B
    # copies an add-on from developer A and then (accidentally) tries to
    # publish it without replacing the JID

    sk = check_for_privkey(keydir, config["id"], stdout)
    if not sk:
        return False, False

    if modified:
        i = 0
        backup = filename + ".backup"
        while os.path.exists(backup):
            if i > 1000:
                raise ValueError("I'm having problems finding a good name"
                                 " for the backup file. Please move %s out"
                                 " of the way and try again."
                                 % (filename + ".backup"))
            backup = filename + ".backup-%d" % i
            i += 1
        os.rename(filename, backup)
        new_json = json.dumps(config, indent=4)
        open(filename, 'w').write(new_json+"\n")
        return False, True

    return True, False
