import sys, os
import markdown
import apiparser
import time

# list of all the 'class' and 'id' attributes assigned to
# <div> and <span> tags by the renderer.
API_REFERENCE = 'api_reference'
MODULE_API_DOCS_CLASS = 'module_api_docs'
MODULE_API_DOCS_ID = '_module_api_docs'
API_HEADER = 'api_header'
API_NAME = 'api_name'
API_COMPONENT_GROUP = 'api_component_group'
API_COMPONENT = 'api_component'
DATATYPE = 'datatype'
RETURNS = 'returns'
PARAMETER_SET = 'parameter_set'
MODULE_DESCRIPTION = 'module_description'

HTML_HEADER = '''
<!DOCTYPE html>\n
<html>\n
<head>\n
  <meta http-equiv="Content-type" content="text/html; charset=utf-8" />\n
  <base target="_blank"/>\n
  <link rel="stylesheet" type="text/css" media="all"\n
        href="../../../css/base.css" />\n
  <link rel="stylesheet" type="text/css" media="all"\n
        href="../../../css/apidocs.css" />\n
  <title>Add-on SDK Documentation</title>\n
  <style type="text/css">\n
    body {\n
      border: 50px solid #FFFFFF;\n
    }\n
  </style>\n
\n
  <script type="text/javascript">\n
    function rewrite_links() {\n
      var images = document.getElementsByTagName("img");\n
      for (var i = 0; i < images.length; i++) {\n
        var before = images[i].src.split("packages/")[0];\n
        var after = images[i].src.split("/docs")[1];\n
        images[i].src = before + after;\n
      }\n
    }\n
    </script>\n
</head>\n
\n
<body onload = "rewrite_links()">\n'''

HTML_FOOTER = '''
</body>\n
\n
</html>\n'''

def indent(text_in):
    text_out = ''
    lines = text_in.splitlines(True)
    indentation_level = 0
    indentation_depth = 2
    for line in lines:
        if (line.startswith('<div')):
            text_out += ((' ' * indentation_depth) * indentation_level) + line
            indentation_level += 1
        else:
            if (line.startswith('</div>')):
                indentation_level -= 1
            text_out += ((' ' * indentation_depth) * indentation_level) + line
    return text_out

def tag_wrap_id(text, classname, id, tag = 'div'):
    return ''.join(['\n<'+ tag + ' id="', id, '" class="', \
                   classname, '">\n\n', text + '\n</' + tag +'>\n\n'])

def tag_wrap(text, classname, tag = 'div'):
    return ''.join(['\n<' + tag + ' class="', classname, '">\n\n', \
                   text, '\n</'+ tag + '>\n\n'])

def span_wrap(text, classname):
    return ''.join(['\n<span class="', classname, '">', \
                   text, '</span>\n\n'])

class API_Renderer(object):
    def __init__(self, json, tag):
        self.name = json['name']
        self.tag = tag
        self.description = json.get('description', '')
        self.json = json

    def render_name(self):
        raise Exception('not implemented in this class')

    def render_description(self):
        return markdown.markdown(self.description)

    def render_subcomponents(self):
        raise Exception('not implemented in this class')

    def get_tag(self):
        return self.tag

class Class_Doc(API_Renderer):
    def __init__(self, json, tag):
        API_Renderer.__init__(self, json, tag)

    def render_name(self):
        return self.name

    def render_subcomponents(self):
        return render_object_contents(self.json)

class Function_Doc(API_Renderer):
    def __init__(self, json, tag, owner=None):
        API_Renderer.__init__(self, json, tag)
        self.owner = owner
        self.signature = json['signature']
        self.returns = json.get('returns', None)
        self.parameters_json = json.get('params', None)

    def render_name(self):
        if (self.owner):
            return self.owner + '.' + self.signature
        else:
            return self.signature

    def render_subcomponents(self):
        return self._render_parameters() + self._render_returns()

    def _render_parameters(self):
        if  not self.parameters_json:
            return ''
        text = ''.join([render_comp(Parameter_Doc(parameter_json, 'div')) \
                       for parameter_json in self.parameters_json])
        return tag_wrap(text, PARAMETER_SET)

    def _render_returns(self):
        if not self.returns:
            return ''
        text = 'Returns: ' + span_wrap(self.returns['type'], DATATYPE)
        text += markdown.markdown(self.returns['description'])
        return tag_wrap(text, RETURNS)

class Parameter_Doc(API_Renderer):
    def __init__(self, json, tag):
        API_Renderer.__init__(self, json, tag)
        self.datatype = json.get('type', None)
        self.properties_json = json.get('props', None)

    def render_name(self):
        if self.datatype:
            return self.name + ' : ' + \
                   span_wrap(self.datatype, DATATYPE)
        return self.name

    def render_subcomponents(self):
        if not self.properties_json:
            return ''
        text = ''.join([render_comp(Internal_Property_Doc(property_json, 'div')) \
                       for property_json in self.properties_json])
        return text

