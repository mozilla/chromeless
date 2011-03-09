
import os, sys, re, hashlib
from cuddlefish.bunch import Bunch

COMMENT_PREFIXES = ["//", "/*", "*", "\'", "\""]

REQUIRE_RE = r"(?<![\'\"])require\s*\(\s*[\'\"]([^\'\"]+?)[\'\"]\s*\)"

# detect the define idiom of the form:
#   define("module name", ["dep1", "dep2", "dep3"], function() {})
# by capturing the contents of the list in a group.
DEF_RE = re.compile(r"(require|define)\s*\(\s*([\'\"][^\'\"]+[\'\"]\s*,)?\s*\[([^\]]+)\]")

# Out of the async dependencies, do not allow quotes in them.
DEF_RE_ALLOWED = re.compile(r"^[\'\"][^\'\"]+[\'\"]$")

def scan_requirements_with_grep(fn, lines):
    requires = Bunch()
    for line in lines:
        for clause in line.split(";"):
            clause = clause.strip()
            iscomment = False
            for commentprefix in COMMENT_PREFIXES:
                if clause.startswith(commentprefix):
                    iscomment = True
            if iscomment:
                continue
            mo = re.search(REQUIRE_RE, clause)
            if mo:
                modname = mo.group(1)
                requires[modname] = Bunch()

    # define() can happen across multiple lines, so join everyone up.
    wholeshebang = "\n".join(lines)
    for match in DEF_RE.finditer(wholeshebang):
        # this should net us a list of string literals separated by commas
        for strbit in match.group(3).split(","):
            strbit = strbit.strip()
            # There could be a trailing comma netting us just whitespace, so
            # filter that out. Make sure that only string values with
            # quotes around them are allowed, and no quotes are inside
            # the quoted value.
            if strbit and DEF_RE_ALLOWED.match(strbit):
                modname = strbit[1:-1]
                requires[modname] = Bunch()

    return requires

MUST_ASK_FOR_CHROME =  """\
To use chrome authority, as in line %d in:
 %s
 > %s
You must enable it with:
  let {Cc,Ci,Cu,Cr,Cm} = require('chrome');
"""

CHROME_ALIASES = ["Cc", "Ci", "Cu", "Cr", "Cm"]

def scan_chrome(fn, lines, stderr):
    filename = os.path.basename(fn)
    if filename == "cuddlefish.js" or filename == "securable-module.js":
        return False, False # these are the loader
    problems = False
    asks_for_chrome = set() # Cc,Ci in: var {Cc,Ci} = require("chrome")
    asks_for_all_chrome = False # e.g.: var c = require("chrome")
    uses_chrome = set()
    uses_components = False
    uses_chrome_at = []
    for lineno,line in enumerate(lines):
        # note: this scanner is not obligated to spot all possible forms of
        # chrome access. The scanner is detecting voluntary requests for
        # chrome. Runtime tools will enforce allowance or denial of access.
        line = line.strip()
        iscomment = False
        for commentprefix in COMMENT_PREFIXES:
            if line.startswith(commentprefix):
                iscomment = True
        if iscomment:
            continue
        mo = re.search(REQUIRE_RE, line)
        if mo:
            if mo.group(1) == "chrome":
                for alias in CHROME_ALIASES:
                    if alias in line:
                        asks_for_chrome.add(alias)
                if not asks_for_chrome:
                    asks_for_all_chrome = True
        alias_in_this_line = False
        for wanted in CHROME_ALIASES:
            if re.search(r'\b'+wanted+r'\b', line):
                alias_in_this_line = True
                uses_chrome.add(wanted)
                uses_chrome_at.append( (wanted, lineno+1, line) )
        
        if not alias_in_this_line and "Components." in line:
            uses_components = True
            uses_chrome_at.append( (None, lineno+1, line) )
            problems = True
            break
    if uses_components or (uses_chrome - asks_for_chrome):
        problems = True
        print >>stderr, ""
        print >>stderr, "To use chrome authority, as in:"
        print >>stderr, " %s" % fn
        for (alias, lineno, line) in uses_chrome_at:
            if alias not in asks_for_chrome:
                print >>stderr, " %d> %s" % (lineno, line)
        print >>stderr, "You must enable it with something like:"
        uses = sorted(uses_chrome)
        if uses_components:
            uses.append("components")
        needed = ",".join(uses)
        print >>stderr, '  const {%s} = require("chrome");' % needed
    wants_chrome = bool(asks_for_chrome) or asks_for_all_chrome
    return wants_chrome, problems

def scan_module(fn, lines, stderr=sys.stderr):
    # barfs on /\s+/ in context-menu.js
    #requires = scan_requirements_with_jsscan(fn)
    requires = scan_requirements_with_grep(fn, lines)
    requires.pop("chrome", None)
    chrome, problems = scan_chrome(fn, lines, stderr)
    return requires, chrome, problems

