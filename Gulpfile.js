var gulp = require('gulp');
var sass = require('gulp-sass');
var packager = require('electron-packager');

// Development tasks

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

// Build tasks
gulp.task('build', ['build:linux', 'build:osx', 'build:win']);

// Linux
gulp.task('build:linux', ['build:linux64', 'build:linux32']);

gulp.task('build:linux64', ['sass'], function () {
  var buildOpts = getDefaultBuildOpts();

  buildOpts.platform = 'linux';
  buildOpts.arch = 'x64';
  buildOpts.out = 'build/linux/64bit';

  build(buildOpts);
});

gulp.task('build:linux32', ['sass'], function () {
  var buildOpts = getDefaultBuildOpts();

  buildOpts.platform = 'linux';
  buildOpts.arch = 'ia32';
  buildOpts.out = 'build/linux/32bit';

  build(buildOpts);
});

// Mac
gulp.task('build:osx', ['build:osx64', 'build:osx32']);

gulp.task('build:osx64', ['sass'], function () {
  var buildOpts = getDefaultBuildOpts();

  buildOpts.platform = 'darwin';
  buildOpts.arch = 'x64';
  buildOpts.out = 'build/osx/64bit';
  buildOpts.icon = 'resources/images/icon.icns';

  build(buildOpts);
});

gulp.task('build:osx32', ['sass'], function () {
  var buildOpts = getDefaultBuildOpts();

  buildOpts.platform = 'darwin';
  buildOpts.arch = 'ia32';
  buildOpts.out = 'build/osx/32bit';
  buildOpts.icon = 'resources/images/icon.icns';

  build(buildOpts);
});

// Windows
gulp.task('build:win', ['build:win64', 'build:win32']);

gulp.task('build:win64', ['sass'], function () {
  var buildOpts = getDefaultBuildOpts();

  buildOpts.platform = 'win32';
  buildOpts.arch = 'x64';
  buildOpts.out = 'build/windows/64bit';
  buildOpts.icon = 'resources/images/icon.ico';

  build(buildOpts);
});

gulp.task('build:win32', ['sass'], function () {
  var buildOpts = getDefaultBuildOpts();

  buildOpts.platform = 'win32';
  buildOpts.arch = 'ia32';
  buildOpts.out = 'build/windows/32bit';
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
    out: 'build/'
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

  return [ignoreRegex, '^/build'];
}
