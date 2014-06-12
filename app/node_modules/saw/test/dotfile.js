describe('dotfile', function () {
  var testDir = '/tmp/saw-test-' + idgen()
    , s

  function matchEntry (p, statMatcher) {
    return function (file) {
      return file.fullPath === testDir + '/' + p && file.path === p && statMatcher(file.stat);
    };
  }

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
    s = saw(testDir, {dot: true}).on('ready', function (files) {
      assert.equal(files.length, 0);
      done();
    });
    instrument(s);
  });
  beforeEach(function() {
    s.onAdd.reset();
    s.onUpdate.reset();
    s.onRemove.reset();
  });
  after(function (done) {
    rimraf(testDir, done);
  });
  it('listens for dotfile', function (done) {
    fs.writeFile(testDir + '/.config', 'duh', assert.ifError);
    wait(function () {
      assertCalledOnce(s.onAdd);
      assertCalledWithMatch(s.onAdd, matchEntry('.config', isFile));
      assertNotCalled(s.onUpdate);
      assertNotCalled(s.onRemove);
      done();
    });
  });
});
