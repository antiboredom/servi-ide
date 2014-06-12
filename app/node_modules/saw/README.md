saw
===

actually working file tree watching library

[![build status](https://secure.travis-ci.org/carlos8f/saw.png)](http://travis-ci.org/carlos8f/saw)

Watch for changes in a file tree. I wrote this because in my search for an
actually reliable/working watcher library on npm, I kept coming up short. This
implementation is brief and accomplishes its goal reliably.

## Rationale

File/directory watching in node.js is notoriously bad. For example:

1. `fs.watch()` when used on a directory, might not tell you what file changed.
   Just that "something" in the directory changed. Depending on the platform.
   Useless.
2. If you're lucky enough to get a filename from `fs.watch()`, you're in the
   dark on whether that file is actually a directory. Or any other details on
   the file in question. Useless.
3. `fs.watch()` does not detect adds, removes, or updates specifically. Just
   "change". Useless.
4. `fs.watch()` when used on a directory, only watches one level deep. It's up
   to you to create more watch instances for subdirectories. Useless.
5. `fs.watchFile()`, the alternative to `fs.watch()`, when used on a directory,
   doesn't give you the filename of the change either. Also it uses polling
   which is obviously hacky and defeats the goal of an evented watcher. Useless.

Moreover, npm-level watching libraries that attempt to remedy the above have
annoying caveats, such as:

1. Events aren't emitted in some cases, especially relating to subdirectories
2. Events are duplicated in some cases (`fs.watch()` is also guilty of this)
3. Poor error handling such as not accounting for ENOFILE (race condition from
   deletion) or EMFILE (large directory trees)
4. Deletes of directories poorly handled -- you might get notified that a directory
   was deleted, but not notified of each file in that directory
5. Lack of node 0.10 support
6. May require you to add files, directories, or patterns manually to the watcher
7. Getting fancy with globs/filters, when the best separation of concerns is for
   a watching library to just watch and tell you the filename and what happened.
8. Wonky APIs which try to reinvent `fs.Stats` or are generally over-engineered
9. Lack of documentation or commitment from author
10. Being written in, ahem, coffee-script
11. Et cetera!

`saw` takes a very simple and reliable approach which consists of:

1. Recursing through the directory given
2. Applying `fs.watch()` to all newly detected files
3. Caching `fs.Stats` instances for all files
4. Comparing the file tree with the last scan (if available) and emitting events
   based on the difference
5. Performing steps 1-4 on the changed dir (or parent of the changed file) when
   `fs.watch()` triggers an event.

## Usage

```js
var saw = require('saw');

saw('path/to/dir', {options: 'are optional'})
  .on('ready', function (files) {
    // watcher is active. `files` is an array of file objects (details below).
  })
  .on('add', function (file) {
    // `file.path` = relative path from root dir
    // `file.fullPath` = absolute path
    // `file.name` = file name
    // `file.stat` = instance of `fs.Stats`
    // `file.parentDir` = relative parent dir
    // `file.fullParentDir` = absolute parent dir
  })
  .on('remove', function (file) {
    // file was removed
  })
  .on('update', function (file) {
    // file was updated
    // caveat: updates within a millisecond after the file was added or updated
    // can't be detected
  })
  .on('all', function (ev, file) {
    // catchall - `ev` is the event name.
  })
  // to unwatch all files, call close():
  .close()
```

## Tips

- You can also pass a [glob pattern](https://www.npmjs.org/package/glob) or array
  of glob patterns as the first argument.
- You can omit the first argument to watch the current working directory.
- The `file` object is the same as returned by
  [readdirp](https://github.com/thlorenz/readdirp#entry-info).

## Options

- `cwd` (String, default: first argument or `process.cwd()` if first argument isn't a directory),
  the directory to consider as root for relative paths.
- `persistent` (Boolean, default: `true`), whether or not to keep the process
  open when watching is active.
- `dot` (Boolean, default: `false`), whether or not to watch dotfiles.
- `cache` (Object), options to pass to [lru-cache](https://www.npmjs.org/package/lru-cache).

- - -

### Developed by [Terra Eclipse](http://www.terraeclipse.com)
Terra Eclipse, Inc. is a nationally recognized political technology and
strategy firm located in Aptos, CA and Washington, D.C.

- - -

### License: MIT

- Copyright (C) 2013-14 Carlos Rodriguez (http://s8f.org/)
- Copyright (C) 2013-14 Terra Eclipse, Inc. (http://www.terraeclipse.com/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the &quot;Software&quot;), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

