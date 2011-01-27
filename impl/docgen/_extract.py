#
# DocExtractor is a module capable of reading a javascript file specified on the
# command line, parsing documentation coments from that file (/** */) and returning
# a data structure containing api documentation for the module.
#
# usage:
#
#   de = DocExtractor()
#   apidocs = de.extract("somefile.js");
#
# Also you can run the module's unit tests by invoking it from the command line
#

import re
import os

class DocExtractor():
    def __init__(self):
        # the pattern for extracting a documentation block and the next line
        self.docBlock_pat = re.compile('(/\*\*)(.*?)(\*/)([\s\n]*[^\/\n]*)?', re.S)

        # after extracting the comment, fix it up (remove *s and leading spaces)
        self.blockFilter_pat = re.compile('^\s*\* ?', re.M)

        # the pattern used to split a comment block to create our token stream
        # this will currently break if there are ampersands in the comments if there
        # is a space before it
        self.tokenize_pat = re.compile('^\s?(@\w\w*)', re.M);

        # parse a function/module/class:
        # @function [name]
        # [description]
        self.function_pat = re.compile('^(\w+)$|^(?:([\w.\[\]]+)\s*\n)?\s*(.*)$', re.S);

        # parse properties or params.
        # We support three forms:
        #   @property <name> <{type}> [description]
        #   @property <{type}> <name> [description]
        #   @property [name]
        #   [description]
        self.prop_pat =  re.compile(
            '(?:^([\w.\[\]]+)\s*(?:{(\w+)})\s*(.*)$)|' +
            '(?:^{(\w+)}\s*([\w.\[\]]+)\s*(.*)$)|' +
            '(?:^([\w.\[\]]+)?\s*(.*)$)',
            re.S);

        # parse returns clause (also works for @throws!)
        # @return [{type}] [description]
        #   or
        # @throws [{type}] [description]
        self.return_pat = re.compile('^\s*(?:{(\w+)})?\s*(.*)$', re.S);

        # heuristic type and name guessing stuff, applied to the first non-whitespace
        # line after the doc block.  designed for commonjs modules (note the 'exports').
        self.findExports_pat = re.compile('(?:^|\s)exports\.(\w+)\s', re.M);

        self.classMarker = "@class"
        self.classEndMarker = "@endclass"
        self.constructorMarker = "@constructor"
        self.descriptionMarker = "@description"
        self.functionMarker = "@function"
        self.moduleMarker = "@module"
        self.paramMarker = "@param"
        self.propertyMarker = "@property"
        self.returnsMarker = "@returns"
        self.returnMarker = "@return"
        self.throwsMarker = "@throws"
        self.typeMarker = "@type"

        self.markers = (
            self.classMarker,
            self.classEndMarker,
            self.constructorMarker,
            self.descriptionMarker,
            self.functionMarker,
            self.moduleMarker,
            self.paramMarker,
            self.propertyMarker,
            self.returnsMarker,
            self.returnMarker,
            self.throwsMarker,
            self.typeMarker
            )

        # a little bit of context that allows us to understand when we're parsing classes
        # XXX: we could make this an array and a couple code tweaks if we cared
        # about nested classes at some point
        self._currentClass = None

    def _isMarker(self, tok):
        return tok in self.markers

    def _popNonMarker(self, toks):
        nxt = None
        if not self._isMarker(self._peekTok(toks)):
            nxt = toks.pop(0)
        return nxt

    def _peekTok(self, toks):
        if (len(toks)):
            return toks[0]
        return None

    def _consumeToks(self, tokens, currentObj, data):
        cur = tokens.pop(0)

        if not self._isMarker(cur):
            raise RuntimeError("Found text where marker was expected: %s" % (cur[:20] + "..."))
        elif cur == self.moduleMarker:
            currentObj["type"] = 'module'
            nxt = self._popNonMarker(tokens)
            if nxt:
                # nxt describes the module
                m = self.function_pat.match(nxt)
                if not m:
                    raise RuntimeError("Malformed args to %s: %s" %
                                       (self.moduleMarker, (cur[:20] + "...")))
                if m.group(1):
                    currentObj["name"] = m.group(1)
                else:
                    if m.group(2):
                        currentObj["name"] = m.group(2)
                    if m.group(3):
                        if 'desc' in currentObj:
                            currentObj['desc'] = currentObj['desc'] + "\n\n" + m.group(3)
                        else:
                            currentObj['desc'] = m.group(3)
            else:
                # in this case we'll have to guess the function name
                pass

        elif cur == self.classMarker:
            currentObj["type"] = 'classstart'
            nxt = self._popNonMarker(tokens)
            if nxt:
                # nxt describes the module
                m = self.function_pat.match(nxt)
                if not m:
                    raise RuntimeError("Malformed args to %s: %s" %
                                       (self.classMarker, (cur[:20] + "...")))
                if m.group(1):
                    currentObj["name"] = m.group(1)
                else:
                    if m.group(2):
                        currentObj["name"] = m.group(2)
                    else:
                        raise RuntimeError("A class must have a name")

                    if m.group(3):
                        if 'desc' in currentObj:
                            currentObj['desc'] = currentObj['desc'] + "\n\n" + m.group(3)
                        else:
                            currentObj['desc'] = m.group(3)
            else:
                # in this case we'll have to guess the function name
                pass

        elif cur == self.classEndMarker:
            currentObj["type"] = 'classend'

        elif cur == self.constructorMarker:
            currentObj["type"] = 'constructor'
            if self._currentClass == None:
                raise RuntimeError("A constructor must be defined inside a class")

            nxt = self._popNonMarker(tokens)
            if nxt:
                currentObj['desc'] = nxt

        elif cur == self.functionMarker:
            currentObj["type"] = 'function'
            nxt = self._popNonMarker(tokens)
            if nxt:
                # nxt describes the function
                m = self.function_pat.match(nxt)
                if not m:
                    raise RuntimeError("Malformed args to %s: %s" %
                                       (self.functionMarker, (cur[:20] + "...")))
                if m.group(1):
                    currentObj['name'] = m.group(1)
                else:
                    if m.group(2):
                        currentObj['name'] = m.group(2)
                    if m.group(3):
                        currentObj['desc'] = m.group(3)
            else:
                # in this case we'll have to guess the function name
                pass
        elif cur == self.propertyMarker:
            currentObj["type"] = 'property'
            nxt = self._popNonMarker(tokens)
            if nxt:
                # nxt now describes the property
                m = self.prop_pat.match(nxt)
                if not m:
                    raise RuntimeError("Malformed args to %s: %s" %
                                       (self.propertyMarker, (nxt[:20] + "...")))
                if m.group(1):
                    currentObj['name'] = m.group(1)
                    currentObj['dataType'] = m.group(2)
                    if m.group(3):
                        currentObj['desc'] = m.group(3)
                elif m.group(4):
                    currentObj['dataType'] = m.group(4)
                    currentObj['name'] = m.group(5)
                    if m.group(6):
                        currentObj['desc'] = m.group(6)
                else:
                    if m.group(7):
                        currentObj['name'] = m.group(7)
                    if m.group(8):
                        currentObj['desc'] = m.group(8)
            else:
                # in this case we'll have to guess the function name
                pass
        elif cur == self.descriptionMarker:
            nxt = self._popNonMarker(tokens)
            if nxt:
                if 'desc' in currentObj:
                    currentObj['desc'] = currentObj['desc'] + "\n\n" + nxt
                else:
                    currentObj['desc'] = nxt
            else:
                # XXX: should this really be fatal?
                raise RuntimeError("@description without any body encountered")
        elif cur == self.typeMarker:
            nxt = self._popNonMarker(tokens)
            if nxt:
                currentObj['dataType'] = nxt
            else:
                # XXX: should this really be fatal?
                raise RuntimeError("@type without any content encountered")
        elif cur == self.paramMarker:
            nxt = self._popNonMarker(tokens)
            if nxt:
                # nxt now describes the param
                m = self.prop_pat.match(nxt)
                if not m:
                    raise RuntimeError("Malformed args to %s: %s" %
                                       (cur, (nxt[:20] + "...")))
                p = { }
                if m.group(1):
                    p['name'] = m.group(1)
                    p['type'] = m.group(2)
                    if m.group(3):
                        p['desc'] = m.group(3)
                elif m.group(4):
                    p['type'] = m.group(4)
                    p['name'] = m.group(5)
                    if m.group(6):
                        p['desc'] = m.group(6)
                else:
                    if m.group(7):
                        p['name'] = m.group(7)
                    if m.group(8):
                        p['desc'] = m.group(8)

                if not 'params' in currentObj:
                    currentObj['params'] = [ ]
                currentObj['params'].append(p)
            else:
                # in this case we'll have to guess the function name
                pass
        elif cur == self.returnsMarker or cur == self.returnMarker:
            nxt = self._peekTok(tokens)
            if not self._isMarker(nxt):
                nxt = tokens.pop(0)
                m = self.return_pat.match(nxt)
                if not m:
                    raise RuntimeError("Malformed args to %s: %s" %
                                       (cur, (nxt[:20] + "...")))
                rv = { }
                if m.group(1):
                    rv['type'] = m.group(1)
                rv['desc'] = m.group(2)

                currentObj['returns'] = rv
            else:
                # in this case we'll have to guess the function name
                pass
        elif cur == self.throwsMarker:
            nxt = self._peekTok(tokens)
            if not self._isMarker(nxt):
                nxt = tokens.pop(0)
                # yeah, we reuse the return pattern here
                m = self.return_pat.match(nxt)
                if not m:
                    raise RuntimeError("Malformed args to %s: %s" %
                                       (self.throwsMarker, (nxt[:20] + "...")))
                t = { }
                if m.group(1):
                    t['type'] = m.group(1)
                t['desc'] = m.group(2)

                if not 'throws' in currentObj:
                    currentObj['throws'] = [ ]
                currentObj['throws'].append(t)
            else:
                # in this case we'll have to guess the function name
                pass
        else:
            raise RuntimeError("unrecognized tag: %s" % cur)

    def _analyzeContext(self, context):
        guessedName = None
        guessedType = None
        # first let's see if there's an exports statement after the block
        m = self.findExports_pat.search(context)
        if m:
            guessedName = m.group(1)

            # we'll only try to guess type if there's an exports statement
            if context.find("function") >= 0: 
                guessedType = 'function'
            else:
                guessedType = 'property'
        return guessedName, guessedType

    def _analyzeBlock(self, block, context, firstBlock, data):
        # when we're parsing classes, we'll modify the classes nested
        # data structure rather than the global data structure for
        # this module
        globalData = data
        if not self._currentClass == None:
            data = data['classes'][self._currentClass]

        tokens = self.tokenize_pat.split(block)

        # remove all whitespace strings
        tokens = [n.strip() for n in tokens if n.strip()]

        curObj = {}

        # special case tagless first block for module description
        # or func/prop description
        if not self._isMarker(tokens[0]):
            if firstBlock:
                # in the first block case we'll guess that this
                # is module doc
                curObj['type'] = 'module'
                curObj['desc'] = tokens.pop(0)
            else:
                curObj['desc'] = tokens.pop(0)

        while len(tokens):
            self._consumeToks(tokens, curObj, data)

        (guessedName, guessedType) = self._analyzeContext(context)

        if not 'name' in curObj and guessedName:
            curObj['name'] = guessedName

        if not 'type' in curObj and guessedType:
            curObj['type'] = guessedType

        if 'type' in curObj:
            if curObj['type'] == 'function':
                del curObj['type']
                if 'functions' not in data:
                    data['functions'] = [ ]
                data['functions'].append(curObj)
            elif curObj['type'] == 'constructor':
                del curObj['type']
                data['constructor'] = curObj
            elif curObj['type'] == 'property':
                if 'dataType' in curObj:
                    curObj['type'] = curObj['dataType']
                    del curObj['dataType']
                else:
                    del curObj['type']

                if 'properties' not in data:
                    data['properties'] = [ ]
                data['properties'].append(curObj)
            elif curObj['type'] == 'classstart':
                if not 'classes' in data:
                    data['classes'] = [ ]

                self._currentClass = len(data['classes'])

                # XXX: check for redefinition?
                del curObj['type']
                data['classes'].append(curObj)

            elif curObj['type'] == 'classend':
                self._currentClass = None

            elif curObj['type'] == 'module':
                if 'desc' in curObj:
                    if 'desc' in globalData:
                        curObj['desc'] = "\n\n".join([globalData['desc'], curObj['desc']])
                    globalData['desc'] = curObj['desc']
                if 'name' in curObj:
                    globalData['module'] = curObj['name']
            else:
                raise RuntimeError("I don't know what to do with a: %s" % curObj['type'])

    def extract(self, filename):
        # the data structure we'll build up
        data = {}

        # clear the lil' context flag that lets us know when we're parsing
        # classes (class definitions cannot span files)
        self._currentClass = None

        # first determine the module name, it's always the same as the file name
        mod = os.path.basename(filename)
        dotLoc = mod.rfind(".")
        if (dotLoc > 0):
            mod = mod[:dotLoc]
        data["module"] = mod
        data["filename"] = filename

        # next read the whole file into memory
        contents = ""
        with open(filename, "r") as f:
            contents = f.read()

        # now parse out and combine comment blocks
        firstBlock = True
        for m in self.docBlock_pat.finditer(contents):
            block = self.blockFilter_pat.sub("", m.group(2)).strip()
            context = m.group(4)
            # data will be mutated!
            self._analyzeBlock(block, context, firstBlock, data)
            firstBlock = False

        return data

