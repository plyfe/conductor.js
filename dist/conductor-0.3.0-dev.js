if (typeof define !== 'function' && typeof require !== 'function') {
  var define, require;

  (function() {
    var registry = {}, seen = {};

    define = function(name, deps, callback) {
      registry[name] = { deps: deps, callback: callback };
    };

    require = function(name) {
      if (seen[name]) { return seen[name]; }

      var mod = registry[name];

      if (!mod) {
        throw new Error("Module: '" + name + "' not found.");
      }

      var deps = mod.deps,
          callback = mod.callback,
          reified = [],
          exports;

      for (var i=0, l=deps.length; i<l; i++) {
        if (deps[i] === 'exports') {
          reified.push(exports = {});
        } else {
          reified.push(require(deps[i]));
        }
      }

      var value = callback.apply(this, reified);

      return seen[name] = exports || value;
    };

    define.registry = registry;
    define.seen = seen;
  })();
}

/*
 Version: core-1.0
 The MIT License: Copyright (c) 2012 LiosK.
*/
function UUID(){}UUID.generate=function(){var a=UUID._gri,b=UUID._ha;return b(a(32),8)+"-"+b(a(16),4)+"-"+b(16384|a(12),4)+"-"+b(32768|a(14),4)+"-"+b(a(48),12)};UUID._gri=function(a){return 0>a?NaN:30>=a?0|Math.random()*(1<<a):53>=a?(0|1073741824*Math.random())+1073741824*(0|Math.random()*(1<<a-30)):NaN};UUID._ha=function(a,b){for(var c=a.toString(16),d=b-c.length,e="0";0<d;d>>>=1,e+=e)d&1&&(c=e+c);return c};

/*! Kamino v0.0.1 | http://github.com/Cyril-sf/kamino.js | Copyright 2012, Kit Cambridge | http://kit.mit-license.org */
(function(window) {
  // Convenience aliases.
  var getClass = {}.toString, isProperty, forEach, undef;

  Kamino = {};
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = Kamino;
    }
    exports.Kamino = Kamino;
  } else {
    window['Kamino'] = Kamino;
  }

  Kamino.VERSION = '0.1.0';

  KaminoException = function() {
    this.name = "KaminoException";
    this.number = 25;
    this.message = "Uncaught Error: DATA_CLONE_ERR: Kamino Exception 25";
  };

  // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
  var isExtended = new Date(-3509827334573292);
  try {
    // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
    // results for certain dates in Opera >= 10.53.
    isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() == 1 &&
      // Safari < 2.0.2 stores the internal millisecond time value correctly,
      // but clips the values returned by the date methods to the range of
      // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
      isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
  } catch (exception) {}

  // IE <= 7 doesn't support accessing string characters using square
  // bracket notation. IE 8 only supports this for primitives.
  var charIndexBuggy = "A"[0] != "A";

  // Define additional utility methods if the `Date` methods are buggy.
  if (!isExtended) {
    var floor = Math.floor;
    // A mapping between the months of the year and the number of days between
    // January 1st and the first of the respective month.
    var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    // Internal: Calculates the number of days between the Unix epoch and the
    // first day of the given month.
    var getDay = function (year, month) {
      return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
    };
  }

  // Internal: Determines if a property is a direct property of the given
  // object. Delegates to the native `Object#hasOwnProperty` method.
  if (!(isProperty = {}.hasOwnProperty)) {
    isProperty = function (property) {
      var members = {}, constructor;
      if ((members.__proto__ = null, members.__proto__ = {
        // The *proto* property cannot be set multiple times in recent
        // versions of Firefox and SeaMonkey.
        "toString": 1
      }, members).toString != getClass) {
        // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
        // supports the mutable *proto* property.
        isProperty = function (property) {
          // Capture and break the object's prototype chain (see section 8.6.2
          // of the ES 5.1 spec). The parenthesized expression prevents an
          // unsafe transformation by the Closure Compiler.
          var original = this.__proto__, result = property in (this.__proto__ = null, this);
          // Restore the original prototype chain.
          this.__proto__ = original;
          return result;
        };
      } else {
        // Capture a reference to the top-level `Object` constructor.
        constructor = members.constructor;
        // Use the `constructor` property to simulate `Object#hasOwnProperty` in
        // other environments.
        isProperty = function (property) {
          var parent = (this.constructor || constructor).prototype;
          return property in this && !(property in parent && this[property] === parent[property]);
        };
      }
      members = null;
      return isProperty.call(this, property);
    };
  }

  // Internal: Normalizes the `for...in` iteration algorithm across
  // environments. Each enumerated key is yielded to a `callback` function.
  forEach = function (object, callback) {
    var size = 0, Properties, members, property, forEach;

    // Tests for bugs in the current environment's `for...in` algorithm. The
    // `valueOf` property inherits the non-enumerable flag from
    // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
    (Properties = function () {
      this.valueOf = 0;
    }).prototype.valueOf = 0;

    // Iterate over a new instance of the `Properties` class.
    members = new Properties();
    for (property in members) {
      // Ignore all properties inherited from `Object.prototype`.
      if (isProperty.call(members, property)) {
        size++;
      }
    }
    Properties = members = null;

    // Normalize the iteration algorithm.
    if (!size) {
      // A list of non-enumerable properties inherited from `Object.prototype`.
      members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
      // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
      // properties.
      forEach = function (object, callback) {
        var isFunction = getClass.call(object) == "[object Function]", property, length;
        for (property in object) {
          // Gecko <= 1.0 enumerates the `prototype` property of functions under
          // certain conditions; IE does not.
          if (!(isFunction && property == "prototype") && isProperty.call(object, property)) {
            callback(property);
          }
        }
        // Manually invoke the callback for each non-enumerable property.
        for (length = members.length; property = members[--length]; isProperty.call(object, property) && callback(property));
      };
    } else if (size == 2) {
      // Safari <= 2.0.4 enumerates shadowed properties twice.
      forEach = function (object, callback) {
        // Create a set of iterated properties.
        var members = {}, isFunction = getClass.call(object) == "[object Function]", property;
        for (property in object) {
          // Store each property name to prevent double enumeration. The
          // `prototype` property of functions is not enumerated due to cross-
          // environment inconsistencies.
          if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
            callback(property);
          }
        }
      };
    } else {
      // No bugs detected; use the standard `for...in` algorithm.
      forEach = function (object, callback) {
        var isFunction = getClass.call(object) == "[object Function]", property, isConstructor;
        for (property in object) {
          if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
            callback(property);
          }
        }
        // Manually invoke the callback for the `constructor` property due to
        // cross-environment inconsistencies.
        if (isConstructor || isProperty.call(object, (property = "constructor"))) {
          callback(property);
        }
      };
    }
    return forEach(object, callback);
  };

  // Public: Serializes a JavaScript `value` as a string. The optional
  // `filter` argument may specify either a function that alters how object and
  // array members are serialized, or an array of strings and numbers that
  // indicates which properties should be serialized. The optional `width`
  // argument may be either a string or number that specifies the indentation
  // level of the output.

  // Internal: A map of control characters and their escaped equivalents.
  var Escapes = {
    "\\": "\\\\",
    '"': '\\"',
    "\b": "\\b",
    "\f": "\\f",
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t"
  };

  // Internal: Converts `value` into a zero-padded string such that its
  // length is at least equal to `width`. The `width` must be <= 6.
  var toPaddedString = function (width, value) {
    // The `|| 0` expression is necessary to work around a bug in
    // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
    return ("000000" + (value || 0)).slice(-width);
  };

  // Internal: Double-quotes a string `value`, replacing all ASCII control
  // characters (characters with code unit values between 0 and 31) with
  // their escaped equivalents. This is an implementation of the
  // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
  var quote = function (value) {
    var result = '"', index = 0, symbol;
    for (; symbol = value.charAt(index); index++) {
      // Escape the reverse solidus, double quote, backspace, form feed, line
      // feed, carriage return, and tab characters.
      result += '\\"\b\f\n\r\t'.indexOf(symbol) > -1 ? Escapes[symbol] :
        // If the character is a control character, append its Unicode escape
        // sequence; otherwise, append the character as-is.
        (Escapes[symbol] = symbol < " " ? "\\u00" + toPaddedString(2, symbol.charCodeAt(0).toString(16)) : symbol);
    }
    return result + '"';
  };

  // Internal: detects if an object is a DOM element.
  // http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
  var isElement = function(o) {
    return (
      typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
      o && typeof o === "object" && o.nodeType === 1 && typeof o.nodeName==="string"
    );
  };

  // Internal: Recursively serializes an object. Implements the
  // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
  var serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
    var value = object[property], originalClassName, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, any, result,
        regExpSource, regExpModifiers = "";
    if( value instanceof Error || value instanceof Function) {
      throw new KaminoException();
    }
    if( isElement( value ) ) {
      throw new KaminoException();
    }
    if (typeof value == "object" && value) {
      originalClassName = getClass.call(value);
      if (originalClassName == "[object Date]" && !isProperty.call(value, "toJSON")) {
        if (value > -1 / 0 && value < 1 / 0) {
          value = value.toUTCString().replace("GMT", "UTC");
        } else {
          value = null;
        }
      } else if (typeof value.toJSON == "function" && ((originalClassName != "[object Number]" && originalClassName != "[object String]" && originalClassName != "[object Array]") || isProperty.call(value, "toJSON"))) {
        // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
        // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
        // ignores all `toJSON` methods on these objects unless they are
        // defined directly on an instance.
        value = value.toJSON(property);
      }
    }
    if (callback) {
      // If a replacement function was provided, call it to obtain the value
      // for serialization.
      value = callback.call(object, property, value);
    }
    if (value === null) {
      return "null";
    }
    if (value === undefined) {
      return undefined;
    }
    className = getClass.call(value);
    if (className == "[object Boolean]") {
      // Booleans are represented literally.
      return "" + value;
    } else if (className == "[object Number]") {
      // Kamino numbers must be finite. `Infinity` and `NaN` are serialized as
      // `"null"`.
      if( value === Number.POSITIVE_INFINITY ) {
        return "Infinity";
      } else if( value === Number.NEGATIVE_INFINITY ) {
        return "NInfinity";
      } else if( isNaN( value ) ) {
        return "NaN";
      }
      return "" + value;
    } else if (className == "[object RegExp]") {
      // Strings are double-quoted and escaped.
      regExpSource = value.source;
      regExpModifiers += value.ignoreCase ? "i" : "";
      regExpModifiers += value.global ? "g" : "";
      regExpModifiers += value.multiline ? "m" : "";

      regExpSource = quote(charIndexBuggy ? regExpSource.split("") : regExpSource);
      regExpModifiers = quote(charIndexBuggy ? regExpModifiers.split("") : regExpModifiers);

      // Adds the RegExp prefix.
      value = '^' + regExpSource + regExpModifiers;

      return value;
    } else if (className == "[object String]") {
      // Strings are double-quoted and escaped.
      value = quote(charIndexBuggy ? value.split("") : value);

      if( originalClassName == "[object Date]") {
        // Adds the Date prefix.
        value = '%' + value;
      }

      return value;
    }
    // Recursively serialize objects and arrays.
    if (typeof value == "object") {
      // Check for cyclic structures. This is a linear search; performance
      // is inversely proportional to the number of unique nested objects.
      for (length = stack.length; length--;) {
        if (stack[length] === value) {
          return "&" + length;
        }
      }
      // Add the object to the stack of traversed objects.
      stack.push(value);
      results = [];
      // Save the current indentation level and indent one additional level.
      prefix = indentation;
      indentation += whitespace;
      if (className == "[object Array]") {
        // Recursively serialize array elements.
        for (index = 0, length = value.length; index < length; any || (any = true), index++) {
          element = serialize(index, value, callback, properties, whitespace, indentation, stack);
          results.push(element === undef ? "null" : element);
        }
        result = any ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
      } else {
        // Recursively serialize object members. Members are selected from
        // either a user-specified list of property names, or the object
        // itself.
        forEach(properties || value, function (property) {
          var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
          if (element !== undef) {
            // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
            // is not the empty string, let `member` {quote(property) + ":"}
            // be the concatenation of `member` and the `space` character."
            // The "`space` character" refers to the literal space
            // character, not the `space` {width} argument provided to
            // `JSON.stringify`.
            results.push(quote(charIndexBuggy ? property.split("") : property) + ":" + (whitespace ? " " : "") + element);
          }
          any || (any = true);
        });
        result = any ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
      }
      return result;
    }
  };

  // Public: `Kamino.stringify`. See ES 5.1 section 15.12.3.
  Kamino.stringify = function (source, filter, width) {
    var whitespace, callback, properties;
    if (typeof filter == "function" || typeof filter == "object" && filter) {
      if (getClass.call(filter) == "[object Function]") {
        callback = filter;
      } else if (getClass.call(filter) == "[object Array]") {
        // Convert the property names array into a makeshift set.
        properties = {};
        for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((getClass.call(value) == "[object String]" || getClass.call(value) == "[object Number]") && (properties[value] = 1)));
      }
    }
    if (width) {
      if (getClass.call(width) == "[object Number]") {
        // Convert the `width` to an integer and create a string containing
        // `width` number of space characters.
        if ((width -= width % 1) > 0) {
          for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
        }
      } else if (getClass.call(width) == "[object String]") {
        whitespace = width.length <= 10 ? width : width.slice(0, 10);
      }
    }
    // Opera <= 7.54u2 discards the values associated with empty string keys
    // (`""`) only if they are used directly within an object member list
    // (e.g., `!("" in { "": 1})`).
    return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
  };

  // Public: Parses a source string.
  var fromCharCode = String.fromCharCode;

  // Internal: A map of escaped control characters and their unescaped
  // equivalents.
  var Unescapes = {
    "\\": "\\",
    '"': '"',
    "/": "/",
    "b": "\b",
    "t": "\t",
    "n": "\n",
    "f": "\f",
    "r": "\r"
  };

  // Internal: Stores the parser state.
  var Index, Source, stack;

  // Internal: Resets the parser state and throws a `SyntaxError`.
  var abort = function() {
    Index = Source = null;
    throw SyntaxError();
  };

  var parseString = function(prefix) {
    prefix = prefix || "";
    var source = Source, length = source.length, value, symbol, begin, position;
    // Advance to the next character and parse a Kamino string at the
    // current position. String tokens are prefixed with the sentinel
    // `@` character to distinguish them from punctuators.
    for (value = prefix, Index++; Index < length;) {
      symbol = source[Index];
      if (symbol < " ") {
        // Unescaped ASCII control characters are not permitted.
        abort();
      } else if (symbol == "\\") {
        // Parse escaped Kamino control characters, `"`, `\`, `/`, and
        // Unicode escape sequences.
        symbol = source[++Index];
        if ('\\"/btnfr'.indexOf(symbol) > -1) {
          // Revive escaped control characters.
          value += Unescapes[symbol];
          Index++;
        } else if (symbol == "u") {
          // Advance to the first character of the escape sequence.
          begin = ++Index;
          // Validate the Unicode escape sequence.
          for (position = Index + 4; Index < position; Index++) {
            symbol = source[Index];
            // A valid sequence comprises four hexdigits that form a
            // single hexadecimal value.
            if (!(symbol >= "0" && symbol <= "9" || symbol >= "a" && symbol <= "f" || symbol >= "A" && symbol <= "F")) {
              // Invalid Unicode escape sequence.
              abort();
            }
          }
          // Revive the escaped character.
          value += fromCharCode("0x" + source.slice(begin, Index));
        } else {
          // Invalid escape sequence.
          abort();
        }
      } else {
        if (symbol == '"') {
          // An unescaped double-quote character marks the end of the
          // string.
          break;
        }
        // Append the original character as-is.
        value += symbol;
        Index++;
      }
    }
    if (source[Index] == '"') {
      Index++;
      // Return the revived string.
      return value;
    }
    // Unterminated string.
    abort();
  };

  // Internal: Returns the next token, or `"$"` if the parser has reached
  // the end of the source string. A token may be a string, number, `null`
  // literal, `NaN` literal or Boolean literal.
  var lex = function () {
    var source = Source, length = source.length, symbol, value, begin, position, sign,
        dateString, regExpSource, regExpModifiers;
    while (Index < length) {
      symbol = source[Index];
      if ("\t\r\n ".indexOf(symbol) > -1) {
        // Skip whitespace tokens, including tabs, carriage returns, line
        // feeds, and space characters.
        Index++;
      } else if ("{}[]:,".indexOf(symbol) > -1) {
        // Parse a punctuator token at the current position.
        Index++;
        return symbol;
      } else if (symbol == '"') {
        // Parse strings.
        return parseString("@");
      } else if (symbol == '%') {
        // Parse dates.
        Index++;
        symbol = source[Index];
        if(symbol == '"') {
          dateString = parseString();
          return new Date( dateString );
        }
        abort();
      } else if (symbol == '^') {
        // Parse regular expressions.
        Index++;
        symbol = source[Index];
        if(symbol == '"') {
          regExpSource = parseString();

          symbol = source[Index];
          if(symbol == '"') {
            regExpModifiers = parseString();

            return new RegExp( regExpSource, regExpModifiers );
          }
        }
        abort();
      } else if (symbol == '&') {
        // Parse object references.
        Index++;
        symbol = source[Index];
        if (symbol >= "0" && symbol <= "9") {
          Index++;
          return stack[symbol];
        }
        abort();
      } else {
        // Parse numbers and literals.
        begin = Index;
        // Advance the scanner's position past the sign, if one is
        // specified.
        if (symbol == "-") {
          sign = true;
          symbol = source[++Index];
        }
        // Parse an integer or floating-point value.
        if (symbol >= "0" && symbol <= "9") {
          // Leading zeroes are interpreted as octal literals.
          if (symbol == "0" && (symbol = source[Index + 1], symbol >= "0" && symbol <= "9")) {
            // Illegal octal literal.
            abort();
          }
          sign = false;
          // Parse the integer component.
          for (; Index < length && (symbol = source[Index], symbol >= "0" && symbol <= "9"); Index++);
          // Floats cannot contain a leading decimal point; however, this
          // case is already accounted for by the parser.
          if (source[Index] == ".") {
            position = ++Index;
            // Parse the decimal component.
            for (; position < length && (symbol = source[position], symbol >= "0" && symbol <= "9"); position++);
            if (position == Index) {
              // Illegal trailing decimal.
              abort();
            }
            Index = position;
          }
          // Parse exponents.
          symbol = source[Index];
          if (symbol == "e" || symbol == "E") {
            // Skip past the sign following the exponent, if one is
            // specified.
            symbol = source[++Index];
            if (symbol == "+" || symbol == "-") {
              Index++;
            }
            // Parse the exponential component.
            for (position = Index; position < length && (symbol = source[position], symbol >= "0" && symbol <= "9"); position++);
            if (position == Index) {
              // Illegal empty exponent.
              abort();
            }
            Index = position;
          }
          // Coerce the parsed value to a JavaScript number.
          return +source.slice(begin, Index);
        }
        // A negative sign may only precede numbers.
        if (sign) {
          abort();
        }
        // `true`, `false`, `Infinity`, `-Infinity`, `NaN` and `null` literals.
        if (source.slice(Index, Index + 4) == "true") {
          Index += 4;
          return true;
        } else if (source.slice(Index, Index + 5) == "false") {
          Index += 5;
          return false;
        } else if (source.slice(Index, Index + 8) == "Infinity") {
          Index += 8;
          return Infinity;
        } else if (source.slice(Index, Index + 9) == "NInfinity") {
          Index += 9;
          return -Infinity;
        } else if (source.slice(Index, Index + 3) == "NaN") {
          Index += 3;
          return NaN;
        } else if (source.slice(Index, Index + 4) == "null") {
          Index += 4;
          return null;
        }
        // Unrecognized token.
        abort();
      }
    }
    // Return the sentinel `$` character if the parser has reached the end
    // of the source string.
    return "$";
  };

  // Internal: Parses a Kamino `value` token.
  var get = function (value) {
    var results, any, key;
    if (value == "$") {
      // Unexpected end of input.
      abort();
    }
    if (typeof value == "string") {
      if (value[0] == "@") {
        // Remove the sentinel `@` character.
        return value.slice(1);
      }
      // Parse object and array literals.
      if (value == "[") {
        // Parses a Kamino array, returning a new JavaScript array.
        results = [];
        stack[stack.length] = results;
        for (;; any || (any = true)) {
          value = lex();
          // A closing square bracket marks the end of the array literal.
          if (value == "]") {
            break;
          }
          // If the array literal contains elements, the current token
          // should be a comma separating the previous element from the
          // next.
          if (any) {
            if (value == ",") {
              value = lex();
              if (value == "]") {
                // Unexpected trailing `,` in array literal.
                abort();
              }
            } else {
              // A `,` must separate each array element.
              abort();
            }
          }
          // Elisions and leading commas are not permitted.
          if (value == ",") {
            abort();
          }
          results.push(get(typeof value == "string" && charIndexBuggy ? value.split("") : value));
        }
        return results;
      } else if (value == "{") {
        // Parses a Kamino object, returning a new JavaScript object.
        results = {};
        stack[stack.length] = results;
        for (;; any || (any = true)) {
          value = lex();
          // A closing curly brace marks the end of the object literal.
          if (value == "}") {
            break;
          }
          // If the object literal contains members, the current token
          // should be a comma separator.
          if (any) {
            if (value == ",") {
              value = lex();
              if (value == "}") {
                // Unexpected trailing `,` in object literal.
                abort();
              }
            } else {
              // A `,` must separate each object member.
              abort();
            }
          }
          // Leading commas are not permitted, object property names must be
          // double-quoted strings, and a `:` must separate each property
          // name and value.
          if (value == "," || typeof value != "string" || value[0] != "@" || lex() != ":") {
            abort();
          }
          var result = lex();
          results[value.slice(1)] = get(typeof result == "string" && charIndexBuggy ? result.split("") : result);
        }
        return results;
      }
      // Unexpected token encountered.
      abort();
    }
    return value;
  };

  // Internal: Updates a traversed object member.
  var update = function(source, property, callback) {
    var element = walk(source, property, callback);
    if (element === undef) {
      delete source[property];
    } else {
      source[property] = element;
    }
  };

  // Internal: Recursively traverses a parsed Kamino object, invoking the
  // `callback` function for each value. This is an implementation of the
  // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
  var walk = function (source, property, callback) {
    var value = source[property], length;
    if (typeof value == "object" && value) {
      if (getClass.call(value) == "[object Array]") {
        for (length = value.length; length--;) {
          update(value, length, callback);
        }
      } else {
        // `forEach` can't be used to traverse an array in Opera <= 8.54,
        // as `Object#hasOwnProperty` returns `false` for array indices
        // (e.g., `![1, 2, 3].hasOwnProperty("0")`).
        forEach(value, function (property) {
          update(value, property, callback);
        });
      }
    }
    return callback.call(source, property, value);
  };

  // Public: `Kamino.parse`. See ES 5.1 section 15.12.2.
  Kamino.parse = function (source, callback) {
    var result, value;
    Index = 0;
    Source = "" + source;
    stack = [];
    if (charIndexBuggy) {
      Source = source.split("");
    }
    result = get(lex());
    // If a Kamino string contains multiple tokens, it is invalid.
    if (lex() != "$") {
      abort();
    }
    // Reset the parser state.
    Index = Source = null;
    return callback && getClass.call(callback) == "[object Function]" ? walk((value = {}, value[""] = result, value), "", callback) : result;
  };

  Kamino.clone = function(source) {
    return Kamino.parse( Kamino.stringify(source) );
  };
})(this);

