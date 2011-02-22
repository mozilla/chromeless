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
import types

class DocStract():
    def __init__(self):
        # the patterns for finding and processing documentation blocks (and the source line
        # Note: these two patterns are identical, except the latter captures groups.  The
        # first is used to split a source file into chunks of text which are either doc blocks
        # or source code, the second extracts information from doc blocks.
        self.docBlockFindPat =    re.compile('(/\*\*  .*?  \*/ (?:[\s\n]*[^\/\n]*)?)', re.S | re.X)
        self.docBlockProcessPat = re.compile('(/\*\*)(.*?)(\*/)(  [\s\n]*[^\/\n]*)? ', re.S | re.X)

        # after extracting the comment, fix it up (remove *s and leading spaces)
        self.blockFilterPat = re.compile('^\s*\* ?', re.M)

        # '@' can be escaped with an '@', i.e. @@function when occurs in text blocks
        # will not be eaten by the parser.  This pattern is used to unescape text
        # blocks.
        self.unescapeTagPat = re.compile('@@(?=\w+)', re.M)

        # the pattern used to split a comment block to create our token stream
        # this will currently break if there are ampersands in the comments if there
        # is a space before it
        self.tokenizePat = re.compile('(?<![@\w])(@\w+)', re.M);

        # block types.  Each document block is of one of these types.
        self.blockTypes = {
            '@class':       ClassBlockHandler("@class"),
            '@endclass':    EndClassBlockHandler("@endclass"),
            '@constructor': ConstructorBlockHandler("@constructor"),
            '@function':    FunctionBlockHandler("@function"),
            '@module':      ModuleBlockHandler("@module"),
            '@property':    PropertyBlockHandler("@property")
            }

        # tag aliases, direct equivalences.  Note, RHS is normal form.
        self.aliases = {
            '@func': '@function',
            '@params': '@param',
            '@parameter': '@param',
            '@parameters': '@param',
            '@argument': '@param',
            '@arg': '@param',
            '@prop': '@property',
            '@returns': '@return',
            '@description': '@desc',
            '@seealso': '@see',
            '@see_also': '@see',
            '@beginclass': '@class',
            '@begin_class': '@class',
            '@end_class': '@endclass',
            '@throw': '@throws',
            '@exception': '@throws'
            }

        # lookup table of tag handlers, lil' object that can parse and inject
        # for different tags.
        self.tags = {
            '@param':  ParamTagHandler('@param'),
            '@desc':   DescTagHandler('@desc'),
            '@return': ReturnTagHandler('@return'),
            '@see':    SeeTagHandler('@see'),
            '@throws': ThrowsTagHandler('@throws'),
            '@type':   TypeTagHandler('@type'),
            }

        # these are a list of functions that examine extraction state and try to guess
        # what type of construct a documentation block documents
        self.typeGuessers = [
            hasGetSetterIsPropertyTypeGuesser,
            isFunctionIfKeywordInCodeTypeGuesser,
            firstBlockIsModuleTypeGuesser,
            assignmentIsProbablyPropertyTypeGuesser,
            typeWithoutReturnsIsProbablyPropertyTypeGuesser
            ]

        # these are a list of functions that, given a block type and subsequent chunk of code,
        # try to guess the name of the construct being documented
        self.nameGuessers = [
            standardFunctionNameGuesser,
            getSetterNameGuesser,
            objectPropertyNameGuesser,
            commonJSNameGuesser,
            assignToPropertyNameGuesser
            ]

        # a little bit of context that allows us to understand when we're parsing classes
        # XXX: we could make this an array and a couple code tweaks if we cared
        # about nested classes at some point
        self._currentClass = None

    def _isMarker(self, tok):
        return tok in self.blockTypes or tok in self.tags or tok in self.aliases

    def _popNonMarker(self, toks):
        nxt = None
        if (len(toks) == 0):
            return None
        if not self._isMarker(self._peekTok(toks)):
            nxt = toks.pop(0)
        return nxt

    def _peekTok(self, toks):
        if (len(toks)):
            return toks[0]
        return None

    def _consumeToks(self, tokens, currentObj):
        cur = tokens.pop(0)

        handler = None
        # is this a blocktype declaration?
        if cur in self.blockTypes:
            handler = self.blockTypes[cur]
            if currentObj['blockHandler']:
                raise RuntimeError("%s and %s may " %
                                   (currentObj['blockHandler'].tagName,
                                    handler.tagName) +
                                   "not occur in same documentation block")
            currentObj['blockHandler'] = handler
        elif cur in self.tags:
            handler = self.tags[cur]

        # do we have a handler for this tag?
        if not handler == None:
            arg = None

            # get argument if required
            if handler.takesArg:
                arg = self._popNonMarker(tokens)

                if arg == None and not handler.argOptional:
                    raise RuntimeError("%s tag requires an argument" % cur)

            ctx = handler.parse(arg)

            if handler.mayRecur:
                if cur not in currentObj["tagData"]:
                    currentObj["tagData"][cur] = []
                currentObj["tagData"][cur].append(ctx)
            else:
                if cur in currentObj["tagData"]:
                    raise RuntimeError("%s tag may not occur multiple times in the same documentation block" % cur)
                currentObj["tagData"][cur] = ctx

        # ooops.  Dunno what that is!
        else:
            raise RuntimeError("unrecognized tag: %s" % cur)

    def _guessBlockName(self, codeChunk, blockType):
        # given the first line of source code after the block, and it's type
        # we'll invoke our name guessers to try to figure out the name of the
        # construct being documented

        # now let's invoke our type guessers, in order
        for func in self.nameGuessers:
            t = func(codeChunk, blockType)
            if t != None:
                return t

        return None

    def _guessBlockType(self, firstBlock, codeChunk, context, tags):
        # first we'll prune possibilities by figuring out which supported blocktypes
        # are valid in the current context, and support all of the required tags
        tagSet = set(tags)
        possibilities = [ ]
        for bt in self.blockTypes:
            bt = self.blockTypes[bt]
            if context not in bt.allowedContexts:
                continue
            if not tagSet.issubset(bt.allowedTags):
                continue
            possibilities.append(bt.tagName)

        # if we've reduced to exactly one possibility, then we don't need to guess
        if len(possibilities) == 1:
            return possibilities[0]

        # now let's invoke our type guessers, in order
        for func in self.typeGuessers:
            t = func(firstBlock, codeChunk, context, tags, possibilities)
            if t != None:
                return t

        raise RuntimeError("Can't determine what this block documents (from %s)" % ", ".join(possibilities))

    def _analyzeBlock(self, block, codeChunk, firstBlock, data, lineStart, lineEnd):
        # Ye' ol' block analysis process.  block at this point contains
        # a chunk of text that has already had comment markers stripped out.

        # when we're parsing classes, we'll modify the classes nested
        # data structure rather than the global data structure for
        # this module
        globalData = data
        if not self._currentClass == None:
            data = data['classes'][self._currentClass]

        # Step 1: split the chunk of text into a token stream, each token
        # is either a tag /@\w+/ or a chunk of text (tag argument).
        # whitespace on either side of tokens is stripped.  Also, unescape
        # @@tags.
        tokens = self.tokenizePat.split(block)
        tokens = [n.lstrip(" \t").lstrip('\r\n').rstrip() for n in tokens if n.strip()]
        tokens = [self.unescapeTagPat.sub("@", t) for t in tokens]

        # Step 2: initialize an object which will hold the intermediate
        # representation of parsed block data.
        parseData = {
            'blockHandler': None,
            'tagData': { }
            }

        # Step 3: Treat initial text as if it were a description. 
        if not self._isMarker(tokens[0]):
            tokens.insert(0, '@desc')

        # Step 4: collapse aliases
        tokens = [self.aliases[n] if self.aliases.has_key(n) else n for n in tokens]

        # Step 5: parse all tokens from the token stream, populating the
        # output representation as we go.
        while len(tokens):
            self._consumeToks(tokens, parseData)

        thisContext = "class" if not self._currentClass == None else "global"

        # Step 6: Heuristics!  Apply a set of functions which use the current state of
        #         documentation extractor and some source code to figure out what
        #         type of construct  (@function, @property, etc) this documentation
        #         block is documenting, and what its name is.

        # only invoke guessing logic if type wasn't explicitly declared
        if parseData['blockHandler'] == None:
            guessedType = self._guessBlockType(firstBlock, codeChunk, thisContext, parseData['tagData'].keys())
        
            if guessedType not in self.blockTypes:
                raise RuntimeError("Don't know how to handle a '%s' documentation block" % guessedType)
            parseData['blockHandler'] = self.blockTypes[guessedType]

        # always try to guess the name, a name guesser has the first interesting line of code
        # after the documentation block and the type of block (it's string name) to work with
        guessedName = self._guessBlockName(codeChunk, parseData['blockHandler'].tagName)

        # Step 7: Validation phase!  Not all tags are allowed in all types of
        # documentation blocks.  like '@returns' inside a '@classend' block
        # would just be nutty.  let's scrutinize this block to make sure it's
        # sane.

        # first check that this doc block type is valid in present context
        if thisContext not in parseData['blockHandler'].allowedContexts:
            raise RuntimeError("%s not allowed in %s context" %
                               (parseData['blockHandler'].tagName,
                                thisContext))

        # now check that all present tags are allowed in this block
        for tag in parseData['tagData']:
            if not tag == parseData['blockHandler'].tagName and tag not in parseData['blockHandler'].allowedTags:
                raise RuntimeError("%s not allowed in %s block" %
                                   (tag, parseData['blockHandler'].tagName))

        # Step 8: Generation of output document
        doc = { }

        for tag in parseData['tagData']:
            val = parseData['tagData'][tag]
            if not type(val) == types.ListType:
                val = [ val ]
            for v in val:
                handler = self.tags[tag] if tag in self.tags else self.blockTypes[tag]
                handler.attach(v, doc, parseData['blockHandler'].tagName)

        # special case to allow for lazy class closing (omit @endclass when
        # many classes are being declared in a row)
        if not self._currentClass == None and parseData['blockHandler'].tagName == '@class':
            data = globalData 

        parseData['blockHandler'].setLineNumber(lineStart, lineEnd, doc)
        parseData['blockHandler'].merge(doc, data, guessedName)

        # special case for classes!
        if parseData['blockHandler'].tagName == '@class':
            self._currentClass = len(data['classes']) - 1
        elif parseData['blockHandler'].tagName == '@endclass':
            self._currentClass = None

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
        line = 0
        for text in self.docBlockFindPat.split(contents):
            lineStart = line + 1
            line += text.count('\n')

            # if this isn't a documentation block, carry on
            m = self.docBlockProcessPat.match(text)
            if m:
                block = self.blockFilterPat.sub("", m.group(2)).strip()
                context = m.group(4).strip()
                # data will be mutated!
                try:
                    self._analyzeBlock(block, context, firstBlock, data, lineStart, line)
                except RuntimeError, exc:
                    args = exc.args
                    if not args:
                        arg0 = ''
                    else:
                        arg0 = args[0]
                    arg0 += ' at line %s' % lineStart
                    exc.args = (arg0,) + args[1:]
                    raise
                firstBlock = False

        return data

