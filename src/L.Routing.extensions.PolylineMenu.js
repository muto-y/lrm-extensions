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

(function() {
	'use strict';

	
	var PolylineMenu = function ( MouseEvent, Map, routingMachine ) {	
		L.DomEvent.stopPropagation ( MouseEvent ); 

		// menu creation		
		var MainDiv = L.DomUtil.create ( 'div', 'PolylineMenu-MainDiv' );

		// Edition button
		var EditPolylineButton = L.DomUtil.create ( 'button', 'PolylineMenu-EditPolylineButton', MainDiv );
		EditPolylineButton.setAttribute ( 'type' , 'button' );
		EditPolylineButton.innerHTML = 'Edit';

		var EditDialog;
		if ( typeof module !== 'undefined' && module.exports ) {
			EditDialog = require ('./L.Routing.Extensions.Dialogs' );
		}
		else {
			EditDialog = polylineDialog ;
		}

		L.DomEvent.on ( 
			EditPolylineButton, 
			'click', 
			function ( ) 
			{ 
				Map.closePopup(); 
				var LineOptions = { 
					color : MouseEvent.target.options.color,
					width : MouseEvent.target.options.weight,
					name : MouseEvent.target.LrmExtensionsName
				};
				if ( typeof module !== 'undefined' && module.exports ) {
					LineOptions = require ('./L.Routing.Extensions.Dialogs' )( LineOptions, Map, null, MouseEvent.target );
				}
				else {
					LineOptions = polylineDialog ( LineOptions, Map, null, MouseEvent.target );
				}
			}
		);

		// Delete button
		var DeletePolylineButton = L.DomUtil.create ( 'button', 'PolylineMenu-DeletePolylineButton', MainDiv );
		DeletePolylineButton.setAttribute ( 'type' , 'button' );
		DeletePolylineButton.innerHTML = 'Delete';
		L.DomEvent.on ( 
			DeletePolylineButton, 
			'click', 
			function ( ) 
			{ 
				Map.closePopup ( ); 
				//MouseEvent.target.remove ( );
				routingMachine.getRoutePolylines ( ).removeLayer ( MouseEvent.target );
			} 
		);

		// Cancel button
		var CancelPolylineButton = L.DomUtil.create( 'button', 'PolylineMenu-CancelPolylineButton', MainDiv );
		CancelPolylineButton.setAttribute( 'type' , 'button' );
		CancelPolylineButton.innerHTML = 'Cancel';	
		CancelPolylineButton.id = 'CancelPolylineButton';
		
		L.DomEvent.on ( 
			CancelPolylineButton, 
			'click', function ( )
			{ 
				Map.closePopup ( ); 
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
		).setContent ( MainDiv ).setLatLng( MouseEvent.latlng ).openOn( Map );
		document.getElementById ( 'CancelPolylineButton' ).focus ( );
	};
	
	function polylineMenu ( MouseEvent, Map, routingMachine ) {	
		return new PolylineMenu ( MouseEvent, Map, routingMachine );
	}
	
	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = PolylineMenu;
	}
} ) ( );