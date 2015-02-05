/*
 * grunt-yui-builder
 * https://github.com/jamiejones85/grunt-yui-builder
 *
 * Copyright (c) 2015 Jones,Jamie
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Nodejs libs.
  var path = require('path'),

  uglify = require('uglify-js'),

  // Converts \r\n to \n
  normalizeLf = function( string ) {
      return string.replace(/\r\n/g, '\n');
  },

  // Removes \ in properties files
  removeLineBreak = function( string ) {
      return normalizeLf(string).replace(/\\\n/g, ' ');
  },

  parsePropertiesFile = function(moduleDir, properties) {
      var buildProperties = removeLineBreak(grunt.file.read(path.join(moduleDir, 'build.properties'))),
      lines;
      lines = buildProperties.split('\n');

      lines.map(function(value) {
          var parts = value.split('=');
          if (parts[0].trim() === 'component') {
              properties.component = parts[1];
          } else if (parts[0].trim() === 'component.jsfiles') {
              properties.jsfiles = parts[1].replace('${component}', properties.component);
          } else if (parts[0].trim() === 'component.requires') {
              properties.requires = parts[1].split(',');
          }
      });

  },

  buildRaw = function(moduleDir, properties) {
      var content = grunt.file.read(path.join(moduleDir, 'js', properties.jsfiles)),
      template = grunt.file.read(path.join(__dirname, '..', 'boilerplate.template')),
      requiresString;

      requiresString = properties.requires.map(function(dep){
          return '"' + dep + '"';
      }).join(",");

      return template.replace('<% module_name %>', properties.component).replace('<% module_content %>', content).replace('<% module_requires %>', requiresString);
  },

  writeDebugJs = function(targetModuleFolder, properties, raw) {
      var debugFilename = path.basename(properties.jsfiles, '.js') + '-debug.js';
      grunt.file.write(path.join(targetModuleFolder, debugFilename), raw);
  },

  writeStrippedJs = function(targetModuleFolder, properties, raw) {
      var stripped = raw.replace(/.*?(?:logger|Y.log).*?(?:;|\).*;|(?:\r?\n.*?)*?\).*;).*;?.*?\r?\n/g, '');
      grunt.file.write(path.join(targetModuleFolder, properties.jsfiles), stripped);
      return stripped;
  },

  writeMinJs = function(targetModuleFolder, properties, stripped) {
      var uglyFilename,
        uglifyResult;

      uglyFilename = path.basename(properties.jsfiles, '.js') + '.min.js';
      uglifyResult = uglify.minify(stripped, {fromString: true});
      grunt.file.write(path.join(targetModuleFolder, uglyFilename), uglifyResult.code);
  },

  // Handle building of the module
  buildModule = function(moduleDir, dest, modules) {
      var moduleFolder = path.basename(moduleDir),
          targetModuleFolder = path.join(dest, moduleFolder),
          properties = { component: null, jsfiles: null, requires: null },
          raw,
          stripped,
          instrumentedFilename,
          instrumented;

      grunt.log.writeln('Building module "' + moduleFolder + '"');

      //create folder in the dest
      grunt.file.mkdir(targetModuleFolder);

      //parse the build.properties file
      parsePropertiesFile(moduleDir, properties);

      //build the raw yui
      raw = buildRaw(moduleDir, properties);

      //debug version
      writeDebugJs(targetModuleFolder, properties, raw);

      //Y.Log Stripped out
      stripped = writeStrippedJs(targetModuleFolder, properties, raw);

      //uglyfy
      writeMinJs(targetModuleFolder, properties, stripped);

      //copy the assets
      if (grunt.file.isDir(path.join(moduleDir, 'assets'))) {
          grunt.file.mkdir(path.join(targetModuleFolder, 'assets'));
          grunt.file.expand(path.join(moduleDir, 'assets', '*')).forEach(function(filePath) {
              grunt.file.copy(filePath, path.join(targetModuleFolder, 'assets', path.basename(filePath)));
          });

      }
      modules[properties.component] = { "requires" : properties.requires };

  };

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('yui_builder', 'A grunt task to wrap YUI modules in the YUI boiler plate and create a modules.json file.', function() {
      var modules = {};

      grunt.log.writeln('Building YUI modules');
      // Iterate over all specified file groups.
      this.files.forEach(function(f) {
          var src = f.src.toString(), dest = f.dest.toString();
          //does src dir exist?
          if (!grunt.file.isDir(src)) {
              grunt.log.error('Source directory "' + src + '" not found.');
          }

          //go over the scr modules
          grunt.file.expand(path.join(src, '*')).forEach(function(moduleDir) {
              buildModule(moduleDir, dest, modules);
          });

          //write out the modules file
          grunt.file.write(path.join(dest, 'modules.json'), JSON.stringify(modules));
      });

  });

};
