(function(global){

function _indefiniteArticle(str) {
  // If str is upper case, assume it's an acronym and use "a".
  return str.toUpperCase() === str ? "a" :
         /^[aeiou]/i.test(str) ? "an" :
         "a";
}

function _createApiTitle(doc, prefix){
  if (doc.type == "property") {
    return _createPropertyTitle(doc, "Property: ");
  }
  else if (doc.type == "class") {
    return _createClassTitle(doc, "Class: ");
  }
  else {
    return _createMethodTitle(doc, false, "Function: ");
  }
}

function _createTitle(doc){
  if (doc.type == "property") {
    return _createPropertyTitle(doc, "");
  }
  else if (doc.type == "class") {
    return _createClassTitle(doc, true, "");
  }
  else {
    return _createMethodTitle(doc, true, "");
  }
}

function _createPropertyTitle(doc, prefix) {
  var $title = $("<div class='name'/>").html(prefix + doc.name);
  var text = " is " + _indefiniteArticle(doc.property_type) + " ";
  var $isSpan = $("<span class='property_type'/>").text(text);
  $("<span class='type'/>").text(doc.property_type).appendTo($isSpan);
  $isSpan.appendTo($title);
  return $title;
}

function _createClassTitle(doc, prefix) {
  var $title = $("<div class='name'/>").html(prefix + doc.name);
  return $title;
}

function _createMethodTitle(doc, showReturns, prefix){
  var $title = $("<div class='name'/>")
    .html(prefix + doc.name + "(<span class='params'></span>)");

  var $params = $title.find(".params");
  if (doc.params) {
    doc.params.forEach(function(param, i) {
      var p = $("<span class='param'/>")
              .text(param.name) // what if param.name is empty?
              .appendTo($params);

      if( param.required == true ) p.addClass("required");
      else p.addClass("optional");

      if( param["default"] ){
        $("<span class='default'/>").text(param["default"]).appendTo(p);
      }

      if( i != doc.params.length-1 ) p.after(", ");
    });
  }

  if( doc.returns && showReturns){
    var text = " returns " + _indefiniteArticle(doc.returns.type) + " ";
    var $ret = $("<span class='returns'/>").text(text);
    $("<span class='type'/>").text(doc.returns.type).appendTo($ret);
    $ret.appendTo($title);
  }

  return $title;
}

function _createDescription(doc){
  // this is markdown, and will be fixed up later in render()
  var $desc = $("<div class='description'/>").text(doc.description);
  return $desc;
}

function _createReturns(doc){
  var $ret = $("<div class='returns'/>")
    .html( "Returns " + "<span class='type'>" + doc.returns.type + "</span>" );

  if( doc.returns.description )
    $("<div class='description'/>").text( doc.returns.description ).appendTo($ret);

  if( doc.returns.props ){
    $props = $("<div class='props'/>").appendTo($ret);
    doc.returns.props.forEach(function(prop){
      var $prop = $("<div class='prop'/>").appendTo($props);
      $("<span class='type'/>").text( prop.type ).appendTo($prop);
      $("<span class='description'/>").text( prop.description ).appendTo($prop);
    });
  }

  return $ret;
}

function _createParams(doc){
  var $params = $("<div class='params'/>");

  doc.params.forEach(function(param){
    var $param = $("<div class='param'/>").appendTo($params);
    var $name = $("<span class='name'/>").text( param.name ).appendTo($param);
    if( param.required == true ) $name.addClass("required");
    else $name.addClass("optional");
    if (param.type)
      $("<span class='type'/>").text( param.type ).appendTo($param);
    $("<span class='description'/>").text( param.description ).appendTo($param);
    if( param["default"] )
      $("<span class='default'/>").text( param["default"] ).appendTo($param);

    if( !param.props ) param.props = [];
    param.props.forEach(function(prop){
      var $prop = $("<div class='prop'/>").appendTo($param);
      $name = $("<span class='name'/>").text( prop.name ).appendTo($prop);
      if (prop.required)
        $name.addClass("required");
      else
        $name.addClass("optional");
      prop.type = prop.type || " ";
      $("<span class='type'/>").text( prop.type ).appendTo($prop);
      $("<span class='description'/>").text( prop.description ).appendTo($prop);
    });

  });

  return $params;
}

function _createComponent($context, components, componentName){
  var $classMemberSet = $("<div class='class-member-set'/>");
  var $componentHeader = $("<div class='name'/>").html(componentName);
  $componentHeader.appendTo($classMemberSet);

  for(var i = 0; i < components.length; i++) {
    component = components[i];
    var $classMember = $("<div class='class-member'/>");
    _createTitle(component).appendTo($classMember);

    if(component.params) {
      _createParams(component).appendTo($classMember);
    }
    if(component.returns) {
      _createReturns(component).appendTo($classMember);
    }
  _createDescription(component).appendTo($classMember);
  $classMember.appendTo($classMemberSet)
  }
  $classMemberSet.appendTo($context);
  return $context;
}

function _createClassComponents($context, doc){
  if(doc.constructors) {
    _createComponent($context, doc.constructors, "Constructors");
  }

  if(doc.methods) {
    _createComponent($context, doc.methods, "Methods");
  }

  if(doc.properties) {
    _createComponent($context, doc.properties, "Properties");
  }
}

function render(doc, $where){
  var $home = $where;
  $home.html("");
  if ($home.length == 0)
    return;

  _createApiTitle(doc).appendTo($home);

  if( doc.params) _createParams(doc).appendTo($home);
  if( doc.returns ) _createReturns(doc).appendTo($home);
  _createDescription(doc).appendTo($home);
  _createClassComponents($home, doc);

  $home.find(".description").each(function(){
    var text = $(this).text();
    $(this).html( markdownToHtml(text) );
  });
}

global.renderDocumentationJSON = render;

})(this);
