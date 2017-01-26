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
--- L.Routing.Extensions.PolylineMenu.js file --------------------------------------------------------------------------------
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
	--- L.Routing.Extensions.PolylineMenu function -------------------------------------------------------------------------
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.PolylineMenu = function ( mouseEvent, map, routingMachine ) {	

		L.DomEvent.stopPropagation ( mouseEvent ); 

		// menu creation		
		var mainDiv = L.DomUtil.create ( 'div', 'PolylineMenu-MainDiv' );

		// Edition button
		var editPolylineButton = L.DomUtil.create ( 'button', 'PolylineMenu-EditPolylineButton', mainDiv );
		editPolylineButton.setAttribute ( 'type' , 'button' );
		editPolylineButton.innerHTML = 'Edit';

		var editDialog;
		if ( typeof module !== 'undefined' && module.exports ) {
			editDialog = require ('./L.Routing.Extensions.Dialogs' );
		}

		L.DomEvent.on ( 
			editPolylineButton, 
			'click', 
			function ( ) 
			{ 
				map.closePopup(); 
				var LineOptions = { 
					color : mouseEvent.target.options.color,
					width : mouseEvent.target.options.weight,
					name : mouseEvent.target.LrmExtensionsName
				};
				if ( typeof module !== 'undefined' && module.exports ) {
					LineOptions = require ('./L.Routing.Extensions.Dialogs' )( LineOptions, map, null, mouseEvent.target );
				}
			}
		);

		// Delete button
		var deletePolylineButton = L.DomUtil.create ( 'button', 'PolylineMenu-DeletePolylineButton', mainDiv );
		deletePolylineButton.setAttribute ( 'type' , 'button' );
		deletePolylineButton.innerHTML = 'Delete';
		L.DomEvent.on ( 
			deletePolylineButton, 
			'click', 
			function ( ) 
			{ 
				map.closePopup ( ); 
				//mouseEvent.target.remove ( );
				routingMachine.getRoutePolylines ( ).removeLayer ( mouseEvent.target );
			} 
		);

		// Cancel button
		var cancelPolylineButton = L.DomUtil.create( 'button', 'PolylineMenu-CancelPolylineButton', mainDiv );
		cancelPolylineButton.setAttribute( 'type' , 'button' );
		cancelPolylineButton.innerHTML = 'Cancel';	
		cancelPolylineButton.id = 'CancelPolylineButton';
		
		L.DomEvent.on ( 
			cancelPolylineButton, 
			'click', function ( )
			{ 
				map.closePopup ( ); 
			} 
		);

		// The dialog is displayed
		L.popup (
			{
				keepInView : true,
				closeButton : false,
				maxWidth : 300,
				className : 'PolylineMenu'
			}
		).setContent ( mainDiv ).setLatLng( mouseEvent.latlng ).openOn( map );
		document.getElementById ( 'CancelPolylineButton' ).focus ( );
	};
	
	/*
	--- L.Routing.Extensions.polylineMenu function ----------------------------------------------------------------------------------------------
	L.Routing.Extensions.PolylineMenu factory function
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.polylineMenu = function ( mouseEvent, map, routingMachine ) {	
		return new L.Routing.Extensions.PolylineMenu ( mouseEvent, map, routingMachine );
	};
	
	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.Extensions.PolylineMenu;
	}
} ) ( );

/* --- End of L.Routing.Extensions.PolylineMenu.js file --- */