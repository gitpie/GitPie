'use strict';

let Electronify = require('electronify'),
  App = new Electronify(__dirname + '/index.html', {
    title: 'GitPie',
    resizable: true,
    width: 1000,
    height: 600,
    minWidth: 1000,
    minHeight: 600
  }),
  globalShortcut = require('global-shortcut');

App.on('ready', function () {

  // Open devTools for debug
  globalShortcut.register('ctrl+shift+d', function() {
    let Win = App.mainWindow;

    if (Win.isDevToolsOpened()) {
      Win.closeDevTools();
    } else {
      Win.openDevTools();
    }
  });

});
