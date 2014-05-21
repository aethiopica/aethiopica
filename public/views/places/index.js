/* global app:true, google:true */

(function() {
  'use strict';

  app = app || {};

  app.Record = Backbone.Model.extend({
    idAttribute: '_id',
    defaults: {
      _id: undefined,
      success: false,
      errors: [],
      errfor: {},
      pivot: '',
      id: '',
      lat: '',
      lng: '',
      address: '',
      name: ''
    },
    url: function() {
      return '/places/'+ (this.isNew() ? '' : this.id +'/');
    }
  });

  app.RecordCollection = Backbone.Collection.extend({
    model: app.Record,
    url: '/places/',
    parse: function(results) {
      app.pagingView.model.set({
        pages: results.pages,
        items: results.items
      });
      return results.data;
    }
  });

  app.Paging = Backbone.Model.extend({
    defaults: {
      pages: {},
      items: {}
    }
  });

  app.HeaderView = Backbone.View.extend({
    el: '#header',
    template: _.template( $('#tmpl-header').html() ),
    events: {
      'submit form': 'preventSubmit',
      'keypress input[type="text"]': 'addNewOnEnter',
      'click .btn-add': 'addNew'
    },
    initialize: function() {
      this.model = new app.Record();
      this.listenTo(this.model, 'change', this.render);
      this.render();
    },
    render: function() {
      this.$el.html(this.template( this.model.attributes ));
      this.$el.find('input[name=address]').geocomplete({details: 'form'});
    },
    preventSubmit: function(event) {
      event.preventDefault();
    },
    addNewOnEnter: function(event) {
      if (event.keyCode !== 13) { return; }
      event.preventDefault();
      this.addNew();
    },
    addNew: function() {
      //if (this.$el.find('[name="my-name"]').val() !== '') {
      //   alert('Please enter a pivot.');
      // }
      // else if (this.$el.find('[name="name"]').val() === '') {
      //   alert('Please enter a name.');
      // }
      // leaving this as optional
      // else if (this.$el.find('[name="lat"]').val() === '') {
      //   alert('Please enter an address.');
      // }
      // else {
      this.model.save({
        name: this.$el.find('[name="my-name"]').val(),
        address: this.$el.find('[name="address"]').val(),
        lng: this.$el.find('[name="lng"]').val(),
        lat: this.$el.find('[name="lat"]').val(),
        id: this.$el.find('[name="id"]').val(),
        pivot: this.$el.find('[name="pivot"]').val()
      },{
        success: function(model, response) {
          if (response.success) {
            app.headerView.model.set({ pivot: '',
                                       id: '',
                                       lat: '',
                                       lng: '',
                                       address: '',
                                       name: ''});
            Backbone.history.stop();
            Backbone.history.start();
          }
          // else {
          //   // alert(response.errors.join('\n'));
          // }
        }
      });
    }
  });

  $('span').on('span', 'click', function () { alert('fuuu'); });
  
  app.ResultsView = Backbone.View.extend({
    el: '#results-container',
    template: _.template( $('#tmpl-results-items').html() ),
    initialize: function() {
      this.collection = new app.RecordCollection( app.mainView.results.data );
      this.listenTo(this.collection, 'reset', this.render);
      this.render();
    },
    render: function() {
      this.$el.html( this.template() );

      var frag = document.createDocumentFragment();
      this.collection.each(function(record) {
        var view = new app.ResultsRowView({ model: record });
        frag.appendChild(view.render().el);
      }, this);
      $('#results-items').append(frag);

      if (this.collection.length === 0) {
        $('#results-items').append( $('#tmpl-results-empty-item').html() );
      }
    }
  });

  app.ResultsRowView = Backbone.View.extend({
    tagName: 'li',
    template: _.template( $('#tmpl-results-item').html() ),
    events: {
      'click .btn-details': 'viewDetails'
    },
    viewDetails: function() {
      location.href = this.model.url();
    },
    render: function() {
      var attrs = _.clone(this.model.attributes);
      // shorten things for readability
      attrs.address = attrs.address.replace(/, [A-Z]{2}, United States/, ''); 
      this.$el.html(this.template(attrs));
      return this;
    }
  });

  app.PagingView = Backbone.View.extend({
    el: '#results-paging',
    template: _.template( $('#tmpl-results-paging').html() ),
    events: {
      'click .btn-page': 'goToPage'
    },
    initialize: function() {
      this.model = new app.Paging({ pages: app.mainView.results.pages, items: app.mainView.results.items });
      this.listenTo(this.model, 'change', this.render);
      this.render();
    },
    render: function() {
      if (this.model.get('pages').total > 1) {
        this.$el.html(this.template( this.model.attributes ));

        if (!this.model.get('pages').hasPrev) {
          this.$el.find('.btn-prev').attr('disabled', 'disabled');
        }

        if (!this.model.get('pages').hasNext) {
          this.$el.find('.btn-next').attr('disabled', 'disabled');
        }
      }
      else {
        this.$el.empty();
      }
    },
    goToPage: function(event) {
      var query = '&page='+ $(event.target).data('page');
      Backbone.history.navigate('q/'+ query, { trigger: true });
      $('body').scrollTop(0);
    }
  });

  app.MainView = Backbone.View.extend({
    el: '.page .container',
    initialize: function() {
      app.mainView = this;
      this.results = JSON.parse( unescape($('#data-results').html()) );

      app.headerView = new app.HeaderView();
      app.resultsView = new app.ResultsView();
      app.pagingView = new app.PagingView();
      app.mapView = new app.MapView();
    }
  });

  // conveniece methods for google maps 3.X that were in 2.X, thanks to some guy on stackoverflow
  google.maps.Map.prototype.markers = [];
  google.maps.Map.prototype.addMarker = function(marker) {
    this.markers[this.markers.length] = marker;
  };
  google.maps.Map.prototype.getMarkers = function() {
    return this.markers;
  };
  google.maps.Map.prototype.clearMarkers = function() {
    for(var i=0; i<this.markers.length; i++){
      this.markers[i].setMap(null);
    }
    this.markers = [];
  };

  app.MapView = Backbone.View.extend({
    initialize: function() {
      this.map = new google.maps.Map($('#map')[0], {
        // zoom: 13,
        // center: new google.maps.LatLng(37.7833, -122.4167),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        // mapTypeControlOptions: {
        //   position: google.maps.ControlPosition.BOTTOM_CENTER
        // },
        panControl: true,
        panControlOptions: {
          position: google.maps.ControlPosition.TOP_RIGHT
        },
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.TOP_RIGHT
        },
        streetViewControl: true,
        streetViewControlOptions: {
          position: google.maps.ControlPosition.TOP_RIGHT
        }
      });
      this.listeners = [];
      this.bounds = new google.maps.LatLngBounds();
      this.infowindow = new google.maps.InfoWindow();
      
      this.collection = app.resultsView.collection;
      this.listenTo(this.collection, 'reset', this.render);
      this.render();
    },
    render: function() {
      // TODO clearMarkers
      this.map.clearMarkers();

      var showMarker = function (infowindow, marker, i, label) {
        return function () {
          infowindow.setContent(label);
          infowindow.open(this.map, marker);
        };
      };
      // don't double-bind the listeners
      _.each(this.listeners, function (l) { l.remove(); });
      this.listeners = [];
      this.bounds = new google.maps.LatLngBounds();
      this.infowindow = new google.maps.InfoWindow();
      if (!this.collection.length) {
        // default bounds for san francisco
        this.bounds.extend(new google.maps.LatLng(37.79, -122.49));
        this.bounds.extend(new google.maps.LatLng(37.73, -122.40));
        // this.map.setZoom(10);
      }
      this.collection.each(function(record, i) {
        if (record.get('lat') && record.get('lng')) {
          var lat = parseFloat(record.get('lat'));
          var lng = parseFloat(record.get('lng'));
          var latLng = new google.maps.LatLng(lat, lng);
          // TODO probably messes up at greenwich
          var latLngForZoomA = new google.maps.LatLng(lat + 0.005, lng + 0.005);
          var latLngForZoomB = new google.maps.LatLng(lat - 0.005, lng - 0.005);
          var marker = new google.maps.Marker({
            position: latLng,
            map: this.map
          });
          this.map.addMarker(marker);
          this.bounds.extend(latLng);
          this.bounds.extend(latLngForZoomA);
          this.bounds.extend(latLngForZoomB);
          var listener = google.maps.event.addListener(marker, 'click', showMarker(this.infowindow, marker, i, record.get('name')));
          this.listeners.push(listener);
        }
      }, this);
      this.map.fitBounds(this.bounds);
      this.map.panToBounds(this.bounds);
      this.map.panBy(-300, 0);
    }
  });

  app.Router = Backbone.Router.extend({
    routes: {
      '': 'default',
      'q/:params': 'query'
    },
    initialize: function() {
      app.mainView = new app.MainView();
    },
    default: function() {
      if (!app.firstLoad) {
        app.resultsView.collection.fetch({ reset: true });
      }

      app.firstLoad = false;
    },
    query: function(params) {
      app.resultsView.collection.fetch({ data: params, reset: true });
      app.firstLoad = false;
    }
  });

  $(document).ready(function() {
    app.firstLoad = true;
    app.router = new app.Router();
    Backbone.history.start();
  });
}());
