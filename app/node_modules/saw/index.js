var path = require('path')
  , fs = require('fs')
  , EventEmitter = require('events').EventEmitter
  , glob = require('glob')
  , LRU = require('lru-cache')
  , minimatch = require('minimatch')
  , inherits = require('util').inherits

function Saw (pattern, options) {
  EventEmitter.call(this);
  if (pattern && pattern.constructor === Object) {
    options = pattern;
    pattern = null;
  }
  options || (options = {});
  if (Array.isArray(pattern)) {
    pattern = pattern.length < 2 ? pattern[0] : '{' + (pattern.join(',')) + '}';
  }
  else if (!pattern) pattern = '.';

  try {
    var stat = fs.statSync(pattern);
    if (stat && stat.isDirectory()) {
      options.cwd || (options.cwd = path.resolve(pattern));
      pattern = pattern.replace(path.sep, '/');
      pattern = '{' + pattern + ',' + pattern + '/**/*}';
    }
  }
  catch (e) {}

  this.pattern = pattern;
  this.options = options;
  this.cwd = options.cwd || path.resolve(process.cwd());
  this.ready = false;
  this.scanning = false;
  this.cache = LRU(options.cache || {});
  this.closed = false;

  var self = this;
  Object.keys(Saw.prototype).forEach(function (method) {
    self[method] = Saw.prototype[method].bind(self);
  });

  setImmediate(this.scan);
}
inherits(Saw, EventEmitter);

Saw.prototype.onErr = function (err) {
  if (err.code !== 'ENOENT') this.emit('error', err);
};

Saw.prototype.getCacheKey = function (file) {
  return 'file:' + file.fullPath + (file.stat.isDirectory() ? path.sep : '');
};

Saw.prototype.createWatcher = function (p) {
  try {
    return fs.watch(p, {persistent: this.options.persistent})
      .on('change', this.scan)
      .on('error', this.onErr);
  }
  catch (err) {
    this.onErr(err);
  }
};

Saw.prototype.scan = function () {
  if (this.scanning) {
    if (!this.ready) this.once('ready', this.scan);
    else this.once('scan', this.scan);
    return false;
  }
  if (this.closed) return false;
  this.scanning = true;
  this.keys = [];
  this.latch = 1;
  var self = this;
  glob(this.pattern, {stat: true, cwd: this.cwd, dot: this.options.dot})
    .on('error', this.onErr)
    .on('stat', this.onStat)
    .on('end', function () {
      if (!--self.latch) self.onEnd();
    });
};

Saw.prototype.cleanup = function () {
  var files = [];
  var self = this;
  this.cache.forEach(function (file, key) {
    if (file.deleted) return;
    if (!~self.keys.indexOf(key)) {
      file.watcher.close();
      file.deleted = true;
      self.emit('remove', file);
      self.emit('all', 'remove', file);
      var dirPath = path.dirname(file.fullPath);
      if (dirPath !== self.cwd && minimatch(dirPath, self.pattern)) {
        self.latch++;
        fs.stat(dirPath, function (err, stat) {
          if (err) {
            self.onErr(err);
            if (!--self.latch) self.onEnd();
            return;
          }
          self.onStat(dirPath, stat, true);
          if (!--self.latch) self.onEnd();
        });
      }
      self.cache.set(key, file);
    }
    if (file.fullPath !== self.cwd) files.push(file);
  });
  return files;
};

Saw.prototype.onEnd = function () {
  var files = this.cleanup();
  if (!this.latch) {
    this.scanning = false;
    this.emit('scan', files);
    if (!this.latch && !this.ready) {
      this.ready = true;
      this.emit('ready', files);
    }
  }
};

Saw.prototype.onStat = function (p, stat, forceUpdate) {
  var self = this;
  var file = {
    path: path.resolve(this.cwd, p).replace(this.cwd + '/', ''),
    fullPath: path.resolve(this.cwd, p),
    stat: stat,
    name: path.basename(p)
  };
  file.parentDir = path.dirname(file.path);
  file.fullParentDir = path.dirname(file.fullPath);
  var key = this.getCacheKey(file);
  if (!forceUpdate && ~this.keys.indexOf(key)) return;
  this.keys.push(key);
  var cached = this.cache.get(key);
  var op = 'noop';
  if (forceUpdate || (cached && cached.stat.isFile() && cached.stat.mtime.getTime() !== file.stat.mtime.getTime())) {
    if (!cached || cached.deleted) file.watcher = this.createWatcher(file.fullPath);
    else file.watcher = cached.watcher;
    op = 'update';
  }
  else if (!cached || cached.deleted) {
    op = 'add';
    file.watcher = this.createWatcher(file.fullPath);
  }
  if (op !== 'noop') {
    this.cache.set(key, file);
    if (this.ready && file.fullPath !== this.cwd) {
      this.emit(op, file);
      this.emit('all', op, file);
      if (file.stat.isFile()) {
        var dirPath = path.dirname(file.fullPath);
        if (dirPath !== this.cwd && minimatch(dirPath, this.pattern)) {
          this.latch++;
          fs.stat(dirPath, function (err, stat) {
            if (err) {
              onErr(err);
              if (!--self.latch) self.onEnd();
              return;
            }
            self.onStat(dirPath, stat, true);
            if (!--self.latch) self.onEnd();
          });
        }
      }
    }
  }
};

Saw.prototype.close = function () {
  var self = this;
  // unwatch all
  this.cache.forEach(function (file, key) {
    if (file.deleted) return;
    try {
      file.watcher.close();
    }
    catch (e) {}
    file.deleted = true;
    self.cache.set(key, file);
  });
  this.closed = true;
};

module.exports = function (pattern, options) {
  return new Saw(pattern, options);
};
module.exports.Saw = Saw;
