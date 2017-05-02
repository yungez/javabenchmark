'use strict'

function generateRandomId(prefix, currentList) {
  var newNumber;
  while (true) {
    newNumber = prefix + Math.floor(Math.random() * 10000);
    if (!currentList || currentList.indexOf(newNumber) === -1) {
      break;
    }
  }
  return newNumber;
}

exports.generateRandomId = generateRandomId;