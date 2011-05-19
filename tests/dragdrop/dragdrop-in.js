function onDrop(e) { 
  e.stopPropagation();
  e.preventDefault();
  var dt = e.dataTransfer;
  var files = dt.files;
  var count = files.length;
  for (var i = 0; i < count; i++) {
    var types = dt.mozTypesAt(i);
    for (var t = 0; t < types.length; t++) {
       console.log("Checking all types, type = " + types[t]);
       if (types[t] == "application/x-moz-file") {
           try {
             var data = files[i];
             console.log("(" + (typeof data) + ") : <" + data + " > " + data.fileName + " " + data.fileSize + "\n");
             document.getElementById("droparea").innerHTML="<h2>The file name is: " + data.fileName+"</h2>";
           } catch (i) {
             console.log("Something wrong");
           }
       }
    }
  }
} 

function onDragEnter(e) { 

} 

function onDragLeave(e) { 
   console.log("Drag leave");
} 
