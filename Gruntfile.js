module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    nodewebkit: {
      options: {
        build_dir: './dist',
        mac_icns: './servi.icns'
        // choose what platforms to compile for here
        mac: true,
        win: false,
        linux32: false,
        linux64: false
      },
      src: ['./app/**/*']
    }
  })

  grunt.loadNpmTasks('grunt-node-webkit-builder');
  grunt.registerTask('default', ['nodewebkit']);
};
