var
  // nodejs child_process object
  cp = require('child_process'),

  // The executor of system process
  exec = cp.exec,

  // The executor of system process
  execSync = cp.execSync,

  // Native event object
  events = require('events'),

  // Native node util class
  util = require('util'),

  ENV = process.env;

ENV.LANG = 'en_US';

/**
 * @class Git
 */
function Git() {
  this.whoiam = 'Git class that perform git operations';
}

util.inherits(Git, events.EventEmitter);

/**
 * @function getCurrentBranch - Return current branch of a git repository
 *
 * @param  {string} path - Path of the git repository
 * @param  {function} callback - Callback to be execute in error or success case
 */
Git.prototype.getCurrentBranch = function (path, callback) {
  exec('git branch -r && git symbolic-ref --short HEAD', { cwd: path, env: ENV }, function (error, stdout, stderr) {
    var err = null,
      localBranchs = stdout.split('\n'),
      currentBranch,
      remoteBranchs = [];

    if (error !== null) {
      err = error;
    } else {

      for (var i = 0; i < (localBranchs.length - 2); i++) {

        if (localBranchs[i].indexOf('HEAD') == -1) {
          localBranchs[i] = localBranchs[i].replace('origin/', '');

          if (localBranchs[i]) {
            remoteBranchs.push(localBranchs[i]);
          }
        }
      }

      currentBranch = localBranchs[localBranchs.length - 2];
    }

    if (callback && typeof callback == 'function') {
      callback.call(this, err, currentBranch, remoteBranchs);
    }
  }.bind(this));
};

/**
 * @function getCommitHistory - Return a array with the commit history
 *
 * @param  {string} path - Path of the git repository
 * @param  {function} callback - Callback to be execute in error or success case
 */
Git.prototype.getCommitHistory = function (opts, callback) {

  exec(
    "git --no-pager log -n 50 --pretty=format:%an-gtseparator-%cr-gtseparator-%h-gtseparator-%s-gtseparator-%b-pieLineBreak-" + (opts.skip ? ' --skip '.concat(opts.skip) : '' ),

    { cwd: opts.path, env: ENV },

    function (error, stdout, stderr) {
    var lines = stdout.split('-pieLineBreak-'),
      historyList = [],
      err = null;

    if (error !== null) {
      err = error;
    } else {

      for (var i = 0; i < lines.length; i++) {

        if (lines[i] !== '') {
          var historyItem = lines[i].split('-gtseparator-');

          historyList.push({
            user: historyItem[0],
            date: historyItem[1],
            hash: historyItem[2],
            message: historyItem[3],
            body: historyItem[4]
          });
        }
      }
    }

    if (callback && typeof callback == 'function') {
      callback.call(this, err, historyList);
    }
  });
};

/**
 * @function getStatus - Return the status of the repository
 *
 * @param  {string} path - Path of the git repository
 * @param  {function} callback - Callback to be execute in error or success case
 */
Git.prototype.getStatus = function (path, callback) {

  exec('git status -sb', {cwd: path, env: ENV}, function (error, stdout, stderr) {
    var err = null,
      syncStatus = {
        ahead: null,
        behind: null
      },
      files = [];

    if (error !== null) {
      err = error;
    }

    var lines = stdout.split('\n'),
      unsynChanges;

    // First line ever the sync numbers status
    unsynChanges = lines[0].substring(lines[0].lastIndexOf("[") + 1, lines[0].lastIndexOf("]"));

    var unsyncParts = unsynChanges.split(',');

    unsyncParts.forEach(function (i) {
      var item = i.trim();

      if (item.indexOf('ahead') > -1) {
        syncStatus.ahead = item.substring(item.lastIndexOf('ahead') + 5, item.length).trim();
      } else if (item.indexOf('behind') > -1) {
        syncStatus.behind = item.substring(item.lastIndexOf('behind ') + 6, item.length).trim();
      }
    });

    for (var i = 1; i < lines.length; i++) {

      if (lines[i].indexOf('M') > - 1) {
        files.push({
          type: 'MODIFIED',
          path: lines[i].replace('M', '').trim()
        });
      } else if(lines[i].indexOf('??') > - 1) {
        files.push({
          type: 'NEW', //UNTRACKED
          path: lines[i].replace('??', '').trim()
        });
      } else if(lines[i].indexOf('D') > - 1) {
        files.push({
          type: 'DELETED',
          path: lines[i].replace('D', '').trim()
        });
      }
    }

    if (callback && typeof callback == 'function') {
      callback.call(this, err, syncStatus, files);
    }
  });
};