(function(root) {
  var self = root,
      Window = self.Window,
      usePoly = false,
      a_slice = [].slice;

  function isFunction(functionToCheck) {
    return functionToCheck && Object.prototype.toString.call(functionToCheck) === '[object Function]';
  }

  function isInWorker() {
    return  typeof Worker === 'undefined' && typeof Window === 'undefined';
  }

  if( usePoly || !self.MessageChannel ) {

    var isWindowToWindowMessage = function( currentTarget ) {
          return typeof window !== "undefined" && self instanceof Window && ( !isFunction(self.Worker) || !(currentTarget instanceof Worker) );
        },
        log = function( message ) {
          if (MessageChannel.verbose) {
            var args = a_slice.apply(arguments);
            args.unshift("MCNP: ");
            console.log.apply(console, args);
          }
        },
        messagePorts = {};

    var MessagePort = self.MessagePort = function( uuid ) {
      this._entangledPortUuid = null;
      this.destinationUrl = null;
      this._listeners = {};
      this._messageQueue = [];
      this._messageQueueEnabled = false;
      this._currentTarget = null;

      this.uuid = uuid || UUID.generate();
      messagePorts[this.uuid] = this;
      this.log("created");
    };

    MessagePort.prototype = {
      start: function() {
        var event,
            self = this;

        // TODO: we have no guarantee that
        // we will not receive and process events in the correct order
        setTimeout( function() {
          self.log('draining ' + self._messageQueue.length + ' queued messages');
          while( self._messageQueueEnabled && (event = self._messageQueue.shift()) ) {
            self.dispatchEvent( event );
          }
        });
        this._messageQueueEnabled = true;
        this.log('started');
      },

      close: function() {
        this._messageQueueEnabled = false;
        if( this._entangledPortUuid ) {
          this._getEntangledPort()._entangledPortUuid = null;
          this._entangledPortUuid = null;

          // /!\ Probably need to send that (?)
        }
      },

      postMessage: function( message ) {
        // Numbers refer to step from the W3C specs. It shows how simplified things are
        // 1- Let target port be the port with which source port is entangled, if any
        var target = this._getEntangledPort(),
            currentTarget = this._currentTarget,
            messageClone;


        // 8- If there is no target port (i.e. if source port is not entangled), then abort these steps.
        if(!target) {
          this.log("not entangled, discarding message", message);
          return;
        }

        // 12- Add the event to the port message queue of target port.
        // As the port is cloned when sent to the other user agent,
        // posting a message can mean different things:
        // * The port is still local, then we need to queue the event
        // * the port has been sent, then we need to send that event
        if( currentTarget ) {
          // 5- Let message clone be the result of obtaining a structured clone of the message argument
          messageClone = MessageChannel.encodeEvent( message, [target], true );

          if( isWindowToWindowMessage( currentTarget ) ) {
            this.log("posting message from window to window", message, this.destinationUrl);
            currentTarget.postMessage(messageClone, this.destinationUrl);
          } else {
            this.log("posting message from or to worker", message);
            currentTarget.postMessage(messageClone);
          }
        } else {
          this.log("not connected, queueing message", message);
          target._enqueueEvent(MessageChannel._messageEvent(message, [target], true));
        }
      },

      addEventListener: function( type, listener ) {
        if (typeof this._listeners[type] === "undefined"){
          this._listeners[type] = [];
        }

        this._listeners[type].push( listener );
      },

      removeEventListener: function( type, listener) {
        if (this._listeners[type] instanceof Array){
          var listeners = this._listeners[type];
          for (var i=0; i < listeners.length; i++){
            if (listeners[i] === listener){
              listeners.splice(i, 1);
              break;
            }
          }
        }
      },

      dispatchEvent: function( event ) {
        var listeners = this._listeners.message;
        if( listeners ) {
          for (var i=0; i < listeners.length; i++){
            listeners[i].call(this, event);
          }
        }
      },

      _enqueueEvent: function( event ) {
        if(this._messageQueueEnabled) {
          this.dispatchEvent( event );
        } else {
          this._messageQueue.push( event );
        }
      },

      _getPort: function( portClone, messageEvent, copyEvents ) {
        var loadPort = function(uuid) {
          var port = messagePorts[uuid] || MessageChannel._createPort(uuid);
          return port;
        };

        var port = loadPort(portClone.uuid);
        port._entangledPortUuid = portClone._entangledPortUuid;
        port._getEntangledPort()._entangledPortUuid = port.uuid;
        port._currentTarget =  messageEvent.source || messageEvent.currentTarget || self;
        if( messageEvent.origin === "null" ) {
          port.destinationUrl = "*";
        } else {
          port.destinationUrl = messageEvent.origin;
        }

        if( copyEvents ) {
          for( var i=0 ; i < portClone._messageQueue.length ; i++ ) {
            port._messageQueue.push( portClone._messageQueue[i] );
          }
        }

        return port;
      },

      _getEntangledPort: function() {
        if( this._entangledPortUuid ) {
          return messagePorts[ this._entangledPortUuid ] || MessageChannel._createPort(this._entangledPortUuid);
        } else {
          return null;
        }
      },

      log: function () {
        if (MessageChannel.verbose) {
          var args = a_slice.apply(arguments);
          args.unshift("Port", this.uuid);
          log.apply(null, args);
        }
      }
    };

    var MessageChannel = self.MessageChannel = function () {
      var port1 = MessageChannel._createPort(),
          port2 = MessageChannel._createPort(),
          channel;

      port1._entangledPortUuid = port2.uuid;
      port2._entangledPortUuid = port1.uuid;

      channel = {
        port1: port1,
        port2: port2
      };

      MessageChannel.log(channel, "created");

      return channel;
    };

    MessageChannel.log = function (_channel) {
      if (MessageChannel.verbose) {
        var args = ["Chnl"],
            msgArgs = a_slice.call(arguments, 1);

        if (_channel.port1 && _channel.port2) {
          args.push(_channel.port1.uuid, _channel.port2.uuid);
        } else {
          _channel.forEach( function(channel) {
            args.push(channel._entangledPortUuid);
          });
        }

        args.push.apply(args, msgArgs);
        log.apply(null, args);
      }
    };

    MessageChannel._createPort = function() {
      var args = arguments,
          MessagePortConstructor = function() {
            return MessagePort.apply(this, args);
          };

      MessagePortConstructor.prototype = MessagePort.prototype;

      return new MessagePortConstructor();
    };

    /**
        Encode the event to be sent.

        messageEvent.data contains a fake Event encoded with Kamino.js

        It contains:
        * data: the content that the MessagePort should send
        * ports: The targeted MessagePorts.
        * messageChannel: this allows to decide if the MessageEvent was meant for the window or the port

        @param {Object} data
        @param {Array} ports
        @param {Boolean} messageChannel
        @returns {String} a string representation of the data to be sent
    */
    MessageChannel.encodeEvent = function( data, ports, messageChannel ) {
      var strippedPorts = new Array(ports.length),
          encodedMessage, messageEvent;

      for (var i = 0; i < ports.length; ++i) {
        strippedPorts[i] = MessageChannel._strippedPort(ports[i]);
      }

      messageEvent = { event: MessageChannel._messageEvent(data, strippedPorts, messageChannel) };
      encodedMessage = Kamino.stringify(messageEvent);

      return encodedMessage;
    };

    MessageChannel._messageEvent = function(data, ports, messageChannel) {
      return  { data: data, ports: ports, messageChannel: messageChannel};
    };

    MessageChannel._strippedPort = function (port) {
      if (!port) { return; }

      var messageQueue = [];
      for (var msg, msgPorts, ports, i = 0; i < port._messageQueue.length; ++i) {
        msg = port._messageQueue[i];
        msgPorts = msg.ports || [];
        ports = [];

        for (var portRef, j = 0; j < msgPorts.length; ++j) {
          portRef = msgPorts[j];
          ports.push({
            uuid: portRef.uuid,
            _entangledPortUuid: portRef._entangledPortUuid
          });
        }
        messageQueue.push({
          data: msg.data,
          messageChannel: msg.messageChannel,
          ports: ports
        });
      }

      return {
        uuid: port.uuid,
        _entangledPortUuid: port._entangledPortUuid,
        _messageQueue: messageQueue
      };
    };

    /**
        Extract the event from the message.

        messageEvent.data contains a fake Event encoded with Kamino.js

        It contains:
        * data: the content that the MessagePort should use
        * ports: The targeted MessagePorts.
        * messageChannel: this allows to decide if the MessageEvent was meant for the window or the port

        @param {MessageEvent} messageEvent
        @param {Boolean} copyEvents: copy or not the events from the cloned port to the local one
        @returns {Object} an object that fakes an event with limited attributes ( data, ports )
    */
    MessageChannel.decodeEvent = function( messageEvent, copyEvents ) {
      var fakeEvent = {
            data: null,
            ports: []
          },
          data = Kamino.parse( messageEvent.data ),
          event = data.event,
          ports = event.ports;

      if( event ) {
        if( ports ) {
          for(var i=0; i< ports.length ; i++) {
            fakeEvent.ports.push( MessagePort.prototype._getPort( ports[i], messageEvent, copyEvents ) );
          }
        }
        fakeEvent.data = event.data;
        fakeEvent.source = messageEvent.source;
        fakeEvent.messageChannel = event.messageChannel;
      }

      return fakeEvent;
    };

    /**
        Extract the event from the message if possible.

        A user agent can received events that are not encoded using Kamino.

        @param {MessageEvent} messageEvent
        @param {Boolean} copyEvents: copy or not the events from the cloned port to the local one
        @returns {Object} an object that fakes an event or the triggered event
    */
    var decodeEvent = function( event, copyEvents ) {
      var messageEvent;

      try {
        messageEvent = MessageChannel.decodeEvent( event, copyEvents );
      } catch( e ) {
        if( e instanceof SyntaxError ) {
          messageEvent = event;
        } else {
          throw e;
        }
      }

      return messageEvent;
    };

    var propagationHandler = function( event ) {
      var messageEvent = decodeEvent( event, true );

      if( messageEvent.messageChannel ) {
        MessageChannel.propagateEvent( messageEvent );
      }
    };

    // Add the default message event handler
    // This is useful so that a user agent can pass ports
    // without declaring any event handler.
    //
    // This handler takes care of copying the events queue passed with a port.
    // We only need to perform this when passing a port between user agents,
    // otherwise the event is passed through `postMessage` and not through the queue
    // and is handled by the port's message listener.
    //
    // Ex:
    //    iFrame1 - iFrame2 - iFrame3
    //    iFrame2 creates a MessageChannel and passes a port to each iframe
    //    we need a default handler to receive MessagePorts' events
    //    and to propagate them
    var _addMessagePortEventHandler = function( target ) {
      if( target.addEventListener ) {
        target.addEventListener( 'message', propagationHandler, false );
      } else if( target.attachEvent ) {
        target.attachEvent( 'onmessage', propagationHandler );
      }
    };

    var _overrideMessageEventListener = function( target ) {
      var originalAddEventListener, addEventListenerName,
          targetRemoveEventListener, removeEventListenerName,
          messageEventType,
          messageHandlers = [];

      if( target.addEventListener ) {
        addEventListenerName = 'addEventListener';
        removeEventListenerName = 'removeEventListener';
        messageEventType = 'message';
      } else if( target.attachEvent ) {
        addEventListenerName = 'attachEvent';
        removeEventListenerName = 'detachEvent';
        messageEventType = 'onmessage';
      }
      originalAddEventListener = target[addEventListenerName];
      targetRemoveEventListener = target[removeEventListenerName];

      target[addEventListenerName] = function() {
        var args = Array.prototype.slice.call( arguments ),
            originalHandler = args[1],
            self = this,
            messageHandlerWrapper;

        if( args[0] === messageEventType ) {
          messageHandlerWrapper = function( event ) {
            var messageEvent = decodeEvent( event );

            if( ! messageEvent.messageChannel ) {
              originalHandler.call( self, messageEvent );
            }
          };
          originalHandler.messageHandlerWrapper = messageHandlerWrapper;

          args[1] = messageHandlerWrapper;
        }

        originalAddEventListener.apply( this, args );
      };

      target[removeEventListenerName] = function() {
        var args = Array.prototype.slice.call( arguments ),
            originalHandler = args[1];

        if( args[0] === messageEventType ) {
          args[1] = originalHandler.messageHandlerWrapper;
          delete originalHandler.messageHandlerWrapper;
        }

        if( args[1] ) {
          targetRemoveEventListener.apply( this, args );
        }
      };
    };


    /**
        Send the event to the targeted ports

        It uses the `messageChannel` attribute to decide
        if the event is meant for the window or MessagePorts

        @param {Object} fakeEvent
    */
    MessageChannel.propagateEvent = function( fakeEvent ) {
      var ports, port, entangledPort;

      if( fakeEvent.messageChannel ) {
        ports = fakeEvent.ports;

        for( var i=0 ; i<ports.length ; i++) {
          port = ports[i];
          entangledPort = port._getEntangledPort();

          if( port._currentTarget && entangledPort._currentTarget ) {
            entangledPort.postMessage( fakeEvent.data );
          } else {
            port._enqueueEvent( fakeEvent );
          }
        }
      }
    };

    MessageChannel.reset = function() {
      messagePorts = {};
    };

    //
    _addMessagePortEventHandler( self );

    /**
        Send the MessagePorts to the other window

        `window.postMessage` doesn't accept fake ports so we have to encode them
        and pass them in the message.

        @param {Object} otherWindow: A reference to another window.
        @param {Object} message: Data to be sent to the other window.
        @param {String} targetOrigin: Specifies what the origin of otherWindow must be for the event to be dispatched.
        @param {Array} ports: MessagePorts that need to be sent to otherWindow.
    */
    if( Window ) {
      Window.postMessage = function( otherWindow, message, targetOrigin, ports ) {
        var data, entangledPort;

        // Internet Explorer requires the `ports` parameter
        ports = ports || [];

        data = MessageChannel.encodeEvent( message, ports, false );

        if( ports ) {
          // We need to know if a port has been sent to another user agent
          // to decide when to queue and when to send messages
          // See `MessageChannel.propagateEvent`
          for( var i=0 ; i<ports.length ; i++) {
            entangledPort = ports[i]._getEntangledPort();
            if( !entangledPort._currentTarget ) {
              entangledPort._currentTarget = otherWindow;
              entangledPort.destinationUrl = targetOrigin;
            }
          }
        }

        MessageChannel.log(ports, "handshake window", otherWindow);
        otherWindow.postMessage(data, targetOrigin);
      };

      // Juggling to find where to override `addEventListener`
      // Firefox 30.0a1 (2014-02-17) adds `addEventListener` on the global object
      // Internet Explorer doesn't allow to override `window.attachEvent`
      var target;
      if( window.addEventListener ) {
        target = window;
      } else if( window.attachEvent ) {
        target = Window.prototype;
      } else {
        throw "We couldn't find a method to attach an event handler.";
      }

      _overrideMessageEventListener( target );
    } else {
      //Worker
      _overrideMessageEventListener( self );
    }

    if( self.Worker ) {
      var OriginalWorker = Worker,
          originalAddEventListener;

      if( OriginalWorker.prototype.addEventListener ) {
        originalAddEventListener = OriginalWorker.prototype.addEventListener;
      } else if( OriginalWorker.prototype.attachEvent ) {
        originalAddEventListener = OriginalWorker.prototype.attachEvent;
      }

      self.Worker = function() {
        var worker = new OriginalWorker(arguments[0]),
            _addEventListener = originalAddEventListener;

        _addEventListener.call(worker, 'message', propagationHandler);

        return worker;
      };
      Worker.prototype = OriginalWorker.prototype;

      _overrideMessageEventListener( Worker.prototype );

    } else if (isInWorker()) {
      self.Worker = { };
    }

    if (self.Worker) {
      self.Worker.postMessage = function( worker, message, transferList )  {
        var data = MessageChannel.encodeEvent( message, transferList, false ),
            entangledPort;

        for( var i=0 ; i<transferList.length ; i++) {
          entangledPort = transferList[i]._getEntangledPort();
          entangledPort._currentTarget = worker;
        }

        MessageChannel.log(transferList, "handshake worker", worker);
        worker.postMessage( data );
      };
    }
  } else {
    if( Window ) {
      Window.postMessage = function( source, message, targetOrigin, ports ) {
        // Internet Explorer requires the `ports` parameter
        ports = ports || [];
        source.postMessage( message, targetOrigin, ports );
      };
    } else {
      // Web worker
      self.Worker = {
        postMessage: function( worker, message, transferList ) {
          worker.postMessage( message, transferList );
        }
      };
    }

    if( self.Worker ) {
      self.Worker.postMessage = function( worker, message, transferList )  {
        worker.postMessage( message, transferList);
      };
    }
  }
})(this);

