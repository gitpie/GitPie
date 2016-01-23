'use strict';

let gulp = require('gulp');
let sass = require('gulp-sass');
let packager = require('electron-packager');
let path = require('path');

const BUILD_FOLDER = 'build';
const RELEASE_FOLDER = 'release';
const LINUX = 'linux';
const MAC = 'osx';
const WINDOWS = 'windows';
const ARCH_64 = '64bit';
const ARCH_32 = '32bit';

/* Development tasks */
gulp.task('sass', function () {
  gulp.src('./resources/sass/all.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(sass({outputStyle: 'compressed'}))
    .pipe(gulp.dest('./resources/css/'));
});

gulp.task('sass:watch', function () {
  gulp.watch('./resources/sass/**/*.scss', ['sass']);
});

gulp.task('dev', ['sass', 'sass:watch']);

/* Build tasks */
gulp.task('build', ['build:linux', 'build:osx', 'build:win']);

// Linux
gulp.task('build:linux', ['build:linux64', 'build:linux32']);

gulp.task('build:linux64', ['sass'], function () {
  var buildOpts = getDefaultBuildOpts();

  buildOpts.platform = 'linux';
  buildOpts.arch = 'x64';
  buildOpts.out = path.join(BUILD_FOLDER, LINUX, ARCH_64);

  build(buildOpts);
});

gulp.task('build:linux32', ['sass'], function () {
  var buildOpts = getDefaultBuildOpts();

  buildOpts.platform = 'linux';
  buildOpts.arch = 'ia32';
  buildOpts.out = path.join(BUILD_FOLDER, LINUX, ARCH_32);

  build(buildOpts);
});

// Mac
gulp.task('build:osx', ['build:osx64']);

gulp.task('build:osx64', ['sass'], function () {
  var buildOpts = getDefaultBuildOpts();

  buildOpts.platform = 'darwin';
  buildOpts.arch = 'x64';
  buildOpts.out = path.join(BUILD_FOLDER, MAC, ARCH_64);
  buildOpts.icon = 'resources/images/icon.icns';

  build(buildOpts);
});

// Windows
gulp.task('build:win', ['build:win64', 'build:win32']);

gulp.task('build:win64', ['sass'], function () {
  var buildOpts = getDefaultBuildOpts();

  buildOpts.platform = 'win32';
  buildOpts.arch = 'x64';
  buildOpts.out = path.join(BUILD_FOLDER, WINDOWS, ARCH_64);
  buildOpts.icon = 'resources/images/icon.ico';

  build(buildOpts);
});

gulp.task('build:win32', ['sass'], function () {
  var buildOpts = getDefaultBuildOpts();

  buildOpts.platform = 'win32';
  buildOpts.arch = 'ia32';
  buildOpts.out = path.join(BUILD_FOLDER, WINDOWS, ARCH_32);
  buildOpts.icon = 'resources/images/icon.ico';

  build(buildOpts);
});

// Return a default build options to Electron
function getDefaultBuildOpts() {
  return {
    dir: __dirname,
    name: 'GitPie',
    version: '0.36.0',
    ignore: getIgnoreRegex(),

    // Fallbacks

    icon: 'resources/images/icon.png',
    out: BUILD_FOLDER
  };
}

function build(electronBuildOpts) {
  var fs = require('fs-extra');

  fs.removeSync(electronBuildOpts.out);

  packager(electronBuildOpts, function (err, appPath) {

    if (err) {
      console.error('Error building electron application for "' + electronBuildOpts.platform + '" arch "' + electronBuildOpts.arch + '". Error:', err);
    } else {
      console.info('Build application for "' + electronBuildOpts.platform + '" arch "' + electronBuildOpts.arch + '" in ', appPath, ' with success!');
    }
  });
}

function getIgnoreRegex() {
  var pack = require('./package'),
    execSync = require('child_process').execSync,
    nonIgnoredModules = [],
    ignoreRegex =  '^/node_modules/(?!({modules}))';

  function findDependentModule (parentModule, module) {
    var pkgModule;

    if (parentModule == 'main') {
      pkgModule = require('./node_modules/'.concat(module).concat('/package'));
    } else {

      try {
        pkgModule = require('./node_modules/'.concat(module).concat('.').concat(parentModule).concat('/package'));
      } catch (err) {
        pkgModule = require('./node_modules/'.concat(module).concat('/package'));
      }

    }

    nonIgnoredModules.push(module);

    if (Object.keys(pkgModule.dependencies).length > 0) {

      for (var i in pkgModule.dependencies) {
        findDependentModule(module, i);
      }

    }
  }

  var npmVersion = execSync('npm -v'),
    i = 0;

  if (parseInt(npmVersion.toString()[0]) >= 3) {
    // The npm modules structure is flat
    for (i in pack.dependencies) {
      findDependentModule('main', i);
    }
  } else {
    // The npm modules structure is not flat
    for (i in pack.dependencies) {
      nonIgnoredModules.push(i);
    }
  }

  ignoreRegex = ignoreRegex.replace('{modules}', nonIgnoredModules.join('|'));

  return [ignoreRegex, '^/'.concat(BUILD_FOLDER)];
}

/* Packing tasks */

// Windows
gulp.task('pack:win64', function () {
  var electronBuilder = require('electron-builder');
  var fs = require('fs-extra');
  var releasePath = path.join(RELEASE_FOLDER, WINDOWS, ARCH_64);

  console.log('Creating windows inataller on', releasePath, '...');

  electronBuilder.init().build({
    appPath: path.join(BUILD_FOLDER, WINDOWS, ARCH_64, 'GitPie-win32-x64'),
    platform: 'win',
    config: 'app/core/packager/config.json',
    out: releasePath
  },
  function (err) {

    if (err) {
      console.error('Error creating windows installer.', err);
    } else {
      console.log('Windows installer created with success on ', releasePath);
    }
  });
});

// Linux
gulp.task('pack:linux64', function () {
  var electronBuilder = require('electron-builder');
  var fs = require('fs-extra');
  var releasePath = path.join(RELEASE_FOLDER, LINUX, ARCH_64);
  var targz = require('tar.gz');

  fs.ensureDirSync(releasePath);

  console.log('Start compressing ', path.join(BUILD_FOLDER, LINUX, ARCH_64, 'GitPie-linux-x64'), 'please wait...');

  targz().compress(path.join(BUILD_FOLDER, LINUX, ARCH_64, 'GitPie-linux-x64'), path.join(releasePath, 'GitPie-linux-x64.tar.gz'))
    .then(function(){
      console.log('File', path.join(releasePath, 'GitPie-linux-x64.tar.gz'), 'created!');
    })
    .catch(function(err){
      console.error('Error compressing ', path.join(BUILD_FOLDER, WINDOWS, ARCH_64, 'GitPie-linux-x64'), 'folder.', err);
    });
});

// Mac
gulp.task('pack:osx64', function () {
  var electronBuilder = require('electron-builder');
  var fs = require('fs-extra');
  var releasePath = path.join(RELEASE_FOLDER, MAC, ARCH_64);
  var AdmZip = require('adm-zip');
  var zip = new AdmZip();

  fs.ensureDirSync(releasePath);

  console.log('Start compressing ', path.join(BUILD_FOLDER, MAC, ARCH_64, 'GitPie-darwin-x64'), 'please wait...');

  zip.addLocalFolder(path.join(BUILD_FOLDER, MAC, ARCH_64, 'GitPie-darwin-x64'));
  zip.writeZip(path.join(releasePath, 'GitPie-darwin-x64.zip'));

  console.log('File', path.join(releasePath, 'GitPie-darwin-x64.zip'), 'created!');
});
