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

	var	polyline = require('polyline');

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
			console.log ( 'L.Routing.Extensions.GraphHopperConverter' );
			console.log ( options );
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
						name: '',
						coordinates: coordinates,
						instructions: this._convertInstructions(path.instructions),
						summary: {
							totalDistance: path.distance,
							totalTime: path.time / 1000,
						},
						inputWaypoints: inputWaypoints,
						waypoints : mappedWaypoints.waypoints, // added wwwouaiebe
						actualWaypoints: mappedWaypoints.waypoints,
						waypointIndices: mappedWaypoints.waypointIndices
					}
				);
			}

			return routes;
		},
		
		/*
		--- _decodePolyline method ---------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_decodePolyline: function(geometry) {
			var coords = polyline.decode(geometry, 5),
				latlngs = new Array(coords.length),
				i;
			for (i = 0; i < coords.length; i++) {
				latlngs[i] = new L.LatLng(coords[i][0], coords[i][1]);
			}

			return latlngs;
		},

		/*
		--- _toWaypoints method ------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_toWaypoints: function(inputWaypoints, vias) {
			var wps = [],
			    i;
			for (i = 0; i < vias.length; i++) {
				wps.push({
					latLng: L.latLng(vias[i]),
					name: inputWaypoints[i].name,
					options: inputWaypoints[i].options
				});
			}

			return wps;
		},

		/*
		--- _convertInstructions method ----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_convertInstructions: function(instructions) {
			var signToType = {
					'-3': 'SharpLeft',
					'-2': 'Left',
					'-1': 'SlightLeft',
					0: 'Straight',
					1: 'SlightRight',
					2: 'Right',
					3: 'SharpRight',
					4: 'DestinationReached',
					5: 'WaypointReached',
					6: 'Roundabout'
				},
				result = [],
			    i,
			    instr;

			for (i = 0; instructions && i < instructions.length; i++) {
				instr = instructions[i];
				result.push({
					type: signToType[instr.sign],
					text: instr.text,
					distance: instr.distance,
					time: instr.time / 1000,
					index: instr.interval[0],
					exit: instr.exit_number
				});
			}

			return result;
		},

		/*
		--- _mapWaypointIndices method -----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_mapWaypointIndices: function(waypoints, instructions, coordinates) {
			var wps = [],
				wpIndices = [],
			    i,
			    idx;

			wpIndices.push(0);
			wps.push(new L.Routing.Waypoint(coordinates[0], waypoints[0].name));

			for (i = 0; instructions && i < instructions.length; i++) {
				if (instructions[i].sign === 5) { // VIA_REACHED
					idx = instructions[i].interval[0];
					wpIndices.push(idx);
					wps.push({
						latLng: coordinates[idx],
						name: waypoints[wps.length + 1].name
					});
				}
			}

			wpIndices.push(coordinates.length - 1);
			wps.push({
				latLng: coordinates[coordinates.length - 1],
				name: waypoints[waypoints.length - 1].name
			});

			return {
				waypointIndices: wpIndices,
				waypoints: wps
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