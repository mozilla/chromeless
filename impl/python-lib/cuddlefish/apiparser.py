import sys, re, textwrap

class ParseError(Exception):
    # args[1] is the line number that caused the problem
    def __init__(self, why, lineno):
        self.why = why
        self.lineno = lineno
    def __str__(self):
        return ("ParseError: the JS API docs were unparseable on line %d: %s" %
                        (self.lineno, self.why))

class Accumulator:
    def __init__(self, holder, firstline):
        self.holder = holder
        self.firstline = firstline
        self.otherlines = []
    def addline(self, line):
        self.otherlines.append(line)
    def finish(self):
        # take a list of strings like:
        #    "initial stuff"    (this is in firstline)
        #    "  more stuff"     (this is in lines[0])
        #    "  yet more stuff"
        #    "      indented block"
        #    "      indented block"
        #    "  nonindented stuff"  (lines[-1])
        #
        # calculate the indentation level by looking at all but the first
        # line, and removing the whitespace they all have in common. Then
        # join the results with newlines and return a single string.
        pieces = []
        if self.firstline:
            pieces.append(self.firstline)
        if self.otherlines:
            pieces.append(textwrap.dedent("\n".join(self.otherlines)))
        self.holder["description"] = "\n".join(pieces)


class APIParser:
    def parse(self, lines, lineno):
        api = {"line_number": lineno}

        titleLine = lines.pop(0)
        if "name" not in titleLine:
            raise ParseError("Opening <api> tag must have a name attribute.",
                             lineno)
        m = re.search("name=['\"]{0,1}([-\w\.]*?)['\"]", titleLine)
        if not m:
            raise ParseError("No value for name attribute found in "
                                             "opening <api> tag.", lineno)
        lineno += 1
        api["name"] = m.group(1)

        finalLine = lines.pop()
        if not "</api>" in finalLine:
            raise ParseError("Closing </api> not found.", lineno+len(lines))

        props = []
        currentPropHolder = None
        params = []
        tag, info, firstline = self._parseTypeLine(lines[0], lineno)
        api["type"] = tag

        if tag == 'property':
            if not 'type' in info:
                raise ParseError("No type found for @property.", lineno)
            api['property_type'] = info['type']

        # info is ignored
        currentAccumulator = Accumulator(api, firstline)
        for line in lines[1:]:
            lineno += 1  # note that we count from lines[1:]

            if not line.lstrip().startswith("@"):
                currentAccumulator.addline(line)
                continue

            # we're starting a new section
            currentAccumulator.finish()
            tag, info, firstline = self._parseTypeLine(line, lineno)
            if tag == "prop":
                if "type" not in info:
                    raise ParseError("@prop lines must include {type}: '%s'" %
                                     line, lineno)
                if "name" not in info:
                    raise ParseError("@prop lines must provide a name: '%s'" %
                                     line, lineno)
                props.append(info) # build up props[]
                currentAccumulator = Accumulator(info, firstline)
                continue
            # close off the @prop list
            if props and currentPropHolder:
                currentPropHolder["props"] = props
                props = []

            if tag == "returns":
                api["returns"] = info
                # the Accumulator will add ["description"] when done
                currentAccumulator = Accumulator(info, firstline)
                # @prop tags get attached to api["returns"]
                currentPropHolder = info
                continue
            if tag == "param":
                if info.get("required", False) and "default" in info:
                    raise ParseError("required parameters should not have defaults: '%s'"
                                     % line, lineno)
                params.append(info)
                currentAccumulator = Accumulator(info, firstline)
                # @prop tags get attached to this param
                currentPropHolder = info
                continue
            raise ParseError("unknown '@' section header %s in '%s'" %
                             (tag, line), lineno)

        currentAccumulator.finish()
        if props and currentPropHolder:
            currentPropHolder["props"] = props
        if params:
            api["params"] = params

        return api

    def _parseTypeLine(self, line, lineno):
        # handle these things:
        #    @method
        #    @returns description
        #    @returns {string} description
        #    @param NAME {type} description
        #    @param NAME
        #    @prop NAME {type} description
        #    @prop NAME
        info = {"line_number": lineno}
        pieces = line.split()

        if not pieces:
            raise ParseError("line is too short: '%s'" % line, lineno)
        if not pieces[0].startswith("@"):
            raise ParseError("type line should start with @: '%s'" % line,
                             lineno)
        tag = pieces[0][1:]
        skip = 1

        expect_name = tag in ("param", "prop")

        if len(pieces) == 1:
            description = ""
        else:
            if pieces[1].startswith("{"):
                # NAME is missing, pieces[1] is TYPE
                pass
            else:
                if expect_name:
                    info["required"] = not pieces[1].startswith("[")
                    name = pieces[1].strip("[ ]")
                    if "=" in name:
                        name, info["default"] = name.split("=")
                    info["name"] = name
                    skip += 1

            if len(pieces) > skip and pieces[skip].startswith("{"):
                info["type"] = pieces[skip].strip("{ }")
                skip += 1

            # we've got the metadata, now extract the description
            pieces = line.split(None, skip)
            if len(pieces) > skip:
                description = pieces[skip]
            else:
                description = ""

        return tag, info, description


