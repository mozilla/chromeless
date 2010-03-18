import re

class ParseError(Exception):
  pass

class APIParser:
  def __init__(self):
    self.name = None
    self.meta = dict()
    self.params = []
    
  def feed(self, text):
    self.lines = text.splitlines()
    self._parseApiTags()
    self._parseMetas()
    self._parseParams()
    
    obj = self.meta.copy()
    
    obj.update(
      name = self.name,
      description = self.description,
      params = self.params
    )
    
    return obj
    
  def _peekNextLine(self):
    if len(self.lines) > 0:
      return self.lines[0]
    else:
      return ""
  
  def _parseApiTags(self):
    titleLine = self.lines.pop(0)
    if "name" not in titleLine:
      raise ParseError("Opening <api> tag must have a name attribute.")
    name = re.findall("name=['\"]{0,1}([-\w\.]*?)['\"]", titleLine)
    if not name:
      raise ParseError("No value for name attribute found in "
                       "opening <api> tag.")
    self.name = name[0]
    
    finalLine = self.lines.pop()
    if not "</api>" in finalLine:
      raise ParseError("Closing </api> not found.")

  def _parseMetas(self):
    # Check for the first @param, which signifies the end
    # of the meta section.
    description = ""
    while len(self.lines) > 0 and not self.lines[0].startswith("@param"):
      line = self.lines.pop(0)
      if line.startswith("@"):
        line = line.strip("@ \t") #Remove @ and any white space
        splitLine = re.split("[ \t]", line)
        key = splitLine[0]
        
        if key != "returns":
          self.meta["type"] = key
        else:
          # Deal with @returns
          # Find the first line that starts with @param
          try:
            startParamLine = [line.strip().startswith("@param")
                              for line in self.lines].index(True)
          except:
            startParamLine = len(self.lines)
          
          retLines = [" ".join(splitLine[1:])] + self.lines[:startParamLine]
          self.lines = self.lines[startParamLine:]
          self._parseReturns(retLines)
      else:
        description += line.strip() + "\n"
    
    self.description = description.strip()

  def _parseParams(self):
    while len(self.lines) > 0:
      self._parseParam()
      
      
  def _parseName(self, raw):
    partialProps = dict()
    if "[" in raw:
      raw = raw.strip("[]")
      partialProps["required"] = True

    if "=" in raw:
      split = raw.split("=")
      raw = split[0]
      partialProps["default"] = split[1]
        
    partialProps["name"] = raw
    return partialProps
            
  def _parseType(self, raw):
    return dict(type = raw.strip("{} \n"))

  def _parseReturns(self, returnLines):
    # Find the first line that starts with @prop
    try:
      startPropLine = [line.strip().startswith("@prop")
                       for line in returnLines].index(True)
    except:
      startPropLine = len(returnLines)
      
    descLines =  returnLines[ :startPropLine]
    propLines = returnLines[startPropLine: ]
    
    if len(descLines) > 0:
      split = descLines[0].split(" ")
      info = self._parseType(split.pop(0))
      info["description"] = (" ".join(split[1:]) + "\n" +
                             "\n".join(descLines[1:]))
      info["description"] = info["description"].strip()
    
    propLines = "\n".join(propLines).split("@prop")
    propLines = [p.strip() for p in propLines if p.strip()]
    
    allProps = []
    
    for propLine in propLines:
      split = re.split("[ ]", propLine)      
      if "{" not in split[0]:
        raise ParseError("@prop in @returns do not have names "
                         "and must have {type}s: " + str(split))
      props = self._parseType(split.pop(0))
      
      props["description"] = " ".join([line for line in split if line])
      allProps.append(props)
    
    if len(allProps) > 0:
      info["props"] = allProps

    self.meta["returns"] = info


          
  def _parseProps(self, propLines):
    propLines = "\n".join(propLines).split("@prop")
    propLines = [p.strip() for p in propLines if p.strip()]
    
    allProps = []
    
    for propLine in propLines:
      split = re.split("[ ]", propLine)
      props = self._parseName(split.pop(0))
      
      hasType = "{" in propLine
      if hasType: props.update( self._parseType(split.pop(0)) )
      props["description"] = " ".join([line for line in split if line])
      allProps.append(props)

    if not self.params[-1].has_key("props"): self.params[-1]["props"] = []
    self.params[-1]["props"].append( allProps )
    
    
  def _parseParamMetas(self, paramLines):
    topLine = paramLines.pop(0).strip()

    if paramLines:
      nonPropLines = []
      while paramLines and "@prop" not in paramLines[0]:
        nonPropLines.append( paramLines.pop(0) )
              
      description = " ".join( [line.strip() for line in nonPropLines] )
    else:
      if "}" not in topLine:
        raise ParseError("The @param definition needs a {type}: " +
                         topLine)
      description = topLine.split("}")[1].strip()
    
    if len(paramLines) > 0: hasProp = True
    else: hasProp = False

    split = topLine.split(" ")

    if not (len(split) >= 2):
      raise ParseError("The @param/@prop definiton requires a name: " +
                       topLine)
    name = split[1]
    if hasProp:
      theType = "object"
    else:
      msg = "The @param/@prop definition requires a {type}: "
      if (not (len(split) >= 3)) or "{" not in split[2]:
        raise ParseError(msg + topLine)
      theType = split[2].strip("{}")
    
    param = dict(description = description)
    param.update( self._parseName(name) )
    param.update( self._parseType(theType) )
    
    self.params.append( param )
    return paramLines
    
  def _parseParam(self):
    paramLines = []
    if len(self.lines) > 0:
      paramLines.append( self.lines.pop(0) )
    
    hasProp = False
    
    while (len(self.lines) > 0 and
           not self._peekNextLine().strip().startswith("@param")):
      line = self.lines.pop(0)
      if "@prop" in line: hasProp = True
      paramLines.append(line)
    
    paramLines = self._parseParamMetas(paramLines)
    if hasProp:
      self._parseProps(paramLines)

def parse_hunks(text):
  # return a list of tuples. Each is one of:
  #  ("raw", string)     : non-API blocks
  #  ("api-json", dict)  : API blocks
  processed = 0 # we've handled all bytes up-to-but-not-including this
                # offset
  for m in re.finditer("<api[\w\W]*?</api>", text, re.M):
    start = m.start()
    if start > processed+1:
      yield ("markdown", text[processed:start])
      processed = start
    p = APIParser()
    d = p.feed(m.group(0))
    yield ("api-json", d)
    processed = m.end()
  if processed < len(text):
    yield ("markdown", text[processed:])

class _OLD:
  def _getAPIBlocks(self, text):
    blocks = re.findall("<api[\w\W]*?</api>", text, re.M)
    return blocks
    
  def _parseBlock(self, block):
    p = APIParser()
    dictApi = p.feed(block)
    print dictApi, "\n"*3
    return "|||%s|||" % repr(dictApi)
    #return str(api)
    
  def _compileParsedBlock( self, parsed):
    return parsed

if __name__ == "__main__":
  import sys

  for (t,data) in parse_hunks(open(sys.argv[1]).read()):
    print t.upper(), ":", data

