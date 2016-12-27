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
| This code is mainly coming from lrm-graphhopper by Per Liedman.                                                      |
| See https://github.com/perliedman/lrm-graphhopper                                                                    |
+----------------------------------------------------------------------------------------------------------------------+
*/

/*
--- L.Routing.Extensions.GraphHopperConverter.js file ---------------------------------------------------------------------------------------
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
	--- L.Routing.Extensions.GraphHopperConverter object ---------------------------------------------------------------
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.GraphHopperConverter = L.Class.extend ( {	

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

			var routes = [];

			for ( var pathCounter = 0; pathCounter < response.paths.length; pathCounter ++ ) {
				var path = response.paths [ pathCounter ];
				var coordinates = this._decodePolyline ( path.points );
				var mappedWaypoints = this._mapWaypointIndices ( inputWaypoints, path.instructions, coordinates );

				routes.push (
					{
						name : '',
						coordinates : coordinates,
						instructions : this._convertInstructions(path.instructions),
						summary : {
							totalDistance: path.distance,
							totalTime: path.time / 1000,
						},
						inputWaypoints : inputWaypoints,
						waypoints : mappedWaypoints.waypoints, // added wwwouaiebe
						actualWaypoints : mappedWaypoints.waypoints,
						waypointIndices : mappedWaypoints.waypointIndices
					}
				);
			}

			return routes;
		},
		
		/*
		--- _toWaypoints method ------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_toWaypoints : function ( inputWaypoints, responseWaypoints ) {

			var wayPoints = [ ];
		
			for ( var counter = 0; counter < responseWaypoints.length; counter ++ ) {
				wayPoints.push (
					{
						latLng: L.latLng ( responseWaypoints [ counter ] ),
						name: inputWaypoints [ counter ].name,
						options: inputWaypoints [ counter ].options
					}
				);
			}

			return wayPoints;
		},

		/*
		--- _decodePolyline method ---------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/
		_decodePolyline: function ( routeGeometry ) {

		var	polyline = require ( 'polyline' );
			
			var coordinates = polyline.decode ( routeGeometry, 5 );
			var result = new Array ( coordinates.length );

			for ( var coordCounter = 0; coordCounter < coordinates.length; coordCounter ++ ) {
				result [ coordCounter ] = L.latLng ( coordinates [ coordCounter ][ 0 ], coordinates [ coordCounter ][ 1 ]);
			}

			return result;
		},

		/*
		--- _convertInstructions method ----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_convertInstructions : function ( instructions ) {

			var signToType = {
					4: 'DestinationReached', 
					5: 'WaypointReached',
					6: 'Roundabout' 
				};
			var signToModifier = {
					'-3': 'SharpLeft', 
					'-2': 'Left', 
					'-1': 'SlightLeft', 
					0: 'Straight', 
					1: 'SlightRight', 
					2: 'Right', 
					3: 'SharpRight', 
				};
			var	result = [ ];

			for ( var instrCounter = 0; instructions && instrCounter < instructions.length; instrCounter ++) {
				var instruction = instructions [ instrCounter ];
				result.push (
					{
						modifier : signToModifier [ instruction.sign ],
						type : signToType [ instruction.sign ],
						text : instruction.text,
						distance : instruction.distance,
						time : instruction.time / 1000,
						index : instruction.interval[0],
						exit : instruction.exit_number
					}
				);
			}

			return result;
		},

		/*
		--- _mapWaypointIndices method -----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_mapWaypointIndices: function ( waypoints, instructions, coordinates ) {
			var tmpWaypoints = [ ];
			var wpIndices = [ ];
			var idx;

			wpIndices.push ( 0 );
			tmpWaypoints.push ( L.Routing.waypoint ( coordinates [ 0 ], waypoints [ 0 ].name ) );

			for ( var instrCounter = 0; instructions && instrCounter < instructions.length; instrCounter ++ ) {
				if ( instructions [ instrCounter ].sign === 5) { // WaypointReached
					idx = instructions [ instrCounter ].interval[0];
					wpIndices.push ( idx );
					tmpWaypoints.push (
						{
							latLng: coordinates[idx],
							name: waypoints[tmpWaypoints.length + 1].name
						}
					);
				}
			}

			wpIndices.push ( coordinates.length - 1 );
			tmpWaypoints.push ( 
				{
					latLng: coordinates[coordinates.length - 1],
					name: waypoints[waypoints.length - 1].name
				}
			);

			return {
				waypointIndices: wpIndices,
				waypoints: tmpWaypoints
			};
		}		
	} );
	
	/*
	--- L.Routing.extensions.graphHopperConverter function -----------------------------------------------------------------
	L.Routing.Extensions.MapzenRouteConverter factory function
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.graphHopperConverter = function ( options ) {
		return new L.Routing.Extensions.GraphHopperConverter ( options );
	};

	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.Extensions.graphHopperConverter;
	}
} ) ( );

/* --- End of L.Routing.Extensions.GraphHopperConverter.js file --- */