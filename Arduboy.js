//use local storage to simulate eeprom
var EEPROM = {
    read: function(addr) {
        return localStorage[addr];
    },
    write: function(addr, chr) {
        localStorage[addr] = chr;
    }
};

var SPI = {
    begin: function() {}
};

function mArray() {
    //create a multidimensional array based on the arguments provided
    var args = arguments;
    
    function makeArray(size, nextSizeIndex) {
        var arr = new Array(size);
        
        //make the children elements based on the next size if there is one
        if (args.length > nextSizeIndex) {
            var nextSize = args[nextSizeIndex];
            nextSizeIndex++;
            
            for (var i=0; i<size; i++) {
                arr[i] = makeArray(nextSize, nextSizeIndex);
            }
        }
        
        return arr;
    }
    
    return makeArray(args[0], 1);
}

//compat c i/o functions
var delayLimit = 100, delayCalled=0;
function delay(time, callback) {
    /*if (callback) {
        setTimeout(callback, time);
    } else {
        if (time<500) {
            time = time + new Date().getTime();
            while (new Date() < time) {}
        } else {        
            var request = new XMLHttpRequest();
            request.open('GET', 'wait.php?t=' + parseInt(time), false);
            request.send(null);
        }
    }*/
    
    if (delayCalled>delayLimit) {
        throw new Error("Delays are not supported! - use the main loop thread and states instead");
    }
    
    delayCalled++;
    
    //throw new Error("Delays are not supported! - use the main loop thread and states instead");
    
}

