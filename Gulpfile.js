'use strict';

let gulp = require('gulp');
let sass = require('gulp-sass');
let packager = require('electron-packager');
let path = require('path');
let fs = require('fs-extra');
let wos = require('node-wos');
let gputil = require('gitpie-util');
let logger = gputil.logger;

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
    version: '0.36.4',
    ignore: getIgnoreRegex(),

    // Fallbacks

    icon: 'resources/images/icon.png',
    out: BUILD_FOLDER
  };
}

function build(electronBuildOpts) {
  fs.removeSync(electronBuildOpts.out);

  packager(electronBuildOpts, function (err, appPath) {

    if (err) {
      logger.error(`Error building electron application for "${electronBuildOpts.platform}" arch "${electronBuildOpts.arch}". Error: ${err}`);
    } else {
      logger.success(`Application built for "${electronBuildOpts.platform}" arch "${electronBuildOpts.arch}" in "${electronBuildOpts.out}"`);
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
  let electronBuilder = require('electron-builder');
  let releasePath = path.join(RELEASE_FOLDER, WINDOWS, ARCH_64);

  fs.ensureDirSync(releasePath);

  logger.info(`Creating windows installer on ${releasePath}...`);

  electronBuilder.init().build({
    appPath: path.join(BUILD_FOLDER, WINDOWS, ARCH_64, 'GitPie-win32-x64'),
    platform: 'win',
    config: 'app/core/packager/config.json',
    out: releasePath
  },
  function (err) {

    if (err) {
      logger.error(`Error creating windows installer. ${err}`);
    } else {
      logger.success(`Windows installer created with success on ${releasePath}`);
      logger.info('Preparing to compress windows build folder...');

      setTimeout(function () {
        compressBuild({
          platform: WINDOWS,
          arch: ARCH_64,
          fileName: 'GitPie-win32-x64'
        });
      }, 4000);
    }
  });
});

// Linux
gulp.task('pack:linux64', function () {
  var electronBuilder = require('electron-builder');
  var releasePath = path.join(RELEASE_FOLDER, LINUX, ARCH_64);
  var targz = require('tar.gz');

  fs.ensureDirSync(releasePath);

  logger.info(`Start compressing ${path.join(BUILD_FOLDER, LINUX, ARCH_64, 'GitPie-linux-x64')} please wait...`);

  targz().compress(path.join(BUILD_FOLDER, LINUX, ARCH_64, 'GitPie-linux-x64'), path.join(releasePath, 'GitPie-linux-x64.tar.gz'))
    .then(function(){
      logger.success(`File ${path.join(releasePath, 'GitPie-linux-x64.tar.gz')} created!`);
    })
    .then(function () {

      if (wos.isLinux()) {

        if (gputil.util.isRoot()) {
          createDeb({ arch: ARCH_64 });
        } else {
          logger.error('To create a .DEB package you must run the task with root privilegies');
        }
      } else {
        logger.warn('Unfortunately to create .deb and .rmp packages you must be on a linux machine.');
      }
    })
    .catch(function(err){
      logger.error(`Error compressing ${path.join(BUILD_FOLDER, WINDOWS, ARCH_64)} GitPie-linux-x64 folder. ${err}`);
    });
});

// Mac
gulp.task('pack:osx64', function () {

  compressBuild({
    platform: MAC,
    arch: ARCH_64,
    fileName: 'GitPie-darwin-x64'
  });

});

function compressBuild(opts) {
  const RELEASE_DIRECTORY = path.join(__dirname, RELEASE_FOLDER, opts.platform, opts.arch);
  const BUILD_DIRECTORY = path.join(__dirname, BUILD_FOLDER, opts.platform, opts.arch);

  var zipFilePath = path.join(RELEASE_DIRECTORY, opts.fileName.concat('.zip'));

  const spawn = require('child_process').spawn;

  logger.info(`Start compressing "${zipFilePath}" please wait...`);

  const zip = spawn('zip', ['-y', '-r', '-v', zipFilePath, opts.fileName.concat('/')], { cwd: BUILD_DIRECTORY });

  zip.stdout.on('data', (data) => {
    console.log(`${data}`);
  });

  zip.on('error', (err) => {
    logger.error(`Error compressing "${zipFilePath}". Error:`, err);
  });

  zip.on('close', (code) => {
    if (code === 0) {
      logger.success(`File "${zipFilePath}" created!`);
    }
  });
}

function createDeb(opts) {
  let archDescription;
  let binariesFolder;

  switch (opts.arch) {
    case ARCH_32:
      archDescription = 'ia32';
      binariesFolder = 'GitPie-linux-ia32';
      break;
    case ARCH_64:
      archDescription = 'amd64';
      binariesFolder = 'GitPie-linux-x64';
      break;
    default:
      throw new Error(`Architucture ${opts.arch} invalid`);
  }

  const RELEASE_DIRECTORY = path.join(__dirname, RELEASE_FOLDER, LINUX, opts.arch);
  const BUILD_DIRECTORY = path.join(__dirname, BUILD_FOLDER, LINUX, opts.arch);

  const spawn = require('child_process').spawn;

  var packageJSON = require('./package');

  logger.info(`Start creating .DEB package for GitPie. Arch: ${opts.arch}`);

  const baseFolder = path.join(RELEASE_DIRECTORY, `${packageJSON.name.toLowerCase()}_${packageJSON.version}_${archDescription}`);

  fs.mkdirsSync( path.join(baseFolder, 'usr', 'share', 'pixmaps') );
  logger.info(`Directory ${path.join(baseFolder, 'usr', 'share', 'pixmaps')} created`);

  fs.mkdirsSync( path.join(baseFolder, 'usr', 'local', 'bin') );
  logger.info(`Directory ${path.join(baseFolder, 'usr', 'local', 'bin')} created`);

  fs.outputFileSync(path.join(baseFolder, 'DEBIAN', 'control'), `Package: ${packageJSON.name.toLowerCase()}
Upstream-Name: ${packageJSON.name}
Version: ${packageJSON.version}
Architecture: ${archDescription}
Name: ${packageJSON.name}
Essential: no
Section: util
Priority: optional
Maintainer: Matheus Paiva <matheus.a.paiva@gmail.com>
Installed-Size: 115,2
Description: ${packageJSON.description}

`);

  logger.info(`File ${path.join(baseFolder, 'DEBIAN', 'control')} created`);

  // Create Desktop Entry
  fs.outputFileSync(path.join(baseFolder, 'usr', 'share', 'applications', 'gitpie.desktop'), `[Desktop Entry]
Name=${packageJSON.name}
Comment=${packageJSON.description}
Exec=${packageJSON.name.toLowerCase()}
Icon=${packageJSON.name.toLowerCase()}
Type=Application
Categories=GNOME;GTK;Utility;Development;
`);

  logger.info('Desktop Entry created');

  // Copy icon image
  fs.copySync(path.join(__dirname, 'resources', 'images', 'icon.png'), path.join(baseFolder, 'usr', 'share', 'pixmaps', 'gitpie.png'));

  logger.info('Icon copied');

  // Copy binaries
  fs.copySync(path.join(BUILD_DIRECTORY, binariesFolder), path.join(baseFolder, 'usr', 'share', 'gitpie'));

  logger.info('Binaries copied');
  logger.info('Creating symbolic link...');

  // Create symbolic link
  let execFolder = path.join(baseFolder, 'usr', 'local', 'bin');
  let ln = spawn('ln', ['-s', '../../share/gitpie/GitPie', 'gitpie'], { cwd: execFolder });

  ln.stdout.on('data', (data) => {
    console.log(`${data}`);
  });

  ln.on('error', (err) => {
    logger.error(`Error creating symbolic link. Error: ${err}`);
  });

  ln.on('close', (code) => {
    logger.success(`Symbolic link created!. Exit code ${code}`);

    logger.info('Creating .DEB file...');

    let dpkg = spawn('dpkg-deb', ['-b', `${packageJSON.name.toLowerCase()}_${packageJSON.version}_${archDescription}`], { cwd: RELEASE_DIRECTORY });

    dpkg.stdout.on('data', (data) => {
      console.log(`${data}`);
    });

    dpkg.stderr.on('data', (data) => {
      console.log(`${data}`);
    });

    dpkg.on('error', (err) => {
      logger.error(`Error creating .DEB file. Error: ${err}`);
    });

    dpkg.on('close', (code) => {

      if (code != 2) {
        logger.success(`.DEB file created!`);
      }

      logger.info(`Exit with code ${code}`);

      logger.info('Creating .RPM file...');

      let alien = spawn('alien', ['-r', '-c', '-v', `${packageJSON.name.toLowerCase()}_${packageJSON.version}_${archDescription}.deb`], { cwd: RELEASE_DIRECTORY });

      alien.stdout.on('data', (data) => {
        console.log(`${data}`);
      });

      alien.stderr.on('data', (data) => {
        console.log(`${data}`);
      });

      alien.on('error', (err) => {
        logger.error(`Error creating .RPM file. Error: ${err}`);
      });

      alien.on('close', (code) => {

        if (code === 0) {
          logger.success('.RPM file created!');
        }

        logger.info(`Exit with code ${code}`);
      });
    });
  });
}
