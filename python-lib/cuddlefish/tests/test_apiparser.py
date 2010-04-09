
import os
import unittest
from cuddlefish.apiparser import parse_hunks, ParseError

tests_path = os.path.abspath(os.path.dirname(__file__))
static_files_path = os.path.join(tests_path, "static-files")

class ParserTests(unittest.TestCase):
    def pathname(self, filename):
        return os.path.join(static_files_path, "docs", filename)

    def parse_text(self, text):
        return list(parse_hunks(text))

    def parse(self, pathname):
        return self.parse_text(open(pathname).read())

    def test_parser(self):
        parsed = self.parse(self.pathname("APIsample.md"))
        #for i,h in enumerate(parsed):
        #    print i, h
        self.assertEqual(parsed[0],
                         ("markdown", "# Title #\n\nSome text here\n\n"))
        self.assertEqual(parsed[1][0], "api-json")
        p_test = parsed[1][1]
        self.assertEqual(p_test["name"], "test")
        self.assertEqual(p_test["type"], "method")
        self.assertEqual(p_test["description"],
                         "This is a function which does nothing in particular.")
        r = p_test["returns"]
        self.assertEqual(r["type"], "object")
        self.assertEqual(r["description"], "")
        self.assertEqual(len(r["props"]), 2)
        self.assertEqual(r["props"][0]["type"], "string")
        self.assertEqual(r["props"][0]["description"], "First string")
        self.assertEqual(r["props"][1]["type"], "url")
        self.assertEqual(r["props"][1]["description"], "First URL")

        self.assertEqual(p_test["params"][0],
                         {"name": "argOne",
                          "required": True,
                          "type": "string",
                          "description": "This is the first argument.",
                          "line_number": 11,
                          })

        self.assertEqual(p_test["params"][1],
                         {"name": "argTwo",
                          "required": False,
                          "type": "bool",
                          "description": "This is the second argument.",
                          "line_number": 12,
                          })

        self.assertEqual(p_test["params"][2],
                         {"name": "argThree",
                          "required": False,
                          "default": "default",
                          "type": "uri",
                          "line_number": 13,
                          "description": """\
This is the third and final argument. And this is
a test of the ability to do multiple lines of
text.""",
                          })
        p3 = p_test["params"][3]
        self.assertEqual(p3["name"], "options")
        self.assertEqual(p3["required"], False)
        self.failIf("type" in p3)
        self.assertEqual(p3["description"], "Options Bag")
        self.assertEqual(p3["props"][0],
                         {"name": "style",
                          "required": False,
                          "type": "string",
                          "description": "Some style information.",
                          "line_number": 18,
                          })
        self.assertEqual(p3["props"][1],
                         {"name": "secondToLastOption",
                          "required": False,
                          "default": "True",
                          "type": "bool",
                          "description": "The last property.",
                          "line_number": 19,
                          })
        self.assertEqual(p3["props"][2]["name"], "lastOption")
        self.assertEqual(p3["props"][2]["required"], False)
        self.assertEqual(p3["props"][2]["type"], "uri")
        self.assertEqual(p3["props"][2]["description"], """\
And this time we have
A multiline description
Written as haiku""")

        self.assertEqual(parsed[2][0], "markdown")
        self.assertEqual(parsed[2][1], "\n\nThis text appears between the API blocks.\n\n")

        self.assertEqual(parsed[3][0], "api-json")
        p_test = parsed[3][1]

        expected = {'description': 'This is a list of options to specify modifications to your slideBar instance.',
 "line_number": 28,
 'name': 'append',
 'params': [{'description': 'Pass in all of your options here.',
             'name': 'options',
             "line_number": 31,
             'props': [{'description': 'The HREF of an icon to show as the method of accessing your features slideBar',
                        'name': 'icon',
                        "line_number": 33,
                        'required': False,
                        'type': 'uri'},
                       {'description': 'The content of the feature, either as an HTML string,\nor an E4X document fragment (e.g., <><h1>Hi!</h1></>)',
                        'name': 'html',
                        "line_number": 34,
                        'required': False,
                        'type': 'string/xml'},
                       {'description': 'The url to load into the content area of the feature',
                        'name': 'url',
                        "line_number": 37,
                        'required': False,
                        'type': 'uri'},
                       {'description': 'Width of the content area and the selected slide size',
                        'name': 'width',
                        "line_number": 38,
                        'required': False,
                        'type': 'int'},
                       {'description': 'Default slide behavior when being selected as follows:\nIf true: blah; If false: double blah.',
                        'name': 'persist',
                        "line_number": 39,
                        'required': False,
                        'type': 'bool'},
                       {'description': 'Automatically reload content on select',
                        'name': 'autoReload',
                        "line_number": 42,
                        'required': False,
                        'type': 'bool'},
                       {'description': 'Callback when the icon is clicked',
                        'name': 'onClick',
                        "line_number": 43,
                        'required': False,
                        'type': 'function'},
                       {'description': 'Callback when the feature is selected',
                        'name': 'onSelect',
                        "line_number": 44,
                        'required': False,
                        'type': 'function'},
                       {'description': 'Callback when featured is loaded',
                        'name': 'onReady',
                        "line_number": 45,
                        'required': False,
                        'type': 'function'}],
             'required': True}],
 'type': 'method'}
        self.assertEqual(p_test, expected)

        self.assertEqual(parsed[5][0], "api-json")
        p_test = parsed[5][1]
        self.assertEqual(p_test["name"], "cool-func.dot")
        self.assertEqual(p_test["returns"]["description"],
                         """\
A value telling you just how cool you are.
A boa-constructor!
This description can go on for a while, and can even contain
some **realy** fancy things. Like `code`, or even
~~~~{.javascript}
// Some code!
~~~~""")
        self.assertEqual(p_test["params"][2]["props"][0],
                         {"name": "callback",
                          "required": True,
                          "type": "function",
                          "line_number": 63,
                          "description": "The callback",
                          })
        self.assertEqual(p_test["params"][2]["props"][1],
                         {"name": "random",
                          "required": False,
                          "type": "bool",
                          "line_number": 64,
                          "description": "Do something random?",
                          })

        self.assertEqual(parsed[8][0], "markdown")
        self.assertEqual(parsed[8][1], "\n\nSome more text here.\n\n")

    def test_missing_return_propname(self):
        md = '''\
<api name="test">
@method
This is a function which does nothing in particular.
@returns {object}
  @prop {string} First string, but the property name is missing
  @prop {url} First URL, same problem
@param argOne {string} This is the first argument.
</api>
'''
        self.assertRaises(ParseError, self.parse_text, md)

    def test_missing_return_proptype(self):
        md = '''\
<api name="test">
@method
This is a function which does nothing in particular.
@returns {object}
  @prop untyped It is an error to omit the type of a return property.
@param argOne {string} This is the first argument.
@param [argTwo=True] {bool} This is the second argument.
</api>
'''
        self.assertRaises(ParseError, self.parse_text, md)

    def test_return_propnames(self):
        md = '''\
<api name="test">
@method
This is a function which does nothing in particular.
@returns {object}
  @prop firststring {string} First string.
  @prop [firsturl] {url} First URL, not always provided.
@param argOne {string} This is the first argument.
@param [argTwo=True] {bool} This is the second argument.
</api>
'''
        parsed = self.parse_text(md)
        r = parsed[0][1]["returns"]
        self.assertEqual(r["props"][0]["name"], "firststring")
        self.assertEqual(r["props"][0],
                         {"name": "firststring",
                          "type": "string",
                          "description": "First string.",
                          "required": True,
                          "line_number": 5, # 1-indexed
                          })
        self.assertEqual(r["props"][1],
                         {"name": "firsturl",
                          "type": "url",
                          "description": "First URL, not always provided.",
                          "required": False,
                          "line_number": 6,
                          })

    def test_return_description_1(self):
        md = '''\
<api name="test">
@method
This is a function which does nothing in particular.
@returns {object} A one-line description.
  @prop firststring {string} First string.
  @prop [firsturl] {url} First URL, not always provided.
@param argOne {string} This is the first argument.
@param [argTwo=True] {bool} This is the second argument.
</api>
'''
        parsed = self.parse_text(md)
        r = parsed[0][1]["returns"]
        self.assertEqual(r["description"], "A one-line description.")

    def test_return_description_2(self):
        md = '''\
<api name="test">
@method
This is a function which does nothing in particular.
@returns {object} A six-line description
  which is consistently indented by two spaces
    except for this line
  and preserves the following empty line
  
  from which a two-space indentation will be removed.
  @prop firststring {string} First string.
  @prop [firsturl] {url} First URL, not always provided.
@param argOne {string} This is the first argument.
@param [argTwo=True] {bool} This is the second argument.
</api>
'''
        parsed = self.parse_text(md)
        r = parsed[0][1]["returns"]
        self.assertEqual(r["description"],
                         "A six-line description\n"
                         "which is consistently indented by two spaces\n"
                         "  except for this line\n"
                         "and preserves the following empty line\n"
                         "\n"
                         "from which a two-space indentation will be removed.")

    def test_return_description_3(self):
        md = '''\
<api name="test">
@method
This is a function which does nothing in particular.
@returns A one-line untyped description.
@param argOne {string} This is the first argument.
@param [argTwo=True] {bool} This is the second argument.
</api>
'''
        parsed = self.parse_text(md)
        r = parsed[0][1]["returns"]
        self.assertEqual(r["description"], "A one-line untyped description.")

    # if the return value was supposed to be an array, the correct syntax
    # would not have any @prop tags:
    #  @returns {array}
    #   Array consists of two elements, a string and a url...

    def test_return_array(self):
        md = '''\
<api name="test">
@method
This is a function which returns an array.
@returns {array}
  Array consists of two elements, a string and a url.
@param argOne {string} This is the first argument.
@param [argTwo=True] {bool} This is the second argument.
</api>
'''
        parsed = self.parse_text(md)
        r = parsed[0][1]["returns"]
        self.assertEqual(r["description"],
                         "Array consists of two elements, a string and a url.")

    def test_bad_default_on_required_parameter(self):
        md = '''\
<api name="test">
@method
This is a function which does nothing in particular.
@returns something
@param argOne=ILLEGAL {string} Mandatory parameters do not take defaults.
@param [argTwo=Chicago] {string} This is the second argument.
</api>
'''
        self.assertRaises(ParseError, self.parse_text, md)

    def test_missing_apitype(self):
        md = '''\
<api name="test">
Sorry, you must have a @method or something before the description.
Putting it after the description is not good enough
@method
@returns something
</api>
'''
        self.assertRaises(ParseError, self.parse_text, md)

    def test_missing_param_propname(self):
        md = '''\
<api name="test">
@method
This is a function which does nothing in particular.
@param p1 {object} This is a parameter.
  @prop {string} Oops, props must have a name.
</api>
'''
        self.assertRaises(ParseError, self.parse_text, md)

    def test_missing_param_proptype(self):
        md = '''\
<api name="test">
@method
This is a function which does nothing in particular.
@param p1 {object} This is a parameter.
  @prop name Oops, props must have a type.
</api>
'''
        self.assertRaises(ParseError, self.parse_text, md)

if __name__ == "__main__":
    unittest.main()