if __name__ == '__main__':
    # running this file from the command line executes its self tests.
    import json
    import sys
    import difflib

    de = DocExtractor()

    # because docextractor embeds filenames into output files, let's
    # change into the directory of the script for consistency
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    testDir = "tests"

    # create a list of the tests to run (.js files in tests/ dir)
    tests = []

    # allow invoker on command line to pass in tests explicitly for
    # selective testing
    if len (sys.argv) > 1:
        for x in sys.argv[1:]:
            x = os.path.basename(x)
            tests.append(x[:-3] if x.endswith(".js") else x)
    else:
        for x in os.listdir(testDir):
            if x.endswith(".js"):
                tests.append(x[:-3])

    # now run!
    ranTests = 0
    failedTests = 0
    for test in tests:
        print "Running '%s'..." % test
        failed = False
        try:
            got = de.extract(os.path.join(testDir, test + ".js"))
        except Exception as e:
            got = { "exception_type": str(type(e)), "args": e.args }
        want = None
        try:
            with open(os.path.join(testDir, test + ".out"), "r") as f:
                want = json.loads(f.read())
        except:
            pass

        gotJSON = json.dumps(got, indent=2, sort_keys=True) + "\n"

        # now let's compare actual with expected
        if want == None:
            print  "  FAILED: no expected test output file available (%s.out)" % test
            failed = True
        else:
            wantJSON = json.dumps(want, indent=2, sort_keys=True) + "\n"

            diff = difflib.unified_diff(wantJSON.splitlines(1), gotJSON.splitlines(1), "expected.out", "actual.out")

            # diff does poorly when newlines are ommitted, let's fix that
            diff = [l if len(l) > 0 and l[-1] == '\n' else l + "\n" for l in diff]
            diffText = '    '.join(diff)

            if len(diffText):
                diffText = '    ' + diffText
                print "  FAILED: actual output doesn't match expected:"
                print diffText
                failed = True
            else:
                print "  ... passed."

        if failed:
            failedTests += 1
            # write actual output to disk, so that it's easy to write new tests
            actualPath = os.path.join(testDir, test + ".outactual")
            with open(actualPath, "w+") as f:
                f.write(gotJSON)

            print "  (expected output left in '%s')" % actualPath

    print "Complete, (%d/%d) tests passed..." % (len(tests) - failedTests, len(tests))
    sys.exit(failedTests)
