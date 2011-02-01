            function handleDragStart(e) {
		var refIndex = parseInt(e.target.getAttribute("class").split("fileindex")[1]); 
console.log("refindex = "+refIndex);
		var fullPath = require('file').join(desktopPath, filesOnDesktop[refIndex ]);
		var fs = require('file').stat(fullPath);
  		var file = fs.file;
 		var leafName = fs.leafName;

                console.log("Starting drag...to "+leafName);

                // We try to set the drag type in the chrome part 
                // so we do not get a security exception
 		//var fileName = file.path.split("/");
		//var onlyName = fileName[fileName.length-1];
 		//require('misc').setDragData(e,file,onlyName);
 		require('dragdrop').setDragData(e,file,leafName, "copy", function(s) { console.log("success!") }, function (e) { console.log("error" + e) } );

                var image = document.createElement("img");
                image.setAttribute("border", "0");
                image.setAttribute("src", "images/question.png");
                image.setAttribute("width", "48");
                image.setAttribute("height", "48");
                e.dataTransfer.setDragImage(image, 25, 25);

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
