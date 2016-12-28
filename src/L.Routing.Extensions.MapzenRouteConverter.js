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
| This code is mainly coming from lrm-mapzen by mapzen.                                                                |
| See https://github.com/mapzen/lrm-mapzen                                                                             |
+----------------------------------------------------------------------------------------------------------------------+
*/

/*
--- L.Routing.Extensions.MapzenRouteConverter.js file ------------------------------------------------------------------
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

	var	polyline = require('polyline');

	/*
	--- L.Routing.Extensions.MapzenRouteConverter object ---------------------------------------------------------------
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.MapzenRouteConverter = L.Class.extend ( {	

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

		createRoutes : function ( response, inputWaypoints, routeOptions ) {

			var insts = [ ];
			var coordinates = [ ];
			var shapeIndex =  0;

			for ( var legsCounter = 0; legsCounter < response.trip.legs.length; legsCounter++ ) {
				var coord = polyline.decode ( response.trip.legs [ legsCounter ].shape, 6 );

				for ( var coordCounter = 0; coordCounter < coord.length; coordCounter++ ) {
					coordinates.push ( L.latLng ( coord [ coordCounter ][ 0 ], coord [ coordCounter ][ 1 ] ) );
				}

				for ( var maneuversCounter = 0; maneuversCounter < response.trip.legs [ legsCounter ].maneuvers.length; maneuversCounter++ ){
					var res = response.trip.legs [ legsCounter ].maneuvers [ maneuversCounter ];
					res.distance = response.trip.legs [ legsCounter ].maneuvers [ maneuversCounter ].length;
					res.index = shapeIndex + response.trip.legs [ legsCounter ].maneuvers [ maneuversCounter ].begin_shape_index;
					insts.push ( res );
				}

				if ( routeOptions.costing === 'multimodal' ) {
					insts = this._unifyTransitManeuver ( insts );
				}

				shapeIndex += response.trip.legs [ legsCounter ].maneuvers [ response.trip.legs [ legsCounter ].maneuvers.length-1 ].begin_shape_index;
			}

			var actualWaypoints = this._toWaypoints ( inputWaypoints, response.trip.locations );

			var subRoutes;
			if ( routeOptions.costing == 'multimodal' ) {
				subRoutes = this._getSubRoutes ( response.trip.legs );
			}

			var alts = [
				{
					name : '',
					unit : response.trip.units,
					costing : routeOptions.costing,
					coordinates : coordinates,
					subRoutes : subRoutes,
					instructions : insts,//response.route_instructions ? this._convertInstructions(response.route_instructions) : [],
					summary : response.trip.summary ? this._convertSummary ( response.trip.summary ) : [ ],
					inputWaypoints: inputWaypoints,
					waypoints: actualWaypoints,
					waypointIndices: this._clampIndices ( [ 0, response.trip.legs [ 0 ].maneuvers.length ], coordinates )
				}
			];

			return alts;
		},
		
		/*
		--- _unifyTransitManeuver method ---------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_unifyTransitManeuver: function ( insts ) {

			var transitType;
			var newInsts = insts;

			for ( var i = 0; i < newInsts.length; i ++ ) {
				if ( newInsts [ i ].type == 30) {
				  transitType = newInsts [ i ].travel_type;
				  break;
				}
			}

			for ( var j = 0; j < newInsts.length; j ++) {
				if ( newInsts [ j ].type > 29 ) {
					newInsts [ j ].edited_travel_type = transitType;
				}
			}

			return newInsts;
		},
		
		/*
		--- _toWaypoints method ------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_toWaypoints: function ( inputWaypoints, responseWaypoints ) {
		
			var wayPoints = [ ];
			for ( var counter = 0; counter < responseWaypoints.length; counter ++) {
				wayPoints.push (
					L.Routing.waypoint (
						L.latLng ( [ responseWaypoints [ counter ].lat, responseWaypoints [ counter ].lon ] ),
						inputWaypoints [ counter ].name,
						inputWaypoints [ counter ].options
					)
				);
			}

			return wayPoints;
		},
		
		/*
		--- _getSubRoutes method -----------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_getSubRoutes: function(legs) {

			var subRoute = [];

			for ( var i = 0; i < legs.length; i ++ ) {
				var coords = polyline.decode(legs[i].shape, 6);

				var lastTravelType;
				var transitIndices = [ ];
				for( var j = 0; j < legs [ i ].maneuvers.length; j ++ ) {
					var res = legs [ i ].maneuvers [ j ];
					var travelType = res.travel_type;

					if ( travelType !== lastTravelType || res.type === 31 /*this is for transfer*/) {
						//transit_info only exists in the transit maneuvers
						//loop thru maneuvers and populate indices array with begin shape index
						//also populate subRoute array to contain the travel type & color associated with the transit polyline sub-section
						//otherwise just populate with travel type and use fallback style
						if(res.begin_shape_index > 0) {
							transitIndices.push(res.begin_shape_index);
						}
						if( res.transit_info ) {
							subRoute.push (
								{ 
									travel_type: travelType, 
									styles: this._getPolylineColor ( res.transit_info.color )
								}
							);
						}
						else {
							subRoute.push ( 
								{
									travel_type: travelType
								}
							);
						}
					}

					lastTravelType = travelType;
				}

				//add coords length to indices array
				transitIndices.push ( coords.length );

				//logic to create the subsets of the polyline by indexing into the shape
				var index_marker = 0;
				for ( var index = 0; index < transitIndices.length; index ++ ) {
					var subRouteArr = [ ];
					var overwrapping = 0;
					//if index != the last indice, we want to overwrap (or add 1) so that routes connect
					if ( index !== transitIndices.length-1 ) {
						overwrapping = 1;
					}
					for ( var ti = index_marker; ti < transitIndices [ index ] + overwrapping; ti ++ ) {
						subRouteArr.push ( coords [ ti ] );
					}

					var temp_array = subRouteArr;
					index_marker = transitIndices [ index ];
					subRoute[index].coordinates = temp_array;
				}
			}
			return subRoute;
		},		
		
		/*
		--- _trimLocationKey method --------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_trimLocationKey: function ( location ) {
			return ( Math.floor ( location.lat * 1000 ) / 1000 ) + ' , ' + (  Math.floor ( location.lng * 1000 ) / 1000 );
		},
		
		/*
		--- _convertSummary method ---------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_convertSummary: function(route) {
			return {
				totalDistance: route.length,
				totalTime: route.time
			};
		},
		
		/*
		--- _getPolylineColor method -------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

	   _getPolylineColor: function(intColor) {

			// isolate red, green, and blue components
			var red = (intColor >> 16) & 0xff;
			var green = (intColor >> 8) & 0xff;
			var blue = (intColor >> 0) & 0xff;

			// calculate luminance in YUV colorspace based on
			// https://en.wikipedia.org/wiki/YUV#Conversion_to.2Ffrom_RGB
			var lum = 0.299 * red + 0.587 * green + 0.114 * blue;
			var is_light = (lum > 0xbb);

			// generate a CSS color string like 'RRGGBB'
			var paddedHex = 0x1000000 | ( intColor & 0xffffff );
			var lineColor = paddedHex.toString ( 16 ).substring ( 1, 7 );

			var polylineColor = [
				// Color of outline depending on luminance against background.
				( is_light ? { color: '#000', opacity: 0.4, weight: 10 } : { color: '#fff', opacity: 0.8, weight: 10 } ),
				// Color of the polyline subset.
				{ color: '#' + lineColor.toUpperCase ( ), opacity: 1, weight: 6 }
			];

			return polylineColor;
	   },
	   
		/*
		--- _clampIndices method -----------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_clampIndices: function ( indices, coords ) {
			
			var maxCoordIndex = coords.length - 1;
			
			for ( var i = 0; i < indices.length; i ++ ) {
				indices [ i ] = Math.min ( maxCoordIndex, Math.max ( indices [ i ], 0 ) );
			}
		}
	} );
	
	/*
	--- L.Routing.extensions.mapzenRouteConverter function -----------------------------------------------------------------
	L.Routing.Extensions.MapzenRouteConverter factory function
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.mapzenRouteConverter = function ( options ) {
		return new L.Routing.Extensions.MapzenRouteConverter ( options );
	};

	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.Extensions.mapzenRouteConverter;
	}
} ) ( );

/* --- End of L.Routing.Extensions.MapzenRouteConverter.js file --- */