define("oasis",
  ["oasis/util","oasis/xhr","oasis/connect","rsvp","oasis/logger","oasis/version","oasis/config","oasis/sandbox","oasis/sandbox_init","oasis/events","oasis/service","oasis/iframe_adapter","oasis/webworker_adapter","oasis/inline_adapter"],
  function(__dependency1__, __dependency2__, __dependency3__, RSVP, logger, Version, OasisConfiguration, Sandbox, autoInitializeSandbox, Events, Service, IframeAdapter, WebworkerAdapter, InlineAdapter) {
    "use strict";
    var assert = __dependency1__.assert;
    var delegate = __dependency1__.delegate;
    var xhr = __dependency2__.xhr;
    var connect = __dependency3__.connect;
    var connectCapabilities = __dependency3__.connectCapabilities;
    var portFor = __dependency3__.portFor;



    function Oasis() {
      // Data structures used by Oasis when creating sandboxes
      this.packages = {};
      this.requestId = 0;
      this.oasisId = 'oasis' + (+new Date());

      this.consumers = {};
      this.services = [];

      // Data structures used when connecting to a parent sandbox
      this.ports = {};
      this.handlers = {};

      this.receivedPorts = false;

      this.configuration = new OasisConfiguration();
      this.events = new Events();

      this.didCreate();
    }

    Oasis.Version = Version;
    Oasis.Service = Oasis.Consumer = Service;
    Oasis.RSVP = RSVP;

    Oasis.reset = function () {
      Oasis.adapters = {
        iframe: new IframeAdapter(),
        webworker: new WebworkerAdapter(),
        inline: new InlineAdapter()
      };
    };

    Oasis.reset();

    Oasis.prototype = {
      logger: logger,
      log: function () {
        this.logger.log.apply(this.logger, arguments);
      },

      on: delegate('events', 'on'),
      off: delegate('events', 'off'),
      trigger: delegate('events', 'trigger'),

      didCreate: function() {},

      xhr: xhr,

      /**
        This is the entry point that allows the containing environment to create a
        child sandbox.

        Options:

        * `capabilities`: an array of registered services
        * `url`: a registered URL to a JavaScript file that will initialize the
          sandbox in the sandboxed environment
        * `adapter`: a reference to an adapter that will handle the lifecycle
          of the sandbox. Right now, there are iframe and web worker adapters.

        @param {Object} options
      */
      createSandbox: function (options) {
        return new Sandbox(this, options);
      },

      /**
        This registers a sandbox type inside of the containing environment so that
        it can be referenced by URL in `createSandbox`.

        Options:

        * `capabilities`: An array of service names that will be supplied when calling
          `createSandbox`
        * `url`: The URL of the JavaScript file that contains the sandbox code

        @param {Object} options
      */
      register: function (options) {
        assert(options.capabilities, "You are trying to register a package without any capabilities. Please provide a list of requested capabilities, or an empty array ([]).");

        this.packages[options.url] = options;
      },

      configure: function(name, value) { this.configuration[name] = value; },
      autoInitializeSandbox: autoInitializeSandbox,

      connect: connect,
      connectCapabilities: connectCapabilities,
      portFor: portFor
    };



    return Oasis;
  });
define("oasis/base_adapter",
  ["oasis/util","oasis/shims","oasis/connect","oasis/message_channel","rsvp","oasis/logger"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, RSVP, Logger) {
    "use strict";
    var mustImplement = __dependency1__.mustImplement;
    var addEventListener = __dependency2__.addEventListener;
    var removeEventListener = __dependency2__.removeEventListener;
    var a_indexOf = __dependency2__.a_indexOf;
    var a_filter = __dependency2__.a_filter;
    var connectCapabilities = __dependency3__.connectCapabilities;
    var PostMessageMessageChannel = __dependency4__.PostMessageMessageChannel;



    function BaseAdapter() {
      this._unsupportedCapabilities = [];
    }

    BaseAdapter.prototype = {
      initializeSandbox: mustImplement('BaseAdapter', 'initializeSandbox'),
      name: mustImplement('BaseAdapter', 'name'),

      unsupportedCapabilities: function () {
        return this._unsupportedCapabilities;
      },

      addUnsupportedCapability: function (capability) {
        this._unsupportedCapabilities.push(capability);
      },

      filterCapabilities: function(capabilities) {
        var unsupported = this._unsupportedCapabilities;
        return a_filter.call(capabilities, function (capability) {
          var index = a_indexOf.call(unsupported, capability);
          return index === -1;
        });
      },

      createChannel: function(oasis) {
        var channel = new PostMessageMessageChannel(oasis);
        channel.port1.start();
        return channel;
      },

      environmentPort: function(sandbox, channel) {
        return channel.port1;
      },

      sandboxPort: function(sandbox, channel) {
        return channel.port2;
      },

      proxyPort: function(sandbox, port) {
        return port;
      },

      connectSandbox: function (receiver, oasis) {
        var adapter = this;

        Logger.log("Sandbox listening for initialization message");

        function initializeOasisSandbox(event) {
          if (!event.data.isOasisInitialization) { return; }

          removeEventListener(receiver, 'message', initializeOasisSandbox);
          adapter.initializeOasisSandbox(event, oasis);
        }
        addEventListener(receiver, 'message', initializeOasisSandbox);

        adapter.oasisLoaded(oasis);
      },

      initializeOasisSandbox: function (event, oasis) {
        var adapter = this;
        oasis.configuration.eventCallback(function () {
          Logger.log("sandbox: received initialization message.");

          oasis.connectCapabilities(event.data.capabilities, event.ports);

          adapter.didConnect(oasis);
        });
      },

      createInitializationMessage: function (sandbox) {
        return {
          isOasisInitialization: true,
          capabilities: sandbox._capabilitiesToConnect,
        };
      },

      oasisLoadedMessage: "oasisSandboxLoaded",
      sandboxInitializedMessage:  "oasisSandboxInitialized"
    };


    return BaseAdapter;
  });
define("oasis/config",
  [],
  function() {
    "use strict";
    /**
      Stores Oasis configuration.  Options include:

      - `eventCallback` - a function that wraps `message` event handlers.  By
        default the event hanlder is simply invoked.
      - `allowSameOrigin` - a card can be hosted on the same domain
      - `reconnect` - the default reconnect options for iframe sandboxes.  Possible values are:
        - "none" - do not allow sandbox reconnection
        - "verify" - only allow reconnections from the original origin of the sandbox
        - "any" - allow any sandbox reconnections.  Only use this setting if you are
          using Oasis strictly for isolation of trusted applications or if it's safe
          to connect your sandbox to arbitrary origins.  This is an advanced setting
          and should be used with care.
    */
    function OasisConfiguration() {
      this.eventCallback = function (callback) { callback(); };
      this.allowSameOrigin = false;
      this.reconnect = 'verify';
    }


    return OasisConfiguration;
  });
