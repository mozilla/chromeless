#!/usr/bin/env Python
"""
API Extension for Python-Markdown
====================================

Added parsing of tables to Python-Markdown.

== method ==
set
:  Writes data from Jetpack to the clipboard. This is the recommended method
   of copying data to the clipboard.
== params ==
content
:  The content to be copied to the clipboard. If no other arguments are
   specified, the flavor of the content is assumed to 'plain'.
   *  type:string
   *  required:true
flavor
:   Data type. This is an optional parameter. The only flavors currently
    implemented are 'plain' (text/unicode) and 'html' (which is HTML).
    *  type:string
    *  default:"text"
    *  required:false


Goes to 

<div class="method">
<span class="name">set</span>
<span class="description">Writes data from Jetpack to the clipboard. This is the recommended method of copying data to the clipboard.</span>
<div class="params">
  <div class="param required">
    <span class="name">content</span>
    <span class="description">The content to be copied to the clipboard. If no other arguments are specified, the flavor of the content is assumed to 'plain'.</span>
    <span class="type">string</span>
  </div>
  <div class="param optional">
    <span class="name">flavor</span>
    <span class="description">Data type. This is an optional parameter. The only flavors currently implemented are 'plain' (text/unicode) and 'html' (which is HTML).</span>
    <span class="type">string</span>
    <span class="default">"text"</span>
  </div>
</div> 
</div>

Copyright 2010 - Aza Raskin
"""
import markdown
from markdown import etree


class APIProcessor(markdown.blockprocessors.BlockProcessor):
    """ Process API. """

    def test(self, parent, block):
        rows = block.split('\n')
        return rows[0] == "== method =="

    def run(self, parent, blocks):
        """ Parse the API and build the doc. """
        block = blocks.pop(0).split('\n')
        method = self._parse( parent, block )
        self._expandDefinition( method )
        

            
    def _parse( self, parent, block ):
      method = {
        "name": None, 
        "params": []
      }
      
      for line in block:
        if line.startswith("=="):
          parent = self._parseHeader( parent, line )
          owner = parent
        
        elif line[0] not in ": \t":            
          if parent.get('class') == 'params':
            param = etree.SubElement(parent, 'div')
            param.set( 'class', 'param' )
            owner = param
          
          span = etree.SubElement(owner, 'span')
          span.set( 'class', 'name' )
          span.text = line.strip()
          
          if not method["name"]:
            method["name"] = span.text
            method["el"] = span
          else:
            method["params"].append(dict(name = span.text, required="true"))
          
        elif line[0] == ":":
          span = etree.SubElement(owner, 'span')
          span.set( 'class', 'description' )
          span.text = line.strip(": \t")
                  
        elif line[0] in " \t" and line.strip()[0] != "*":
          span = self.lastChild(owner)
          span.text += " " + line.strip()
          
        elif line.strip()[0] == "*":
          line = line.strip(" \t*")
          className, text = line.split(":")
          
          if method["params"]: method["params"][-1][className] = text
          else: method[className] = text
          
          if className == "required":
            if text != "true": className = "optional"
            className = owner.get('class') + " " + className
            owner.set('class', className)
          elif className == "returns":
            pass
          else:
            span = etree.SubElement(owner, 'span')
            span.set( 'class', className)
            span.text = text
            
      return method
            
            
    def _parseHeader( self, parent, line ):
      div = etree.SubElement(parent, 'div')
      # Remove the spaces and equal signs
      className = line.strip('= ')
      div.set( 'class', className )
      return div
      
    def _expandDefinition( self, method ):
      parent = method["el"]
      parent.text += "("
      
      for param in method["params"]:
        try:
          self._createParam( parent, param )
        except:
          "It appears you left something out in param:", param

      children = parent.getchildren()
      if children:
        parent.getchildren()[-1].tail = ")"
      else:
        parent.text += ")"
      
      if( method.has_key("returns") ):
        returns = etree.SubElement(parent, 'span')
        returns.set('class', 'returns')
        returns.text = method["returns"]
       
    
    def _createParam( self, span, param ):
      className = "param"
      
      if param["required"] == "true": className += " required"

      p = etree.SubElement(span, "span")
      p.set('class', className)
      name = etree.SubElement(p, "strong")
      name.set("class","name")
      name.text = param["name"]
      
      t = etree.SubElement(p, "em")
      t.set("class","type")
      t.text = param["type"]
      

class APIExtension(markdown.Extension):
    """ Add API documentation to Markdown. """

    def extendMarkdown(self, md, md_globals):
        """ Add an instance of APIProcessor to BlockParser. """
        md.parser.blockprocessors.add('api', 
                                      APIProcessor(md.parser),
                                      '<hashheader')

def makeExtension(configs={}):
    return APIExtension(configs=configs)