def scan_package(prefix, resource_url, pkg_name, section, dirname,
                 stderr=sys.stderr):
    manifest = {}
    has_problems = False
    for dirpath, dirnames, filenames in os.walk(dirname):
        for fn in [fn for fn in filenames if fn.endswith(".js")]:
            modname = os.path.splitext(fn)[0]
            # turn "packages/api-utils/lib/content/foo" into "content/foo"
            reldir = dirpath[len(dirname)+1:]
            if reldir:
                modname = "/".join(reldir.split(os.sep) + [modname])
            absfn = os.path.join(dirpath, fn)
            hashhex = hashlib.sha256(open(absfn,"rb").read()).hexdigest()
            lines = open(absfn).readlines()
            requires, chrome, problems = scan_module(absfn, lines, stderr)
            url = "%s%s.js" % (resource_url, modname)
            info = { "packageName": pkg_name,
                     "sectionName": section,
                     "name": modname,
                     "hash": hashhex,
                     "requires": requires,
                     "chrome": chrome,
                     "e10s-adapter": None,
                     "zipname": "resources/%s%s-%s/%s.js" % (prefix, pkg_name,
                                                             section, modname),
                     }
            manifest[url] = Bunch(**info)
            if problems:
                has_problems = True
    return manifest, has_problems

def update_manifest_with_fileinfo(deps, loader, manifest):
    packages = deps[:]
    if loader not in packages:
        packages.append(loader)

    # "m" helps us find where each modname will be found. The runtime code
    # will walk harness_options.rootPaths, which includes the lib/ directory
    # of all included packages, and the tests/ directory of the top-level
    # package. The manifest we're handed will have data for all these
    # directories. Some modules (those with "absolute" paths) will search the
    # whole rootPaths list, while others (with "relative" paths) will only
    # look in the package they're being imported from. We just record the
    # first section that the module appears in, and the resource: URL of the
    # module there.
    m = {}
    for url, i in manifest.items():
        idx = (i.packageName,i.name)
        if idx not in m:
            m[idx] = url
    for url, i in manifest.items():
        looking_for = i.name + '-e10s-adapter'
        for source in packages:
            if (source,looking_for) in m:
                # got it
                i['e10s-adapter'] = m[ (source,looking_for) ]
                break

        for reqname in i.requires:
            # now where will this requirement come from? This code tries to
            # duplicate the behavior of the LocalFileSystem.resolveModule
            # method in packages/api-utils/lib/securable-module.js . Our
            # goal is to find a specific .js file, at link time, and record
            # as much information as we can about it in the manifest. Some of
            # this information is destined for the runtime, which will
            # complain if it appears to be loading a module that differs from
            # the one the linker found. The rest of the information is
            # intended for external code-review tools, so the humans reading
            # through the code can confidently exclude common modules that
            # were reviewed earlier.

            reqname_bits = reqname.split("/")

            if reqname_bits[0] in (".", ".."):
                # for relative paths like these, we only look in the single
                # package that did the require()
                search_all = False
                # and start from the module doing the require()
                target = i.name.split("/")[:-1]
                while reqname_bits:
                    first = reqname_bits.pop(0)
                    if first == ".":
                        continue
                    elif first == "..":
                        try:
                            target.pop()
                        except IndexError:
                            raise
                    else:
                        target.append(first)
                looking_for = "/".join(target)
            else:
                # for absolute paths, we search all packages, always in the
                # same order (i.e. the package that did the require() does
                # not get special treatment)
                search_all = True
                looking_for = reqname

            found_url = None
            if search_all:
                for source in packages:
                    if (source,looking_for) in m:
                        # got it
                        found_url = m[ (source,looking_for) ]
                        break
            else:
                # only look in the package doing the importing
                if (i.packageName,looking_for) in m:
                    # yup
                    found_url = m[ (i.packageName,looking_for) ]

            if found_url:
                # now store the zipfile name (actually the URL)
                #print >>sys.stderr, "FOUND:", pkgname, modname, reqname, looking_for, url
                i.requires[reqname]["url"] = found_url
            elif i.chrome:
                # we can't find the module they're loading, but they've asked
                # for chrome, so the runtime isn't going to complain. So
                # let's not complain either.
                #print >>sys.stderr, "NOT FOUND (but chrome)", pkgname, modname, reqname, looking_for
                pass

            elif i.sectionName == "tests":
                # don't complain when tests import imaginary things
                pass
            else:
                print >>sys.stderr, "NOT FOUND", i.packageName, i.sectionName, i.name, reqname, looking_for, packages
    # the manifest is modified in-place

if __name__ == '__main__':
    for fn in sys.argv[1:]:
        requires,chrome,problems = scan_module(fn, open(fn).readlines())
        print
        print "---", fn
        if problems:
            print "PROBLEMS"
            sys.exit(1)
        print "chrome: %s" % chrome
        print "requires: %s" % (",".join(requires))

