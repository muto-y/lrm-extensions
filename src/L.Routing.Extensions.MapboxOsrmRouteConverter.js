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
+----------------------------------------------------------------------------------------------------------------------+
| This code is mainly coming from leaflet-routing-machine by Per Liedman.                                              |
| See https://github.com/perliedman/leaflet-routing-machine                                                            |
+----------------------------------------------------------------------------------------------------------------------+
*/

/*
--- L.Routing.Extensions.MapboxOsrmRouteConverter.js file --------------------------------------------------------------

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

	/*
	--- L.Routing.Extensions.MapboxOsrmRouteConverter object ---------------------------------------------------------------
	------------------------------------------------------------------------------------------------------------------------
	*/
	
	L.Routing.Extensions.MapboxOsrmRouteConverter = L.Class.extend ( {	

		/*
		--- initialize method --------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		initialize: function ( options ) {
			L.Util.setOptions( this, options );
		},

		/*
		--- createRoutes method ------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		createRoutes : function ( response, inputWaypoints, options ) {
			var routes = [];
			var route;
			for ( var counter = 0; counter < response.routes.length; counter++) {
				route = this._convertRoute ( response.routes [ counter ] );
				route.inputWaypoints = inputWaypoints;
				route.waypoints = this._toWaypoints ( inputWaypoints, response.waypoints );
				route.properties = { isSimplified: ! options || !options.geometryOnly || options.simplifyGeometry };
				routes.push ( route );
			}
			
			return routes;
		},
		
		/*
		--- _convertRoute method -----------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_convertRoute : function ( responseRoute ) {

			var	stepToText;
			if ( this.options.stepToText ) {
				stepToText = this.options.stepToText;
			} 
			else {
				var osrmTextInstructions = require('osrm-text-instructions');
				var textInstructions = osrmTextInstructions( 'v5', this.options.language );
				stepToText = textInstructions.compile.bind ( textInstructions );
			}
			
			var result = {
				name: '',
				coordinates: [ ],
				instructions: [ ],
				summary: {
					totalDistance: responseRoute.distance,
					totalTime: responseRoute.duration
				}
			};
			var	legNames = [ ];
			var	waypointIndices = [ ];
			var legsCount = responseRoute.legs.length;
			var hasSteps = responseRoute.legs [ 0 ].steps.length > 0;
			var	index = 0;
			
			for ( var legsCounter = 0; legsCounter < legsCount; legsCounter ++ ) {
				var leg = responseRoute.legs [ legsCounter ];
				legNames.push ( leg.summary && leg.summary.charAt ( 0 ).toUpperCase ( ) + leg.summary.substring ( 1 ) );

				for ( var stepsCounter = 0; stepsCounter < leg.steps.length; stepsCounter++) {
					var step = leg.steps [ stepsCounter ];
					var geometry = this._decodePolyline( step.geometry );
					result.coordinates.push.apply ( result.coordinates, geometry );
					var type = this._maneuverToInstructionType ( step.maneuver, legsCounter === legsCount - 1 );
					var modifier = this._maneuverToModifier ( step.maneuver );
					var stepText = stepToText ( step );

					if ( type ) {
						if ( ( legsCounter === 0 && step.maneuver.type === 'depart' ) || step.maneuver.type === 'arrive' ) {
							waypointIndices.push ( index );
						}

						result.instructions.push (
							{
								type : type,
								distance : step.distance,
								time : step.duration,
								road : step.name,
								direction : this._bearingToDirection ( step.maneuver.bearing_after ),
								exit : step.maneuver.exit,
								index : index,
								mode : step.mode,
								modifier : modifier,
								text : stepText
							}
						);
					}

					index += geometry.length;
				}

			}

			result.name = legNames.join ( ', ' );
			if ( ! hasSteps ) {
				result.coordinates = this._decodePolyline ( responseRoute.geometry );
			} 
			else {
				result.waypointIndices = waypointIndices;
			}

			return result;
		},

		/*
		--- _toWaypoints method ------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_toWaypoints : function ( inputWaypoints, responseWaypoints ) {
			
			var wayPoints = [];
			
			for ( var counter = 0; counter < responseWaypoints.length; counter ++ ) {
				wayPoints.push ( 
					L.Routing.waypoint ( 
						L.latLng ( responseWaypoints [ counter ].location [ 1 ], responseWaypoints [ counter].location [ 0 ] ),
						inputWaypoints [ counter ].name,
						inputWaypoints [ counter ].options
					)
				);
			}

			return wayPoints;
		},

		/*
		--- _decodePolyline method ---------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_decodePolyline : function ( routeGeometry ) {
			
			var	polyline = require('polyline');
	
			var coordinates = polyline.decode ( routeGeometry, this.options.polylinePrecision );
			var result = new Array ( coordinates.length );
			
			for ( var coordCounter = coordinates.length - 1; coordCounter >= 0; coordCounter -- ) {
				result [ coordCounter ] = L.latLng ( coordinates [ coordCounter ] );
			}

			return result;
		},

		/*
		--- _bearingToDirection method -----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_bearingToDirection : function ( bearing ) {
			var oct = Math.round ( bearing / 45 ) % 8;
			return [ 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW' ][ oct ];
		},
		
		/*
		--- _maneuverToInstructionType method ----------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_maneuverToInstructionType : function ( maneuver, lastLeg ) {
			switch ( maneuver.type ) {
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
					return this._camelCase ( maneuver.modifier );
			}
		},
		
		/*
		--- _maneuverToModifier method -----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_maneuverToModifier : function(maneuver) {
			var modifier = maneuver.modifier;

			switch (maneuver.type) {
			case 'merge':
			case 'fork':
			case 'on ramp':
			case 'off ramp':
			case 'end of road':
				modifier = this._leftOrRight ( modifier );
			}

			return modifier && this._camelCase ( modifier );
		},

		/*
		--- _camelCase method --------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_camelCase: function ( text ) {
			var words = text.split(' ');
			var result = '';
			for (var wordsCounter = 0; wordsCounter < words.length; wordsCounter++) {
				result += words [ wordsCounter ].charAt ( 0 ).toUpperCase ( ) + words [ wordsCounter ].substring ( 1 );
			}

			return result;
		},

		/*
		--- _leftOrRight method ------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_leftOrRight: function ( d ) {
			return d.indexOf ( 'left' ) >= 0 ? 'Left' : 'Right';
		}		
	} );
	
	/*
	--- L.Routing.extensions.mapboxOsrmRouteConverter function -------------------------------------------------------------
	L.Routing.Extensions.MapboxOsrmRouteConverter factory function
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.mapboxOsrmRouteConverter = function ( options ) {
		return new L.Routing.Extensions.MapboxOsrmRouteConverter ( options );
	};

	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.Extensions.mapboxOsrmRouteConverter;
	}
} ) ( );

/* --- End of L.Routing.Extensions.MapboxOsrmRouteConverter.js file --- */