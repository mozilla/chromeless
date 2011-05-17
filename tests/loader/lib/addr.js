var node = null; 

exports.run = function(n) {
  
   node = n;
   timer = require('timer');
try { 
   timer.setTimeout( function () { tick() }, 1000);
} catch(i) { console.log(i) } 

};

var c=0;
tick = function () { 
   c++;
   node.innerHTML=c;  
 
console.log("+");
   timer.setTimeout( function () { tick() }, 1000);
} 

require("unload").when(
  function() {
    trackedObjects = {};
    if (timer) {
      timer.cancel();
console.log("cleanup");
      timer = null;
    }
  });

