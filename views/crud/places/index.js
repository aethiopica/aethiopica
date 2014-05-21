'use strict';

exports.find = function(req, res, next){
  req.query.pivot = req.query.pivot ? req.query.pivot : '';
  req.query.name = req.query.name ? req.query.name : '';
  req.query.limit = req.query.limit ? parseInt(req.query.limit, null) : 20;
  req.query.page = req.query.page ? parseInt(req.query.page, null) : 1;
  req.query.sort = req.query.sort ? req.query.sort : '_id';

  var filters = {};
  if (req.query.pivot) {
    filters.pivot = new RegExp('^.*?'+ req.query.pivot +'.*$', 'i');
  }

  if (req.query.name) {
    filters.name = new RegExp('^.*?'+ req.query.name +'.*$', 'i');
  }

  req.app.db.models.Place.pagedFind({
    filters: filters,
    keys: 'pivot name id lat lng address name',
    limit: req.query.limit,
    page: req.query.page,
    sort: req.query.sort
  }, function(err, results) {
    if (err) {
      return next(err);
    }

    if (req.xhr) {
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      results.filters = req.query;
      res.send(results);
    }
    else {
      results.filters = req.query;
      res.render('crud/places/index', { data: { results: escape(JSON.stringify(results)) } });
    }
  });
};

exports.read = function(req, res, next){
  req.app.db.models.Place.findById(req.params.id).exec(function(err, place) {
    if (err) {
      return next(err);
    }

    if (req.xhr) {
      res.send(place);
    }
    else {
      res.render('crud/places/details', { data: { record: escape(JSON.stringify(place)) } });
    }
  });
};

exports.create = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('You may not create places.');
      return workflow.emit('response');
    }

    if (!req.body.pivot) {
      workflow.outcome.errors.push('A pivot is required.');
      return workflow.emit('response');
    }

    if (!req.body.name) {
      workflow.outcome.errors.push('A name is required.');
      return workflow.emit('response');
    }

    workflow.emit('duplicatePlaceCheck');
  });

  workflow.on('duplicatePlaceCheck', function() {
    req.app.db.models.Place.findById(req.app.utility.slugify(req.body.pivot +' '+ req.body.name)).exec(function(err, place) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (place) {
        workflow.outcome.errors.push('That place+pivot is already taken.');
        return workflow.emit('response');
      }

      workflow.emit('createPlace');
    });
  });

  workflow.on('createPlace', function() {
    var fieldsToSet = {
      _id: req.app.utility.slugify(req.body.pivot +' '+ req.body.name),
      pivot: req.body.pivot,
      name: req.body.name,
      id: req.body.id,
      lat: req.body.lat,
      lng: req.body.lng,
      address: req.body.address
    };

    req.app.db.models.Place.create(fieldsToSet, function(err, place) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.record = place;
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.update = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('You may not update places.');
      return workflow.emit('response');
    }

    if (!req.body.pivot) {
      workflow.outcome.errfor.pivot = 'pivot';
      return workflow.emit('response');
    }

    if (!req.body.name) {
      workflow.outcome.errfor.name = 'required';
      return workflow.emit('response');
    }

    workflow.emit('patchPlace');
  });

  workflow.on('patchPlace', function() {
    var fieldsToSet = {
      pivot: req.body.pivot,
      name: req.body.name,
      id: req.body.id,
      lat: req.body.lat,
      lng: req.body.lng,
      address: req.body.address
    };

    req.app.db.models.Place.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, place) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.place = place;
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.delete = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('You may not delete places.');
      return workflow.emit('response');
    }

    workflow.emit('deletePlace');
  });

  workflow.on('deletePlace', function(err) {
    req.app.db.models.Place.findByIdAndRemove(req.params.id, function(err, place) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.emit('response');
    });
  });

  workflow.emit('validate');
};
