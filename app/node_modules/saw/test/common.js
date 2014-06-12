assert = require('assert');
util = require('util');
saw = require('../');
mkdirp = require('mkdirp');
rimraf = require('rimraf');
idgen = require('idgen');
fs = require('fs');
path = require('path');
sinon = require('sinon');
sinon.assert.expose(global);

instrument = function (s) {
  ['all', 'add', 'update', 'remove', 'error', 'scan'].forEach(function (ev) {
    var name = 'on' + ev.slice(0, 1).toUpperCase() + ev.slice(1);
    s[name] = sinon.spy();
    s.on(ev, s[name]);
  });
}

wait = function (cb) {
  setTimeout(cb, 1000);
}

isDir = function (stat) {
  return stat.isDirectory();
}

isFile = function (stat) {
  return !stat.isDirectory();
}

basicTest = function (title, options) {
  describe(title, function () {
    var testDir = '/tmp/saw-test-' + idgen()
      , s, s2

    function matchEntry (p, statMatcher) {
      return function (file) {
        try {
          assert.strictEqual(file.fullPath, testDir + '/' + p);
          assert(statMatcher(file.stat));
          return true;
        }
        catch (e) {
          return false;
        }
      };
    }

    beforeEach(function() {
      [s, s2].forEach(function (s) {
        if (s) {
          s.onAdd.reset();
          s.onUpdate.reset();
          s.onRemove.reset();
        }
      });
    });
    before(function (done) {
      mkdirp(testDir, function (err) {
        if (err) return done(err);
        fs.realpath(testDir, function (err, resolvedPath) {
          if (err) return done(err);
          testDir = resolvedPath;
          done();
        });
      });
    });
    before(function (done) {
      s = saw(testDir, options).on('ready', function (files) {
        assert.equal(files.length, 0);
        done();
      });
      instrument(s);
    });
    after(function (done) {
      rimraf(testDir, done);
    });
    it('listens for file', function (done) {
      fs.writeFile(testDir + '/beans', 'beans', assert.ifError);
      wait(function () {
        assertCalledOnce(s.onAdd);
        assertCalledWithMatch(s.onAdd, matchEntry('beans', isFile));
        assertNotCalled(s.onUpdate);
        assertNotCalled(s.onRemove);
        done();
      });
    });
    it('listens for new dirs', function (done) {
      mkdirp(testDir + '/rice/beans');
      wait(function () {
        assertCalledTwice(s.onAdd);
        assertCalledWithMatch(s.onAdd, matchEntry('rice', isDir));
        assertCalledWithMatch(s.onAdd, matchEntry('rice/beans', isDir));
        assertNotCalled(s.onUpdate);
        assertNotCalled(s.onRemove);
        done();
      });
    });
    it('listens for new file in sub dir', function (done) {
      fs.writeFile(testDir + '/rice/beans/meat', 'meat is neat', assert.ifError);
      wait(function () {
        assertCalledOnce(s.onAdd);
        assertCalledWithMatch(s.onAdd, matchEntry('rice/beans/meat', isFile));
        assertCalledOnce(s.onUpdate);
        assertCalledWithMatch(s.onUpdate, matchEntry('rice/beans', isDir));
        assertNotCalled(s.onRemove);
        done();
      });
    });
    it('listens for another new file', function (done) {
      fs.writeFile(testDir + '/rice/taters', 'tater treats', assert.ifError);
      wait(function () {
        assertCalledOnce(s.onAdd);
        assertCalledWithMatch(s.onAdd, matchEntry('rice/taters', isFile));
        assertCalledOnce(s.onUpdate);
        assertCalledWithMatch(s.onUpdate, matchEntry('rice', isDir));
        assertNotCalled(s.onRemove);
        done();
      });
    });
    it('detects single remove', function (done) {
      fs.unlink(testDir + '/beans', assert.ifError);
      wait(function () {
        assertCalledOnce(s.onRemove);
        assertCalledWithMatch(s.onRemove, matchEntry('beans', isFile));
        assertNotCalled(s.onAdd);
        assertNotCalled(s.onUpdate);
        done();
      });
    });
    it('another mkdirp', function (done) {
      mkdirp(testDir + '/bugs/sauce/turmoil');
      wait(function () {
        assertCalledThrice(s.onAdd);
        assertCalledWithMatch(s.onAdd, matchEntry('bugs', isDir));
        assertCalledWithMatch(s.onAdd, matchEntry('bugs/sauce', isDir));
        assertCalledWithMatch(s.onAdd, matchEntry('bugs/sauce/turmoil', isDir));
        assertNotCalled(s.onUpdate);
        assertNotCalled(s.onRemove);
        done();
      });
    });
    it('multiple saws', function (done) {
      s2 = saw(testDir).on('ready', function (files) {
        assert.equal(files.length, 7);
        var paths = files.map(function (file) {
          return file.path;
        });
        assert.deepEqual(paths.sort(), [
          'bugs',
          'bugs/sauce',
          'bugs/sauce/turmoil',
          'rice',
          'rice/beans',
          'rice/beans/meat',
          'rice/taters'
        ]);
        done();
      });
      instrument(s2);
    });
    it('detects update', function (done) {
      fs.writeFile(testDir + '/rice/beans/meat', 'quite a treat', assert.ifError);
      wait(function () {
        [s, s2].forEach(function (s) {
          assertCalledTwice(s.onUpdate);
          assertCalledWithMatch(s.onUpdate, matchEntry('rice/beans/meat', isFile));
          assertCalledWithMatch(s.onUpdate, matchEntry('rice/beans', isDir));
          assertNotCalled(s.onAdd);
          assertNotCalled(s.onRemove);
        });
        done();
      });
    });
    it('detects rimraf', function (done) {
      rimraf(testDir + '/rice', assert.ifError);
      wait(function () {
        [s, s2].forEach(function (s) {
          //assert.equal(s.onRemove.callCount, 4);
          assertCalledWithMatch(s.onRemove, matchEntry('rice', isDir));
          assertCalledWithMatch(s.onRemove, matchEntry('rice/beans', isDir));
          assertCalledWithMatch(s.onRemove, matchEntry('rice/beans/meat', isFile));
          assertCalledWithMatch(s.onRemove, matchEntry('rice/taters', isFile));
          assertNotCalled(s.onAdd);
          assertNotCalled(s.onUpdate);
        });
        done();
      });
    });
    it('detects remove of empty dir', function (done) {
      fs.rmdir(testDir + '/bugs/sauce/turmoil', assert.ifError);
      wait(function () {
        [s, s2].forEach(function (s) {
          assertCalledOnce(s.onRemove);
          assertCalledWithMatch(s.onRemove, matchEntry('bugs/sauce/turmoil', isDir));
          assertCalledOnce(s.onUpdate);
          assertCalledWithMatch(s.onUpdate, matchEntry('bugs/sauce', isDir));
          assertNotCalled(s.onAdd);
        });
        done();
      });
    });
    it('detects add after remove', function (done) {
      mkdirp(testDir + '/rice/taters', assert.ifError);
      wait(function () {
        [s, s2].forEach(function (s) {
          assertCalledTwice(s.onAdd);
          assertCalledWithMatch(s.onAdd, matchEntry('rice', isDir));
          assertCalledWithMatch(s.onAdd, matchEntry('rice/taters', isDir));
          assertNotCalled(s.onUpdate);
          assertNotCalled(s.onRemove);
        });
        done();
      });
    });
    it('unwatch', function (done) {
      [s, s2].forEach(function (s) { s.close(); });
      rimraf(testDir + '/bugs', assert.ifError);
      wait(function () {
        [s, s2].forEach(function (s) {
          assertNotCalled(s.onAdd);
          assertNotCalled(s.onUpdate);
          assertNotCalled(s.onRemove);
        });
        done();
      });
    });
    it('event counts', function () {
      assert.equal(s.onAll.callCount, 21);
      assert.equal(s2.onAll.callCount, 10);
      assertNotCalled(s.onError);
      assertNotCalled(s2.onError);
      // the following assertions are pretty fuzzy. extra credit!
      if (options && options.delay) {
        //assert(s.onScan.callCount < 13);
      }
      else {
        //assert(s.onScan.callCount > 13);
      }
    });
  });
};
