#!/usr/bin/env python
#
# Copyright (c) 2011, Lloyd Hilaiel <lloyd@hilaiel.com>
#
# Permission to use, copy, modify, and/or distribute this software for any
# purpose with or without fee is hereby granted, provided that the above
# copyright notice and this permission notice appear in all copies.
#
# THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
# WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
# MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
# ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
# WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
# ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
# OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

import re
import os

class DocStract():
    def __init__(self):
        # the pattern for extracting a documentation block and the next line
        self.docBlockPat = re.compile('(/\*\*)(.*?)(\*/)([\s\n]*[^\/\n]*)?', re.S)

        # after extracting the comment, fix it up (remove *s and leading spaces)
        self.blockFilterPat = re.compile('^\s*\* ?', re.M)

        # the pattern used to split a comment block to create our token stream
        # this will currently break if there are ampersands in the comments if there
        # is a space before it
        self.tokenizePat = re.compile('^\s?(@\w\w*)', re.M);

        # parse a function/module/class:
        # @function [name]
        # [description]
        self.functionPat = re.compile('^(\w+)$|^(?:([\w.\[\]]+)\s*\n)?\s*(.*)$', re.S);

        # parse properties or params.
        # We support three forms:
        #   @property <name> <{type}> [description]
        #   @property <{type}> <name> [description]
        #   @property [name]
        #   [description]
        self.propPat =  re.compile(
            '(?:^([\w.\[\]]+)\s*(?:{(\w+)})\s*(.*)$)|' +
            '(?:^{(\w+)}\s*([\w.\[\]]+)\s*(.*)$)|' +
            '(?:^([\w.\[\]]+)?\s*(.*)$)',
            re.S);

        # parse returns clause (also works for @throws!)
        # @return [{type}] [description]
        #   or
        # @throws [{type}] [description]
        self.returnPat = re.compile('^\s*(?:{(\w+)})?\s*(.*)$', re.S);

        # heuristic type and name guessing stuff, applied to the first non-whitespace
        # line after the doc block.  designed for commonjs modules (note the 'exports').
        self.findExportsPat = re.compile('(?:^|\s)exports\.(\w+)\s', re.M);

        self.classMarker = "@class"
        self.classEndMarker = "@endclass"
        self.constructorMarker = "@constructor"
        self.descriptionMarker = "@description"
        self.functionMarker = "@function"
        self.moduleMarker = "@module"
        self.paramMarker = "@param"
        self.paramsMarker = "@params"
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
            self.paramsMarker,
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
                m = self.functionPat.match(nxt)
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
                m = self.functionPat.match(nxt)
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
                m = self.functionPat.match(nxt)
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
                m = self.propPat.match(nxt)
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
        elif cur in ( self.paramMarker, self.paramsMarker ):
            nxt = self._popNonMarker(tokens)
            if nxt:
                # nxt now describes the param
                m = self.propPat.match(nxt)
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
                m = self.returnPat.match(nxt)
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
                m = self.returnPat.match(nxt)
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
        m = self.findExportsPat.search(context)
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

        tokens = self.tokenizePat.split(block)

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

    def extractFromFile(self, filename):
        # next read the whole file into memory
        contents = ""
        with open(filename, "r") as f:
            contents = f.read()

        data = self.extract(contents)

        # first determine the module name, it's always the same as the file name
        mod = os.path.basename(filename)
        dotLoc = mod.rfind(".")
        if (dotLoc > 0):
            mod = mod[:dotLoc]
        if not "module" in data:
            data["module"] = mod
        if not "filename" in data:
            data["filename"] = filename

        return data

    def extract(self, contents):
        # the data structure we'll build up
        data = {}

        # clear the lil' context flag that lets us know when we're parsing
        # classes (class definitions cannot span files)
        self._currentClass = None

        # now parse out and combine comment blocks
        firstBlock = True
        for m in self.docBlockPat.finditer(contents):
            block = self.blockFilterPat.sub("", m.group(2)).strip()
            context = m.group(4)
            # data will be mutated!
            self._analyzeBlock(block, context, firstBlock, data)
            firstBlock = False

        return data

if __name__ == '__main__':
    import sys
    import json
    ds = DocStract()

    docs = None
    if len (sys.argv) == 2:
        docs = ds.extractFromFile(sys.argv[1])
    elif len (sys.argv) == 1:
        docs = ds.extract(sys.stdin.read())
    else:
        print >> sys.stderr, "Usage: docstract [file]"
        sys.exit(1)

    print json.dumps(docs, indent=2, sort_keys=True) + "\n"
