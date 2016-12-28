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
--- L.Routing.Extensions.MapzenFormatter.js file -----------------------------------------------------------------------

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

	L.Routing.Extensions.MapzenFormatter = L.Class.extend ( {

		options : {
			units: 'metric',
			unitNames: {
				meters: 'm',
				kilometers: 'km',
				yards: 'yd',
				miles: 'mi',
				hours: 'h',
				minutes: 'mín',
				seconds: 's'
			},
			language: 'en',			
			roundingSensitivity : 1,			
			distanceTemplate : '{value} {unit}',
			whiteSpace : ' ' // So we can use &nbsp; if needed...
		},

		/*
		--- initialize method --------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/
		
		initialize : function ( options ) {
			L.setOptions( this, options );
		},

		/*
		--- formatDistance method ----------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/
		
		formatDistance : function ( distance ) {

			//valhalla returns distance in km
			var data;
			if ( this.options.units === 'imperial' ) {
				distance = distance * 1000;
				distance = distance / 1.609344;
				if ( distance >= 1000 ) {
					data = {
						value: ( this._round ( distance ) / 1000 ),
						unit: this.options.unitNames.miles
					};
				} 
				else {
					data = {
						value: this._round ( distance / 1.760 ),
						unit: this.options.unitNames.yards
					};
				}
			} 
			else {
				data = {
					value: distance >= 1 ? distance : distance * 1000,
					unit: distance >= 1 ? this.options.unitNames.kilometers : this.options.unitNames.meters
				};
			}

			return L.Util.template ( this.options.distanceTemplate, data );
		},

		/*
		--- _round method ------------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/
		
		_round : function ( d ) {
			var pow10 = Math.pow ( 10, ( Math.floor ( d / this.options.roundingSensitivity ) + '' ).length - 1 ),
				r = Math.floor ( d / pow10 ),
				p = (r > 5) ? pow10 : pow10 / 2;

			return Math.round( d / p ) * p;
		},

		/*
		--- formatTime method --------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/
		
		formatTime: function ( time /* Number (seconds) */ ) {
			if ( time > 86400 ) {
				return Math.round( time / 3600) + 
					this.options.whiteSpace + 
					this.options.unitNames.hours;
			} 
			else if ( time > 3600 ) {
				return Math.floor ( time / 3600 ) + 
					this.options.whiteSpace + 
					this.options.unitNames.hours +
					this.options.whiteSpace + 
					Math.round ( ( time % 3600 ) / 60 ) +
					this.options.whiteSpace + 
					this.options.unitNames.minutes ;
			} 
			else if ( time > 300 ) {
				return Math.round ( time / 60 ) + 
					this.options.whiteSpace + 
					this.options.unitNames.minutes ;
			} 
			else if ( time > 60) {
				return Math.floor ( time / 60 ) + 
					this.options.whiteSpace + 
					this.options.unitNames.minutes +
					( time % 60 !== 0 ? this.options.whiteSpace + ( time % 60 ) + this.options.whiteSpace +  this.options.unitNames.seconds : '' );
			} 
			else {
				return time + 
					this.options.whiteSpace + 
					this.options.unitNames.seconds ;
			}
		},

		/*
		--- formatInstruction method -------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		formatInstruction: function ( instr, i ) {
		// Valhalla returns instructions itself.
			return instr.instruction;
		},

		/*
		--- getIconName method -------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		getIconName: function ( instr, i ) {
			// you can find all Valhalla's direction types at https://github.com/valhalla/odin/blob/master/proto/tripdirections.proto
			if ( instr.type < 30 )
			{
				return [
					'kNone', 'kStart', 'kStartRight', 'kStartLeft', 'kDestination', 'kDestinationRight', 'kDestinationLeft', 'kBecomes',
					'kContinue', 'kSlightRight', 'kRight', 'kSharpRight', 'kUturnRight', 'kUturnLeft', 'kSharpLeft', 'kLeft', 'kSlightLeft',
					'kRampStraight', 'kRampRight', 'kRampLeft', 'kExitRight', 'kExitLeft', 'kStayStraight',
					'kStayRight', 'kStayLeft', 'kMerge', 'kRoundaboutEnter', 'kRoundaboutExit', 'kFerryEnter', 'kFerryExit'
					] [ instr.type ];
			}
			else if ( instr.type < 37 ) {
				if ( instr.edited_travel_type ) {
					return 'kTransit' + this._getCapitalizedName ( instr.edited_travel_type );
				}
				else {
					return 'kTransit';
				}
			}
		},

		/*
		--- _getInstructionTemplate method -------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_getInstructionTemplate: function ( instr, i ) {
			return instr.instruction + " " + instr.length;
		},
		
		/*
		--- _getCapitalizedName method -----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_getCapitalizedName: function ( name ) {
			return name.charAt ( 0 ).toUpperCase ( ) + name.slice ( 1 );
		}
	});

	/*
	--- L.Routing.extensions.mapzenFormatter function ----------------------------------------------------------------------
	L.Routing.Extensions.MapboxOsrmRouteConverter factory function
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.mapzenFormatter = function ( options ) {
		return new L.Routing.Extensions.MapzenFormatter ( options );
	};

	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.Extensions.mapzenFormatter;
	}
})();

/* --- End of L.Routing.Extensions.MapzenFormatter.js file --- */