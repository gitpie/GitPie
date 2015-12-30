'use strict';

let Electronify = require('electronify'),
  App = new Electronify(__dirname + '/index.html', {
    title: 'GitPie',
    resizable: true,
    width: 1000,
    height: 600,
    minWidth: 1000,
    minHeight: 600
});