define("oasis/connect",
  ["oasis/util","oasis/shims","oasis/message_channel","rsvp","oasis/logger","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, RSVP, Logger, __exports__) {
    "use strict";
    var assert = __dependency1__.assert;
    var a_forEach = __dependency2__.a_forEach;
    var PostMessagePort = __dependency3__.PostMessagePort;


    function registerHandler(oasis, capability, options) {
      var port = oasis.ports[capability];

      if (port) {
        Logger.log(oasis.oasisId, "sandbox: found port, setting up '" + capability + "'");
        options.setupCapability(port);

        if (options.promise) {
          options.promise.then(function() {
            port.start();
          })['catch'](RSVP.rethrow);
        } else {
          port.start();
        }
      } else if (!oasis.receivedPorts) {
        Logger.log("No port found, saving handler for '" + capability + "'");
        oasis.handlers[capability] = options;
      } else {
        Logger.log("No port was sent for capability '" + capability + "'");
        options.rejectCapability();
      }
    }

    /**
      This is the main entry point that allows sandboxes to connect back
      to their containing environment.

      It can be called either with a set of named consumers, with callbacks, or using promises.

      Example

        // Using promises
        Oasis.connect('foo').then( function (port) {
          port.send('hello');
        }, function () {
          // error
        });


        // using callbacks
        Oasis.connect('foo', function (port) {
          port.send('hello');
        }, errorHandler);


        // connecting several consumers at once.
        var ConsumerA = Oasis.Consumer.extend({
          initialize: function (port) { this.port = port; },

          error: function () { }
        });

        var ConsumerB = Oasis.Consumer.extend({
          initialize: function (port) { this.port = port; },

          error: function () { }
        });

        Oasis.connect({
          consumers: {
            capabilityA: ConsumerA,
            capabilityB: ConsumerB
          }
        });

      @param {String} capability the name of the service to connect to, or an object
        containing named consumers to connect.
      @param {Function?} callback the callback to trigger once the other
        side of the connection is available.
      @param {Function?} errorCallback the callback to trigger if the capability is
        not provided by the environment.
      @return {Promise} a promise that will be resolved once the other
        side of the connection is available. You can use this instead
        of the callbacks.
    */
    function connect(capability, callback, errorCallback) {
      if (typeof capability === 'object') {
        return connectConsumers(this, capability.consumers);
      } else if (callback) {
        return connectCallbacks(this, capability, callback, errorCallback);
      } else {
        return connectPromise(this, capability);
      }
    }

    function connectCapabilities(capabilities, eventPorts) {
      var oasis = this;
      a_forEach.call(capabilities, function(capability, i) {
        var handler = oasis.handlers[capability],
            port = new PostMessagePort(oasis, eventPorts[i]);

        if (handler) {
          Logger.log("Invoking handler for '" + capability + "'");

          RSVP.resolve(handler.setupCapability(port)).then(function () {
            port.start();
          })['catch'](RSVP.rethrow);
        }

        oasis.ports[capability] = port;
      });

      // for each handler w/o capability, reject
      for( var prop in oasis.handlers ) {
        if( ! oasis.ports[prop] ) {
          oasis.handlers[prop].rejectCapability();
        }
      }

      this.receivedPorts = true;
    }

    function portFor(capability) {
      var port = this.ports[capability];
      assert(port, "You asked for the port for the '" + capability + "' capability, but the environment did not provide one.");
      return port;
    }


    function connectConsumers(oasis, consumers) {
      function setupCapability(Consumer, name) {
        return function(port) {
          var consumer = new Consumer(port);
          oasis.consumers[name] = consumer;
          consumer.initialize(port, name);
        };
      }

      function rejectCapability(prop) {
        return function () {
          consumers[prop].prototype.error();
        };
      }

      for (var prop in consumers) {
        registerHandler(oasis, prop, {
          setupCapability: setupCapability(consumers[prop], prop),
          rejectCapability: rejectCapability(prop)
        });
      }
    }

    function connectCallbacks(oasis, capability, callback, errorCallback) {
      Logger.log("Connecting to '" + capability + "' with callback.");

      registerHandler(oasis, capability, {
        setupCapability: function(port) {
          callback(port);
        },
        rejectCapability: function () {
          if (errorCallback) {
            errorCallback();
          }
        }
      });
    }

    function connectPromise(oasis, capability) {
      Logger.log("Connecting to '" + capability + "' with promise.");

      var defered = RSVP.defer();
      registerHandler(oasis, capability, {
        promise: defered.promise,
        setupCapability: function(port) {
          defered.resolve(port);
          return defered.promise;
        },
        rejectCapability: function () {
          defered.reject();
        }
      });
      return defered.promise;
    }

    __exports__.registerHandler = registerHandler;
    __exports__.connect = connect;
    __exports__.connectCapabilities = connectCapabilities;
    __exports__.portFor = portFor;
  });
define("oasis/events",
  [],
  function() {
    "use strict";
    var a_slice = Array.prototype.slice;

    function Events() {
      this.listenerArrays = {};
    }

    Events.prototype = {
      on: function (eventName, listener) {
        var listeners = this.listenerArrays[eventName] = this.listenerArrays[eventName] || [];

        listeners.push(listener);
      },

      off: function (eventName, listener) {
        var listeners = this.listenerArrays[eventName];
        if (!listeners) { return; }

        for (var i=0; i<listeners.length; ++i) {
          if (listeners[i] === listener) {
            listeners.splice(i, 1);
            break;
          }
        }
      },

      clear: function(eventName) {
        delete this.listenerArrays[eventName];
      },

      trigger: function(eventName) {
        var listeners = this.listenerArrays[eventName];
        if (!listeners) { return; }

        var args = a_slice.call(arguments, 1);

        for (var i=0; i<listeners.length; ++i) {
          listeners[i].apply(null, args);
        }
      }
    };


    return Events;
  });
define("oasis/iframe_adapter",
  ["oasis/util","oasis/shims","rsvp","oasis/logger","oasis/base_adapter"],
  function(__dependency1__, __dependency2__, RSVP, Logger, BaseAdapter) {
    "use strict";
    var assert = __dependency1__.assert;
    var extend = __dependency1__.extend;
    var a_forEach = __dependency2__.a_forEach;
    var addEventListener = __dependency2__.addEventListener;
    var removeEventListener = __dependency2__.removeEventListener;
    var a_map = __dependency2__.a_map;
    /*global Window, UUID */



    function verifySandbox(oasis, sandboxUrl) {
      if (oasis.configuration.sandboxed === false) { return; }
      var iframe = document.createElement('iframe'),
          link;

      if( (oasis.configuration.allowSameOrigin && iframe.sandbox !== undefined) ||
          (iframe.sandbox === undefined) ) {
        // The sandbox attribute isn't supported (IE8/9) or we want a child iframe
        // to access resources from its own domain (youtube iframe),
        // we need to make sure the sandbox is loaded from a separate domain
        link = document.createElement('a');
        link.href = sandboxUrl;

        if( !link.host || (link.protocol === window.location.protocol && link.host === window.location.host) ) {
          throw new Error("Security: iFrames from the same host cannot be sandboxed in older browsers and is disallowed.  " +
                          "For HTML5 browsers supporting the `sandbox` attribute on iframes, you can add the `allow-same-origin` flag" +
                          "only if you host the sandbox on a separate domain.");
        }
      }
    }

    function verifyCurrentSandboxOrigin(sandbox, event) {
      var linkOriginal, linkCurrent;

      if (sandbox.firstLoad || sandbox.options.reconnect === "any") {
        return true;
      }

      if (!sandbox.oasis.configuration.allowSameOrigin || event.origin === "null") {
        fail();
      } else {
        linkOriginal = document.createElement('a');
        linkCurrent = document.createElement('a');

        linkOriginal.href = sandbox.options.url;
        linkCurrent.href = event.origin;

        if (linkCurrent.protocol === linkOriginal.protocol &&
            linkCurrent.host === linkOriginal.host) {
          return true;
        }

        fail();
      }

      function fail() {
        sandbox.onerror(
          new Error("Cannot reconnect null origins unless `reconnect` is set to " +
                    "'any'.  `reconnect: 'verify' requires `allowSameOrigin: " +
                    "true`"));
      }
    }

    function isUrl(s) {
      var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
      return regexp.test(s);
    }

    var IframeAdapter = extend(BaseAdapter, {
      //-------------------------------------------------------------------------
      // Environment API

      initializeSandbox: function(sandbox) {
        var options = sandbox.options,
            iframe = document.createElement('iframe');

        if(sandbox.oasis.configuration.sandboxed !== false) {
          var sandboxAttributes = ['allow-scripts'];

          if( sandbox.oasis.configuration.allowSameOrigin ) {
            sandboxAttributes.push('allow-same-origin');
          }
          if( options && options.sandbox && options.sandbox.popups ) {
            sandboxAttributes.push('allow-popups');
          }
          iframe.sandbox = sandboxAttributes.join(' ');
        }
        iframe.name = sandbox.options.url + '?uuid=' + UUID.generate();
        iframe.seamless = true;

        // rendering-specific code
        if (options.width) {
          iframe.width = options.width;
        } else if (options.height) {
          iframe.height = options.height;
        }

        // Error handling inside the iFrame
        iframe.errorHandler = function(event) {
          if(!event.data.sandboxException) {return;}
          try {
            // verify this message came from the expected sandbox; try/catch
            // because ie8 will disallow reading contentWindow in the case of
            // another sandbox's message
            if( event.source !== iframe.contentWindow ) {return;}
          } catch(e) {
            return;
          }

          sandbox.onerror( event.data.sandboxException );
        };
        addEventListener(window, 'message', iframe.errorHandler);

        verifySandbox( sandbox.oasis, sandbox.options.url );
        iframe.src = sandbox.options.url;

        Logger.log('Initializing sandbox ' + iframe.name);

        // Promise that sandbox has loaded and capabilities connected at least once.
        // This does not mean that the sandbox will be loaded & connected in the
        // face of reconnects (eg pages that navigate)
        sandbox._waitForLoadDeferred().resolve(new RSVP.Promise( function(resolve, reject) {
          iframe.initializationHandler = function (event) {
            if( event.data !== sandbox.adapter.sandboxInitializedMessage ) {return;}
            try {
              // verify this message came from the expected sandbox; try/catch
              // because ie8 will disallow reading contentWindow in the case of
              // another sandbox's message
              if( event.source !== iframe.contentWindow ) {return;}
            } catch(e) {
              return;
            }
            removeEventListener(window, 'message', iframe.initializationHandler);

            sandbox.oasis.configuration.eventCallback(function () {
              Logger.log("container: iframe sandbox has initialized (capabilities connected)");
              resolve(sandbox);
            });
          };
          addEventListener(window, 'message', iframe.initializationHandler);
        }));

        sandbox.el = iframe;

        iframe.oasisLoadHandler = function (event) {
          if( event.data !== sandbox.adapter.oasisLoadedMessage ) {return;}
          try {
            // verify this message came from the expected sandbox; try/catch
            // because ie8 will disallow reading contentWindow in the case of
            // another sandbox's message
            if( event.source !== iframe.contentWindow ) {return;}
          } catch(e) {
            return;
          }

          Logger.log("container: iframe sandbox has loaded Oasis");


          if (verifyCurrentSandboxOrigin(sandbox, event)) {
            sandbox.createAndTransferCapabilities();
          }

          if (sandbox.options.reconnect === "none") {
            removeEventListener(window, 'message', iframe.oasisLoadHandler);
          }
        };
        addEventListener(window, 'message', iframe.oasisLoadHandler);
      },

      startSandbox: function(sandbox) {
        var head = document.head || document.documentElement.getElementsByTagName('head')[0];
        head.appendChild(sandbox.el);
      },

      terminateSandbox: function(sandbox) {
        var el = sandbox.el;

        sandbox.terminated = true;

        if (el.loadHandler) {
          // no load handler for HTML sandboxes
          removeEventListener(el, 'load', el.loadHandler);
        }
        removeEventListener(window, 'message', el.initializationHandler);
        removeEventListener(window, 'message', el.oasisLoadHandler);

        if (el.parentNode) {
          Logger.log("Terminating sandbox ", sandbox.el.name);
          el.parentNode.removeChild(el);
        }

        sandbox.el = null;
      },

      connectPorts: function(sandbox, ports) {
        var rawPorts = a_map.call(ports, function(port) { return port.port; }),
            message = this.createInitializationMessage(sandbox);

        if (sandbox.terminated) { return; }
        Window.postMessage(sandbox.el.contentWindow, message, '*', rawPorts);
      },

      //-------------------------------------------------------------------------
      // Sandbox API

      connectSandbox: function(oasis) {
        return BaseAdapter.prototype.connectSandbox.call(this, window, oasis);
      },

      oasisLoaded: function() {
        window.parent.postMessage(this.oasisLoadedMessage, '*', []);
      },

      didConnect: function() {
        window.parent.postMessage(this.sandboxInitializedMessage, '*', []);
      },

      name: function(sandbox) {
        return sandbox.el.name;
      }

    });


    return IframeAdapter;
  });
define("oasis/inline_adapter",
  ["oasis/util","oasis/config","oasis/shims","oasis/xhr","rsvp","oasis/logger","oasis/base_adapter"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, RSVP, Logger, BaseAdapter) {
    "use strict";
    var assert = __dependency1__.assert;
    var extend = __dependency1__.extend;
    var noop = __dependency1__.noop;
    var configuration = __dependency2__.configuration;
    var a_forEach = __dependency3__.a_forEach;
    var a_map = __dependency3__.a_map;
    var xhr = __dependency4__.xhr;
    /*global self, postMessage, importScripts */



    var InlineAdapter = extend(BaseAdapter, {
      //-------------------------------------------------------------------------
      // Environment API

      initializeSandbox: function(sandbox) {
        sandbox.el = document.createElement('div');

        var oasis = sandbox.sandboxedOasis = new Oasis();
        sandbox.sandboxedOasis.sandbox = sandbox;
        RSVP.async(function () {
          sandbox.createAndTransferCapabilities();
        });
      },
 
      startSandbox: function(sandbox) {
        var body = document.body || document.documentElement.getElementsByTagName('body')[0];
        body.appendChild(sandbox.el);
      },

      terminateSandbox: function(sandbox) {
        var el = sandbox.el;

        if (el.parentNode) {
          Logger.log("Terminating sandbox ", sandbox.el.name);
          el.parentNode.removeChild(el);
        }

        sandbox.el = null;
      },

      connectPorts: function(sandbox, ports) {
        var rawPorts = a_map.call(ports, function(oasisPort){ return oasisPort.port; }),
            message = this.createInitializationMessage(sandbox),
            event = { data: message, ports: rawPorts };

        // Normally `connectSandbox` is called in autoinitialization, but there
        // isn't a real sandbox here.
        this.connectSandbox(sandbox.sandboxedOasis, event);
      },

      fetchResource: function (url, oasis) {
        var adapter = this;

        return xhr(url, {
          dataType: 'text'
        }, oasis).then(function (code) {
          return adapter.wrapResource(code);
        })['catch'](RSVP.rethrow);
      },

      wrapResource: function (code) {
        return new Function("oasis", code);
      },

      //-------------------------------------------------------------------------
      // Sandbox API

      connectSandbox: function(oasis, pseudoEvent) {
        return this.initializeOasisSandbox(pseudoEvent, oasis);
      },

      oasisLoaded: noop,

      didConnect: function(oasis) {
        var adapter = this;

        return oasis.sandbox._waitForLoadDeferred().resolve(loadSandboxJS()['catch'](RSVP.rethrow));

        function applySandboxJS(sandboxFn) {
          Logger.log("sandbox: inline sandbox initialized");
          sandboxFn(oasis);
          return oasis.sandbox;
        }

        function loadSandboxJS() {
          return new RSVP.Promise(function (resolve, reject) {
            resolve(adapter.fetchResource(oasis.sandbox.options.url, oasis).
              then(applySandboxJS));
          });
        }
      },
    });


    return InlineAdapter;
  });
define("oasis/logger",
  [],
  function() {
    "use strict";
    function Logger() {
      this.enabled = false;
    }

    Logger.prototype = {
      enable: function () {
        this.enabled = true;
      },

      disable: function () {
        this.enabled = false;
      },

      log: function () {
        if (logger.enabled) {
          if (typeof console !== 'undefined' && typeof console.log === 'function') {
            console.log.apply(console, arguments);
          } else if (typeof console !== 'undefined' && typeof console.log === 'object') {
            // Log in IE
            try {
              switch (arguments.length) {
                case 1:
                  console.log(arguments[0]);
                  break;
                case 2:
                  console.log(arguments[0], arguments[1]);
                  break;
                default:
                  console.log(arguments[0], arguments[1], arguments[2]);
              }
            } catch(e) {}
          }
        }
      }
    };

    var logger = new Logger();


    return logger;
  });
