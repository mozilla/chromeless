var xhr = require("xhr");

function runTask(options) {
  require("bootstrap").run(options, packaging.root.path);
  processNextTask();
}

function processNextTask() {
  var req = new xhr.XMLHttpRequest();
  var url = "http://localhost:8888/api/task-queue/get";
  req.open("GET", url);
  req.onreadystatechange = function() {
    if (req.readyState == 4) {
      if (req.status == 200) {
        if (req.responseText) {
          runTask(JSON.parse(req.responseText));
        } else
          processNextTask();
      } else {
        require("timer").setTimeout(processNextTask, 1000);
      }
    }
  };
  req.send(null);
}

exports.main = function(options) {
  console.log("Starting.");
  processNextTask();
};
