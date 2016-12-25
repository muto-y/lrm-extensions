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
--- L.Routing.Extensions.MapboxOsrmRouteConverter.js file ---------------------------------------------------------------------------------------
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
	var osrmTextInstructions = require('osrm-text-instructions');

	L.Routing.Extensions.MapboxOsrmRouteConverter = L.Class.extend ( {	
		initialize: function ( options ) {
			L.Util.setOptions( this, options );
			console.log ( 'L.Routing.Extensions.MapboxOsrmRouteConverter' );
			console.log ( options );
		}
	} );
	
	/*
	--- L.Routing.extensions.mapboxOsrmRouteConverter function --------------------------------------------------------------------------------------
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