define("oasis/message_channel",
  ["oasis/util","rsvp","exports"],
  function(__dependency1__, RSVP, __exports__) {
    "use strict";
    var extend = __dependency1__.extend;
    var mustImplement = __dependency1__.mustImplement;

    /**
      OasisPort is an interface that adapters can use to implement ports.
      Ports are passed into the `initialize` method of services and consumers,
      and are available as `this.port` on services and consumers.

      Ports are the low-level API that can be used to communicate with the
      other side of a connection. In general, you will probably want to use
      the `events` and `requests` objects inside your service or consumer
      rather than manually listen for events and requests.

      @constructor
      @param {OasisPort} oasis
      @param {OasisPort} port
    */
    function OasisPort(oasis, port) {}


    function getRequestId(oasis) {
      return oasis.oasisId + '-' + oasis.requestId++;
    }

    OasisPort.prototype = {
      /**
        This allows you to register an event handler for a particular event
        name.

        @param {String} eventName the name of the event
        @param {Function} callback the callback to call when the event occurs
        @param {any?} binding an optional value of `this` inside of the callback
      */
      on: mustImplement('OasisPort', 'on'),

      /**
        Allows you to register an event handler that is called for all events
        that are sent to the port.
      */
      all: mustImplement('OasisPort', 'all'),

      /**
        This allows you to unregister an event handler for an event name
        and callback. You should not pass in the optional binding.

        @param {String} eventName the name of the event
        @param {Function} callback a reference to the callback that was
          passed into `.on`.
      */
      off: mustImplement('OasisPort', 'off'),

      /**
        This method sends an event to the other side of the connection.

        @param {String} eventName the name of the event
        @param {Structured?} data optional data to pass along with the event
      */
      send: mustImplement('OasisPort', 'send'),

      /**
        @private

        Adapters should implement this to start receiving messages from the
        other side of the connection.

        It is up to the adapter to make sure that no messages are dropped if
        they are sent before `start` is called.
      */
      start: mustImplement('OasisPort', 'start'),

      /**
        @private

        Adapters should implement this to stop receiving messages from the
        other side of the connection.
      */
      close: mustImplement('OasisPort', 'close'),

      /**
        This method sends a request to the other side of the connection.

        @param {String} requestName the name of the request
        @return {Promise} a promise that will be resolved with the value
          provided by the other side of the connection, or rejected if the other
          side indicates retrieving the value resulted in an error. The fulfillment
          value must be structured data.
      */
      request: function(eventName) {
        var oasis = this.oasis;
        var port = this;
        var args = [].slice.call(arguments, 1);

        return new RSVP.Promise(function (resolve, reject) {
          var requestId = getRequestId(oasis);

          var clearObservers = function () {
            port.off('@response:' + eventName, observer);
            port.off('@errorResponse:' + eventName, errorObserver);
          };

          var observer = function(event) {
            if (event.requestId === requestId) {
              clearObservers();
              resolve(event.data);
            }
          };

          var errorObserver = function (event) {
            if (event.requestId === requestId) {
              clearObservers();
              reject(event.data);
            }
          };

          port.on('@response:' + eventName, observer, port);
          port.on('@errorResponse:' + eventName, errorObserver, port);
          port.send('@request:' + eventName, { requestId: requestId, args: args });
        });
      },

      /**
        This method registers a callback to be called when a request is made
        by the other side of the connection.

        The callback will be called with any arguments passed in the request.  It
        may either return a value directly, or return a promise if the value must be
        retrieved asynchronously.

        Examples:

          // This completes the request immediately.
          service.onRequest('name', function () {
            return 'David';
          });


          // This completely the request asynchronously.
          service.onRequest('name', function () {
            return new Oasis.RSVP.Promise(function (resolve, reject) {
              setTimeout( function() {
                resolve('David');
              }, 200);
            });
          });

        @param {String} requestName the name of the request
        @param {Function} callback the callback to be called when a request
          is made.
        @param {any?} binding the value of `this` in the callback
      */
      onRequest: function(eventName, callback, binding) {
        var self = this;

        this.on('@request:' + eventName, function(data) {
          var requestId = data.requestId,
              args = data.args,
              getResponse = new RSVP.Promise(function (resolve, reject) {
                var value = callback.apply(binding, data.args);
                if (undefined !== value) {
                  resolve(value);
                } else {
                  reject("@request:" + eventName + " [" + data.requestId + "] did not return a value.  If you want to return a literal `undefined` return `RSVP.resolve(undefined)`");
                }
              });

          getResponse.then(function (value) {
            self.send('@response:' + eventName, {
              requestId: requestId,
              data: value
            });
          }, function (error) {
            var value = error;
            if (error instanceof Error) {
              value = {
                message: error.message,
                stack: error.stack
              };
            }
            self.send('@errorResponse:' + eventName, {
              requestId: requestId,
              data: value
            });
          });
        });
      }
    };


    function OasisMessageChannel(oasis) {}

    OasisMessageChannel.prototype = {
      start: mustImplement('OasisMessageChannel', 'start')
    };


    var PostMessageMessageChannel = extend(OasisMessageChannel, {
      initialize: function(oasis) {
        this.channel = new MessageChannel();
        this.port1 = new PostMessagePort(oasis, this.channel.port1);
        this.port2 = new PostMessagePort(oasis, this.channel.port2);
      },

      start: function() {
        this.port1.start();
        this.port2.start();
      },

      destroy: function() {
        this.port1.close();
        this.port2.close();
        delete this.port1;
        delete this.port2;
        delete this.channel;
      }
    });

    var PostMessagePort = extend(OasisPort, {
      initialize: function(oasis, port) {
        this.oasis = oasis;
        this.port = port;
        this._callbacks = [];
      },

      on: function(eventName, callback, binding) {
        var oasis = this.oasis;

        function wrappedCallback(event) {
          if (event.data.type === eventName) {
            oasis.configuration.eventCallback(function () {
              return callback.call(binding, event.data.data);
            });
          }
        }

        this._callbacks.push([callback, wrappedCallback]);
        this.port.addEventListener('message', wrappedCallback);
      },

      all: function(callback, binding) {
        var oasis = this.oasis;

        function wrappedCallback(event) {
          oasis.configuration.eventCallback(function () {
            callback.call(binding, event.data.type, event.data.data);
          });
        }

        this.port.addEventListener('message', wrappedCallback);
      },

      off: function(eventName, callback) {
        var foundCallback;

        for (var i=0, l=this._callbacks.length; i<l; i++) {
          foundCallback = this._callbacks[i];
          if (foundCallback[0] === callback) {
            this.port.removeEventListener('message', foundCallback[1]);
          }
        }
      },

      send: function(eventName, data) {
        this.port.postMessage({
          type: eventName,
          data: data
        });
      },

      start: function() {
        this.port.start();
      },

      close: function() {
        var foundCallback;

        for (var i=0, l=this._callbacks.length; i<l; i++) {
          foundCallback = this._callbacks[i];
          this.port.removeEventListener('message', foundCallback[1]);
        }
        this._callbacks = [];

        this.port.close();
      }
    });

    __exports__.OasisPort = OasisPort;
    __exports__.PostMessageMessageChannel = PostMessageMessageChannel;
    __exports__.PostMessagePort = PostMessagePort;
  });
define("oasis/sandbox",
  ["oasis/util","oasis/shims","oasis/message_channel","rsvp","oasis/logger"],
  function(__dependency1__, __dependency2__, __dependency3__, RSVP, Logger) {
    "use strict";
    var assert = __dependency1__.assert;
    var uniq = __dependency1__.uniq;
    var reverseMerge = __dependency1__.reverseMerge;
    var a_forEach = __dependency2__.a_forEach;
    var a_reduce = __dependency2__.a_reduce;
    var a_filter = __dependency2__.a_filter;
    var OasisPort = __dependency3__.OasisPort;


    var OasisSandbox = function(oasis, options) {
      options = reverseMerge(options || {}, {
        reconnect: oasis.configuration.reconnect
      });

      var reconnect = options.reconnect;
      assert( reconnect === "none" || reconnect === "verify" || reconnect === "any",
              "`reconnect` must be one of 'none', 'verify' or 'any'.  '" + reconnect + "' is invalid.");

      this.connections = {};
      this.wiretaps = [];

      this.oasis = oasis;

      // Generic capabilities code
      var pkg = oasis.packages[options.url];

      var capabilities = options.capabilities;
      if (!capabilities) {
        assert(pkg, "You are trying to create a sandbox from an unregistered URL without providing capabilities. Please use Oasis.register to register your package or pass a list of capabilities to createSandbox.");
        capabilities = pkg.capabilities;
      }

      pkg = pkg || {};

      this.adapter = options.adapter || Oasis.adapters.iframe;

      this._capabilitiesToConnect = this._filterCapabilities(capabilities);
      this.envPortDefereds = {};
      this.sandboxPortDefereds = {};
      this.channels = {};
      this.capabilities = {};
      this.options = options;
      this.firstLoad = true;

      var sandbox = this;
      this.promisePorts();
      this.adapter.initializeSandbox(this);
    };

    OasisSandbox.prototype = {
      waitForLoad: function () {
        return this._waitForLoadDeferred().promise;
      },

      wiretap: function(callback) {
        this.wiretaps.push(callback);
      },

      connect: function(capability) {
        var portPromise = this.envPortDefereds[capability].promise;

        assert(portPromise, "Connect was called on '" + capability + "' but no such capability was registered.");

        return portPromise;
      },

      createAndTransferCapabilities: function () {
        if (!this.firstLoad) { this.promisePorts(); }

        this.createChannels();
        this.connectPorts();

        // subsequent calls to `createAndTransferCapabilities` requires new port promises
        this.firstLoad = false;
      },

      promisePorts: function () {
        a_forEach.call(this._capabilitiesToConnect, function(capability) {
          this.envPortDefereds[capability] = RSVP.defer();
          this.sandboxPortDefereds[capability] = RSVP.defer();
        }, this);
      },

      createChannels: function () {
        var sandbox = this,
            services = this.options.services || {},
            channels = this.channels;
        a_forEach.call(this._capabilitiesToConnect, function (capability) {

          Logger.log("container: Will create port for '" + capability + "'");
          var service = services[capability],
              channel, port;

          // If an existing port is provided, just
          // pass it along to the new sandbox.

          // TODO: This should probably be an OasisPort if possible
          if (service instanceof OasisPort) {
            port = this.adapter.proxyPort(this, service);
            this.capabilities[capability] = service;
          } else {
            channel = channels[capability] = this.adapter.createChannel(sandbox.oasis);

            var environmentPort = this.adapter.environmentPort(this, channel),
                sandboxPort = this.adapter.sandboxPort(this, channel);

            Logger.log("container: Wiretapping '" + capability + "'");

            environmentPort.all(function(eventName, data) {
              a_forEach.call(this.wiretaps, function(wiretap) {
                wiretap(capability, {
                  type: eventName,
                  data: data,
                  direction: 'received'
                });
              });
            }, this);

            a_forEach.call(this.wiretaps, function(wiretap) {
              var originalSend = environmentPort.send;

              environmentPort.send = function(eventName, data) {
                wiretap(capability, {
                  type: eventName,
                  data: data,
                  direction: 'sent'
                });

                originalSend.apply(environmentPort, arguments);
              };
            });

            if (service) {
              Logger.log("container: Creating service for '" + capability + "'");
              /*jshint newcap:false*/
              // Generic
              service = new service(environmentPort, this);
              service.initialize(environmentPort, capability);
              sandbox.oasis.services.push(service);
              this.capabilities[capability] = service;
            }

            // Law of Demeter violation
            port = sandboxPort;

            this.envPortDefereds[capability].resolve(environmentPort);
          }

          Logger.log("container: Port created for '" + capability + "'");
          this.sandboxPortDefereds[capability].resolve(port);
        }, this);
      },

      destroyChannels: function() {
        for( var prop in this.channels ) {
          this.channels[prop].destroy();
          delete this.channels[prop];
        }
        this.channels = [];
      },

      connectPorts: function () {
        var sandbox = this;

        var allSandboxPortPromises = a_reduce.call(this._capabilitiesToConnect, function (accumulator, capability) {
          return accumulator.concat(sandbox.sandboxPortDefereds[capability].promise);
        }, []);

        RSVP.all(allSandboxPortPromises).then(function (ports) {
          Logger.log("container: All " + ports.length + " ports created.  Transferring them.");
          sandbox.adapter.connectPorts(sandbox, ports);
        })['catch'](RSVP.rethrow);
      },

      start: function(options) {
        this.adapter.startSandbox(this, options);
      },

      terminate: function() {
        var sandbox = this,
            channel,
            environmentPort;

        if( this.isTerminated ) { return; }
        this.isTerminated = true;

        this.adapter.terminateSandbox(this);

        this.destroyChannels();

        for( var index=0 ; index<sandbox.oasis.services.length ; index++) {
          sandbox.oasis.services[index].destroy();
          delete sandbox.oasis.services[index];
        }
        sandbox.oasis.services = [];
      },

      onerror: function(error) {
        throw error;
      },

      name: function() {
        return this.adapter.name(this);
      },

      // Oasis internal

      _filterCapabilities: function(capabilities) {
        return uniq.call(this.adapter.filterCapabilities(capabilities));
      },

      _waitForLoadDeferred: function () {
        if (!this._loadDeferred) {
          // the adapter will resolve this
          this._loadDeferred = RSVP.defer();
        }

        return this._loadDeferred;
      }
    };


    return OasisSandbox;
  });
define("oasis/sandbox_init",
  [],
  function() {
    "use strict";
    function autoInitializeSandbox () {
      if (typeof window !== 'undefined') {
        if (/PhantomJS/.test(navigator.userAgent)) {
          // We don't support phantomjs for several reasons, including
          //  - window.constructor vs Window
          //  - postMessage must not have ports (but recall in IE postMessage must
          //    have ports)
          //  - because of the above we need to polyfill, but we fail to do so
          //    because we see MessageChannel in global object
          //  - we erroneously try to decode the oasis load message; alternatively
          //    we should just encode the init message
          //  - all the things we haven't noticed yet
          return;
        }

        if (window.parent && window.parent !== window) {
          Oasis.adapters.iframe.connectSandbox(this);
        } 
      } else {
        Oasis.adapters.webworker.connectSandbox(this);
      }
    }


    return autoInitializeSandbox;
  });
define("oasis/service",
  ["oasis/shims"],
  function(__dependency1__) {
    "use strict";
    var o_create = __dependency1__.o_create;

    /**
      This is a base class that services and consumers can subclass to easily
      implement a number of events and requests at once.

      Example:

          var MetadataService = Oasis.Service.extend({
            initialize: function() {
              this.send('data', this.sandbox.data);
            },

            events: {
              changed: function(data) {
                this.sandbox.data = data;
              }
            },

            requests: {
              valueForProperty: function(name, promise) {
                promise.resolve(this.sandbox.data[name]);
              }
            }
          });

      In the above example, the metadata service implements the Service
      API using `initialize`, `events` and `requests`.

      Both services (implemented in the containing environment) and
      consumers (implemented in the sandbox) use the same API for
      registering events and requests.

      In the containing environment, a service is registered in the
      `createSandbox` method. In the sandbox, a consumer is registered
      using `Oasis.connect`.

      ### `initialize`

      Oasis calls the `initialize` method once the other side of the
      connection has initialized the connection.

      This method is useful to pass initial data back to the other side
      of the connection. You can also set up events or requests manually,
      but you will usually want to use the `events` and `requests` sections
      for events and requests.

      ### `events`

      The `events` object is a list of event names and associated callbacks.
      Oasis will automatically set up listeners for each named event, and
      trigger the callback with the data provided by the other side of the
      connection.

      ### `requests`

      The `requests` object is a list of request names and associated
      callbacks. Oasis will automatically set up listeners for requests
      made by the other side of the connection, and trigger the callback
      with the request information as well as a promise that you should
      use to fulfill the request.

      Once you have the information requested, you should call
      `promise.resolve` with the response data.

      @constructor
      @param {OasisPort} port
      @param {OasisSandbox} sandbox in the containing environment, the
        OasisSandbox that this service is connected to.
    */
    function Service (port, sandbox) {
      var service = this, prop, callback;

      this.sandbox = sandbox;
      this.port = port;

      function xform(callback) {
        return function() {
          return callback.apply(service, arguments);
        };
      }

      for (prop in this.events) {
        callback = this.events[prop];
        port.on(prop, xform(callback));
      }

      for (prop in this.requests) {
        callback = this.requests[prop];
        port.onRequest(prop, xform(callback));
      }
    }

    Service.prototype = {
      /**
        This hook is called when the connection is established. When
        `initialize` is called, it is safe to register listeners and
        send data to the other side.

        The implementation of Oasis makes it impossible for messages
        to get dropped on the floor due to timing issues.

        @param {OasisPort} port the port to the other side of the connection
        @param {String} name the name of the service
      */
      initialize: function() {},


      /**
        This hooks is called when an attempt is made to connect to a capability the
        environment does not provide.
      */
      error: function() {},

      /**
        This hook is called when the connection is stopped. When
        `destroy` is called, it is safe to unregister listeners.
      */
      destroy: function() {},

      /**
        This method can be used to send events to the other side of the
        connection.

        @param {String} eventName the name of the event to send to the
          other side of the connection
        @param {Structured} data an additional piece of data to include
          as the data for the event.
      */
      send: function() {
        return this.port.send.apply(this.port, arguments);
      },

      /**
        This method can be used to request data from the other side of
        the connection.

        @param {String} requestName the name of the request to send to
          the other side of the connection.
        @return {Promise} a promise that will be resolved by the other
          side of the connection. Use `.then` to wait for the resolution.
      */
      request: function() {
        return this.port.request.apply(this.port, arguments);
      }
    };

    Service.extend = function extend(object) {
      var superConstructor = this;

      function Service() {
        if (Service.prototype.init) { Service.prototype.init.call(this); }
        superConstructor.apply(this, arguments);
      }

      Service.extend = extend;

      var ServiceProto = Service.prototype = o_create(this.prototype);

      for (var prop in object) {
        ServiceProto[prop] = object[prop];
      }

      return Service;
    };


    return Service;
  });
