'use strict';

exports = module.exports = function(app, mongoose) {
  var placeSchema = new mongoose.Schema({
    _id: { type: String },
    pivot: { type: String, default: '' },
    name: { type: String, default: '' }
	,lat: { type: String, default: '' }
	,lng: { type: String, default: '' }
	,address: { type: String, default: '' }
  });
  placeSchema.plugin(require('./plugins/pagedFind'));
  placeSchema.index({ pivot: 1 });
  placeSchema.index({ name: 1 });
  placeSchema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('Place', placeSchema);
};
