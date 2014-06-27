var cloundfront = require("./index");
var toolFactory = require("./tool");
var should = require("should");
var gulp = require("gulp");
var es = require("event-stream");
var fs = require("fs");
var util = require("util");
var Stream = require("stream");
var assert = require("assert");
var path = require('path');
var gutil = require("gulp-util");
var glob = require("glob");
var sinon = require("sinon");

require("mocha");

describe("gulp-cloudfront", function () {

    var stream;
    var writeFile = function(globPath) {
        //write all files to stream
        glob(globPath + "/**/*.*", {}, function (er, fileNames) {
            fileNames.forEach(function (fileName) {
                stream.write(new gutil.File({
                    path: path.join(__dirname, fileName),
                    contents: fs.readFileSync(fileName),
                    base: path.join(__dirname, globPath)
                }));
            });

            stream.end();
        });
    }

    it("should identify default index pattern", function(done) {

        var dirRoot = 'test/fixtures/config1';
        var callback = sinon.mock().withArgs('/index.abcd1234.html').once().returns({
            then: function (success, error) {
                success();
            }
        });
        
        var tool = {
            updateDefaultRootObject: callback
        };

        stream = cloundfront({ 
            tool: tool
        });
        stream.on('data', function (file) {});
        stream.on('end', function () {
            callback.verify();
            done();
        });

        writeFile(dirRoot);

    });


    it("should identify default index pattern gzipped", function(done) {

        var dirRoot = 'test/fixtures/gzip';
        var callback = sinon.mock().withArgs('/index.abcd1234.html').once().returns({
            then: function (success, error) {
                success();
            }
        });
        
        var tool = {
            updateDefaultRootObject: callback
        };

        stream = cloundfront({ 
            tool: tool
        });
        stream.on('data', function (file) {});
        stream.on('end', function () {
            callback.verify();
            done();
        });

        writeFile(dirRoot);

    });

    it("should identify custom pattern", function(done) {

        var dirRoot = 'test/fixtures/config1';
        var callback = sinon.mock().withArgs('/custom.a1b2.html').once().returns({
            then: function (success, error) {
                success();
            }
        });
        
        var tool = {
            updateDefaultRootObject: callback
        };

        stream = cloundfront({
            patternIndex: /^\/custom\.[a-f0-9]{4}\.html$/gi,
            tool: tool
        });
        stream.on('data', function (file) {});        
        stream.on('end', function () {
            callback.verify();
            done();
        });

        writeFile(dirRoot);
    });



});
