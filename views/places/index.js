'use strict';

exports.find = function(req, res, next){
  req.query.pivot = req.query.pivot ? req.query.pivot : '';
  req.query.name = req.query.name ? req.query.name : '';
  req.query.limit = req.query.limit ? parseInt(req.query.limit, null) : 20;
  req.query.page = req.query.page ? parseInt(req.query.page, null) : 1;
  req.query.sort = req.query.sort ? req.query.sort : '_id';

  // TODO admins can specify any username
  var filters = { user: (req.user && req.user.username) || ''};
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
      res.render('places/index', { data: { results: escape(JSON.stringify(results)) } });
    }
  });
};

exports.read = function(req, res, next){
  req.app.db.models.Place.findById(req.params.id).exec(function(err, place) {
    if (err) {
      return next(err);
    }

    if (place.user !== req.user.username) {
      return require('../http/index').http404(req, res, next);
    }

    if (req.xhr) {
      res.send(place);
    }
    else {
      res.render('places/details', { data: { record: escape(JSON.stringify(place)) } });
    }
  });
};

exports.create = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    // if (!req.body.pivot) {
    //   workflow.outcome.errors.push('A pivot is required.');
    //   return workflow.emit('response');
    // }

    if (!req.body.name) {
      workflow.outcome.errors.push('A name is required.');
      return workflow.emit('response');
    }

    workflow.emit('duplicatePlaceCheck');
  });

  workflow.on('duplicatePlaceCheck', function() {
    req.app.db.models.Place.findById(req.app.utility.slugify(req.user.username +' '+ req.body.name)).exec(function(err, place) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (place) {
        workflow.outcome.errors.push('That place already exists.');
        return workflow.emit('response');
      }

      workflow.emit('createPlace');
    });
  });

  workflow.on('createPlace', function() {
    var fieldsToSet = {
      _id: req.app.utility.slugify(req.user.username +' '+ req.body.name),
      pivot: req.body.pivot,
      name: req.body.name,
      id: req.body.id,
      lat: req.body.lat,
      lng: req.body.lng,
      address: req.body.address,
      user: req.user.username
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
    // if (!req.body.pivot) {
    //   workflow.outcome.errfor.pivot = 'pivot';
    //   return workflow.emit('response');
    // }

    if (!req.body.name) {
      workflow.outcome.errfor.name = 'required';
      return workflow.emit('response');
    }

    req.app.db.models.Place.findById(req.params.id).exec(function(err, place) {
      if (err) {
        return next(err);
      }
      
      if (place.user !== req.user.username) {
        return require('../http/index').http404(req, res, next);
      }

      workflow.emit('patchPlace');
    });
  });

  workflow.on('patchPlace', function() {
    var fieldsToSet = {
      pivot: req.body.pivot,
      name: req.body.name,
      id: req.body.id,
      lat: req.body.lat,
      lng: req.body.lng,
      address: req.body.address,
      user: req.user.username
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
    req.app.db.models.Place.findById(req.params.id).exec(function(err, place) {
      if (err) {
        return next(err);
      }
      
      if (place.user !== req.user.username) {
        return require('../http/index').http404(req, res, next);
      }

      workflow.emit('deletePlace');
    });
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
