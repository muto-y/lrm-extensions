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
--- L.Routing.Extensions.Dialogs.js file -------------------------------------------------------------------------------
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
	--- PolylineDialog object ----------------------------------------------------------------------------------------------
	------------------------------------------------------------------------------------------------------------------------
	*/

	function PolylineDialog ( options, map, routingMachine, polyline ) {	
	
		// options
		options = options || {};
		options.color = options.color || '#000000';
		options.width = options.width || 5;
		options.name = options.name || '';
		options.clear = options.clear || false;
		
		// Main div
		var polylineDialogMainDiv = L.DomUtil.create ( 'div','cyPolylineDialogMainDiv' );

		var polylineDialogInputDiv = L.DomUtil.create ( 'div','cyPolylineDialogInputDiv', polylineDialogMainDiv );

		// Color
		var polylineDialogColorDiv = L.DomUtil.create ( 'div','cyPolylineDialogColorDiv', polylineDialogInputDiv );
		polylineDialogColorDiv.innerHTML = 'Color:&nbsp;';
		
		var colorInput = L.DomUtil.create( 'input', 'cyPolylineDialogColorInput', polylineDialogColorDiv );
		colorInput.type = 'color';
		colorInput.value = options.color;
		colorInput.id = 'cyPolylineDialogColorInput';

		// Width
		var polylineDialogWidthDiv = L.DomUtil.create ( 'div','cyPolylineDialogColorDiv', polylineDialogInputDiv );
		polylineDialogWidthDiv.innerHTML = 'Width:&nbsp;';

		var widthInput = L.DomUtil.create( 'input', 'cyPolylineDialogWidthInput', polylineDialogWidthDiv );
		widthInput.type = 'number';
		widthInput.setAttribute ( 'min', 0 );
		widthInput.setAttribute ( 'max', 20 );
		widthInput.setAttribute ( 'step', 1 );
		widthInput.value = options.width;
		widthInput.id = 'cyPolylineDialogWidthInput';
		
		// Name
		var polylineDialogNameDiv = L.DomUtil.create ( 'div','cyPolylineDialogNameDiv', polylineDialogInputDiv );
		polylineDialogNameDiv.innerHTML = 'Name:&nbsp;';
		
		var nameInput = L.DomUtil.create( 'input', 'cyPolylineDialogNameDiv', polylineDialogNameDiv );
		nameInput.id = 'cyPolylineDialogNameInput';
		nameInput.value = options.name;

		if ( ! polyline ) {
			// Clear route
			var polylineDialogClearDiv = L.DomUtil.create ( 'div','cyPolylineDialogClearDiv', polylineDialogInputDiv );
			polylineDialogClearDiv.innerHTML = 'Clear route:&nbsp;';
			
			var clearInput = L.DomUtil.create( 'input', 'cyPolylineDialogClearDiv', polylineDialogClearDiv );
			clearInput.type = 'checkbox';
			clearInput.checked = options.clear;
			clearInput.id = 'cyPolylineDialogNameInput';		
		}
		// Buttons div
		var polylineDialogButtonsDiv = L.DomUtil.create ( 'div','cyPolylineDialogButtonsDiv', polylineDialogMainDiv );
		
		// OK button
		var okButton = L.DomUtil.create( 'button', 'cyPolylineDialogOkButton', polylineDialogButtonsDiv );
		okButton.setAttribute( 'type' , 'button' );
		okButton.innerHTML = 'OK';
		if ( ! polyline ) {
			L.DomEvent.on ( 
				okButton, 
				'click', 
				function() { 
					options.color = colorInput.value;
					options.width = widthInput.value;
					options.name = nameInput.value;
					options.clear = clearInput.checked;
					map.closePopup ( );
					routingMachine.RouteToLine ( options );
				} 
			);
		} 
		else {
			L.DomEvent.on ( 
				okButton, 
				'click', 
				function() { 
					options.color = colorInput.value;
					options.width = widthInput.value;
					options.name = nameInput.value;
					options.clear = false;
					map.closePopup ( );
					polyline.setStyle ( { color : options.color, weight : options.width } );
					if ( 0 < options.name.length ) {
						polyline.bindTooltip ( options.name );
					}
					else
					{
						polyline.unbindTooltip ( );
					}
					polyline.LrmExtensionsName = options.name;
				} 
			);
			
		}

		// Cancel button
		var cancelButton = L.DomUtil.create( 'button', 'cyPolylineDialogCancelButton', polylineDialogButtonsDiv );
		cancelButton.setAttribute( 'type' , 'button' );
		cancelButton.innerHTML = 'Cancel';
		L.DomEvent.on ( 
			cancelButton, 
			'click', 
			function() { 
				map.closePopup ( );
			} 
		);
		
		// show dialog
		L.popup
			(
				{
					keepInView : true,
					closeButton : true,
					maxWidth : 200,
					className : 'cyPolylineDialog',
					autoClose : false
				}
			)
			.setContent ( polylineDialogMainDiv )
			.setLatLng( map.getCenter() )
			.openOn( map );
		return options;
	}
	
	/*
	--- polylineDialog function --------------------------------------------------------------------------------------------
	PolylineDialog factory function
	------------------------------------------------------------------------------------------------------------------------
	*/
	
	function polylineDialog ( options, map, routingMachine, polyline ) {	
		return new PolylineDialog ( options, map, routingMachine, polyline );
	}
	
	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = polylineDialog;
	}
} ) ( );

/* --- End of L.Routing.Extensions.Dialogs.js file --- */