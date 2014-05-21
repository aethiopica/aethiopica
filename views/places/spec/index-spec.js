var AsyncSpec = require('jasmine-async')(jasmine);
var placeAPI = require("../index");
var reqMocker = function (out) {
  return {
    app: {
      db: {
        models: {
          Place: {
            pagedFind: function(o, out) { out(null, {filters:''}); },
            findById: function(id) {
              return {
                exec: function(out) {
                  if (id === 'notbobrossslug') { out(null, null); } else { out(null, {user: 'bobross'}); }
                }
              };
            },
            create: function (obj, out) { out(null, {}); }
          }
        }
      },
      utility: {
        workflow: (function() {
          var fns = {response: out && out.workflowResponse};
          return function(req, res) {
            return {
              on: function(id, out) { fns[id] = out; },
              emit: function(id) { fns[id](); },
              outcome: {}
            };
          };
        }()),
        slugify: function () { return 'notbobrossslug'; }
      }
    },
    params: {id: 'test'},
    user: {username: 'bobross'},
    query: {}, // name, pivot, limit, page, sort
    body: {name: 'test'}
  };
};

var resMocker = function (out) {
  return {
    header: function(key, value) { out.header(key, value); },
    render: function(template, data) { out.render(template, data); },
    send: function(results) { out.send(results); }
  };
};

describe("find", function(done) {
  var async = new AsyncSpec(this);
  async.it("should return results", function(done) {
    var res = resMocker({
      render: function(template, data) {
        expect(template).toBe('places/index');
        done();
      }
    });
    placeAPI.find(reqMocker(), res);
  });
});

describe("read", function(done) {
  var async = new AsyncSpec(this);
  async.it("should return results", function (done) {
    var res = resMocker({
      render: function(template, data) {
        expect(template).toBe('places/details');
        done();
      }
    });
    placeAPI.read(reqMocker(), res);
  });
});

describe("create", function(done) {
  var async = new AsyncSpec(this);
  async.it("should return results", function (done) {
    var req = reqMocker({
      workflowResponse: function() {
        expect(true).toBe(true);
        done();
      }
    });
    placeAPI.create(req, resMocker());
  });
});