Git.prototype.fetch = function (path, callback) {

  exec('git fetch --prune', {cwd: path, env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error) {
      err = error.message;
    }

    if (callback && typeof callback == 'function') {
      callback.call(this, err);
    }
  });
};

Git.prototype.getDiff = function (opts, callback) {

  exec('git diff --numstat ' + opts.ancestorHash + ' ' + opts.hash, { cwd: opts.path, env: ENV}, function (error, stdout, stderr) {
    var err = null,
      files = [];

    if (error !== null) {
      err = error;
    } else {
      var lines = stdout.split('\n');

      lines.forEach(function (line) {

        if (line) {
          var props = line.split('\t');

          files.push({
            name: props[2],
            additions: parseInt(props[0]),
            deletions: parseInt(props[1]),
            isBinary: (props[0] == '-' || props[1] == '-') ? true : false
          });
        }
      });
    }

    if (callback && typeof callback == 'function') {
      callback.call(this, err, files);
    }
  });
};

Git.prototype.getUnsyncFileDiff = function (opts, callback) {
  opts = opts || {};
  var path = opts.path,
    file = opts.file;

  exec('git diff HEAD ' + file, { cwd: path,  env: ENV}, function(error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error;
    }

    if (callback && typeof callback == 'function') {
      callback.call(this, err, stdout);
    }
  });
};

Git.prototype.getFileDiff = function (opts, callback) {

  exec('git log --format=\'%N\' -p -1 ' + opts.hash + ' -- ' + opts.file, { cwd: opts.path, env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error;
    }

    if (callback && typeof callback == 'function') {
      callback.call(this, err, stdout);
    }
  });
};

Git.prototype.sync = function (path, callback) {

  exec('git pull', { cwd: path,  env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error;
    }

    if (callback && typeof callback == 'function') {
      callback.call(this, err);
    }
  });
};

Git.prototype.add = function (path, opts) {

  if (opts.forceSync) {
    return execSync('git add '.concat(opts.file), { cwd: path});
  } else {

    exec(
      'git add '.concat(opts.file),
      { cwd: path}, function (error, stdout, stderr) {
      var err = null;

      if (error !== null) {
        err = error;
      }

      if (opts.callback && typeof opts.callback == 'function') {
        opts.callback.call(this, err);
      }
    });
  }
};

Git.prototype.commit = function (path, opts) {
  var commad = 'git commit -m "'.concat(opts.message).concat('"');

  if (opts.description) {
    commad = commad.concat(' -m "').concat(opts.description).concat('"');
  }

  if (opts.forceSync) {
    return execSync(commad, { cwd: path});
  } else {

    exec(commad, { cwd: path}, function (error, stdout, stderr) {
      var err = null;

      if (error !== null) {
        err = error;
      }

      if (opts.callback && typeof opts.callback == 'function') {
        opts.callback.call(this, err);
      }
    });
  }
};

Git.prototype.switchBranch = function (opts, callback) {
  opts = opts || {};
  var path = opts.path,
    branch = opts.branch,
    forceCreateIfNotExists = opts.forceCreateIfNotExists;

  exec('git checkout ' + (forceCreateIfNotExists ? ' -b ': '') + branch, { cwd: path,  env: ENV}, function(error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error.message;
    }

    if (callback && typeof callback == 'function') {
      callback.call(this, err);
    }
  });
};

Git.prototype.getCommitCount = function (path, callback) {

  exec('git rev-list HEAD --count', { cwd: path,  env: ENV}, function  (error, stdout, stderr){
    var err = null;

    if (error !== null) {
      err = error.message;
    }

    if (callback && typeof callback == 'function') {
      callback.call(this, err, stdout);
    }
  });
};

Git.prototype.listRemotes = function (path, callback) {

  exec('git remote -v', { cwd: path,  env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error.message;
    }

    if (callback && typeof callback == 'function') {
      callback.call(this, err, stdout);
    }
  });
};

Git.prototype.discartChangesInFile = function (path, opts) {
  var command;

  opts = opts || {};

  if (opts.isUnknow) {
    command = 'git clean -df '.concat(opts.file);
  } else {
    command = 'git checkout -- '.concat(opts.file);
  }

  exec(command, { cwd: path,  env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error.message;
    }

    if (opts.callback && typeof opts.callback == 'function') {
      opts.callback.call(this, err, stdout);
    }
  });
};

module.exports = new Git();