define("oasis/shims",
  ["exports"],
  function(__exports__) {
    "use strict";
    var K = function() {};

    function o_create(obj, props) {
      K.prototype = obj;
      obj = new K();
      if (props) {
        K.prototype = obj;
        for (var prop in props) {
          K.prototype[prop] = props[prop].value;
        }
        obj = new K();
      }
      K.prototype = null;

      return obj;
    }

    // If it turns out we need a better polyfill we can grab mozilla's at: 
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget.removeEventListener?redirectlocale=en-US&redirectslug=DOM%2FEventTarget.removeEventListener#Polyfill_to_support_older_browsers
    function addEventListener(receiver, eventName, fn) {
      if (receiver.addEventListener) {
        return receiver.addEventListener(eventName, fn);
      } else if (receiver.attachEvent) {
        return receiver.attachEvent('on' + eventName, fn);
      }
    }

    function removeEventListener(receiver, eventName, fn) {
      if (receiver.removeEventListener) {
        return receiver.removeEventListener(eventName, fn);
      } else if (receiver.detachEvent) {
        return receiver.detachEvent('on' + eventName, fn);
      }
    }

    function isNativeFunc(func) {
      // This should probably work in all browsers likely to have ES5 array methods
      return func && Function.prototype.toString.call(func).indexOf('[native code]') > -1;
    }

    var a_forEach = isNativeFunc(Array.prototype.forEach) ? Array.prototype.forEach : function(fun /*, thisp */) {
      if (this === void 0 || this === null) {
        throw new TypeError();
      }

      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof fun !== "function") {
        throw new TypeError();
      }

      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (i in t) {
          fun.call(thisp, t[i], i, t);
        }
      }
    };

    var a_reduce = isNativeFunc(Array.prototype.reduce) ? Array.prototype.reduce : function(callback, opt_initialValue){
      if (null === this || 'undefined' === typeof this) {
        // At the moment all modern browsers, that support strict mode, have
        // native implementation of Array.prototype.reduce. For instance, IE8
        // does not support strict mode, so this check is actually useless.
        throw new TypeError(
            'Array.prototype.reduce called on null or undefined');
      }
      if ('function' !== typeof callback) {
        throw new TypeError(callback + ' is not a function');
      }
      var index = 0, length = this.length >>> 0, value, isValueSet = false;
      if (1 < arguments.length) {
        value = opt_initialValue;
        isValueSet = true;
      }
      for ( ; length > index; ++index) {
        if (!this.hasOwnProperty(index)) continue;
        if (isValueSet) {
          value = callback(value, this[index], index, this);
        } else {
          value = this[index];
          isValueSet = true;
        }
      }
      if (!isValueSet) {
        throw new TypeError('Reduce of empty array with no initial value');
      }
      return value;
    };

    var a_map = isNativeFunc(Array.prototype.map) ? Array.prototype.map : function(callback, thisArg) {

        var T, A, k;

        if (this == null) {
          throw new TypeError(" this is null or not defined");
        }

        // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
        var O = Object(this);

        // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = O.length >>> 0;

        // 4. If IsCallable(callback) is false, throw a TypeError exception.
        // See: http://es5.github.com/#x9.11
        if (typeof callback !== "function") {
          throw new TypeError(callback + " is not a function");
        }

        // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
        if (thisArg) {
          T = thisArg;
        }

        // 6. Let A be a new array created as if by the expression new Array(len) where Array is
        // the standard built-in constructor with that name and len is the value of len.
        A = new Array(len);

        // 7. Let k be 0
        k = 0;

        // 8. Repeat, while k < len
        while(k < len) {

          var kValue, mappedValue;

          // a. Let Pk be ToString(k).
          //   This is implicit for LHS operands of the in operator
          // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
          //   This step can be combined with c
          // c. If kPresent is true, then
          if (k in O) {

            // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
            kValue = O[ k ];

            // ii. Let mappedValue be the result of calling the Call internal method of callback
            // with T as the this value and argument list containing kValue, k, and O.
            mappedValue = callback.call(T, kValue, k, O);

            // iii. Call the DefineOwnProperty internal method of A with arguments
            // Pk, Property Descriptor {Value: mappedValue, : true, Enumerable: true, Configurable: true},
            // and false.

            // In browsers that support Object.defineProperty, use the following:
            // Object.defineProperty(A, Pk, { value: mappedValue, writable: true, enumerable: true, configurable: true });

            // For best browser support, use the following:
            A[ k ] = mappedValue;
          }
          // d. Increase k by 1.
          k++;
        }

        // 9. return A
        return A;
      };  

    var a_indexOf = isNativeFunc(Array.prototype.indexOf) ? Array.prototype.indexOf : function (searchElement /*, fromIndex */ ) {
      /* jshint eqeqeq:false */
      "use strict";
      if (this == null) {
        throw new TypeError();
      }
      var t = Object(this);
      var len = t.length >>> 0;

      if (len === 0) {
        return -1;
      }
      var n = 0;
      if (arguments.length > 1) {
        n = Number(arguments[1]);
        if (n != n) { // shortcut for verifying if it's NaN
          n = 0;
        } else if (n != 0 && n != Infinity && n != -Infinity) {
          n = (n > 0 || -1) * Math.floor(Math.abs(n));
        }
      }
      if (n >= len) {
        return -1;
      }
      var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
      for (; k < len; k++) {
        if (k in t && t[k] === searchElement) {
          return k;
        }
      }
      return -1;
    };

    var a_filter = isNativeFunc(Array.prototype.filter) ? Array.prototype.filter : function(fun /*, thisp*/) {
      'use strict';

      if (!this) {
        throw new TypeError();
      }

      var objects = Object(this);
      var len = objects.length >>> 0;
      if (typeof fun !== 'function') {
        throw new TypeError();
      }

      var res = [];
      var thisp = arguments[1];
      for (var i in objects) {
        if (objects.hasOwnProperty(i)) {
          if (fun.call(thisp, objects[i], i, objects)) {
            res.push(objects[i]);
          }
        }
      }

      return res;
    };

    __exports__.o_create = o_create;
    __exports__.addEventListener = addEventListener;
    __exports__.removeEventListener = removeEventListener;
    __exports__.a_forEach = a_forEach;
    __exports__.a_reduce = a_reduce;
    __exports__.a_map = a_map;
    __exports__.a_indexOf = a_indexOf;
    __exports__.a_filter = a_filter;
  });
define("oasis/util",
  ["oasis/shims","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var o_create = __dependency1__.o_create;
    var a_filter = __dependency1__.a_filter;

    function assert(assertion, string) {
      if (!assertion) {
        throw new Error(string);
      }
    }

    function noop() { }

    function mustImplement(className, name) {
      return function() {
        throw new Error("Subclasses of " + className + " must implement " + name);
      };
    }

    function extend(parent, object) {
      function OasisObject() {
        parent.apply(this, arguments);
        if (this.initialize) {
          this.initialize.apply(this, arguments);
        }
      }

      OasisObject.prototype = o_create(parent.prototype);

      for (var prop in object) {
        if (!object.hasOwnProperty(prop)) { continue; }
        OasisObject.prototype[prop] = object[prop];
      }

      return OasisObject;
    }

    function delegate(delegateeProperty, delegatedMethod) {
      return function () {
        var delegatee = this[delegateeProperty];
        return delegatee[delegatedMethod].apply(delegatee, arguments);
      };
    }

    function uniq() {
      var seen = {};
      return a_filter.call(this, function (item) {
        var _seen = !seen.hasOwnProperty(item);
        seen[item] = true;
        return _seen;
      });
    }

    function reverseMerge(a, b) {
      for (var prop in b) {
        if (!b.hasOwnProperty(prop)) { continue; }

        if (! (prop in a)) {
          a[prop] = b[prop];
        }
      }

      return a;
    }

    __exports__.assert = assert;
    __exports__.noop = noop;
    __exports__.mustImplement = mustImplement;
    __exports__.extend = extend;
    __exports__.delegate = delegate;
    __exports__.uniq = uniq;
    __exports__.reverseMerge = reverseMerge;
  });
define("oasis/version",
  [],
  function() {
    "use strict";

    return '0.4.0';
  });
define("oasis/webworker_adapter",
  ["oasis/util","oasis/shims","rsvp","oasis/logger","oasis/base_adapter"],
  function(__dependency1__, __dependency2__, RSVP, Logger, BaseAdapter) {
    "use strict";
    var assert = __dependency1__.assert;
    var extend = __dependency1__.extend;
    var a_forEach = __dependency2__.a_forEach;
    var addEventListener = __dependency2__.addEventListener;
    var removeEventListener = __dependency2__.removeEventListener;
    /*global self, postMessage, importScripts, UUID */



    var WebworkerAdapter = extend(BaseAdapter, {
      type: 'js',

      //-------------------------------------------------------------------------
      // Environment API

      initializeSandbox: function(sandbox) {
        var worker = new Worker(sandbox.options.url);
        worker.name = sandbox.options.url + '?uuid=' + UUID.generate();
        sandbox.worker = worker;

        // Error handling inside the worker
        worker.errorHandler = function(event) {
          if(!event.data.sandboxException) {return;}

          sandbox.onerror( event.data.sandboxException );
        };
        addEventListener(worker, 'message', worker.errorHandler);

        sandbox._waitForLoadDeferred().resolve(new RSVP.Promise( function(resolve, reject) {
          worker.initializationHandler = function (event) {
            sandbox.oasis.configuration.eventCallback(function () {
              if( event.data !== sandbox.adapter.sandboxInitializedMessage ) {return;}
              removeEventListener(worker, 'message', worker.initializationHandler);

              Logger.log("worker sandbox initialized");
              resolve(sandbox);
            });
          };
          addEventListener(worker, 'message', worker.initializationHandler);
        }));

        worker.loadHandler = function (event) {
          sandbox.oasis.configuration.eventCallback(function () {
            if( event.data !== sandbox.adapter.oasisLoadedMessage ) {return;}
            removeEventListener(worker, 'message', worker.loadHandler);

            Logger.log("worker sandbox initialized");
            sandbox.createAndTransferCapabilities();
          });
        };
        addEventListener(worker, 'message', worker.loadHandler);
      },

      startSandbox: function(sandbox) { },

      terminateSandbox: function(sandbox) {
        var worker = sandbox.worker;

        removeEventListener(worker, 'message', worker.loadHandler);
        removeEventListener(worker, 'message', worker.initializationHandler);
        sandbox.worker.terminate();
      },

      connectPorts: function(sandbox, ports) {
        var rawPorts = ports.map(function(port) { return port.port; }),
            message = this.createInitializationMessage(sandbox);

        Worker.postMessage(sandbox.worker, message, rawPorts);
      },

      connectSandbox: function(oasis) {
        return BaseAdapter.prototype.connectSandbox.call(this, self, oasis);
      },

      //-------------------------------------------------------------------------
      // Sandbox API

      name: function(sandbox) {
        return sandbox.worker.name;
      },

      oasisLoaded: function() {
        postMessage(this.oasisLoadedMessage, []);
      },

      didConnect: function() {
        postMessage(this.sandboxInitializedMessage, []);
      }
    });


    return WebworkerAdapter;
  });
define("oasis/xhr",
  ["oasis/util","rsvp","exports"],
  function(__dependency1__, RSVP, __exports__) {
    "use strict";
    var noop = __dependency1__.noop;
    /*global XDomainRequest */


    var a_slice = Array.prototype.slice;

    function acceptsHeader(options) {
      var dataType = options.dataType;

      if (dataType && accepts[dataType]) {
        return accepts[dataType];
      }

      return accepts['*'];
    }

    function xhrSetRequestHeader(xhr, options) {
      xhr.setRequestHeader("Accepts", acceptsHeader(options));
    }

    function xhrGetLoadStatus(xhr) {
      return xhr.status;
    }

    function xdrGetLoadStatus() {
      return 200;
    }

    var NONE = {};

    function trigger(event, oasis) {
      if (!oasis) { return; }

      var args = a_slice.call(arguments, 2);

      args.unshift(event);
      oasis.trigger.apply(oasis, args);
    }

    var accepts = {
      "*": "*/*",
      text: "text/plain",
      html: "text/html",
      xml: "application/xml, text/xml",
      json: "application/json, text/javascript"
    };

    var XHR, setRequestHeader, getLoadStatus, send;

    try {
      if ('withCredentials' in new XMLHttpRequest()) {
        XHR = XMLHttpRequest;
        setRequestHeader = xhrSetRequestHeader;
        getLoadStatus = xhrGetLoadStatus;
      } else if (typeof XDomainRequest !== 'undefined') {
        XHR = XDomainRequest;
        setRequestHeader = noop;
        getLoadStatus = xdrGetLoadStatus;
      }
    } catch( exception ) {
      if (typeof XDomainRequest !== 'undefined') {
        XHR = XDomainRequest;
        setRequestHeader = noop;
        getLoadStatus = xdrGetLoadStatus;
      }
    }
    // else inline adapter with cross-domain cards is not going to work


    function xhr(url, options, oasis) {
      if (!oasis && this instanceof Oasis) { oasis = this; }
      if (!options) { options = NONE; }

      return new RSVP.Promise(function(resolve, reject){
        var xhr = new XHR();
        xhr.open("get", url, true);
        setRequestHeader(xhr, options);

        if (options.timeout) {
          xhr.timeout = options.timeout;
        }

        xhr.onload = function () {
          trigger('xhr.load', oasis, url, options, xhr);

          var status = getLoadStatus(xhr);
          if (status >= 200 && status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(xhr);
          }
        };

        xhr.onprogress = noop;
        xhr.ontimeout = function () {
          trigger('xhr.timeout', oasis, url, options, xhr);
          reject(xhr);
        };

        xhr.onerror = function () {
          trigger('xhr.error', oasis, url, options, xhr);
          reject(xhr);
        };

        trigger('xhr.send', oasis, url, options, xhr);
        xhr.send();
      });
    }

    __exports__.xhr = xhr;
  });
