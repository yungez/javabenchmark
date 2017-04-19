'use strict'

var simssh = require('simple-ssh');

/**
 * Finds SSH key
 * @returns {string}
 */
function findSshKey(keyFile) {
  if (keyFile) {

    // if no directory we have only filename and assume it's in ~/.ssh
    if (fileExistsSync(keyFile)) {
      return fs.readFileSync(p, { encoding: 'ascii' });
    }
  }
  return false;
}


function sshExecCmd(hostName, userName, keyfileName, cmd, options, cb) {
  var sshOptions = {
    host: hostName,
    user: userName,
    timeout: 30000
  };

  if (options.baseDir) {
    sshOptions.baseDir = options.baseDir;
  }

  var sshKey = findSshKey(keyfileName);

  if (sshKey) {
    sshOptions.key = sshKey;
  }
  
  var ssh = new simssh(sshOptions);

  ssh.on('error', function (e) {
    // when we pass error via deferred.reject, stack will be displayed
    // as it is just string, we can just replace it with message
    e.stack = 'ERROR: ' + e.message + '\nFailed command: ' + cmd;
    console.log('ERROR OCCURED');
    cb(e);
  });

  if (options && options.sshPrintCommands) {
    process.stdout.write(' SSH: ' + chalk.bgWhite.blue(' ' + cmd + ' ') + '\n');
  }

  ssh.exec(cmd, {
    pty: true,
    out: function (o) {
      if (options && options.verbose) {
        process.stdout.write(o);
      }
    },
    exit: function (code, stdout, stderr) {
      var succeeded = true;
      if (code != 0 || (options && options.marker && stdout.indexOf(options.marker) < 0)) {
        succeeded = false;
      }

      if (succeeded) {
        if (cb) cb();
      } else {
        if (cb) {
          var message = `SSH command hasn\'t completed successfully.\nFailed command: ${cmd}\n` +
            (stdout ? `stdout: ${stdout}` : '') +
            (stderr ? `stderr: ${stderr}` : '');
          var e = new Error(message);
          e.stack = message;
          cb(e);
        }
      }
    }
  }).start();
}