//from http://phpjs.org/functions/sprintf/
function sprintf() {
  var regex = /%%|%(\d+\$)?([-+\'#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuideEfFgG])/g;
  var a = arguments;
  var i = 0;
  var format = a[i++];

  // pad()
  var pad = function (str, len, chr, leftJustify) {
    if (!chr) {
      chr = ' ';
    }
    var padding = (str.length >= len) ? '' : new Array(1 + len - str.length >>> 0)
      .join(chr);
    return leftJustify ? str + padding : padding + str;
  };

  // justify()
  var justify = function (value, prefix, leftJustify, minWidth, zeroPad, customPadChar) {
    var diff = minWidth - value.length;
    if (diff > 0) {
      if (leftJustify || !zeroPad) {
        value = pad(value, minWidth, customPadChar, leftJustify);
      } else {
        value = value.slice(0, prefix.length) + pad('', diff, '0', true) + value.slice(prefix.length);
      }
    }
    return value;
  };

  // formatBaseX()
  var formatBaseX = function (value, base, prefix, leftJustify, minWidth, precision, zeroPad) {
    // Note: casts negative numbers to positive ones
    var number = value >>> 0;
    prefix = prefix && number && {
      '2': '0b',
      '8': '0',
      '16': '0x'
    }[base] || '';
    value = prefix + pad(number.toString(base), precision || 0, '0', false);
    return justify(value, prefix, leftJustify, minWidth, zeroPad);
  };

  // formatString()
  var formatString = function (value, leftJustify, minWidth, precision, zeroPad, customPadChar) {
    if (precision != null) {
      value = value.slice(0, precision);
    }
    return justify(value, '', leftJustify, minWidth, zeroPad, customPadChar);
  };

  // doFormat()
  var doFormat = function (substring, valueIndex, flags, minWidth, _, precision, type) {
    var number, prefix, method, textTransform, value;

    if (substring === '%%') {
      return '%';
    }

    // parse flags
    var leftJustify = false;
    var positivePrefix = '';
    var zeroPad = false;
    var prefixBaseX = false;
    var customPadChar = ' ';
    var flagsl = flags.length;
    for (var j = 0; flags && j < flagsl; j++) {
      switch (flags.charAt(j)) {
      case ' ':
        positivePrefix = ' ';
        break;
      case '+':
        positivePrefix = '+';
        break;
      case '-':
        leftJustify = true;
        break;
      case "'":
        customPadChar = flags.charAt(j + 1);
        break;
      case '0':
        zeroPad = true;
        customPadChar = '0';
        break;
      case '#':
        prefixBaseX = true;
        break;
      }
    }

    // parameters may be null, undefined, empty-string or real valued
    // we want to ignore null, undefined and empty-string values
    if (!minWidth) {
      minWidth = 0;
    } else if (minWidth === '*') {
      minWidth = +a[i++];
    } else if (minWidth.charAt(0) == '*') {
      minWidth = +a[minWidth.slice(1, -1)];
    } else {
      minWidth = +minWidth;
    }

    // Note: undocumented perl feature:
    if (minWidth < 0) {
      minWidth = -minWidth;
      leftJustify = true;
    }

    if (!isFinite(minWidth)) {
      throw new Error('sprintf: (minimum-)width must be finite');
    }

    if (!precision) {
      precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type === 'd') ? 0 : undefined;
    } else if (precision === '*') {
      precision = +a[i++];
    } else if (precision.charAt(0) == '*') {
      precision = +a[precision.slice(1, -1)];
    } else {
      precision = +precision;
    }

    // grab value using valueIndex if required?
    value = valueIndex ? a[valueIndex.slice(0, -1)] : a[i++];

    switch (type) {
    case 's':
      return formatString(String(value), leftJustify, minWidth, precision, zeroPad, customPadChar);
    case 'c':
      return formatString(String.fromCharCode(+value), leftJustify, minWidth, precision, zeroPad);
    case 'b':
      return formatBaseX(value, 2, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
    case 'o':
      return formatBaseX(value, 8, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
    case 'x':
      return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
    case 'X':
      return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad)
        .toUpperCase();
    case 'u':
      return formatBaseX(value, 10, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
    case 'i':
    case 'd':
      number = +value || 0;
      // Plain Math.round doesn't just truncate
      number = Math.round(number - number % 1);
      prefix = number < 0 ? '-' : positivePrefix;
      value = prefix + pad(String(Math.abs(number)), precision, '0', false);
      return justify(value, prefix, leftJustify, minWidth, zeroPad);
    case 'e':
    case 'E':
    case 'f': // Should handle locales (as per setlocale)
    case 'F':
    case 'g':
    case 'G':
      number = +value;
      prefix = number < 0 ? '-' : positivePrefix;
      method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
      textTransform = ['toString', 'toUpperCase']['eEfFgG'.indexOf(type) % 2];
      value = prefix + Math.abs(number)[method](precision);
      return justify(value, prefix, leftJustify, minWidth, zeroPad)[textTransform]();
    default:
      return substring;
    }
  };

  return format.replace(regex, doFormat);
}

function random(from, to) {
    return Math.round(Math.random()*(from-to)) + from;
}

function min(a, b) {
    return Math.min(a, b);
}

function max(a, b) {
    return Math.max(a, b);
}

function abs(num) {
    return Math.abs(num);
}

//re-evaluate the code below into a map so we can translate single bytes into correct byte quickly
function pgm_read_byte(pixels, offset) {
    return pixels[offset];
    
    //return parseInt((pixels[offset]).toString(16).replace(/^(.(..)*)$/, "0$1").match(/../g).reverse().join(""), 16);
}

//pin helper functions
var A0 = 0xA0, A1 = 0xA1, A2 = 0xA2;
function digitalRead(pin) {
    return !Arduboy.pinStatus[pin];
}

//audio functions
function tone() {
    //TODO: hookup to html audio
    
}

//port of Arduboy.cpp to js/canvas
var Arduboy = (function() {
    var CS = 6;
    var DC = 4;
    var RST = 12;

    var WIDTH = 128;
    var HEIGHT = 64;
    
    var font = [
        0x00, 0x00, 0x00, 0x00, 0x00,
        0x3E, 0x5B, 0x4F, 0x5B, 0x3E,
        0x3E, 0x6B, 0x4F, 0x6B, 0x3E,
        0x1C, 0x3E, 0x7C, 0x3E, 0x1C,
        0x18, 0x3C, 0x7E, 0x3C, 0x18,
        0x1C, 0x57, 0x7D, 0x57, 0x1C,
        0x1C, 0x5E, 0x7F, 0x5E, 0x1C,
        0x00, 0x18, 0x3C, 0x18, 0x00,
        0xFF, 0xE7, 0xC3, 0xE7, 0xFF,
        0x00, 0x18, 0x24, 0x18, 0x00,
        0xFF, 0xE7, 0xDB, 0xE7, 0xFF,
        0x30, 0x48, 0x3A, 0x06, 0x0E,
        0x26, 0x29, 0x79, 0x29, 0x26,
        0x40, 0x7F, 0x05, 0x05, 0x07,
        0x40, 0x7F, 0x05, 0x25, 0x3F,
        0x5A, 0x3C, 0xE7, 0x3C, 0x5A,
        0x7F, 0x3E, 0x1C, 0x1C, 0x08,
        0x08, 0x1C, 0x1C, 0x3E, 0x7F,
        0x14, 0x22, 0x7F, 0x22, 0x14,
        0x5F, 0x5F, 0x00, 0x5F, 0x5F,
        0x06, 0x09, 0x7F, 0x01, 0x7F,
        0x00, 0x66, 0x89, 0x95, 0x6A,
        0x60, 0x60, 0x60, 0x60, 0x60,
        0x94, 0xA2, 0xFF, 0xA2, 0x94,
        0x08, 0x04, 0x7E, 0x04, 0x08,
        0x10, 0x20, 0x7E, 0x20, 0x10,
        0x08, 0x08, 0x2A, 0x1C, 0x08,
        0x08, 0x1C, 0x2A, 0x08, 0x08,
        0x1E, 0x10, 0x10, 0x10, 0x10,
        0x0C, 0x1E, 0x0C, 0x1E, 0x0C,
        0x30, 0x38, 0x3E, 0x38, 0x30,
        0x06, 0x0E, 0x3E, 0x0E, 0x06,
        0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x5F, 0x00, 0x00,
        0x00, 0x07, 0x00, 0x07, 0x00,
        0x14, 0x7F, 0x14, 0x7F, 0x14,
        0x24, 0x2A, 0x7F, 0x2A, 0x12,
        0x23, 0x13, 0x08, 0x64, 0x62,
        0x36, 0x49, 0x56, 0x20, 0x50,
        0x00, 0x08, 0x07, 0x03, 0x00,
        0x00, 0x1C, 0x22, 0x41, 0x00,
        0x00, 0x41, 0x22, 0x1C, 0x00,
        0x2A, 0x1C, 0x7F, 0x1C, 0x2A,
        0x08, 0x08, 0x3E, 0x08, 0x08,
        0x00, 0x80, 0x70, 0x30, 0x00,
        0x08, 0x08, 0x08, 0x08, 0x08,
        0x00, 0x00, 0x60, 0x60, 0x00,
        0x20, 0x10, 0x08, 0x04, 0x02,
        0x3E, 0x51, 0x49, 0x45, 0x3E,
        0x00, 0x42, 0x7F, 0x40, 0x00,
        0x72, 0x49, 0x49, 0x49, 0x46,
        0x21, 0x41, 0x49, 0x4D, 0x33,
        0x18, 0x14, 0x12, 0x7F, 0x10,
        0x27, 0x45, 0x45, 0x45, 0x39,
        0x3C, 0x4A, 0x49, 0x49, 0x31,
        0x41, 0x21, 0x11, 0x09, 0x07,
        0x36, 0x49, 0x49, 0x49, 0x36,
        0x46, 0x49, 0x49, 0x29, 0x1E,
        0x00, 0x00, 0x14, 0x00, 0x00,
        0x00, 0x40, 0x34, 0x00, 0x00,
        0x00, 0x08, 0x14, 0x22, 0x41,
        0x14, 0x14, 0x14, 0x14, 0x14,
        0x00, 0x41, 0x22, 0x14, 0x08,
        0x02, 0x01, 0x59, 0x09, 0x06,
        0x3E, 0x41, 0x5D, 0x59, 0x4E,
        0x7C, 0x12, 0x11, 0x12, 0x7C,
        0x7F, 0x49, 0x49, 0x49, 0x36,
        0x3E, 0x41, 0x41, 0x41, 0x22,
        0x7F, 0x41, 0x41, 0x41, 0x3E,
        0x7F, 0x49, 0x49, 0x49, 0x41,
        0x7F, 0x09, 0x09, 0x09, 0x01,
        0x3E, 0x41, 0x41, 0x51, 0x73,
        0x7F, 0x08, 0x08, 0x08, 0x7F,
        0x00, 0x41, 0x7F, 0x41, 0x00,
        0x20, 0x40, 0x41, 0x3F, 0x01,
        0x7F, 0x08, 0x14, 0x22, 0x41,
        0x7F, 0x40, 0x40, 0x40, 0x40,
        0x7F, 0x02, 0x1C, 0x02, 0x7F,
        0x7F, 0x04, 0x08, 0x10, 0x7F,
        0x3E, 0x41, 0x41, 0x41, 0x3E,
        0x7F, 0x09, 0x09, 0x09, 0x06,
        0x3E, 0x41, 0x51, 0x21, 0x5E,
        0x7F, 0x09, 0x19, 0x29, 0x46,
        0x26, 0x49, 0x49, 0x49, 0x32,
        0x03, 0x01, 0x7F, 0x01, 0x03,
        0x3F, 0x40, 0x40, 0x40, 0x3F,
        0x1F, 0x20, 0x40, 0x20, 0x1F,
        0x3F, 0x40, 0x38, 0x40, 0x3F,
        0x63, 0x14, 0x08, 0x14, 0x63,
        0x03, 0x04, 0x78, 0x04, 0x03,
        0x61, 0x59, 0x49, 0x4D, 0x43,
        0x00, 0x7F, 0x41, 0x41, 0x41,
        0x02, 0x04, 0x08, 0x10, 0x20,
        0x00, 0x41, 0x41, 0x41, 0x7F,
        0x04, 0x02, 0x01, 0x02, 0x04,
        0x40, 0x40, 0x40, 0x40, 0x40,
        0x00, 0x03, 0x07, 0x08, 0x00,
        0x20, 0x54, 0x54, 0x78, 0x40,
        0x7F, 0x28, 0x44, 0x44, 0x38,
        0x38, 0x44, 0x44, 0x44, 0x28,
        0x38, 0x44, 0x44, 0x28, 0x7F,
        0x38, 0x54, 0x54, 0x54, 0x18,
        0x00, 0x08, 0x7E, 0x09, 0x02,
        0x18, 0xA4, 0xA4, 0x9C, 0x78,
        0x7F, 0x08, 0x04, 0x04, 0x78,
        0x00, 0x44, 0x7D, 0x40, 0x00,
        0x20, 0x40, 0x40, 0x3D, 0x00,
        0x7F, 0x10, 0x28, 0x44, 0x00,
        0x00, 0x41, 0x7F, 0x40, 0x00,
        0x7C, 0x04, 0x78, 0x04, 0x78,
        0x7C, 0x08, 0x04, 0x04, 0x78,
        0x38, 0x44, 0x44, 0x44, 0x38,
        0xFC, 0x18, 0x24, 0x24, 0x18,
        0x18, 0x24, 0x24, 0x18, 0xFC,
        0x7C, 0x08, 0x04, 0x04, 0x08,
        0x48, 0x54, 0x54, 0x54, 0x24,
        0x04, 0x04, 0x3F, 0x44, 0x24,
        0x3C, 0x40, 0x40, 0x20, 0x7C,
        0x1C, 0x20, 0x40, 0x20, 0x1C,
        0x3C, 0x40, 0x30, 0x40, 0x3C,
        0x44, 0x28, 0x10, 0x28, 0x44,
        0x4C, 0x90, 0x90, 0x90, 0x7C,
        0x44, 0x64, 0x54, 0x4C, 0x44,
        0x00, 0x08, 0x36, 0x41, 0x00,
        0x00, 0x00, 0x77, 0x00, 0x00,
        0x00, 0x41, 0x36, 0x08, 0x00,
        0x02, 0x01, 0x02, 0x04, 0x02,
        0x3C, 0x26, 0x23, 0x26, 0x3C,
        0x1E, 0xA1, 0xA1, 0x61, 0x12,
        0x3A, 0x40, 0x40, 0x20, 0x7A,
        0x38, 0x54, 0x54, 0x55, 0x59,
        0x21, 0x55, 0x55, 0x79, 0x41,
        0x21, 0x54, 0x54, 0x78, 0x41,
        0x21, 0x55, 0x54, 0x78, 0x40,
        0x20, 0x54, 0x55, 0x79, 0x40,
        0x0C, 0x1E, 0x52, 0x72, 0x12,
        0x39, 0x55, 0x55, 0x55, 0x59,
        0x39, 0x54, 0x54, 0x54, 0x59,
        0x39, 0x55, 0x54, 0x54, 0x58,
        0x00, 0x00, 0x45, 0x7C, 0x41,
        0x00, 0x02, 0x45, 0x7D, 0x42,
        0x00, 0x01, 0x45, 0x7C, 0x40,
        0xF0, 0x29, 0x24, 0x29, 0xF0,
        0xF0, 0x28, 0x25, 0x28, 0xF0,
        0x7C, 0x54, 0x55, 0x45, 0x00,
        0x20, 0x54, 0x54, 0x7C, 0x54,
        0x7C, 0x0A, 0x09, 0x7F, 0x49,
        0x32, 0x49, 0x49, 0x49, 0x32,
        0x32, 0x48, 0x48, 0x48, 0x32,
        0x32, 0x4A, 0x48, 0x48, 0x30,
        0x3A, 0x41, 0x41, 0x21, 0x7A,
        0x3A, 0x42, 0x40, 0x20, 0x78,
        0x00, 0x9D, 0xA0, 0xA0, 0x7D,
        0x39, 0x44, 0x44, 0x44, 0x39,
        0x3D, 0x40, 0x40, 0x40, 0x3D,
        0x3C, 0x24, 0xFF, 0x24, 0x24,
        0x48, 0x7E, 0x49, 0x43, 0x66,
        0x2B, 0x2F, 0xFC, 0x2F, 0x2B,
        0xFF, 0x09, 0x29, 0xF6, 0x20,
        0xC0, 0x88, 0x7E, 0x09, 0x03,
        0x20, 0x54, 0x54, 0x79, 0x41,
        0x00, 0x00, 0x44, 0x7D, 0x41,
        0x30, 0x48, 0x48, 0x4A, 0x32,
        0x38, 0x40, 0x40, 0x22, 0x7A,
        0x00, 0x7A, 0x0A, 0x0A, 0x72,
        0x7D, 0x0D, 0x19, 0x31, 0x7D,
        0x26, 0x29, 0x29, 0x2F, 0x28,
        0x26, 0x29, 0x29, 0x29, 0x26,
        0x30, 0x48, 0x4D, 0x40, 0x20,
        0x38, 0x08, 0x08, 0x08, 0x08,
        0x08, 0x08, 0x08, 0x08, 0x38,
        0x2F, 0x10, 0xC8, 0xAC, 0xBA,
        0x2F, 0x10, 0x28, 0x34, 0xFA,
        0x00, 0x00, 0x7B, 0x00, 0x00,
        0x08, 0x14, 0x2A, 0x14, 0x22,
        0x22, 0x14, 0x2A, 0x14, 0x08,
        0xAA, 0x00, 0x55, 0x00, 0xAA,
        0xAA, 0x55, 0xAA, 0x55, 0xAA,
        0x00, 0x00, 0x00, 0xFF, 0x00,
        0x10, 0x10, 0x10, 0xFF, 0x00,
        0x14, 0x14, 0x14, 0xFF, 0x00,
        0x10, 0x10, 0xFF, 0x00, 0xFF,
        0x10, 0x10, 0xF0, 0x10, 0xF0,
        0x14, 0x14, 0x14, 0xFC, 0x00,
        0x14, 0x14, 0xF7, 0x00, 0xFF,
        0x00, 0x00, 0xFF, 0x00, 0xFF,
        0x14, 0x14, 0xF4, 0x04, 0xFC,
        0x14, 0x14, 0x17, 0x10, 0x1F,
        0x10, 0x10, 0x1F, 0x10, 0x1F,
        0x14, 0x14, 0x14, 0x1F, 0x00,
        0x10, 0x10, 0x10, 0xF0, 0x00,
        0x00, 0x00, 0x00, 0x1F, 0x10,
        0x10, 0x10, 0x10, 0x1F, 0x10,
        0x10, 0x10, 0x10, 0xF0, 0x10,
        0x00, 0x00, 0x00, 0xFF, 0x10,
        0x10, 0x10, 0x10, 0x10, 0x10,
        0x10, 0x10, 0x10, 0xFF, 0x10,
        0x00, 0x00, 0x00, 0xFF, 0x14,
        0x00, 0x00, 0xFF, 0x00, 0xFF,
        0x00, 0x00, 0x1F, 0x10, 0x17,
        0x00, 0x00, 0xFC, 0x04, 0xF4,
        0x14, 0x14, 0x17, 0x10, 0x17,
        0x14, 0x14, 0xF4, 0x04, 0xF4,
        0x00, 0x00, 0xFF, 0x00, 0xF7,
        0x14, 0x14, 0x14, 0x14, 0x14,
        0x14, 0x14, 0xF7, 0x00, 0xF7,
        0x14, 0x14, 0x14, 0x17, 0x14,
        0x10, 0x10, 0x1F, 0x10, 0x1F,
        0x14, 0x14, 0x14, 0xF4, 0x14,
        0x10, 0x10, 0xF0, 0x10, 0xF0,
        0x00, 0x00, 0x1F, 0x10, 0x1F,
        0x00, 0x00, 0x00, 0x1F, 0x14,
        0x00, 0x00, 0x00, 0xFC, 0x14,
        0x00, 0x00, 0xF0, 0x10, 0xF0,
        0x10, 0x10, 0xFF, 0x10, 0xFF,
        0x14, 0x14, 0x14, 0xFF, 0x14,
        0x10, 0x10, 0x10, 0x1F, 0x00,
        0x00, 0x00, 0x00, 0xF0, 0x10,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xF0, 0xF0, 0xF0, 0xF0, 0xF0,
        0xFF, 0xFF, 0xFF, 0x00, 0x00,
        0x00, 0x00, 0x00, 0xFF, 0xFF,
        0x0F, 0x0F, 0x0F, 0x0F, 0x0F,
        0x38, 0x44, 0x44, 0x38, 0x44,
        0x7C, 0x2A, 0x2A, 0x3E, 0x14,
        0x7E, 0x02, 0x02, 0x06, 0x06,
        0x02, 0x7E, 0x02, 0x7E, 0x02,
        0x63, 0x55, 0x49, 0x41, 0x63,
        0x38, 0x44, 0x44, 0x3C, 0x04,
        0x40, 0x7E, 0x20, 0x1E, 0x20,
        0x06, 0x02, 0x7E, 0x02, 0x02,
        0x99, 0xA5, 0xE7, 0xA5, 0x99,
        0x1C, 0x2A, 0x49, 0x2A, 0x1C,
        0x4C, 0x72, 0x01, 0x72, 0x4C,
        0x30, 0x4A, 0x4D, 0x4D, 0x30,
        0x30, 0x48, 0x78, 0x48, 0x30,
        0xBC, 0x62, 0x5A, 0x46, 0x3D,
        0x3E, 0x49, 0x49, 0x49, 0x00,
        0x7E, 0x01, 0x01, 0x01, 0x7E,
        0x2A, 0x2A, 0x2A, 0x2A, 0x2A,
        0x44, 0x44, 0x5F, 0x44, 0x44,
        0x40, 0x51, 0x4A, 0x44, 0x40,
        0x40, 0x44, 0x4A, 0x51, 0x40,
        0x00, 0x00, 0xFF, 0x01, 0x03,
        0xE0, 0x80, 0xFF, 0x00, 0x00,
        0x08, 0x08, 0x6B, 0x6B, 0x08,
        0x36, 0x12, 0x36, 0x24, 0x36,
        0x06, 0x0F, 0x09, 0x0F, 0x06,
        0x00, 0x00, 0x18, 0x18, 0x00,
        0x00, 0x00, 0x10, 0x10, 0x00,
        0x30, 0x40, 0xFF, 0x01, 0x01,
        0x00, 0x1F, 0x01, 0x01, 0x1E,
        0x00, 0x19, 0x1D, 0x17, 0x12,
        0x00, 0x3C, 0x3C, 0x3C, 0x3C,
        0x00, 0x00, 0x00, 0x00, 0x00
    ];
    
    //TODO: replace this with instance references
    var context;
    var imageData;
    var sBuffer = new Array((HEIGHT*WIDTH)/8);
    
    var cursor_x, cursor_y;
    var textsize;
    var wrap; // If set, 'wrap' text at right edge of display
    
    //default arduboy options to get started with
    var Arduboy = function() {
        //register the controls with the pins
        
        //read the pixels from the canvas and associate them with a buffer, similarly to the arduboy
        context = Arduboy.screen.getContext("2d");
        
        //attempt to force nearest neighbour scaling interpolation to maintain pixelation
        context.mozImageSmoothingEnabled = false;
        context.msImageSmoothingEnabled = false;
        context.imageSmoothingEnabled = false;
        
        imageData = context.getImageData(0, 0, WIDTH, HEIGHT);
        sBuffer = imageData.data;
    };
    
    Arduboy.screen = null;
    Arduboy.speaker = null;
    
    Arduboy.pins = {
        left: 9,
        up: 8,
        right: 5,
        down: 10, 
        a: A0,
        b: A1
    };
    
    Arduboy.pinStatus = {
        9: 0,
        8: 0,
        5: 0, 
        10: 0,
        A0: 0,
        A1: 0
    };
    
    var shouldDraw = false;
    Arduboy.flush = function() {
        if (shouldDraw) {
            //update all of the pixels that have changed from the last block
            
            
            context.putImageData(imageData, 0, 0);
        }
    };
    
    Arduboy.clear = function() {
        for (var i=0; i<WIDTH*HEIGHT*4; i++) {
            sBuffer[i] = 0;
        }
        
        shouldDraw = true;
    };
    
    Arduboy.prototype = {
        print: function(str) {
            for (var i=0; i<str.length; i++) {
                this.write(str[i]);
            }
        },
        getInput: function(pin) {
            return !Ardubot.pinStatus(pin);
        },
        start: function() {
            //setup a request animation frame callback that handles the actual rendering to the display
        },
        blank: function() {
            this.clearDisplay();
        },
        clearDisplay: function() {
            Arduboy.clear();
        },
        display: function() {
            //context.putImageData(imageData, 0, 0);
            shouldDraw = true;
        },
        drawScreen: function(image) {
            //TODO: take the give image and transform it into a renderable image that we can view on the screen
            imageData.data = image;
        },
        drawPixel: function(x, y, value) {
            if (x < 0 || x > (WIDTH-1) || y < 0 || y > (HEIGHT-1)) {
                return;
            }
            
            var index = ((y*WIDTH) + x) * 4;
            
            if (value) {
                sBuffer[index] = 255;
                sBuffer[index+1] = 255;
                sBuffer[index+2] = 255;
                sBuffer[index+3] = 255;
            } else {
                sBuffer[index] = 0;
                sBuffer[index+1] = 0;
                sBuffer[index+2] = 0;
                sBuffer[index+3] = 0;
            }
        },
        drawCircle: function(x0, y0, r, color) {
            var f = 1 - r;
            var ddF_x = 1;
            var ddF_y = -2 * r;
            var x = 0;
            var y = r;

            this.drawPixel(x0, y0+r, color);
            this.drawPixel(x0, y0-r, color);
            this.drawPixel(x0+r, y0, color);
            this.drawPixel(x0-r, y0, color);

            while (x<y) {
                if (f >= 0) {
                    y--;
                    ddF_y += 2;
                    f += ddF_y;
                }

                x++;
                ddF_x += 2;
                f += ddF_x;

                this.drawPixel(x0 + x, y0 + y, color);
                this.drawPixel(x0 - x, y0 + y, color);
                this.drawPixel(x0 + x, y0 - y, color);
                this.drawPixel(x0 - x, y0 - y, color);
                this.drawPixel(x0 + y, y0 + x, color);
                this.drawPixel(x0 - y, y0 + x, color);
                this.drawPixel(x0 + y, y0 - x, color);
                this.drawPixel(x0 - y, y0 - x, color);
            }
        },
        drawCircleHelper: function(x0, y0, r, cornername, color) {
            var f = 1 - r;
            var ddF_x = 1;
            var ddF_y = -2 * r;
            var x = 0;
            var y = r;

            while (x<y) {
                if (f >= 0) {
                    y--;
                    ddF_y += 2;
                    f += ddF_y;
                }
                
                x++;
                ddF_x += 2;
                f += ddF_x;

                if (cornername & 0x4) {
                    this.drawPixel(x0 + x, y0 + y, color);
                    this.drawPixel(x0 + y, y0 + x, color);
                } 
                if (cornername & 0x2) {
                    this.drawPixel(x0 + x, y0 - y, color);
                    this.drawPixel(x0 + y, y0 - x, color);
                }
                if (cornername & 0x8)  {
                    this.drawPixel(x0 - y, y0 + x, color);
                    this.drawPixel(x0 - x, y0 + y, color);
                }
                if (cornername & 0x1) {
                    this.drawPixel(x0 - y, y0 - x, color);
                    this.drawPixel(x0 - x, y0 - y, color);
                }
            }
        },
        fillCircle: function(x0, y0, r, color) {
            this.drawFastVLine(x0, y0-r, 2*r+1, color);
            this.fillCircleHelper(x0, y0, r, 3, 0, color);
        },
        fillCircleHelper: function(x0, y0, r, cornername, delta, color) {
            // used to do circles and roundrects!
            var f = 1 - r;
            var ddF_x = 1;
            var ddF_y = -2 * r;
            var x = 0;
            var y = r;

            while (x < y) {
                if (f >= 0) {
                    y--;
                    ddF_y += 2;
                    f += ddF_y;
                }
                
                x++;
                ddF_x += 2;
                f += ddF_x;
                
                if (cornername & 0x1)  {
                    this.drawFastVLine(x0+x, y0-y, 2*y+1+delta, color);
                    this.drawFastVLine(x0+y, y0-x, 2*x+1+delta, color);
                }
                
                if (cornername & 0x2) {
                    this.drawFastVLine(x0-x, y0-y, 2*y+1+delta, color);
                    this.drawFastVLine(x0-y, y0-x, 2*x+1+delta, color);
                }
            }
        },
        drawLine: function(x0, y0, x1, y1, color) {
            // bresenham's algorithm - thx wikpedia
            var steep = abs(y1 - y0) > abs(x1 - x0);
            
            if (steep) {
                var temp = x0;
                x0 = y0;
                y0 = temp;
                
                var temp = x1;
                x1 = y1;
                y1 = temp;
            }

            if (x0 > x1) {
                var temp = x0;
                x0 = x1;
                x1 = temp;
                
                var temp = y0;
                y0 = y1;
                y1 = temp;
            }

            var dx, dy;
            dx = x1 - x0;
            dy = abs(y1 - y0);

            var err = dx / 2;
            var ystep;

            if (y0 < y1) {
                ystep = 1;
            } else {
                ystep = -1;
            }

            for (; x0 <= x1; x0++) {
                if (steep) {
                    this.drawPixel(y0, x0, color);
                } else {
                    this.drawPixel(x0, y0, color);
                }

                err -= dy;
                if (err < 0) {
                    y0 += ystep;
                    err += dx;
                }
            }
        },
        drawRect: function(x, y, w, h, color) {
            this.drawFastHLine(x, y, w, color);
            this.drawFastHLine(x, y+h-1, w, color);
            this.drawFastVLine(x, y, h, color);
            this.drawFastVLine(x+w-1, y, h, color);
        },
        drawFastVLine: function(x, y, h, color) {
            var end = y+h;
            for (var a = max(0,y); a < min(end,HEIGHT); a++) {
                this.drawPixel(x, a, color);
            }
        },
        drawFastHLine: function(x, y, w, color) {
            var end = x+w;
            for (var a = max(0,x); a < min(end,WIDTH); a++) {
                this.drawPixel(a,y,color);
            }
        },
        fillRect: function(x, y, w, h, color) {
            for (var i=x; i<x+w; i++) {
                this.drawFastVLine(i, y, h, color); 
            }
        },
        fillScreen: function(color) {
            this.fillRect(0, 0, WIDTH, HEIGHT, color);
        },
        drawRoundRect: function(x, y, w, h, r, color) {
            // smarter version
            this.drawFastHLine(x+r, y, w-2*r, color); // Top
            this.drawFastHLine(x+r, y+h-1, w-2*r, color); // Bottom
            this.drawFastVLine(x, y+r, h-2*r, color); // Left
            this.drawFastVLine(x+w-1, y+r, h-2*r, color); // Right
            
            // draw four corners
            this.drawCircleHelper(x+r, y+r, r, 1, color);
            this.drawCircleHelper(x+w-r-1, y+r, r, 2, color);
            this.drawCircleHelper(x+w-r-1, y+h-r-1, r, 4, color);
            this.drawCircleHelper(x+r, y+h-r-1, r, 8, color);
        },
        fillRoundRect: function(x, y, w, h, r, color) {
            // smarter version
            this.fillRect(x+r, y, w-2*r, h, color);

            // draw four corners
            this.fillCircleHelper(x+w-r-1, y+r, r, 1, h-2*r-1, color);
            this.fillCircleHelper(x+r, y+r, r, 2, h-2*r-1, color);
        },
        drawTriangle: function(x0, y0, x1, y1, x2, y2, color) {
            this.drawLine(x0, y0, x1, y1, color);
            this.drawLine(x1, y1, x2, y2, color);
            this.drawLine(x2, y2, x0, y0, color);
        },
        fillTriangle: function(x0, y0, x1, y1, x2, y2, color) {
            var a, b, y, last;
            
            // Sort coordinates by Y order (y2 >= y1 >= y0)
            if (y0 > y1) {
                var temp = y0;
                y0 = y1;
                y1 = temp;
                
                var temp = x0;
                x0 = x1;
                x1 = temp;
            }
            
            if (y1 > y2) {
                var temp = y2;
                y2 = y1;
                y1 = temp;
                
                var temp = x2;
                x2 = x1;
                x1 = temp;
            }
            
            if (y0 > y1) {
                var temp = y0;
                y0 = y1;
                y1 = temp;
                
                var temp = x0;
                x0 = x1;
                x1 = temp;
            }
            
            if(y0 == y2)  { // Handle awkward all-on-same-line case as its own thing
                a = b = x0;
                if(x1 < a) {
                    a = x1;
                } else if(x1 > b) {
                    b = x1;
                }
                
                if(x2 < a) {
                    a = x2;
                } else if(x2 > b) {
                    b = x2;
                }
                
                this.drawFastHLine(a, y0, b-a+1, color);
                return;
            }

            var dx01 = x1 - x0,
                dy01 = y1 - y0,
                dx02 = x2 - x0,
                dy02 = y2 - y0,
                dx12 = x2 - x1,
                dy12 = y2 - y1,
                sa = 0,
                sb = 0;

            // For upper part of triangle, find scanline crossings for segments
            // 0-1 and 0-2.  If y1=y2 (flat-bottomed triangle), the scanline y1
            // is included here (and second loop will be skipped, avoiding a /0
            // error there), otherwise scanline y1 is skipped here and handled
            // in the second loop...which also avoids a /0 error here if y0=y1
            // (flat-topped triangle).
            if (y1 == y2) {
                last = y1;   // Include y1 scanline
            } else {
                last = y1-1; // Skip it
            }
            
            for(y = y0; y <= last; y++) {
                a   = x0 + sa / dy01;
                b   = x0 + sb / dy02;
                sa += dx01;
                sb += dx02;
                
                if(a > b) {
                    swap(a,b);
                }
                
                this.drawFastHLine(a, y, b-a+1, color);
            }

            // For lower part of triangle, find scanline crossings for segments
            // 0-2 and 1-2.  This loop is skipped if y1=y2.
            sa = dx12 * (y - y1);
            sb = dx02 * (y - y0);

            for (; y <= y2; y++) {
                a = x1 + sa / dy12;
                b = x0 + sb / dy02;
                sa += dx12;
                sb += dx02;
                
                if (a > b) {
                    swap(a,b);
                }
                
                this.drawFastHLine(a, y, b-a+1, color);
            }
        },
        drawBitmap: function(x, y, bitmap, w, h, color) {
            if (color === undefined) color = 1;
            
            //the width must be a divisor of 8 so round up to the nearest
            w = Math.ceil(w / 8) * 8;
            
            //bitmap is off screen
            for (var i=0, i2=0; i<bitmap.length; i++, i2+=8) {
                var line = pgm_read_byte(bitmap, i);
                var x2 = x + (i2 % w), y2 = y + Math.floor(i2 / w);
                
                for (var j = 7; j>=0; j--) {
                    if (line & 0x1) {
                        this.drawPixel(x2+j, y2, color);
                    }
                    
                    line >>= 1;
                }
            }
        },
        drawChar: function(x, y, c, color, bg, size) {
            if ((x >= WIDTH) || (y >= HEIGHT) || ((x + 5 * size - 1) < 0) || ((y + 8 * size - 1) < 0)) {
                return;
            }
            
            c = c.charCodeAt(0);
            
            for (var i=0; i<6; i++ ) {
                var line;
                if (i == 5)  {
                    line = 0x0;
                }  else  {
                    line = pgm_read_byte(font, (c*5)+i);
                }
                
                for (var j = 0; j<8; j++) {
                    if (line & 0x1) {
                        if (size == 1) { //default size
                            this.drawPixel(x+i, y+j, color);
                        } else { //big size
                            this.fillRect(x+(i*size), y+(j*size), size, size, color);
                        } 
                    } else if (bg != color) {
                        if (size == 1) { // default size
                            this.drawPixel(x+i, y+j, bg);
                        }  else {  // big size
                            this.fillRect(x+i*size, y+j*size, size, size, bg);
                        }
                    }

                    line >>= 1;
                }
            }
        },
        setCursor: function(x, y) {
            cursor_x = x;
            cursor_y = y;
        },
        setTextSize: function(s) {
            textsize = (s > 0) ? s : 1;
        },
        setTextWrap: function(w) {
            wrap = w;
        },
        width: function() {
            return WIDTH;
        },
        height: function() {
            return HEIGHT;
        },
        write: function(c) {
            if (c == '\n') {
                cursor_y += textsize*8;
                cursor_x = 0;
            } else if (c == '\r') {
                // skip em
            } else {
                this.drawChar(cursor_x, cursor_y, c, 1, 0, textsize);
                cursor_x += textsize*6;
                if (wrap && (cursor_x > (WIDTH - textsize*6))) {
                    cursor_y += textsize*8;
                    cursor_x = 0;
                }
            }
        }
    };
    
    return Arduboy;
})();
