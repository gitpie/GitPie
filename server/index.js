// Dependencies
var App = require("app")
  , BrowserWindow = require("browser-window")
  , Path = require("path")
  , Menu = require("menu")
  , Ipc = require("ipc")
  , DarwinMenu = require("./menu/darwin.js")
  , OtherMenu = require("./menu/other.js")
  ;

const ROOT = Path.normalize(__dirname + "/..");
// Report crashes to our server.
// require("crash-reporter").start();

App.on("ready", function() {
    var mainWindow = new BrowserWindow({width: 800, height: 600})
      , menu = null
      ;

    mainWindow.loadUrl("file://" + ROOT + "/client/html/index.html");
    if (process.platform === "darwin") {
        menu = Menu.buildFromTemplate(DarwinMenu(App, mainWindow))
        Menu.setApplicationMenu(menu)
    } else {
        menu = Menu.buildFromTemplate(OtherMenu(mainWindow))
        mainWindow.setMenu(menu)
    }
});
