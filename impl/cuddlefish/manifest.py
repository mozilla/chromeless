
import os, sys, re

COMMENT_PREFIXES = ["//", "/*", "*", "\'", "\""]

REQUIRE_RE = r"(?<![\'\"])require\s*\(\s*[\'\"]([^\'\"]+?)[\'\"]\s*\)"

def scan_requirements_with_grep(fn, lines):
    requires = set()
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
                requires.add(mo.group(1))
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
    requires.discard("chrome")
    chrome, problems = scan_chrome(fn, lines, stderr)
    return sorted(requires), chrome, problems

def scan_package(pkg_name, dirname, stderr=sys.stderr):
    manifest = []
    has_problems = False
    for dirpath, dirnames, filenames in os.walk(dirname):
        for fn in [fn for fn in filenames if fn.endswith(".js")]:
            modname = os.path.splitext(fn)[0]
            # turn "packages/api-utils/lib/content/foo" into "content/foo"
            reldir = dirpath[len(dirname)+1:]
            if reldir:
                modname = "/".join(reldir.split(os.sep) + [modname])
            absfn = os.path.join(dirpath, fn)
            lines = open(absfn).readlines()
            requires, chrome, problems = scan_module(absfn, lines, stderr)
            manifest.append( (pkg_name, modname, requires, chrome) )
            if problems:
                has_problems = True
    return manifest, has_problems

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