# internal_property_doc is a hack to deal with the fact that
# in the current model properties of parameters are represented
# differently. This should be fixed, but it's an incompatible change,
# so deferring it for now.
class Internal_Property_Doc(API_Renderer):
    def __init__(self, json, tag, owner = None):
        API_Renderer.__init__(self, json, tag)
        self.owner = owner
        self.datatype = json['type']

    def render_name(self):
        if self.owner:
            rendered_name = self.owner + '.' + self.name
        else:
            rendered_name = self.name
        return rendered_name + ' : ' + \
               span_wrap(self.datatype, DATATYPE)

    def render_subcomponents(self):
        return ''

class Property_Doc(API_Renderer):
    def __init__(self, json, tag, owner = None):
        API_Renderer.__init__(self, json, tag)
        self.owner = owner
        self.datatype = json['property_type']

    def render_name(self):
        if self.owner:
            rendered_name = self.owner + '.' + self.name
        else:
            rendered_name = self.name
        return rendered_name + ' : ' + \
               span_wrap(self.datatype, DATATYPE)

    def render_subcomponents(self):
        return render_object_contents(self.json)

def render_object_contents(json):
    ctors = json.get('constructors', None)
    text = render_comp_group(ctors, 'Constructors', Function_Doc)
    methods = json.get('methods', None)
    text += render_comp_group(methods, 'Methods', Function_Doc)
    properties = json.get('properties', None)
    text += render_comp_group(properties, 'Properties', Property_Doc)
    return text

def render_comp(component):
    # a component is wrapped inside a single div marked 'API_COMPONENT'
    # containing:
    # 1) the component name, marked 'API_NAME'
    text = tag_wrap(component.render_name(), API_NAME, component.get_tag())
    # 2) the component description
    text += component.render_description()
    # 3) the component contents
    text += component.render_subcomponents()
    return tag_wrap(text, API_COMPONENT)

def render_comp_group(group, group_name, ctor, tag = 'div', comp_tag = 'div'):
    if not group:
        return ''
    # component group is a list of components in a single div called
    # 'API_COMPONENT_GROUP' containing:
    # 1) a title for the group marked with 'API_HEADER'
    text = tag_wrap(group_name, API_HEADER, tag)
    # 2) each component
    text += ''.join([render_comp(ctor(api, comp_tag)) for api in group])
    return tag_wrap(text, API_COMPONENT_GROUP)

def render_descriptions(descriptions_md):
    text = ''.join([description_md for description_md in descriptions_md])
    return tag_wrap(markdown.markdown(text), MODULE_DESCRIPTION)

def render_api_reference(api_docs):
    if (len(api_docs) == 0):
        return ''
    # at the top level api reference is in a single div marked 'API_REFERENCE',
    # containing:
    # 1) a title 'API Reference' marked with 'API_HEADER'
    text = tag_wrap('API Reference', API_HEADER, 'h2')
    # 2) a component group called 'Classes' containing any class elements
    classes = [api for api in api_docs if api['type'] == 'class']
    text += render_comp_group(classes, 'Classes', Class_Doc, 'h3', 'h4')
    # 3) a component group called 'Functions' containing any global functions
    functions = [api for api in api_docs if api['type'] == 'function']
    text += render_comp_group(functions, 'Functions', Function_Doc, 'h3', 'h4')
    # 4) a component group called 'Properties' containing any global properties
    properties = [api for api in api_docs if api['type'] == 'property']
    text += render_comp_group(properties, 'Properties', Property_Doc, 'h3', 'h4')
    return tag_wrap(text, API_REFERENCE)

# take the JSON output of apiparser
# return the HTML DIV containing the rendered component
def json_to_div(json, markdown_filename):
    module_name, ext = os.path.splitext(os.path.basename(markdown_filename))
    descriptions = [hunk[1] for hunk in json if hunk[0]=='markdown']
    api_docs = [hunk[1] for hunk in json if hunk[0]=='api-json']
    text = "<h1>" + module_name + "</h1>"
    text += render_descriptions(descriptions)
    text += render_api_reference(api_docs)
    text = tag_wrap_id(text, MODULE_API_DOCS_CLASS, \
                       module_name + MODULE_API_DOCS_ID)
    return text.encode('utf8')

# take the JSON output of apiparser
# return standalone HTML containing the rendered component
def json_to_html(json, markdown_filename):
    return indent(HTML_HEADER + \
           json_to_div(json, markdown_filename) + HTML_FOOTER)

# take the name of a Markdown file
# return the HTML DIV containing the rendered component
def md_to_div(markdown_filename):
    markdown_contents = open(markdown_filename).read().decode('utf8')
    json = list(apiparser.parse_hunks(markdown_contents))
    return json_to_div(json, markdown_filename)

# take the name of a Markdown file
# return standalone HTML containing the rendered component
def md_to_html(markdown_filename):
    return indent(HTML_HEADER + md_to_div(markdown_filename) + HTML_FOOTER)

if __name__ == '__main__':
    if (len(sys.argv) == 0):
        print 'Supply the name of a docs file to parse'
    else:
        print md_to_html(sys.argv[1])
