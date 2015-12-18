var emojiList = require('../../resources/emoji/emojiList'),
  parse = function (string) {
    var emojis = string.match(/(:[\w.&\-\+]+:)/g),
      parsedString = string;

    if (emojis) {
      var regex,
        emojiLabel,
        emojiURL,
        dictionary = {};

      for (var i = 0; i < emojis.length; i++) {

        if (!dictionary[ emojis[i] ]) {
          emojiLabel = emojis[i].replace(/:/g, '');
          regex = new RegExp(':' + (emojiLabel.replace('+', '\\+').replace('-', '\\-')) + ':', 'g');
          emojiURL = emojiList[emojiLabel];

          if (emojiURL) {
            parsedString = parsedString.replace(regex, '<img class="emoji" src="' + emojiURL+ '" title="' + emojis[i] + '" />');
          }

          dictionary[ emojis[i] ] = emojis[i];
        }
      }

      regex = null;
      emojiLabel = null;
      emojiURL = null;
      dictionary = null;
    }

    return parsedString;
  };

module.exports = {
  parse: parse
};
