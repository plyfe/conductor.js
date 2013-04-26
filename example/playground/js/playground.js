/*globals $,RSVP*/

// Pluck off the RSVP object from Conductor and
// re-export it to the global scope.
window.RSVP = Conductor.Oasis.RSVP;

// Create a namespace for the Playground jQuery app
// to live in.
window.Playground = {
  crossOriginHtmlUrl: function(url) {
    if( !url.match(/^http/) ) {
      var link = document.createElement('a');
      link.href = url;
      link.port = parseInt( link.port, 10 ) + 1;
      url = link.href;
    }

    url = url.replace(/\.js$/, ".html");

    return url;
  },

  initialize: function() {
    // Create a new Conductor instance that will
    // manage all of the cards on the page.
    this.conductor = new Conductor();

    this.conductor.configure('allowSameOrigin', true);

    this.initializeServices();
    this.initializeCards();
    this.initializeAnalytics();

    $('#show-borders').on('change', function() {
      $('body').toggleClass('show-borders', $(this).val());
    });

    this.cardTemplate = $('.card-wrapper').hide();

    this.conductor.loadData(
      Playground.crossOriginHtmlUrl('../cards/tutorial/youtube_card.js'),
      '1',
      { videoId: '4d8ZDSyFS2g'}
    );
    this.addCard('../cards/tutorial/youtube_card.js', 1, []);
    this.addCard('../cards/tutorial/youtube_card.js', 1, ['video']);
  }
};

RSVP.EventTarget.mixin(window.Playground);

// Initialize the Playground application once the
// page has finished loading.
$(function() {
  Playground.initialize();
});

(function() {
  "use strict";

  var hasDefineProperty = (function () {
    if (!Object.defineProperty) {
      return false;
    } else {
      // Catch IE8 where Object.defineProperty exists but only works on DOM elements
      try {
        Object.defineProperty({}, 'a',{get:function(){}});
        return true;
      } catch (e) {
        return false;
      }
    }
  })();

  addStringExtensions();

  function addStringExtensions() {
    var stringProto = String.prototype;

    function fmt(str, formats) {
      // first, replace any ORDERED replacements.
      var idx  = 0; // the current index for non-numerical replacements
      return str.replace(/%@([0-9]+)?/g, function(s, argIndex) {
        argIndex = (argIndex) ? parseInt(argIndex,0) - 1 : idx++ ;
        s = formats[argIndex];
        return ((s === null) ? '(null)' : (s === undefined) ? '' : s).toString();
      }) ;
    }

    stringProto.fmt = function() {
      return fmt(this, arguments);
    };

    function extend(prop, getter) {
      if (hasDefineProperty) {
        Object.defineProperty(stringProto, prop, {
          get: getter
        });
      } else {
        // ie8 fallback
        stringProto[prop] = getter;
      }
    }

    extend('p', function() {
      return '<p>'+this+'</p>';
    });

    extend('bold', function() {
      return '<span style="font-weight: bold;">'+this+'</span>';
    });

    var colors = {
      red: '#a00',
      green: '#0a0',
      blue: '#4866ff',
      yellow: '#aa0',
      teal: '#0aa',
      magenta: '#a0a',
      lightGrey: '#aaa',
      veryLightGrey: '#666'
    };

    function extendColor(colorName, colorValue) {
      extend(colorName, function() {
        return "<span style='color: "+colorValue+";'>"+this+"</span>";
      });
    }

    for (var color in colors) {
      if ( ! colors.hasOwnProperty(color)) { continue; }

      extendColor(color, colors[color]);
    }
  }
})();
