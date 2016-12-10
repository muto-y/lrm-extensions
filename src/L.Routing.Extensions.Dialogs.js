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

	function PolylineDialog ( options, map, routingMachine, polyline ) {	
	
		options = options || {};
		options.color = options.color || '#000000';
		options.width = options.width || 5;
		options.name = options.name || '';
		options.clear = options.clear || false;
		
		// Main div
		var PolylineDialogMainDiv = L.DomUtil.create ( 'div','cyPolylineDialogMainDiv' );
/*
		L.DomEvent.on ( 
			PolylineDialogMainDiv,
			'keyup',
			function ( KeyBoardEvent ) { 
				console.log ( 'KeyPressed' );
				console.log ( KeyBoardEvent.key );
				switch ( KeyBoardEvent.key ) {
					case 'Escape':
					case 'Esc':
						map.closePopup ( );
						break;
					case 'Enter':
						options.color = ColorInput.value;
						options.width = WidthInput.value;
						options.ok = true;
						map.closePopup ( );
						break;
					default:
						break;
				}
			}
		);
*/
		var PolylineDialogInputDiv = L.DomUtil.create ( 'div','cyPolylineDialogInputDiv', PolylineDialogMainDiv );

		// Color
		var PolylineDialogColorDiv = L.DomUtil.create ( 'div','cyPolylineDialogColorDiv', PolylineDialogInputDiv );
		PolylineDialogColorDiv.innerHTML = 'Color:&nbsp;';
		
		var ColorInput = L.DomUtil.create( 'input', 'cyPolylineDialogColorInput', PolylineDialogColorDiv );
		ColorInput.type = 'color';
		ColorInput.value = options.color;
		ColorInput.id = 'cyPolylineDialogColorInput';

		// Width
		var PolylineDialogWidthDiv = L.DomUtil.create ( 'div','cyPolylineDialogColorDiv', PolylineDialogInputDiv );
		PolylineDialogWidthDiv.innerHTML = 'Width:&nbsp;';

		var WidthInput = L.DomUtil.create( 'input', 'cyPolylineDialogWidthInput', PolylineDialogWidthDiv );
		WidthInput.type = 'number';
		WidthInput.setAttribute ( 'min', 0 );
		WidthInput.setAttribute ( 'max', 20 );
		WidthInput.setAttribute ( 'step', 1 );
		WidthInput.value = options.width;
		WidthInput.id = 'cyPolylineDialogWidthInput';
		
		// Name
		var PolylineDialogNameDiv = L.DomUtil.create ( 'div','cyPolylineDialogNameDiv', PolylineDialogInputDiv );
		PolylineDialogNameDiv.innerHTML = 'Name:&nbsp;';
		
		var NameInput = L.DomUtil.create( 'input', 'cyPolylineDialogNameDiv', PolylineDialogNameDiv );
		NameInput.id = 'cyPolylineDialogNameInput';
		NameInput.value = options.name;

		if ( ! polyline ) {
			// Clear route
			var PolylineDialogClearDiv = L.DomUtil.create ( 'div','cyPolylineDialogClearDiv', PolylineDialogInputDiv );
			PolylineDialogClearDiv.innerHTML = 'Clear route:&nbsp;';
			
			var ClearInput = L.DomUtil.create( 'input', 'cyPolylineDialogClearDiv', PolylineDialogClearDiv );
			ClearInput.type = 'checkbox';
			ClearInput.checked = options.clear;
			ClearInput.id = 'cyPolylineDialogNameInput';		
		}
		// Buttons div
		var PolylineDialogButtonsDiv = L.DomUtil.create ( 'div','cyPolylineDialogButtonsDiv', PolylineDialogMainDiv );
		
		// OK button
		var OkButton = L.DomUtil.create( 'button', 'cyPolylineDialogOkButton', PolylineDialogButtonsDiv );
		OkButton.setAttribute( 'type' , 'button' );
		OkButton.innerHTML = 'OK';
		if ( ! polyline ) {
			L.DomEvent.on ( 
				OkButton, 
				'click', 
				function() { 
					options.color = ColorInput.value;
					options.width = WidthInput.value;
					options.name = NameInput.value;
					options.clear = ClearInput.checked;
					map.closePopup ( );
					routingMachine.RouteToLine ( options );
				} 
			);
		} 
		else {
			L.DomEvent.on ( 
				OkButton, 
				'click', 
				function() { 
					options.color = ColorInput.value;
					options.width = WidthInput.value;
					options.name = NameInput.value;
					options.clear = false;
					map.closePopup ( );
					polyline.setStyle ( { color : options.color, weight : options.width } );
					polyline.bindTooltip ( options.name );
					polyline.LrmExtensionsName = options.name;
				} 
			);
			
		}

		// Cancel button
		var CancelButton = L.DomUtil.create( 'button', 'cyPolylineDialogCancelButton', PolylineDialogButtonsDiv );
		CancelButton.setAttribute( 'type' , 'button' );
		CancelButton.innerHTML = 'Cancel';
		L.DomEvent.on ( 
			CancelButton, 
			'click', 
			function() { 
				map.closePopup ( );
			} 
		);
		
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
			.setContent ( PolylineDialogMainDiv )
			.setLatLng( map.getCenter() )
			.openOn( map );
		return options;
	}
	
	function polylineDialog ( options, map, routingMachine, polyline ) {	
		return new PolylineDialog ( options, map, routingMachine, polyline );
	}
	
	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = polylineDialog;
	}
} ) ( );