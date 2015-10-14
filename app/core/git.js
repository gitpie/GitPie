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
    "git --no-pager log -n 50 --pretty=format:%an-gtseparator-%cr-gtseparator-%h-gtseparator-%s-gtseparator-%b-gtseparator-%ae-pieLineBreak-" + (opts.skip ? ' --skip '.concat(opts.skip) : '' ),

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
            body: historyItem[4],
            email: historyItem[5]
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
      files = [],
      lines = stdout.split('\n'),
      unsynChanges,
      unsyncParts;

    if (error !== null) {
      err = error;
    }

    // First line ever is the sync numbers status
    unsynChanges = lines[0].substring(lines[0].lastIndexOf("[") + 1, lines[0].lastIndexOf("]"));

    unsyncParts = unsynChanges.split(',');

    unsyncParts.forEach(function (i) {
      var item = i.trim();

      if (item.indexOf('ahead') > -1) {
        syncStatus.ahead = item.substring(item.lastIndexOf('ahead') + 5, item.length).trim();
      } else if (item.indexOf('behind') > -1) {
        syncStatus.behind = item.substring(item.lastIndexOf('behind ') + 6, item.length).trim();
      }
    });

    for (var i = 1; i < lines.length; i++) {

      switch (lines[i].trim()[0]) {
        case 'R':
          files.push({
            type: 'RENAMED',
            displayPath: lines[i].replace('RM', '').replace(/"/g, '').trim(),
            path: lines[i].replace('RM', '').replace(/"/g, '').split('->')[1].trim()
          });
          break;

        case 'M':
          files.push({
            type: 'MODIFIED',
            displayPath: lines[i].replace('M', '').replace(/"/g, '').trim(),
            path: lines[i].replace('M', '').replace(/"/g, '').trim()
          });
          break;

          case '?':
            files.push({
              type: 'NEW', //UNTRACKED
              displayPath: lines[i].replace('??', '').replace(/"/g, '').trim(),
              path: lines[i].replace('??', '').replace(/"/g, '').trim()
            });
            break;

          case 'A':
            files.push({
              type: 'ADDED',
              displayPath: lines[i].replace('A', '').replace(/"/g, '').trim(),
              path: lines[i].replace('A', '').replace(/"/g, '').trim()
            });
            break;

          case 'D':
            files.push({
              type: 'DELETED',
              displayPath: lines[i].replace('D', '').replace(/"/g, '').trim(),
              path: lines[i].replace('D', '').replace(/"/g, '').trim()
            });
            break;
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

  exec('git diff HEAD "'.concat(file.trim()).concat('"'), { cwd: path,  env: ENV}, function(error, stdout, stderr) {
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

  exec('git log --format=\'%N\' -p -1 '.concat(opts.hash).concat(' -- "').concat(opts.file).concat('"'), { cwd: opts.path, env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error;
    }

    if (callback && typeof callback == 'function') {
      callback.call(this, err, stdout);
    }
  });
};

Git.prototype.sync = function (opts, callback) {

  if (opts.setUpstream) {

    exec('git push -u origin '.concat(opts.branch), { cwd: opts.path,  env: ENV}, function (error) {

      if (callback && typeof callback == 'function') {
        callback.call(this, error);
      }
    });

  } else {

    exec('git pull', { cwd: opts.path,  env: ENV}, function (error, stdout, stderr) {

      if (error) {

        if (callback && typeof callback == 'function') {
          callback.call(this, error);
        }
      } else if (opts.push) {

        exec('git push origin '.concat(opts.branch), { cwd: opts.path,  env: ENV}, function (error) {

          if (callback && typeof callback == 'function') {
            callback.call(this, error);
          }
        });

      } else {

        if (callback && typeof callback == 'function') {
          callback.call(this, error);
        }
      }
    });
  }
};

Git.prototype.add = function (path, opts) {

  if (opts.forceSync) {
    return execSync('git add "'.concat(opts.file).concat('"'), { cwd: path});
  } else {

    exec(
      'git add "'.concat(opts.file).concat('"'),
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
  var commad = 'git commit -m "'.concat( (opts.message.replace(/"/g, '\\"')) ).concat('"');

  if (opts.description) {
    commad = commad.concat(' -m "').concat( (opts.description.replace(/"/g, '\\"')) ).concat('"');
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

  if (opts.forceSync) {
    execSync('git checkout ' + (forceCreateIfNotExists ? ' -b ': '') + branch, { cwd: path,  env: ENV});
  } else {

    exec('git checkout ' + (forceCreateIfNotExists ? ' -b ': '') + branch, { cwd: path,  env: ENV}, function(error, stdout, stderr) {
      var err = null;

      if (error !== null) {
        err = error.message;
      }

      if (callback && typeof callback == 'function') {
        callback.call(this, err);
      }
    });
  }
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
    command = 'git clean -df "'.concat(opts.file.trim()).concat('"');
  } else {
    command = 'git checkout -- "'.concat(opts.file.trim()).concat('"');
  }

  if (opts.forceSync) {
    return execSync(command, { cwd: path,  env: ENV });
  } else {

    exec(command, { cwd: path,  env: ENV}, function (error, stdout, stderr) {
      var err = null;

      if (error !== null) {
        err = error.message;
      }

      if (opts.callback && typeof opts.callback == 'function') {
        opts.callback.call(this, err, stdout);
      }
    });
  }
};

Git.prototype.unstageFile = function (path, opts) {
  opts = opts || {};

  var command = 'git reset "'.concat(opts.file.trim()).concat('"');

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

Git.prototype.getTag = function (path, callback) {

  exec('git tag', { cwd: path,  env: ENV}, function (error, stdout, stderr) {
    var err = null,
      tags = [];

    if (error !== null) {
      err = error.message;
    } else {
      var lines = stdout.split('\n');

      lines.forEach(function (tag) {

        if (tag !== '') {
          tags.push(tag);
        }
      });
    }

    if (callback && typeof callback == 'function') {
      callback.call(this, err, tags);
    }
  });
};

Git.prototype.assumeUnchanged = function (path, opts) {

  exec(' git update-index --assume-unchanged "'.concat(opts.file).concat('"'), { cwd: path,  env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error.message;
    }

    if (opts.callback && typeof opts.callback == 'function') {
      opts.callback.call(this, err);
    }
  });
};

Git.prototype.clone = function (opts) {
  opts = opts || {};

  exec('git clone --recursive '.concat(opts.cloneURL), { cwd: opts.destinyFolder,  env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error.message;
    }

    if (opts.callback && typeof opts.callback == 'function') {
      opts.callback.call(this, err);
    }
  });
};

Git.prototype.reset = function (path, opts) {

  exec('git reset --soft '.concat(opts.hash), { cwd: path,  env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error.message;
    }

    if (opts.callback && typeof opts.callback == 'function') {
      opts.callback.call(this, err);
    }
  });
};

Git.prototype.createRepository = function (opts) {
  var fs = require('fs'),
    path = require('path'),
    err = null;

  opts = opts || {};

  fs.writeFile( path.join(opts.repositoryHome, '.gitignore'), '// # Logs and databases # \n ####################### \n *.log \n *.sql \n .sqlite', 'utf8', function (errFile) {

    if (errFile) {
      err = errFile.message;

      if (opts.callback && typeof opts.callback == 'function') {
        opts.callback.call(this, err);
      }
    } else {

      try {
        execSync('git init', { cwd: opts.repositoryHome,  env: ENV});

        this.switchBranch({
          path: opts.repositoryHome,
          branch: 'master',
          forceCreateIfNotExists: true,
          forceSync: true
        });

        this.add(opts.repositoryHome, {
          forceSync: true,
          file: '.gitignore'
        });

        this.commit(opts.repositoryHome, {
          forceSync: true,
          file: '.gitignore',
          message: '.gitignore'
        });
      } catch (error) {
        err = error.message;
      }

      if (opts.callback && typeof opts.callback == 'function') {
        opts.callback.call(this, err);
      }
    }

  }.bind(this));
};

Git.prototype.getStashList = function (path, callback) {

  exec('git stash list', { cwd: path,  env: ENV}, function (error, stdout, stderr) {
    var err = null,
      stashs = [];

    if (error !== null) {
      err = error.message;
    } else {
      var lines = stdout.split('\n');

      lines.forEach(function (stash) {

        if (stash !== '') {
          stashs.push(stash);
        }
      });
    }

    if (callback && typeof callback == 'function') {
      callback.call(this, err, stashs);
    }
  });
};

module.exports = new Git();