# begin definition of Tag Handler classes.

# TagHandler is the base class for a handler of tags.  This is an
# object that is capable of parsing tags and merging them into
# the output JSON document.
class TagHandler(object):
    # if takesArg is true, then text may occur after the tag
    # (it "accepts" a single text blob as an argument)
    takesArg = False
    # if takesArg is True, argOptional specifies whether the
    # argument is required
    argOptional = False
    # if mayRecur is True the tag may be specified multiple times
    # in a single document text blob.
    mayRecur = False
    def __init__(self, tagname):
        self.tagName = tagname

    # the parse method attempts to parse the text blob and returns
    # any representation of it that it likes.  This method should throw
    # if there's a syntactic error in the text argument.  text may be
    # 'None' if the tag accepts no argument.
    def parse(self, text):
        return text

    # attach merges the results of parsing a tag into the output
    # JSON document for a documentation block. `obj` is the value
    # returned by parse(), and parent is the json document that
    # the function should mutate
    def attach(self, obj, parent, blockType):
        parent[self.tagName[1:]] = obj

class ParamTagHandler(TagHandler):
    mayRecur = True
    takesArg = True

    # We support three forms:
    #   @property <name> <{type}> [description]
    #   @property <{type}> <name> [description]
    #   @property [name]
    #   [description]
    _pat = re.compile(
        '(?:^([\w.\[\]]+)\s*(?:{(\w+)})\s*(.*)$)|' +
        '(?:^{(\w+)}\s*([\w.\[\]]+)\s*(.*)$)|' +
        '(?:^([\w.\[\]]+)?\s*(.*)$)',
        re.S);

    def parse(self, text):
        m = self._pat.match(text)
        if not m:
            raise RuntimeError("Malformed args to %s: %s" %
                                   (tag, (text[:20] + "...")))
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
        return p

    def attach(self, obj, current, blockType):
        if not 'params' in current:
            current['params'] = [ ]
        current['params'].append(obj)

