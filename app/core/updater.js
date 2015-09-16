var request = require('request'),

  os = require('os'),

  path = require('path'),

  fs = require('fs-extra'),

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

  getExecPath = function () {
    var reverse = process.execPath.split('').reverse().join(''),
      reversedPath,
      execPath;

    reversedPath = reverse.substr(reverse.indexOf(path.sep));
    execPath = reversedPath.split('').reverse().join('');

    return execPath.substr( 0, (execPath.length - 1) );
  },

  getHardwareInfo = function () {
    var info = {};

    if (/64/.test(process.arch)) {
      info.arch = 'x64';
    } else {
      info.arch = 'x86';
    }

    switch (process.platform) {
      case 'darwin':
        info.os = 'mac';
          break;
      case 'win32':
        info.os = 'windows';
          break;
      case 'linux':
        info.os = 'linux';
          break;
      default:
        info.os = 'unknown';
          break;
    }

    return info;
  };

function Updater () {
  this.updating = false;

  EXEC_PATH = getExecPath();
}

util.inherits(Updater, events.EventEmitter);

Updater.prototype.checkAvailableUpdate = function () {

  request(UPDATE_CONFIG.remotePackJsonURL, function (error, response, body) {

    if (error) {
      this.emit('error', error);
    } else {
      remotePackJson = JSON.parse(body);

      if (localPackJson.version != remotePackJson.version) {
        this.emit('availableUpdate', remotePackJson);
      }
    }

  }.bind(this));
};

Updater.prototype.update = function () {
  var hInfo = getHardwareInfo();

  if (!this.updating) {
    this.updating = true;

    releaseURL = releaseURL.concat('v').concat(remotePackJson.version).concat('/');

    console.log('[DEBUG] OS: ', hInfo.os);
    console.log('[DEBUG] Arch: ', hInfo.arch);
    console.log('[DEBUG] EXEC_PATH: ', EXEC_PATH);

    switch (hInfo.os) {
      case 'linux':
        write = targz().createWriteStream(os.tmpdir());

        if (hInfo.arch == 'x64') {
          releaseURL = releaseURL.concat(UPDATE_CONFIG.fileName.linux64);
          downloadedPath = 'linux64';
        } else {
          releaseURL = releaseURL.concat(UPDATE_CONFIG.fileName.linux32);
          downloadedPath = 'linux32';
        }

        callbackDownloadFn = function () {
          fs.renameSync(EXEC_PATH, EXEC_PATH.concat('.old'));

          fs.move( path.join(os.tmpdir(), downloadedPath), EXEC_PATH, function (err) {

            if (err) {
              this.emit('error', err);
            } else {
              this.emit('updated');
            }

            fs.removeSync(path.join(os.tmpdir(), downloadedPath));
            fs.removeSync(EXEC_PATH.concat('.old'));
          }.bind(this));

        }.bind(this);

        break;

      case 'windows':

        if (hInfo.arch == 'x64') {
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

          fs.move( path.join(os.tmpdir(), 'pie', downloadedPath), EXEC_PATH, function (err) {
            fs.removeSync( path.join(os.tmpdir(), downloadedPath.concat('.zip')) );
            fs.removeSync( path.join(os.tmpdir(), 'pie') );

            if (err) {
              this.emit('error', err);
            } else {
              this.emit('updated');
            }

          }.bind(this));
        }.bind(this);

        break;

        case 'mac':

          if (hInfo.arch == 'x64') {
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

            fs.move( path.join(os.tmpdir(), 'pie', downloadedPath), EXEC_PATH, function (err) {
              fs.removeSync( path.join(os.tmpdir(), downloadedPath.concat('.zip')) );
              fs.removeSync( path.join(os.tmpdir(), 'pie') );

              if (err) {
                this.emit('error', err);
              } else {
                this.emit('updated');
              }

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
