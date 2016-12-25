/*
Copyright - 2015 2016 - Christian Guyette - Contact: http//www.ouaie.be/
This  program is free software;
you can redistribute it and/or modify it under the terms of the 
GNU General Public License as published by the Free Software Foundation;
either version 3 of the License, or any later version.
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

/*
--- L.Routing.Extensions.Router.js file ---------------------------------------------------------------------------------------
This file contains:
	- 
	- 
Changes:
	- v1.0.1:
		- created
		
Doc not reviewed...
Tests to do...
------------------------------------------------------------------------------------------------------------------------
*/

(function() {
	'use strict';

	var corslite = require('corslite');
	var	polyline = require('polyline');
	var osrmTextInstructions = require('osrm-text-instructions');

	L.Routing.Extensions.Router = L.Class.extend ( {	
	
		options: {
			serviceUrl: 'https://router.project-osrm.org/route/v1',
			profile: 'driving',
			timeout: 30 * 1000,
			routingOptions: {
				alternatives: true,
				steps: true
			},
			polylinePrecision: 5,
			useHints: true,
			suppressDemoServerWarning: false,
			language: 'en'
		},
		
		transitMode : 'car',

		initialize: function ( options ) {
			L.Util.setOptions( this, options );
			this._hints = {
				locations: {}
			};

			if (!this.options.suppressDemoServerWarning &&
				this.options.serviceUrl.indexOf('//router.project-osrm.org') >= 0) {
				console.warn('You are using OSRM\'s demo server. ' +
					'Please note that it is **NOT SUITABLE FOR PRODUCTION USE**.\n' +
					'Refer to the demo server\'s usage policy: ' +
					'https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy\n\n' +
					'To change, set the serviceUrl option.\n\n' +
					'Please do not report issues with this server to neither ' +
					'Leaflet Routing Machine or OSRM - it\'s for\n' +
					'demo only, and will sometimes not be available, or work in ' +
					'unexpected ways.\n\n' +
					'Please set up your own OSRM server, or use a paid service ' +
					'provider for production.');
			}
		},

		route: function ( waypoints, callback, context, options ) {

			options = L.extend ( { }, this.options.routingOptions, options);
			
			var url = this.buildRouteUrl ( waypoints, options );
			console.log ( url );
			
			var timedOut = false;
			var	timer;

			timer = setTimeout ( 
				function ( ) {
					timedOut = true;
					callback.call ( context || callback, {
						status: -1,
						message: this.options.provider + ' request timed out.'
					} );
				}, 
				this.options.timeout
			);

			// Create a copy of the waypoints, since they
			// might otherwise be asynchronously modified while
			// the request is being processed.
			var	tmpWaypoints = [];
			var	tmpWaypoint;
			for ( var counter = 0; counter < waypoints.length; counter++ ) {
				tmpWaypoint = waypoints [ counter ];
				tmpWaypoints.push ( new L.Routing.Waypoint ( tmpWaypoint.latLng, tmpWaypoint.name, tmpWaypoint.options ) );
			}

			var	xhr;
			xhr = corslite ( 
				url, 
				L.bind (
					function ( err, resp ) {
						var data;
						var error = { };

						clearTimeout ( timer );

						if ( ! timedOut ) {
							if ( ! err ) {
								try {
									data = JSON.parse ( resp.responseText );
									try {
										return this._routeDone( data, tmpWaypoints, options, callback, context );
									} 
									catch ( ex ) {
										error.status = -3;
										error.message = ex.toString ( );
									}
								} 
								catch ( ex ) {
									error.status = -2;
									error.message = 'Error parsing OSRM response: ' + ex.toString ( );
								}
							}
							else {
								error.message = 'HTTP request failed: ' + 
									err.type +
									(err.target && err.target.status ? ' HTTP ' + err.target.status + ': ' + err.target.statusText : '');
								error.url = url;
								error.status = -1;
								error.target = err;
							}

							callback.call ( context || callback, error );
						} 
						else {
							xhr.abort();
						}
					}, 
					this 
				)
			);
			return xhr;
		},

		_routeDoneMapboxOsrm : function ( response, inputWaypoints, options, callback, context ) {
			console.log ( JSON.stringify ( response ) );

			context = context || callback;
			if ( response.code !== 'Ok' ) {
				callback.call ( 
					context, 
					{
						status: response.code
					}
				);
				return;
			}

			var routes = [];
			var route;
			for ( var counter = 0; counter < response.routes.length; counter++) {
				route = this._convertRouteMapboxOsrm ( response.routes [ counter ] );
				route.inputWaypoints = inputWaypoints;
				route.waypoints = this._toWaypointsMapboxOsrm ( inputWaypoints, response.waypoints );
				route.properties = { isSimplified: ! options || !options.geometryOnly || options.simplifyGeometry };
				routes.push ( route );
			}

			// tmp // this._saveHintData( response.waypoints, inputWaypoints );

			callback.call( context, null, routes );
		},
		
		_toWaypointsMapboxOsrm : function ( inputWaypoints, responseWaypoints ) {
			var tmpWayPoints = [];
			for ( var counter = 0; counter < responseWaypoints.length; counter++ ) {
				tmpWayPoints.push ( 
					new L.Routing.Waypoint ( 
						L.latLng ( responseWaypoints [ counter ].location [ 1 ], responseWaypoints [ counter].location [ 0 ] ),
						inputWaypoints [ counter ].name,
						inputWaypoints [ counter ].options
					)
				);
			}

			return tmpWayPoints;
		},
		
		_convertRouteMapboxOsrm : function ( responseRoute ) {
			var result = {
					name: '',
					coordinates: [],
					instructions: [],
					summary: {
						totalDistance: responseRoute.distance,
						totalTime: responseRoute.duration
					}
				};
			var	legNames = [],
				waypointIndices = [],
				index = 0,
				legCount = responseRoute.legs.length,
				hasSteps = responseRoute.legs[0].steps.length > 0,
				i,
				j,
				leg,
				step,
				geometry,
				type,
				modifier,
				text,
				stepToText;

			if (this.options.stepToText) {
				stepToText = this.options.stepToText;
			} else {
				var textInstructions = osrmTextInstructions('v5', this.options.language);
				stepToText = textInstructions.compile.bind(textInstructions);
			}
			for (i = 0; i < legCount; i++) {
				leg = responseRoute.legs[i];
				legNames.push(leg.summary && leg.summary.charAt(0).toUpperCase() + leg.summary.substring(1));

				for (j = 0; j < leg.steps.length; j++) {
					step = leg.steps[j];
					geometry = this._decodePolyline(step.geometry);
					result.coordinates.push.apply(result.coordinates, geometry);
					type = this._maneuverToInstructionType(step.maneuver, i === legCount - 1);
					modifier = this._maneuverToModifier(step.maneuver);
					text = stepToText(step);

					if (type) {
						if ((i === 0 && step.maneuver.type === 'depart') || step.maneuver.type === 'arrive') {
							waypointIndices.push(index);
						}

						result.instructions.push({
							type: type,
							distance: step.distance,
							time: step.duration,
							road: step.name,
							direction: this._bearingToDirection(step.maneuver.bearing_after),
							exit: step.maneuver.exit,
							index: index,
							mode: step.mode,
							modifier: modifier,
							text: text
						});
					}

					index += geometry.length;
				}

			}

			result.name = legNames.join(', ');
			if (!hasSteps) {
				result.coordinates = this._decodePolyline(responseRoute.geometry);
			} else {
				result.waypointIndices = waypointIndices;
			}

			return result;
		},

		_decodePolyline: function(routeGeometry) {
			var cs = polyline.decode(routeGeometry, this.options.polylinePrecision),
				result = new Array(cs.length),
				i;
			for (i = cs.length - 1; i >= 0; i--) {
				result[i] = L.latLng(cs[i]);
			}

			return result;
		},

		_bearingToDirection: function(bearing) {
			var oct = Math.round(bearing / 45) % 8;
			return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][oct];
		},
		
		_maneuverToInstructionType: function(maneuver, lastLeg) {
			switch (maneuver.type) {
			case 'new name':
				return 'Continue';
			case 'depart':
				return 'Head';
			case 'arrive':
				return lastLeg ? 'DestinationReached' : 'WaypointReached';
			case 'roundabout':
			case 'rotary':
				return 'Roundabout';
			case 'merge':
			case 'fork':
			case 'on ramp':
			case 'off ramp':
			case 'end of road':
				return this._camelCase(maneuver.type);
			// These are all reduced to the same instruction in the current model
			//case 'turn':
			//case 'ramp': // deprecated in v5.1
			default:
				return this._camelCase(maneuver.modifier);
			}
		},
		_maneuverToModifier: function(maneuver) {
			var modifier = maneuver.modifier;

			switch (maneuver.type) {
			case 'merge':
			case 'fork':
			case 'on ramp':
			case 'off ramp':
			case 'end of road':
				modifier = this._leftOrRight(modifier);
			}

			return modifier && this._camelCase(modifier);
		},

		_camelCase: function(s) {
			var words = s.split(' '),
				result = '';
			for (var i = 0, l = words.length; i < l; i++) {
				result += words[i].charAt(0).toUpperCase() + words[i].substring(1);
			}

			return result;
		},

		_leftOrRight: function(d) {
			return d.indexOf('left') >= 0 ? 'Left' : 'Right';
		},
		
		_routeDone : function ( response, inputWaypoints, options, callback, context )	 {
			switch ( this.options.provider ) {
				case 'graphhopper':
					return this._routeDoneGraphHopper ( response, inputWaypoints, options, callback, context );
				case 'mapbox':
					return this._routeDoneMapboxOsrm ( response, inputWaypoints, options, callback, context );
				case 'mapzen':
					return this._routeDoneMapzen ( response, inputWaypoints, options, callback, context );
				case 'osrm':
					return this._routeDoneMapboxOsrm ( response, inputWaypoints, options, callback, context );
				default:
					break;
			}
		},
		
		_buildRouteUrlGraphHopper : function ( waypoints, options) {
			
			var vehicle;
			switch ( this.options.transitMode ) {
				case 'bike':
				{
					vehicle = 'bike';
					break;
				}
				case 'pedestrian':
				{
					vehicle = 'foot';
					break;
				}
				case 'car':
				{
					vehicle = 'car';
					break;
				}
			}
			
			var	locations = [];

			for ( var counter = 0; counter < waypoints.length; counter++ ) {
				locations.push ( 'point=' + waypoints [ counter ].latLng.lat + ',' + waypoints [ counter ].latLng.lng );
			}

			return 'https://graphhopper.com/api/1/route' + 
				'?' +
				locations.join('&') +
				'&instructions=true&type=json&key=' + 
				this.options.providerKeys.GraphHopper +
				'&locale=' +
				this.options.language +
				'&vehicle=' +
				vehicle;
			//https://graphhopper.com/api/1/route?point=50.50901,5.49351&point=50.50959,5.49657&instructions=true&type=json&key=xxxxxxxxxxxxxxxxxxxxxxxxxxx&locale=fr&vehicle=car
		},
		
		_buildRouteUrlMapboxOsrm: function( waypoints, options ) {
			var profile;
			var serviceUrl;
			var useHints;
			if ( 'osrm' === this.options.provider ) {
				serviceUrl = 'https://router.project-osrm.org/route/v1';
				profile = 'driving';
				useHints = true;
			}
			else if ( 'mapbox' === this.options.provider ) {
				serviceUrl = 'https://api.mapbox.com/directions/v5';
				useHints = false;
				switch ( this.options.transitMode ) {
					case 'bike':
					{
						profile = 'mapbox/cycling';
						break;
					}
					case 'pedestrian':
					{
						profile = 'mapbox/walking';
						break;
					}
					case 'car':
					{
						profile = 'mapbox/driving';
						break;
					}
				}
			}
			
			var locations = [];
			var hints = [];
			var	waypoint;
			var latLng;

			for ( var counter = 0; counter < waypoints.length; counter ++ ) {
				waypoint = waypoints [ counter ];
				latLng = waypoint.latLng;
				locations.push ( latLng.lng + ',' + latLng.lat );
				hints.push ( this._hints.locations [ latLng.lat + ',' + latLng.lng ] || '' );
			}

			return serviceUrl + 
				'/' + 
				profile + 
				'/' +
				locations.join(';') + 
				'?' +
				( options.geometryOnly ? ( options.simplifyGeometry ? '' : 'overview=full' ) : 'overview=false' ) +
				'&alternatives=true' + 
				'&steps=true' + 
				( useHints ? '&hints=' + hints.join(';') : '' ) +
				( options.allowUTurns ? '&continue_straight=' + !options.allowUTurns : '') +
				( 'mapbox' === this.options.provider ? '&access_token=' + this.options.providerKeys.Mapbox : '' );
				// https://api.mapbox.com/directions/v5/mapbox/driving/5.493505,50.509012;5.496565103530885,50.509585337052286?overview=false&alternatives=true&steps=true&access_token=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
		},
		
		_buildRouteUrlMapzen : function ( waypoints, options ) {
			var costing;
			var costingOptions;
			switch ( this.options.transitMode ) {
				case 'bike':
				{
					costing = "bicycle";
					costingOptions = { bicycle: { bicycle_type: "Mountain", cycling_speed: "20.0", use_roads: "0", use_hills: "1" } };
					break;
				}
				case 'pedestrian':
				{
					costing = "pedestrian";
					costingOptions = { pedestrian: { walking_speed: "4.0" } };
					break;
				}
				case 'car':
				{
					costing = "auto";
					costingOptions = { auto: { country_crossing_cost : "60" } };
					break;
				}
			}
			
			var locations = [];
			for (var counter = 0; counter < waypoints.length; counter ++ ) {
				var locationType =  ( ( 0 === counter ) || ( waypoints.length - 1 === counter ) ) ? "break" : "through";
				locations.push (
					{ 
						lat: waypoints [ counter ].latLng.lat ,
						lon : waypoints [ counter ].latLng.lng , 
						type : locationType
					}
				);
			}
			
			var locationsString = JSON.stringify ( {
				locations: locations,
				costing: costing,
				costing_options: costingOptions,
				directions_options: { language: this.options.language }
			});
			
			return 'https://valhalla.mapzen.com/route?json=' +
				locationsString + 
				'&api_key=' + 
				this.options.providerKeys.Mapzen;
			// https://valhalla.mapzen.com/route?json={"locations":[{"lat":50.50901,"lon":5.49351,"type":"break"},{"lat":50.509585337052286,"lon":5.496929883956909,"type":"break"}],"costing":"auto","costing_options":{"bicycle":{"bicycle_type":"Mountain","cycling_speed":"20.0","use_roads":"0","use_hills":"1"}},"directions_options":{"language":"fr"}}&api_key=xxxxxxx
		},
		
		buildRouteUrl : function ( waypoints, options )	 {
			switch ( this.options.provider ) {
				case 'graphhopper':
					return this._buildRouteUrlGraphHopper ( waypoints, options );
				case 'mapbox':
					var converter = require ( './L.Routing.Extensions.MapboxOsrmRouteConverter' ) ;
					converter ( this.options ) ;
					return this._buildRouteUrlMapboxOsrm ( waypoints, options );
				case 'mapzen':
					return this._buildRouteUrlMapzen ( waypoints, options );
				case 'osrm':
					return this._buildRouteUrlMapboxOsrm ( waypoints, options );
				default:
					break;
			}
		}
	});
	
	/*
	--- L.Routing.extensions function --------------------------------------------------------------------------------------
	L.Routing.Extensions factory function
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.router = function ( options ) {
		return new L.Routing.Extensions.Router ( options );
	};

	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.Extensions.router;
	}
} ) ( );

/* --- End of L.Routing.Extensions.Router.js file --- */