def parse_hunks(text):
    # return a list of tuples. Each is one of:
    #    ("raw", string)         : non-API blocks
    #    ("api-json", dict)  : API blocks
    processed = 0 # we've handled all bytes up-to-but-not-including this offset
    line_number = 1
    for m in re.finditer("<api[\w\W]*?</api>", text, re.M):
        start = m.start()
        if start > processed+1:
            hunk = text[processed:start]
            yield ("markdown", hunk)
            processed = start
            line_number += hunk.count("\n")
        api_text = m.group(0)
        api_lines = api_text.splitlines()
        d = APIParser().parse(api_lines, line_number)
        yield ("api-json", d)
        processed = m.end()
        line_number += api_text.count("\n")
    if processed < len(text):
        yield ("markdown", text[processed:])

class TestRenderer:
    # render docs for test purposes

    def getm(self, d, key):
        return d.get(key, "<MISSING>")

    def join_lines(self, text):
        return " ".join([line.strip() for line in text.split("\n")])

    def render_prop(self, p):
        s = "props[%s]: " % self.getm(p, "name")
        pieces = []
        for k in ("type", "description", "required", "default"):
            if k in p:
                pieces.append("%s=%s" % (k, self.join_lines(str(p[k]))))
        return s + ", ".join(pieces)

    def render_param(self, p):
        pieces = []
        for k in ("name", "type", "description", "required", "default"):
            if k in p:
                pieces.append("%s=%s" % (k, self.join_lines(str(p[k]))))
        yield ", ".join(pieces)
        for prop in p.get("props", []):
            yield " " + self.render_prop(prop)

    def format_api(self, api):
        yield "name= %s" % self.getm(api, "name")
        yield "type= %s" % self.getm(api, "type")
        yield "description= %s" % self.getm(api, "description")
        params = api.get("params", [])
        if params:
            yield "parameters:"
            for p in params:
                for pline in self.render_param(p):
                    yield " " + pline
        r = api.get("returns", None)
        if r:
            yield "returns:"
            if "type" in r:
                yield " type= %s" % r["type"]
            if "description" in r:
                yield " description= %s" % self.join_lines(r["description"])
            props = r.get("props", [])
            for p in props:
                yield "  " + self.render_prop(p)

    def render_docs(self, docs_json, outf=sys.stdout):

        for (t,data) in docs_json:
            if t == "api-json":
                #import pprint
                #for line in str(pprint.pformat(data)).split("\n"):
                #    outf.write("JSN: " + line + "\n")
                for line in self.format_api(data):
                    outf.write("API: " + line + "\n")
            else:
                for line in str(data).split("\n"):
                    outf.write("MD :" +  line + "\n")

def hunks_to_dict(docs_json):
    exports = {}
    for (t,data) in docs_json:
        if t != "api-json":
            continue
        if data["name"]:
            exports[data["name"]] = data
    return exports

if __name__ == "__main__":
    json = False
    if sys.argv[1] == "--json":
        json = True
        del sys.argv[1]
    docs_text = open(sys.argv[1]).read()
    docs_parsed = list(parse_hunks(docs_text))
    if json:
        import simplejson
        print simplejson.dumps(docs_parsed, indent=2)
    else:
        TestRenderer().render_docs(docs_parsed)
