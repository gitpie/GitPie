// Dependencies
var app = require("app")
  , BrowserWindow = require("browser-window")
  ;

// Report crashes to our server.
// require("crash-reporter").start();

app.on("ready", function() {
  var mainWindow = new BrowserWindow({width: 800, height: 600});
  mainWindow.loadUrl("file://" + __dirname + "/index.html");
});