class SeeTagHandler(TagHandler):
    takesArg = True
    mayRecur = True
    def attach(self, obj, current, blockType):
        if not 'see' in current:
            current['see'] = [ ]
        current['see'].append(obj)

class DescTagHandler(TagHandler):
    takesArg = True
    mayRecur = True
    def attach(self, obj, current, blockType):
        if 'desc' in current:
            current['desc'] = current['desc'] + "\n\n" + obj
        else:
            current['desc'] = obj

class ReturnTagHandler(TagHandler):
    takesArg = True
    _pat = re.compile('^\s*(?:{(\w+)})?\s*(.*)$', re.S);
    _isWordPat = re.compile('^\w+$', re.S);

    def parse(self, text):
        m = self._pat.match(text)
        rv = { }
        if m:
            if m.group(1):
                rv['type'] = m.group(1)
            if m.group(2):
                # If the match is a single word, assume it's a
                # typename
                if self._isWordPat.match(m.group(2)):
                    rv['type'] = m.group(2)
                else:
                    rv['desc'] = m.group(2)
        else:
            raise RuntimeError("Malformed args to %s: %s" %
                               (self.tagName, (text[:20] + "...")))

        return rv

    def attach(self, obj, current, blockType):
        # The only way this can occur (returns already defined) is if
        # someone added an extension that behaves badly, or if @type and
        # @returns occur in the same block.
        if 'returns' in current:
            for k in current['returns']:
                if k in obj:
                    raise RuntimeError("Return %s redefined (@type and @returns in " % k +
                                       "same function block?)")
        else:
            current['returns'] = {}

        for k in obj:
            current['returns'][k] = obj[k]