define("conductor",
  ["oasis/shims","oasis/util","oasis","conductor/version","conductor/card_reference","conductor/card_dependencies","conductor/capabilities","conductor/multiplex_service","conductor/adapters"],
  function(__dependency1__, __dependency2__, Oasis, Version, CardReference, CardDependencies, ConductorCapabilities, MultiplexService, adapters) {
    "use strict";
    var o_create = __dependency1__.o_create;
    var a_forEach = __dependency1__.a_forEach;
    var a_indexOf = __dependency1__.a_indexOf;
    var delegate = __dependency2__.delegate;

    function Conductor(options) {
      this.options = options || {};
      this.oasis = new Oasis();

      this.data = {};
      this.cards = {};
      this._capabilities = new ConductorCapabilities();
      Conductor._dependencies = new CardDependencies();
    }

    Conductor.Version = Version;
    Conductor.Oasis = Oasis;

    Conductor._dependencies = new CardDependencies();
    Conductor.require = function(url) { Conductor._dependencies.requireJavaScript(url); };
    Conductor.requireCSS = function(url) { Conductor._dependencies.requireCSS(url); };

    Conductor.MultiplexService = MultiplexService;
    Conductor.adapters = adapters;

    var RSVP = Conductor.Oasis.RSVP,
        Promise = RSVP.Promise;

    function coerceId(id) {
      return id + '';
    }

    Conductor.prototype = {
      configure: function (name, value) {
        if ('eventCallback' === name || 'allowSameOrigin' === name || 'sandboxed' === name) {
          this.oasis.configure(name, value);
        } else {
          throw new Error("Unexpected Configuration `" + name + "` = `" + value + "`");
        }
      },

      loadData: function(url, id, data) {
        id = coerceId(id);

        this.data[url] = this.data[url] || {};
        this.data[url][id] = data;

        var cards = this.cards[url] && this.cards[url][id];

        if (!cards) { return; }

        a_forEach.call(cards, function(card) {
          card.updateData('*', data);
        });
      },

      updateData: function(card, bucket, data) {
        var url = card.url,
            id = card.id;

        this.data[url][id][bucket] = data;

        var cards = this.cards[url][id].slice(),
            index = a_indexOf.call(cards, card);

        cards.splice(index, 1);

        a_forEach.call(cards, function(card) {
          card.updateData(bucket, data);
        });
      },

      load: function(url, id, options) {
        id = coerceId(id);

        var datas = this.data[url],
            data = datas && datas[id],
            _options = options || {},
            extraCapabilities = _options.capabilities || [],
            capabilities = this.defaultCapabilities().slice(),
            cardServices = o_create(this.defaultServices()),
            adapter = _options.adapter,
            prop;

        capabilities.push.apply(capabilities, extraCapabilities);

        // TODO: this should be a custom service provided in tests
        if (this.options.testing) {
          capabilities.unshift('assertion');
        }

        // It is possible to add services when loading the card
        if( _options.services ) {
          for( prop in _options.services) {
            cardServices[prop] = _options.services[prop];
          }
        }

        var sandbox = this.oasis.createSandbox({
          url: url,
          capabilities: capabilities,
          services: cardServices,

          adapter: adapter
        });

        sandbox.data = data;
        sandbox.activateDefered = RSVP.defer();
        sandbox.activatePromise = sandbox.activateDefered.promise;

        var card = new CardReference(sandbox);

        this.cards[url] = this.cards[url] || {};
        var cards = this.cards[url][id] = this.cards[url][id] || [];
        cards.push(card);

        card.url = url;
        card.id = id;

        sandbox.conductor = this;
        sandbox.card = card;

        // TODO: it would be better to access the consumer from
        // `conductor.parentCard` after the child card refactoring is in master.
        if (this.oasis.consumers.nestedWiretapping) {
          card.wiretap(function (service, messageEvent) {
            this.oasis.consumers.nestedWiretapping.send(messageEvent.type, {
              data: messageEvent.data,
              service: service+"",
              direction: messageEvent.direction,
              url: url,
              id: id
            });
          });
        }

        return card;
      },

      unload: function(card) {
        var cardArray = this.cards[card.url][card.id],
            cardIndex = a_indexOf.call(cardArray, card);

        card.sandbox.conductor = null;

        card.sandbox.terminate();
        delete cardArray[cardIndex];
        cardArray.splice(cardIndex, 1);
      },

      /**
        @return array the default list of capabilities that will be included for all
        cards.
      */
      defaultCapabilities: delegate('_capabilities', 'defaultCapabilities'),

      /**
        @return object the default services used for the default capabilities.
      */
      defaultServices: delegate('_capabilities', 'defaultServices'),

      /**
        Add a default capability that this conductor will provide to all cards,
        unless the capability is not supported by the specified adapter.

        @param {string} capability the capability to add
        @param {Oasis.Service} [service=Oasis.Service] the default service to use
        for `capability`.  Defaults to a plain `Oasis.Service`.
      */
      addDefaultCapability: delegate('_capabilities', 'addDefaultCapability'),

      // Be careful with this: it does no safety checking, so things will break if
      // one for example removes `data` or `xhr` as a default capability.
      //
      // It is however safe to remove `height`.
      removeDefaultCapability: delegate('_capabilities', 'removeDefaultCapability')
    };


    return Conductor;
  });
define("conductor/adapters",
  ["oasis","conductor/inline_adapter"],
  function(Oasis, inlineAdapter) {
    "use strict";

    var adapters = {
      iframe: Oasis.adapters.iframe,
      inline: inlineAdapter
    };


    return adapters;
  });
define("conductor/assertion_consumer",
  ["oasis"],
  function(Oasis) {
    "use strict";

    var AssertionConsumer = Oasis.Consumer.extend({
      initialize: function() {
        var service = this;


        window.ok = window.ok || function(bool, message) {
          service.send('ok', { bool: bool, message: message });
        };

        window.equal = window.equal || function(expected, actual, message) {
          service.send('equal', { expected: expected, actual: actual, message: message });
        };

        window.start = window.start || function() {
          service.send('start');
        };
      },

      events: {
        instruct: function(info) {
          this.card.instruct(info);
        }
      }
    });


    return AssertionConsumer;
  });
define("conductor/assertion_service",
  ["oasis"],
  function(Oasis) {
    "use strict";

    var AssertionService = Oasis.Service.extend({
      initialize: function(port) {
        this.sandbox.assertionPort = port;
      },

      events: {
        ok: function(data) {
          ok(data.bool, data.message);
        },

        equal: function (data) {
          equal(data.expected, data.actual, data.message);
        },

        start: function() {
          start();
        }
      }
    });


    return AssertionService;
  });
define("conductor/capabilities",
  ["conductor/services","conductor/lang","oasis/shims","oasis"],
  function(__dependency1__, __dependency2__, __dependency3__, Oasis) {
    "use strict";
    var services = __dependency1__.services;
    var copy = __dependency2__.copy;
    var a_indexOf = __dependency3__.a_indexOf;

    function ConductorCapabilities() {
      this.capabilities = [
        'xhr', 'metadata', 'render', 'data', 'lifecycle', 'height',
        'nestedWiretapping' ];
      this.services = copy(services);
    }

    ConductorCapabilities.prototype = {
      defaultCapabilities: function () {
        return this.capabilities;
      },

      defaultServices: function () {
        return this.services;
      },

      addDefaultCapability: function (capability, service) {
        if (!service) { service = Oasis.Service; }
        this.capabilities.push(capability);
        this.services[capability] = service;
      },

      removeDefaultCapability: function (capability) {
        var index = a_indexOf.call(this.capabilities, capability);
        if (index !== -1) {
          return this.capabilities.splice(index, 1);
        }
      }
    };


    return ConductorCapabilities;
  });
define("conductor/card",
  ["conductor","oasis","conductor/assertion_consumer","conductor/xhr_consumer","conductor/render_consumer","conductor/metadata_consumer","conductor/data_consumer","conductor/lifecycle_consumer","conductor/height_consumer","conductor/nested_wiretapping_consumer","conductor/multiplex_service","oasis/shims"],
  function(Conductor, Oasis, AssertionConsumer, XhrConsumer, RenderConsumer, MetadataConsumer, DataConsumer, LifecycleConsumer, HeightConsumer, NestedWiretapping, MultiplexService, OasisShims) {
    "use strict";

    var RSVP = Oasis.RSVP,
        Promise = RSVP.Promise,
        o_create = OasisShims.o_create,
        a_forEach = OasisShims.a_forEach,
        a_map = OasisShims.a_map;

    function extend(a, b) {
      for (var key in b) {
        if (b.hasOwnProperty(key)) {
          a[key] = b[key];
        }
      }
      return a;
    }

    function getBase () {
      var link = document.createElement("a");
      link.href = "!";
      var base = link.href.slice(0, -1);

      return base;
    }

    function Card(options, _oasis) {
      var card = this,
          prop,
          oasis = _oasis || self.oasis;

      for (prop in options) {
        this[prop] = options[prop];
      }

      this.consumers = o_create(oasis.consumers);
      this.options = options = options || {};

      this.deferred = {
        data: this.defer(),
        xhr: this.defer()
      };

      options.events = options.events || {};
      options.requests = options.requests || {};

      this.activateWhen(this.deferred.data.promise, [ this.deferred.xhr.promise ]);

      var cardOptions = {
        consumers: extend({
          // TODO: this should be a custom consumer provided in tests
          assertion: AssertionConsumer,
          xhr: XhrConsumer,
          render: RenderConsumer,
          metadata: MetadataConsumer,
          data: DataConsumer,
          lifecycle: LifecycleConsumer,
          height: HeightConsumer,
          nestedWiretapping: NestedWiretapping
        }, options.consumers)
      };

      for (prop in cardOptions.consumers) {
        cardOptions.consumers[prop] = cardOptions.consumers[prop].extend({card: this});
      }

      oasis.connect(cardOptions);
    }

    Card.prototype = {
      waitForActivation: function () {
        return this._waitForActivationDeferral().promise;
      },

      updateData: function(name, hash) {
        oasis.portFor('data').send('updateData', { bucket: name, object: hash });
      },

      /**
        A card can contain other cards.

        `childCards` is an array of objects describing the differents cards. The accepted attributes are:
        * `url` {String} the url of the card
        * `id` {String} a unique identifier for this instance (per type)
        * `options` {Object} Options passed to `Conductor.load` (optional)
        * `data` {Object} passed to `Conductor.loadData`

        Example:

          Conductor.card({
            childCards: [
              { url: '../cards/survey', id: 1 , options: {}, data: '' }
            ]
          });

        Any `Conductor.Oasis.Service` needed for a child card can be simply
        declared with the `services` attribute.  A card can contain other cards.

        Example:

          Conductor.card({
            services: {
              survey: SurveyService
            },
            childCards: [
              {url: 'survey', id: 1 , options: {capabilities: ['survey']} }
            ]
          });

        `loadDataForChildCards` can be defined when a child card needs data passed
        to the parent card.

        Once `initializeChildCards` has been called, the loaded card can be
        accessed through the `childCards` attribute.

        Example:

          var card = Conductor.card({
            childCards: [
              { url: '../cards/survey', id: 1 , options: {}, data: '' }
            ]
          });

          // After `initializeChildCards` has been called
          var surveyCard = card.childCards[0].card;

        Child cards can be added to the DOM by overriding `initializeDOM`.  The
        default behavior of `initializeDOM` is to add all child cards to the body
        element.

        You can pass the configuration to be used with Conductor on the instance used to load
        the child cards. This will be passed to `conductor.configure`.

        Example:

          Conductor.card({
            conductorConfiguration: { allowSameOrigin: true },
            childCards: [
              { url: '../cards/survey', id: 1 , options: {}, data: '' }
            ]
          });

        If you use child cards and `allowSameOrigin`, you'll need to specify in the parent card
        a different url for Conductor.js. This will ensure that the child cards can't access
        their parent.

        Example:

          Conductor.card({
            conductorConfiguration: {
              allowSameOrigin: true
            },
            childCards: [
              { url: '../cards/survey', id: 1 , options: {}, data: '' }
            ]
          });
       */
      initializeChildCards: function( data ) {
        var prop,
            conductorOptions = {};

        if(this.childCards) {
          this.conductor = new Conductor( conductorOptions );

          if( this.conductorConfiguration ) {
            for( prop in this.conductorConfiguration ) {
              this.conductor.configure( prop, this.conductorConfiguration[prop] );
            }
          }

          this.conductor.addDefaultCapability('xhr', MultiplexService.extend({
            upstream: this.consumers.xhr,
            transformRequest: function (requestEventName, data) {
              var base = this.sandbox.options.url;
              if (requestEventName === 'get') {
                data.args = a_map.call(data.args, function (resourceUrl) {
                  var url = PathUtils.cardResourceUrl(base, resourceUrl);
                  return PathUtils.cardResourceUrl(getBase(), url);
                });
              }

              return data;
            }
          }));

          // A child card may not need new services
          if( this.services ) {
            for( prop in this.services) {
              this.conductor.addDefaultCapability(prop, this.services[prop]);
            }
          }

          // Hook if you want to initialize cards that are not yet instantiated
          if( this.loadDataForChildCards ) {
            this.loadDataForChildCards( data );
          }

          for( prop in this.childCards ) {
            var childCardOptions = this.childCards[prop];

            this.conductor.loadData(
              childCardOptions.url,
              childCardOptions.id,
              childCardOptions.data
            );

            childCardOptions.card = this.conductor.load( childCardOptions.url, childCardOptions.id, childCardOptions.options );
          }
        }
      },

      initializeDOM: function () {
        if (this.childCards) {
          a_forEach.call(this.childCards, function(cardInfo) {
            cardInfo.card.appendTo(document.body);
          });
        }
      },

      render: function () {},

      //-----------------------------------------------------------------
      // Internal

      defer: function(callback) {
        var defered = RSVP.defer();
        if (callback) { defered.promise.then(callback).catch( RSVP.rethrow ); }
        return defered;
      },

      activateWhen: function(dataPromise, otherPromises) {
        var card = this;

        return this._waitForActivationDeferral().resolve(RSVP.all([dataPromise].concat(otherPromises)).then(function(resolutions) {
          // Need to think if this called at the right place/time
          // My assumption for the moment is that
          // we don't rely on some initializations done in activate
          if (card.initializeChildCards) { card.initializeChildCards(resolutions[0]); }

          if (card.activate) {
            return card.activate(resolutions[0]);
          }
        }));
      },

      _waitForActivationDeferral: function () {
        if (!this._activationDeferral) {
          this._activationDeferral = RSVP.defer();
          this._activationDeferral.promise.catch( RSVP.rethrow );
        }
        return this._activationDeferral;
      }
    };

    Conductor.card = function(options) {
      return new Card(options);
    };

  });
define("conductor/card_dependencies",
  [],
  function() {
    "use strict";
    function CardDependencies() {
      this.requiredJavaScriptURLs = [];
      this.requiredCSSURLs = [];
    }

    CardDependencies.prototype = {
      requireJavaScript: function(url) {
        this.requiredJavaScriptURLs.push(url);
      },
      requireCSS: function(url) {
        this.requiredCSSURLs.push(url);
      }
    };


    return CardDependencies;
  });
define("conductor/card_reference",
  ["oasis"],
  function(Oasis) {
    "use strict";

    var RSVP = Oasis.RSVP,
        Promise = RSVP.Promise;

    function CardReference(sandbox) {
      this.sandbox = sandbox;
      var card = this;

      return this;
    }

    CardReference.prototype = {
      waitForLoad: function() {
        var card = this;
        if (!this._loadPromise) {
          this._loadPromise = this.sandbox.waitForLoad().then(function() {
            return card;
          }).catch(RSVP.rethrow);
        }
        return this._loadPromise;
      },

      metadataFor: function(name) {
        return this.sandbox.metadataPort.request('metadataFor', name);
      },

      instruct: function(info) {
        return this.sandbox.assertionPort.send('instruct', info);
      },

      appendTo: function(parent) {
        if (typeof parent === 'string') {
          var selector = parent;
          parent = document.querySelector(selector);
          if (!parent) { throw new Error("You are trying to append to '" + selector + "' but no element matching it was found"); }
        }

        parent.appendChild(this.sandbox.el);

        return this.waitForLoad();
      },

      render: function(intent, dimensions) {
        var card = this;

        this.sandbox.activatePromise.then(function() {
          card.sandbox.renderPort.send('render', [intent, dimensions]);
        }).catch(RSVP.rethrow);
      },

      updateData: function(bucket, data) {
        var sandbox = this.sandbox;
        sandbox.activatePromise.then(function() {
          sandbox.dataPort.send('updateData', { bucket: bucket, data: data });
        }).catch(RSVP.rethrow);
      },

      wiretap: function(callback, binding) {
        this.sandbox.wiretap(function() {
          callback.apply(binding, arguments);
        });
      },

      destroy: function() {
        this.sandbox.conductor.unload(this);
      }
    };

    Oasis.RSVP.EventTarget.mixin(CardReference.prototype);


    return CardReference;
  });
define("conductor/data_consumer",
  ["oasis"],
  function(Oasis) {
    "use strict";

    var DataConsumer = Oasis.Consumer.extend({
      events: {
        initializeData: function(data) {
          this.card.data = data;
          this.card.deferred.data.resolve(data);
        },

        updateData: function(data) {
          if (data.bucket === '*') {
            this.card.data = data.data;
          } else {
            this.card.data[data.bucket] = data.data;
          }

          if (this.card.didUpdateData) {
            this.card.didUpdateData(data.bucket, data.data);
          }
        }
      }
    });


    return DataConsumer;
  });
define("conductor/data_service",
  ["oasis"],
  function(Oasis) {
    "use strict";

    var DataService = Oasis.Service.extend({
      initialize: function(port) {
        var data = this.sandbox.data;
        this.send('initializeData', data);

        this.sandbox.dataPort = port;
      },

      events: {
        updateData: function(event) {
          this.sandbox.conductor.updateData(this.sandbox.card, event.bucket, event.object);
        }
      }
    });


    return DataService;
  });
define("conductor/dom",
  [],
  function() {
    "use strict";
    /* global DomUtils:true */

    var DomUtils = {};

    if (typeof window !== "undefined") {
      if (window.getComputedStyle) {
        DomUtils.getComputedStyleProperty = function (element, property) {
          return window.getComputedStyle(element)[property];
        };
      } else {
        DomUtils.getComputedStyleProperty = function (element, property) {
          var prop = property.replace(/-(\w)/g, function (_, letter) {
            return letter.toUpperCase();
          });
          return element.currentStyle[prop];
        };
      }
    }

    DomUtils.createStyleElement = function(css) {
      var style = document.createElement('style');

      style.type = 'text/css';
      if (style.styleSheet){
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }

      return style;
    };


    return DomUtils;
  });
