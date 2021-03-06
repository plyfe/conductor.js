var setDiff = require('conductor/lang').setDiff;
var destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 2);

Conductor.card({
  childCards: [{
    url: destinationUrl + '/test/fixtures/child/no_service_card.html',
    id: 1,
    options: {capabilities: ['assertion']}
  }],
  activate: function() {
    var customServices = setDiff(this.conductor.defaultServices(), (new Conductor()).defaultServices());

    ok(true, "parent card activated");
    equal( customServices.length, 1, "only one custom service");
    equal( customServices[0], 'xhr', "No custom services added on the parent card beside the multiplexed xhr service");
  }
});