class TypeTagHandler(ReturnTagHandler):
    # type is special.  it means different things
    # when it occurs in a '@property' vs. a '@function'
    # context.  in the former it's the property type, in
    # the later, it's an alias for '@return'
    def attach(self, obj, current, blockType):
        if (blockType == '@property'):
            if 'desc' in obj or 'type' not in obj:
                raise RuntimeError("Malformed args to %s: %s" %
                                   (self.tagName, (obj['desc'][:20] + "...")))
            current['type'] = obj["type"]
        else:
            ReturnTagHandler.attach(self, obj, current, blockType)

class ThrowsTagHandler(ReturnTagHandler):
    mayRecur = True
    def attach(self, obj, current, blockType):
        if 'throws' not in current:
            current['throws'] = [ ]
        current['throws'].append(obj)


# a block handler is slightly different than a tag
# handler.  Each document block is of a certain type,
# it describes *something*.  Block handlers do
# everything that TagHandlers do, but also:
#  * one block handler per code block, they're mutually
#    exclusive (a docblock can't describe a *function*
#    AND a *property*)
#  * express what tags may occur inside of them
#  * express what contexts they may occur in ('global'
#    and 'class' are the only two meaninful contexts at
#    present).
class BlockHandler(TagHandler):
    allowedTags = [ ]
    allowedContexts = [ 'global', 'class' ]
    def merge(self, doc, parent, guessedName):
        for k in doc:
            parent[k] = doc[k]
    def setLineNumber(self, lineStart, lineEnd, doc):
        doc['source_lines'] = [ lineStart, lineEnd ]

