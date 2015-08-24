module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    nwjs: {

      options: {
        version: '0.12.0',
        build_dir: './build',
        mac_icns: './resources/images/icon.icns',
        platforms: [
          'win',
          'osx',
          'linux'
        ]
      },

      src: [

        './resources/**',

        './app/**',

        './libraries/**',

        './language/**',

        './node_modules/**',

        '!./node_modules/grunt*/**',

        './index.html',

        './package.json',

        './README.md'
      ]

    },

    sass: {
      dist: {
        files: {
          'resources/css/all.css': 'resources/sass/all.scss'
        }
      }
    },

    watch: {
      css: {
        files: '**/*.scss',
        tasks: ['sass']
      }
    }
  });

  grunt.loadNpmTasks('grunt-nw-builder');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('build', ['nwjs']);
  grunt.registerTask('dev', ['sass', 'watch']);
};