define("conductor/error",
  ["exports"],
  function(__exports__) {
    "use strict";
    function error(exception) {
      if (typeof console === 'object' && console.assert && console.error) {
        // chrome does not (yet) link the URLs in `console.assert`
        console.error(exception.stack);
        console.assert(false, exception.message);
      }
      setTimeout( function () {
        throw exception;
      }, 1);
      throw exception;
    }

    function warn() {
      if (console.warn) {
        return console.warn.apply(this, arguments);
      }
    }

    __exports__.error = error;
    __exports__.warn = warn;
  });
define("conductor/height_consumer",
  ["oasis","conductor","conductor/dom"],
  function(Oasis, Conductor, DomUtils) {
    "use strict";
    /*global MutationObserver:true */

    /**
      The height consumer reports changes to the `documentElement`'s element to its
      parent environment.  This is obviated by the ALLOWSEAMLESS proposal, but no
      browser supports it yet.

      There are two mechanisms for reporting dimension changes: automatic (via DOM
      mutation observers) and manual.  By default, height resizing is automatic.  It
      must be disabled during card activation if `MutationObserver` is not
      supported.  It may be disabled during card activation if manual updates are
      preferred.

      Automatic updating can be disabled as follows:

      ```js
      Conductor.card({
        activate: function () {
          this.consumers.height.autoUpdate = false;
        }
      })
      ```

      Manual updates can be done either with specific dimensions, or manual updating
      can compute the dimensions.

      ```js
      card = Conductor.card({ ... });

      card.consumers.height.update({ width: 200, height: 200 });

      // dimensions of `document.body` will be computed.
      card.consumers.height.update();
      ```
    */

    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    var HeightConsumer = Oasis.Consumer.extend({
      autoUpdate: true,

      // TODO: fix autoupdate
      // initialize: function () {
        // var consumer = this;

        // this.card.waitForActivation().then(function () {
          // if (!consumer.autoUpdate) {
            // return;
          // } else if (typeof MutationObserver === "undefined") {
            // Conductor.warn("MutationObserver is not defined.  Height service cannot autoupdate.  You must manually call `update` for your height consumer.  You may want to disable autoupdate when your card activates with `this.consumers.height.autoUpdate = false;`");
            // return;
          // }

          // consumer.setUpAutoupdate();
        // });
      // },

      update: function (dimensions) {
        if (typeof dimensions === "undefined") {
          var width = 0,
              height = 0,
              childNodes = document.body.childNodes,
              len = childNodes.length,
              extraVSpace = 0,
              extraHSpace = 0,
              vspaceProps = ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'],
              hspaceProps = ['marginLeft', 'marginRight', 'paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'],
              i,
              childNode;

          for (i=0; i < vspaceProps.length; ++i) {
            extraVSpace += parseInt(DomUtils.getComputedStyleProperty(document.body, vspaceProps[i]), 10);
          }

          for (i=0; i < hspaceProps.length; ++i) {
            extraHSpace += parseInt(DomUtils.getComputedStyleProperty(document.body, hspaceProps[i]), 10);
          }

          for (i = 0; i < len; ++i) {
            childNode = childNodes[i];
            if (childNode.nodeType !== 1 /* Node.ELEMENT_NODE */ ) { continue; }

            width = Math.max(width, childNode.clientWidth + extraHSpace);
            height = Math.max(height, childNode.clientHeight + extraVSpace);
          }

          dimensions = {
            width: width,
            height: height
          };
        }

        this.send('resize', dimensions);
      },

      setUpAutoupdate: function () {
        var consumer = this;

        var mutationObserver = new MutationObserver(function () {
          consumer.update();
        });

        mutationObserver.observe(document.documentElement, {
          childList: true,
          attributes: true,
          characterData: true,
          subtree: true,
          attributeOldValue: false,
          characterDataOldValue: false,
          attributeFilter: ['style', 'className']
        });
      }
    });


    return HeightConsumer;
  });
define("conductor/height_service",
  ["oasis","conductor/dom"],
  function(Oasis, DomUtils) {
    "use strict";
    /*global DomUtils*/

    function maxDim(element, dim) {
      var max = DomUtils.getComputedStyleProperty(element, 'max' + dim);
      return (max === "none") ? Infinity : parseInt(max, 10);
    }

    var HeightService = Oasis.Service.extend({
      initialize: function (port) {
        var el;
        if (el = this.sandbox.el) {
          Oasis.RSVP.EventTarget.mixin(el);
        }
        this.sandbox.heightPort = port;
      },

      events: {
        resize: function (data) {
          // height service is meaningless for DOMless sandboxes, eg sandboxed as
          // web workers.
          if (! this.sandbox.el) { return; }

          var el = this.sandbox.el,
              maxWidth = maxDim(el, 'Width'),
              maxHeight = maxDim(el, 'Height'),
              width = Math.min(data.width, maxWidth),
              height = Math.min(data.height, maxHeight);

          el.style.width = width + "px";
          el.style.height = height + "px";

          el.trigger('resize', { width: width, height: height });
        }
      }
    });


    return HeightService;
  });
define("conductor/inline_adapter",
  ["oasis/util","oasis/inline_adapter"],
  function(__dependency1__, OasisInlineAdapter) {
    "use strict";
    var extend = __dependency1__.extend;

    var InlineAdapter = extend(OasisInlineAdapter, {
      wrapResource: function (data, oasis) {
        var functionDef = 
          'var _globalOasis = window.oasis; window.oasis = oasis;' +
          'try {' +
          data +
          ' } finally {' +
          'window.oasis = _globalOasis;' +
          '}';
        return new Function("oasis", functionDef);
        }
    });

    var inlineAdapter = new InlineAdapter();

    inlineAdapter.addUnsupportedCapability('height');


    return inlineAdapter;
  });
define("conductor/lang",
  ["oasis/shims","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var a_indexOf = __dependency1__.a_indexOf;
    var a_filter = __dependency1__.a_filter;

    function copy(a) {
      var b = {};
      for (var prop in a) {
        if (!a.hasOwnProperty(prop)) { continue; }

        b[prop] = a[prop];
      }
      return b;
    }

    function setDiff(a, b) {
      var differences  = [];

      for(var prop in a) {
        if( a[prop] !== b[prop] ) {
          differences.push( prop );
        }
      }

      return differences;
    }

    __exports__.copy = copy;
    __exports__.setDiff = setDiff;
  });
define("conductor/lifecycle_consumer",
  ["oasis"],
  function(Oasis) {
    "use strict";

    var LifecycleConsumer = Oasis.Consumer.extend({
      initialize: function() {
        var consumer = this;

        this.card.waitForActivation().then(function() {
          consumer.send('activated');
        });
      }
    });


    return LifecycleConsumer;
  });
define("conductor/lifecycle_service",
  ["oasis"],
  function(Oasis) {
    "use strict";

    var LifecycleService = Oasis.Service.extend({
      events: {
        activated: function() {
          this.sandbox.activateDefered.resolve();
        }
      }
    });


    return LifecycleService;
  });
define("conductor/metadata_consumer",
  ["oasis"],
  function(Oasis) {
    "use strict";

    var MetadataConsumer = Oasis.Consumer.extend({
      requests: {
        metadataFor: function(name) {
          if (name === '*') {
            var values = [], names = [];

            for (var metadataName in this.card.options.metadata) {
              values.push(this.card.metadata[metadataName].call(this.card));
              names.push(metadataName);
            }

            return Oasis.RSVP.all(values).then(function(sources) {
              var metadata = {};

              for (var i = 0; i < sources.length; i++) {
                var name = names[i];
                for (var key in sources[i]) {
                  metadata[name+':'+key] = sources[i][key];
                }
              }

              return metadata;
            });

          } else {
            return this.card.metadata[name].call(this.card);
          }
        }
      }
    });


    return MetadataConsumer;
  });
define("conductor/metadata_service",
  ["oasis"],
  function(Oasis) {
    "use strict";

    var MetadataService = Oasis.Service.extend({
      initialize: function(port) {
        this.sandbox.metadataPort = port;
      }
    });


    return MetadataService;
  });
define("conductor/multiplex_service",
  ["oasis"],
  function(Oasis) {
    "use strict";
    /**
      Passes requests from each instance to `upstream`, a
      `Conductor.Oasis.Consumer`, and sends the responses back to the instance.
      This differs from simply passing `upstream`'s port to nested cards in two
      ways:

        1. `upstream` can still be used within the current card and
        2. requests from multiple nested cards can be sent to `upstream`.

      This is useful for cards who cannot fulfill dependency requests of its child
      cards, but whose containing environment can.


      Example:

        Conductor.card({
          activate: function () {
            var conductor = new Conductor();

            // nested conductor cannot load required resources, but its containing
            // environment can (possibly by passing the request up through its own
            // multiplex service).
            conductor.addDefaultCapability('xhr', Conductor.MultiplexService.extend({
                                                    upstream: this.consumers.xhr
                                                  }));

            // now the nested card can `Conductor.require` resources normally.
            conductor.card.load("/nested/card/url.js");
          }
        });
    */


    var MultiplexService = Oasis.Service.extend({
      initialize: function () {
        this.port.all(function (eventName, data) {
          if (eventName.substr(0, "@request:".length) === "@request:") {
            this.propagateRequest(eventName, data);
          } else {
            this.propagateEvent(eventName, data);
          }
        }, this);
      },

      propagateEvent: function (eventName, _data) {
        var data = (typeof this.transformEvent === 'function') ? this.transformEvent(eventName, _data) : _data;
        this.upstream.send(eventName, data);
      },

      propagateRequest: function (eventName, _data) {
        var requestEventName = eventName.substr("@request:".length),
            port = this.upstream.port,
            data = (typeof this.transformRequest === 'function') ? this.transformRequest(requestEventName, _data) : _data,
            requestId = data.requestId,
            args = data.args,
            self = this;

        args.unshift(requestEventName);
        port.request.apply(port, args).then(function (responseData) {
          self.send('@response:' + requestEventName, {
            requestId: requestId,
            data: responseData
          });
        });
      }
    });


    return MultiplexService;
  });
define("conductor/nested_wiretapping_consumer",
  ["oasis"],
  function(Oasis) {
    "use strict";

    var NestedWiretapping = Oasis.Consumer;


    return NestedWiretapping;
  });
define("conductor/nested_wiretapping_service",
  ["oasis"],
  function(Oasis) {
    "use strict";

    var NestedWiretappingService = Oasis.Service.extend({
      initialize: function (port) {
        this.sandbox.nestedWiretappingPort = port;
      }
    });


    return NestedWiretappingService;
  });
define("conductor/path",
  ["oasis/shims"],
  function(__dependency1__) {
    "use strict";
    var a_filter = __dependency1__.a_filter;
    /* global PathUtils:true */

    var PathUtils = window.PathUtils = {
      dirname: function (path) {
        return path.substring(0, path.lastIndexOf('/'));
      },

      expandPath: function (path) {
        var parts = path.split('/');
        for (var i = 0; i < parts.length; ++i) {
          if (parts[i] === '..') {
            for (var j = i-1; j >= 0; --j) {
              if (parts[j] !== undefined) {
                parts[i] = parts[j] = undefined;
                break;
              }
            }
          }
        }
        return a_filter.call(parts, function (part) { return part !== undefined; }).join('/');
      },

      cardResourceUrl: function(baseUrl, resourceUrl) {
        var url;
        if (/^((http(s?):)|\/)/.test(resourceUrl)) {
          url = resourceUrl;
        } else {
          url = PathUtils.dirname(baseUrl) + '/' + resourceUrl;
        }

        return PathUtils.expandPath(url);
      }
    };


    return PathUtils;
  });
define("conductor/render_consumer",
  ["oasis","conductor/dom"],
  function(Oasis, DomUtils) {
    "use strict";
    /*global DomUtils */


    var domInitialized = false;

    function resetCSS() {
      var head = document.head || document.documentElement.getElementsByTagName('head')[0],
          css = "",
          newStyle;

      css += "body {";
      css += "  margin: 0px;";
      css += "  padding: 0px;";
      css += "}";

      css += "iframe {";
      css += "  display: block;";
      css += "}";

      newStyle = DomUtils.createStyleElement(css);

      head.insertBefore(newStyle, head.children[0]);
    }

    var RenderConsumer = Oasis.Consumer.extend({
      events: {
        render: function(args) {
          if(!domInitialized) {
            resetCSS();

            if(this.card.initializeDOM) {
              this.card.initializeDOM();
            }

            domInitialized = true;
          }
          this.card.render.apply(this.card, args);
        }
      }
    });


    return RenderConsumer;
  });
define("conductor/render_service",
  ["oasis"],
  function(Oasis) {
    "use strict";

    var RenderService = Oasis.Service.extend({
      initialize: function(port) {
        this.sandbox.renderPort = port;
      }
    });


    return RenderService;
  });
define("conductor/services",
  ["conductor/assertion_service","conductor/xhr_service","conductor/render_service","conductor/metadata_service","conductor/data_service","conductor/lifecycle_service","conductor/height_service","conductor/nested_wiretapping_service","exports"],
  function(AssertionService, XhrService, RenderService, MetadataService, DataService, LifecycleService, HeightService, NestedWiretappingService, __exports__) {
    "use strict";

    /**
      Default Conductor services provided to every conductor instance.
    */
    var services = {
      xhr: XhrService,
      metadata: MetadataService,
      assertion: AssertionService,
      render: RenderService,
      lifecycle: LifecycleService,
      data: DataService,
      height: HeightService,
      nestedWiretapping: NestedWiretappingService
    };

    var capabilities = [
      'xhr', 'metadata', 'render', 'data', 'lifecycle', 'height',
      'nestedWiretapping'
    ];

    __exports__.services = services;
    __exports__.capabilities = capabilities;
  });
define("conductor/version",
  [],
  function() {
    "use strict";

    return '0.3.0';
  });
define("conductor/xhr_consumer",
  ["oasis","oasis/shims","conductor/dom"],
  function(Oasis, OasisShims, DomUtils) {
    "use strict";

    var a_forEach = OasisShims.a_forEach;

    var XhrConsumer = Oasis.Consumer.extend({
      initialize: function() {
        var promises = [],
            jsPromises = [],
            port = this.port,
            promise = this.card.deferred.xhr;

        function loadURL(callback) {
          return function(url) {
            var promise = port.request('get', url);
            promises.push(promise);
            promise.then(callback);
          };
        }

        function processJavaScript(data) {
          var script = document.createElement('script');
          var head = document.head || document.documentElement.getElementsByTagName('head')[0];
          // textContent is ie9+
          script.text = script.textContent = data;
          head.appendChild(script);
        }

        function processCSS(data) {
          var head = document.head || document.documentElement.getElementsByTagName('head')[0],
              style = DomUtils.createStyleElement(data);
          head.appendChild(style);
        }

        a_forEach.call(Conductor._dependencies.requiredJavaScriptURLs, function( url ) {
          var promise = port.request('get', url);
          jsPromises.push( promise );
          promises.push(promise);
        });
        Oasis.RSVP.all(jsPromises).then(function(scripts) {
          a_forEach.call(scripts, processJavaScript);
        }).catch( Oasis.RSVP.rethrow );
        a_forEach.call(Conductor._dependencies.requiredCSSURLs, loadURL(processCSS));

        Oasis.RSVP.all(promises).then(function() { promise.resolve(); }).catch( Oasis.RSVP.rethrow );
      }
    });


    return XhrConsumer;
  });
define("conductor/xhr_service",
  ["oasis/xhr","oasis","conductor/path"],
  function(__dependency1__, Oasis, PathUtils) {
    "use strict";
    var xhr = __dependency1__.xhr;
    /*global PathUtils */

    var XhrService = Oasis.Service.extend({
      requests: {
        get: function(url) {
          var service = this;
          var resourceUrl = PathUtils.cardResourceUrl(service.sandbox.options.url, url);

          return xhr(resourceUrl);
        }
      }
    });


    return XhrService;
  });
define("conductor/dev",
  ["rsvp"],
  function(RSVP) {
    "use strict";

    RSVP.configure('onerror', function (error) {
      if (typeof console !== 'undefined' && console.assert) {
        console.assert(false, error);
      }
      /* jshint debug:true */
      debugger;
    });


    // // Uncomment to disable async.  Note that this will cause some false positives,
    // // but can be helpful in debugging.
    // RSVP.configure('async', function (callback, arg) {
    //   callback(arg);
    // });

  });require('conductor/dev'); self.Oasis = require('oasis'); self.Conductor = require('conductor'); require('conductor/card'); self.oasis = new self.Oasis(); self.oasis.autoInitializeSandbox();