class ModuleBlockHandler(BlockHandler):
    allowedTags = [ '@desc', '@see' ]
    allowedContexts = [ 'global' ]
    takesArg = True
    _pat = re.compile('^(\w+)$|^(?:([\w.\[\]]+)\s*\n)?\s*(.*)$', re.S);
    def parse(self, text):
        m = self._pat.match(text)
        if not m:
            raise RuntimeError("Malformed args to %s: %s" %
                               (self.tagName, (text[:20] + "...")))
        a = { }
        if m.group(1):
            a["name"] = m.group(1)
        else:
            if m.group(2):
                a["name"] = m.group(2)
            if m.group(3):
                a["desc"] = m.group(3)
        return a

    def attach(self, obj, current, blockType):
        if "name" in obj:
            current['module'] = obj["name"]
        if "desc" in obj:
            if "desc" in current:
                obj['desc'] = current['desc'] + "\n\n" + obj['desc']
            current['desc'] = obj['desc']

class FunctionBlockHandler(ModuleBlockHandler):
    allowedTags = [ '@see', '@param', '@return', '@throws', '@desc', '@type' ]
    allowedContexts = [ 'global', 'class' ]

    def attach(self, obj, current, blockType):
        if "name" in obj:
            current['name'] = obj["name"]
        if "desc" in obj:
            if "desc" in current:
                obj['desc'] = current['desc'] + "\n\n" + obj['desc']
            current['desc'] = obj['desc']

    def merge(self, doc, parent, guessedName):
        if "name" not in doc:
            doc['name'] = guessedName
        if doc['name'] == None:
            raise RuntimeError("can't determine function name")                
        if not "functions" in parent:
            parent["functions"] = []
        for f in parent["functions"]:
            if doc["name"] == f['name']:
                raise RuntimeError("function '%s' redefined" % doc["name"])

        parent["functions"].append(doc)

class ConstructorBlockHandler(BlockHandler):
    allowedTags = [ '@see', '@param', '@throws', '@desc', '@return', '@type' ]
    takesArg = True
    argOptional = True
    allowedContexts = [ 'class' ]
    def attach(self, obj, current, blockType):
        if obj:
            if "desc" in current:
                obj = current['desc'] + "\n\n" + obj
            current['desc'] = obj

    def merge(self, doc, parent, guessedName):
        parent["constructor"] = doc

class ClassBlockHandler(FunctionBlockHandler):
    allowedTags = [ '@see', '@desc' ]
    def merge(self, doc, parent, guessedName):
        if "name" not in doc:
            doc['name'] = guessedName
        if not "classes" in parent:
            parent["classes"] = []
        for c in  parent["classes"]:
            if doc["name"] == c['name']:
                raise RuntimeError("class '%s' redefined" % doc["name"])
        parent["classes"].append(doc)

class EndClassBlockHandler(BlockHandler):
    def attach(self, obj, current, blockType):
        pass
    def merge(self, doc, parent, guessedName):
        pass

