var request = require('request'),

  os = require('os'),

  path = require('path'),

  fs = require('fs'),

  events = require('events'),

  util = require('util'),

  targz = require('tar.gz'),

  AdmZip = require('adm-zip'),

  localPackJson = require('../../package.json'),

  UPDATE_CONFIG = require('./updateConfig'),

  remotePackJson,

  releaseURL = UPDATE_CONFIG.releaseURL,

  downloadedPath,

  EXEC_PATH,

  // Output stream instance
  write,

  callbackDownloadFn,

  rmdir = function (dir) {
    var list = fs.readdirSync(dir);

  	for(var i = 0; i < list.length; i++) {
  		var filename = path.join(dir, list[i]);
  		var stat = fs.statSync(filename);

  		if(filename == "." || filename == "..") {
  			// pass these files
  		} else if(stat.isDirectory()) {
  			// rmdir recursively
  			rmdir(filename);
  		} else {
  			// rm fiilename
  			fs.unlinkSync(filename);
  		}
  	}

  	fs.rmdirSync(dir);
  },

  getExecPath = function () {
    var reverse = process.execPath.split('').reverse().join(''),
      reversedPath,
      execPath;

    console.log(path.sep);

    reversedPath = reverse.substr(reverse.indexOf(path.sep));
    execPath = reversedPath.split('').reverse().join('');

    return execPath;
  };

function Updater () {
  this.updating = false;

  EXEC_PATH = getExecPath();
}

util.inherits(Updater, events.EventEmitter);

Updater.prototype.checkAvailableUpdate = function () {

  request(UPDATE_CONFIG.remotePackJsonURL, function (error, response, body) {
    remotePackJson = JSON.parse(body);

    if (localPackJson.version != remotePackJson.version) {
      this.emit('availableUpdate', remotePackJson);
    }

  }.bind(this));
};

Updater.prototype.update = function () {

  if (!this.updating) {
    this.updating = true;

    releaseURL = releaseURL.concat('v').concat(remotePackJson.version).concat('/');

    console.log('os', os.platform());
    console.log('arch', os.arch());
    console.log('EXEC_PATH', EXEC_PATH);

    switch (os.platform()) {
      case 'linux':
        write = targz().createWriteStream(os.tmpdir());

        if (os.arch() == 'x64') {
          releaseURL = releaseURL.concat(UPDATE_CONFIG.fileName.linux64);
          downloadedPath = 'linux64';
        } else {
          releaseURL = releaseURL.concat(UPDATE_CONFIG.fileName.linux32);
          downloadedPath = 'linux32';
        }

        callbackDownloadFn = function () {
          rmdir(EXEC_PATH);

          fs.rename( path.join(os.tmpdir(), downloadedPath), EXEC_PATH, function (err) {

            if (err) {
              console.error(err);
              alert(err);
              this.emit('updateerror');
            } else {
              this.emit('updated');
            }
          }.bind(this));

        }.bind(this);

        break;

      case 'win32':

        if (os.arch() == 'x64') {
          releaseURL = releaseURL.concat(UPDATE_CONFIG.fileName.win64);
          downloadedPath = 'win64';
        } else {
          releaseURL = releaseURL.concat(UPDATE_CONFIG.fileName.win32);
          downloadedPath = 'win32';
        }

        write = fs.createWriteStream( path.join(os.tmpdir(), downloadedPath.concat('.zip')) );

        callbackDownloadFn = function () {
          var zip = new AdmZip( path.join(os.tmpdir(), downloadedPath.concat('.zip')) ),
            zipEntries = zip.getEntries();

          fs.mkdirSync(path.join(os.tmpdir(), 'pie'));

          zip.extractAllTo( path.join(os.tmpdir(), 'pie') , true);

          fs.rename( path.join(os.tmpdir(), 'pie', downloadedPath), EXEC_PATH, function (err) {
            console.log(err);
            fs.unlinkSync( path.join(os.tmpdir(), downloadedPath.concat('.zip')) );
            rmdir( path.join(os.tmpdir(), 'pie') );

            this.emit('updated');

          }.bind(this));
        }.bind(this);

        break;

        case 'osx':

          if (os.arch() == 'x64') {
            releaseURL = releaseURL.concat(UPDATE_CONFIG.fileName.osx64);
            downloadedPath = 'osx64';
          } else {
            releaseURL = releaseURL.concat(UPDATE_CONFIG.fileName.osx32);
            downloadedPath = 'osx32';
          }

          write = fs.createWriteStream( path.join(os.tmpdir(), downloadedPath.concat('.zip')) );

          callbackDownloadFn = function () {
            var zip = new AdmZip( path.join(os.tmpdir(), downloadedPath.concat('.zip')) ),
              zipEntries = zip.getEntries();

            fs.mkdirSync(path.join(os.tmpdir(), 'pie'));

            zip.extractAllTo( path.join(os.tmpdir(), 'pie') , true);

            fs.rename( path.join(os.tmpdir(), 'pie', downloadedPath), EXEC_PATH, function () {
              fs.unlinkSync( path.join(os.tmpdir(), downloadedPath.concat('.zip')) );
              rmdir( path.join(os.tmpdir(), 'pie') );

              this.emit('updated');

            }.bind(this));
          }.bind(this);

          break;

      default:
        throw new Error('Operation system '.concat(os.platform()).concat(' not supported'));
    }

    //Streams
    var read = request.get(releaseURL);

    this.emit('downloadingfiles');

    read
      .pipe(write)
      .on('close', function () {
        this.emit('installing');

        callbackDownloadFn.call(this);
      }.bind(this));
  }
};

module.exports = Updater;
