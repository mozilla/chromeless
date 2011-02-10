function handleDragStart(e) {
	var refIndex = parseInt(e.target.getAttribute("class").split("fileindex")[1]); 
	var fullPath = require('path').join(desktopPath, filesOnDesktop[refIndex ]);
	var fs = require('fs').stat(fullPath);

  if(fs.type == "file") { 
    /*
  		var file = fs.file;
 		  var leafName = fs.leafName;
    */
    console.log("Starting drag...to "+fullPath);
    var leafName = filesOnDesktop[refIndex];
    require('dragdrop').setDragData(e,fullPath,leafName, "copy", function(s) { console.log("success!") }, function (e) { console.log("error" + e) } );
    var image = document.createElement("img");
    image.setAttribute("border", "0");
    image.setAttribute("src", "images/question.png");
    image.setAttribute("width", "48");
    image.setAttribute("height", "48");
    e.dataTransfer.setDragImage(image, 25, 25);
    
  } else { 
    console.log("I can only associate files to the drag, for now...");
  } 
}

function handleDragEnd(e) {
}

function dragEnable() {
  var dragItems = document.querySelectorAll("[draggable=true]");
  for (var i = 0, l = dragItems.length; i < l; ++i) {
    dragItems[i].addEventListener("dragstart", handleDragStart, true);
    dragItems[i].addEventListener("dragend", handleDragEnd, true);
  }
}