class PropertyBlockHandler(ParamTagHandler, BlockHandler):
    allowedTags = [ '@see', '@throws', '@desc', '@type' ]
    def attach(self, obj, current, blockType):
        for x in obj:
            current[x] = obj[x]

    def merge(self, doc, parent, guessedName):
        if "name" not in doc:
            doc['name'] = guessedName
        if doc["name"] == None:
            raise RuntimeError("can't determine property name")
        if not "properties" in parent:
            parent["properties"] = []
        for p in parent["properties"]:
            if doc["name"] == p['name']:
                raise RuntimeError("property '%s' redefined" % doc["name"])
        parent["properties"].append(doc)


# A type guesser that assumes the first documentation block of a source file is
# probably a '@module' documentation block
def firstBlockIsModuleTypeGuesser(firstBlock, codeChunk, context, tags, possibilities):
    if '@module' in possibilities and firstBlock:
        return '@module'
    return None

# A type guesser that checks the codeChunk for appearance of the keyword 'function'
_functionKeywordPat = re.compile('(?<!\w)function(?!\w)');
def isFunctionIfKeywordInCodeTypeGuesser(firstBlock, codeChunk, context, tags, possibilities):
    if '@function' in possibilities and _functionKeywordPat.search(codeChunk):
        return '@function'
    return None

# A type guesser that assumes '@property' based on the presence of @type and the absence of @return.
def typeWithoutReturnsIsProbablyPropertyTypeGuesser(firstBlock, codeChunk, context, tags, possibilities):
    if '@type' in tags and '@return' not in tags and '@property' in possibilities:
        return '@property'
    return None

# a guesser which assumes if a documentation block occurs before an assignment, its probably a
# property (this is a bit questionable, folks)
_assignmentPat = re.compile('^.*=.*;\s*$', re.M);
def assignmentIsProbablyPropertyTypeGuesser(firstBlock, codeChunk, context, tags, possibilities):
    if '@property' in possibilities and _assignmentPat.match(codeChunk):
        return '@property'
    return None

_hasGetSetterPat = re.compile('__define[GS]etter__');
def hasGetSetterIsPropertyTypeGuesser(firstBlock, codeChunk, context, tags, possibilities):
    if '@property' in possibilities and _hasGetSetterPat.search(codeChunk):
        return '@property'
    return None

# A name guesser that looks for exports.XXX and assumes XXX is the name we want
# define the pattern globally in this module so we don't recompile it all the time
_findExportsPat = re.compile('(?:^|\s)exports\.(\w+)\s', re.M);
def commonJSNameGuesser(codeChunk, blockType):
    m = _findExportsPat.search(codeChunk)
    if m:
        return m.group(1)
    return None

# A name guesser that catches assignment to properties and guesses the name based
# on that.  like `this.foo` or `stream.bar`.  Very general, but requires rooting
# at the beginning of line, whereas exports guesser does not
_findPropPat = re.compile('^\s*\w+\.(\w+)\s*=', re.M);
def assignToPropertyNameGuesser(codeChunk, blockType):
    m = _findPropPat.search(codeChunk)
    if m:
        return m.group(1)
    return None

_standardFunctionPat = re.compile('^\s*function\s*(\w+)\(.*$');
def standardFunctionNameGuesser(codeChunk, blockType):
    m = _standardFunctionPat.match(codeChunk)
    if m:
        return m.group(1)
    return None

_objectPropertyPat = re.compile('^\s*(\w+)\s*:.*$');
def objectPropertyNameGuesser(codeChunk, blockType):
    m = _objectPropertyPat.match(codeChunk)
    if m:
        return m.group(1)
    return None

_getSetterNameGuesserPat = re.compile(r'''__define[GS]etter__\s* \( \s* (?:"(\w+)" | '(\w+)') ''', re.X);
def getSetterNameGuesser(codeChunk, blockType):
    m = _getSetterNameGuesserPat.search(codeChunk)
    if m:
        return m.group(1) if m.group(1) else m.group(2)
    return None


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
