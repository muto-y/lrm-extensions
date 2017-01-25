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
--- L.Routing.Extensions.js file ---------------------------------------------------------------------------------------
This file contains:
	- the extend for the L.Routing.Control
	- the module.exports implementation
Changes:
	- v1.0.0:
		- created
Doc reviewed 20161022
Tests to do...
------------------------------------------------------------------------------------------------------------------------
*/

(function() {
	'use strict';

	L.Routing.Extensions = L.Routing.Control.extend ( {

		/*
		--- _routePolylines : Variable used to store and display the polylines -------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/
	
		_routePolylines : L.layerGroup ( ),

		/*
		--- _gpxRoute : Variable used to store the GPX data --------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_gpxRoute : null,

		/*
		--- transitMode getter -------------------------------------------------------------------------------------------------
		*/
		
		getTransitMode : function ( ) { return this.options.transitMode; },

		/*
		--- provider getter ----------------------------------------------------------------------------------------------------
		*/

		getProvider : function ( ) { return this.options.provider; },
		
		/*
		--- initialize method --------------------------------------------------------------------------------------------------
		Constructor
		------------------------------------------------------------------------------------------------------------------------
		*/
		
		initialize: function ( options ) {

			// options are verified...
			// ... language ...
			options.language = options.language  || 'en';
			
			// ... transit mode
			options.transitMode = options.transitMode || 'car';
			options.transitMode = options.transitMode.toLowerCase ( );
			
			// ... routing provider ...
			options.provider = options.provider || 'osrm';
			options.provider = options.provider.toLowerCase ( );

			// ... providers keys ...
			options.providerKeys = options.providerKeys || {};
			options.providerKeys.GraphHopper = options.providerKeys.GraphHopper || '';
			options.providerKeys.Mapzen = options.providerKeys.Mapzen || '';
			options.providerKeys.Mapbox = options.providerKeys.Mapbox || '';
			
			// the provider is set to 'osrm' when providers key are not filled
			if ( ( 0 === options.providerKeys.GraphHopper.length ) && ( 0 === options.providerKeys.Mapzen.length ) && ( 0 === options.providerKeys.Mapbox.length ) ) {
				options.provider = 'osrm';
			}
			
			// the provider is set to 'osrm' when the given provider is invalid
			if ( -1 === [ 'graphhopper', 'mapzen', 'mapbox', 'osrm' ].indexOf (  options.provider ) ) {
				options.provider = 'osrm';
			}
			
			// the transit mode is set to 'car' when the given transit mode is invalid
			if ( -1 === [ 'bike', 'pedestrian', 'car' ].indexOf (  options.transitMode ) ) {
				options.transitMode = 'car';				
			}
			
			// the provider is set to 'osrm' when the given provider is 'graphhopper' and the GraphHopper key is empty
			if ( ( 0 === options.providerKeys.GraphHopper.length ) && ( 'graphhopper' === options.provider ) ) {
				options.provider = 'osrm';
			}
			
			// the provider is set to 'osrm' when the given provider is 'mapzen' and the Mapzen key is empty
			if ( ( 0 === options.providerKeys.Mapzen.length ) && ( 'mapzen' === options.provider ) ) {
				options.provider = 'osrm';
			}

			// the provider is set to 'osrm' when the given provider is 'mapbox' and the Mapbox key is empty
			if ( ( 0 === options.providerKeys.Mapbox.length ) && ( 'mapbox' === options.provider ) ) {
				options.provider = 'osrm';
			}

			// the transit mode is set to 'car' when the provider is 'osrm'
			if ( 'osrm' === options.provider ) {
				options.transitMode = 'car';		
			}
			
			// the user don't gives a default provider, but a provider key is filled
			if ( 'osrm' === options.provider && 0 < options.providerKeys.Mapbox.length ) {
				options.provider = 'mapbox';
			} else if ( 'osrm' === options.provider && 0 < options.providerKeys.Mapzen.length ) {
				options.provider = 'mapzen';
			} else if ( 'osrm' === options.provider && 0 < options.providerKeys.GraphHopper.length ) {
				options.provider = 'graphhopper';
			}
			
			// Formatter change if the provider is Mapzen
			require ( './L.Routing.Extensions.MapzenFormatter' );
			if ( 'mapzen' === options.provider ) {
				options.formatter = L.Routing.Extensions.mapzenFormatter ( );		
			}	

			// Router options
			var routingOptions = {};
			routingOptions.alternatives = ( options.routingOptions && options.routingOptions.alternatives ? options.routingOptions.alternatives : true );
			routingOptions.steps = ( options.routingOptions && options.routingOptions.steps ? options.routingOptions.steps : true );
			var useHints = ( options.useHints ? options.useHints : true );
			var routerOptions = {
				provider : options.provider,
				transitMode : options.transitMode,
				providerKeys : options.providerKeys,
				serviceUrl: options.serviceUrl || 'https://router.project-osrm.org/route/v1',
				timeout : options.timeout || 30 * 1000,
				routingOptions : routingOptions,
				polylinePrecision : options.polylinePrecision || 5,
				useHints: useHints,
				suppressDemoServerWarning: false,
				language : options.language,
			};
			
			var routerFactory = require ( './L.Routing.Extensions.Router' );
			options.router = routerFactory ( routerOptions );

			L.Util.setOptions ( this, options );
			
			L.Routing.Control.prototype.initialize.call ( this, options );
		},
		
		/*
		--- _createRadioButton method ------------------------------------------------------------------------------------------
		Helper method for the button creation
		See also the lrm-extensions.css file. Radio buttons are used for chanching the image when the button is clicked
		------------------------------------------------------------------------------------------------------------------------
		*/

		_createRadioButton: function ( parentHTML, titleAttribute, nameAttribute, ButtonId, LabelId ) {
			var radioButton = L.DomUtil.create ( 'input', 'lrm-extensions-Button', parentHTML );
			radioButton.type = 'radio';
			radioButton.setAttribute ( 'title' , titleAttribute );
			radioButton.setAttribute ( 'name' , nameAttribute );
			radioButton.id = ButtonId;

			var radioLabel = L.DomUtil.create ( 'label', 'lrm-extensions-Label', parentHTML );
			radioLabel.setAttribute ( 'title' , titleAttribute );
			radioLabel.setAttribute ( 'for' , ButtonId );
			radioLabel.id = LabelId;
			
			return radioButton;
		},
		
		/*
		--- _routingButtonsDiv : Variable used to store the provider and transit mode buttons DIV ------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_routingButtonsDiv : L.DomUtil.create ( 'form', 'lrm-extensions-RoutingButtons' ),

		/*
		--- _servicesButtonsDiv : Variable used to store the GPX and Polyline buttons DIV --------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_servicesButtonsDiv : L.DomUtil.create ( 'form', 'lrm-extensions-ServiceButtons' ),

		/*
		--- onAdd method -------------------------------------------------------------------------------------------------------
		overload of the onAdd method
		------------------------------------------------------------------------------------------------------------------------
		*/

		onAdd: function ( map ) {
			
			// The prototype method is called
			var container = L.Routing.Control.prototype.onAdd.call ( this, map );
			
			var bikeButton;
			var pedestrianButton;
			var carButton;
			if ( ( 0 < this.options.providerKeys.GraphHopper.length ) || ( 0 < this.options.providerKeys.Mapzen.length ) || ( 0 < this.options.providerKeys.Mapbox.length ) ) {
				
				// Transit mode buttons are created
				bikeButton = this._createRadioButton ( this._routingButtonsDiv, 'Bike', 'transitmode', 'lrm-extensions-BikeButton', 'lrm-extensions-BikeLabel' );
				pedestrianButton = this._createRadioButton ( this._routingButtonsDiv, 'Pedestrian', 'transitmode', 'lrm-extensions-PedestrianButton', 'lrm-extensions-PedestrianLabel' );
				carButton = this._createRadioButton ( this._routingButtonsDiv, 'Car', 'transitmode', 'lrm-extensions-CarButton', 'lrm-extensions-CarLabel' );

				// The correct transit mode button is checked
				switch ( this.options.transitMode ) {
					case 'bike':
						bikeButton.checked = true;
						break;
					case 'pedestrian':
						pedestrianButton.checked = true;
						break;
					case 'car':
						carButton.checked = true;
						break;
					default:
						carButton.checked = true;
						break;
				}
				
				// event for the 'bike' button
				L.DomEvent.on ( 
					bikeButton, 
					'click', 
					L.bind (
						function ( event ) 
						{ 
							this.options.transitMode = 'bike';
							this.options.router.options.transitMode = 'bike';
							this.route ( );
							this.fire ( 'transitmodechanged' );
						},
						this
					)
				);
				
				// event for the 'pedestrian' button
				L.DomEvent.on ( 
					pedestrianButton, 
					'click', 
					L.bind (
						function ( event ) 
						{ 
							this.options.transitMode = 'pedestrian';
							this.options.router.options.transitMode = 'pedestrian';
							this.route ( );
							this.fire ( 'transitmodechanged' );
						},
						this
					)
				);
				
				// event for the 'car' button
				L.DomEvent.on ( 
					carButton, 
					'click', 
					L.bind (
						function ( event ) 
						{ 
							this.options.transitMode = 'car';
							this.options.router.options.transitMode = 'car';
							this.route ( );
							this.fire ( 'transitmodechanged' );
						},
						this
					)
				);
			}

			// Providers buttons are created
			var graphHopperButton;
			var mapzenButton;
			var mapboxButton;
			if ( 0 < this.options.providerKeys.GraphHopper.length ) {
				// GraphHopper button
				graphHopperButton = this._createRadioButton ( this._routingButtonsDiv, 'GraphHopper', 'provider', 'lrm-extensions-GraphHopperButton', 'lrm-extensions-GraphHopperLabel');
				// event for the GraphHopper button
				L.DomEvent.on ( 
					graphHopperButton, 
					'click', 
					L.bind (
						function ( event ) 
						{ 
							this.options.provider = 'graphhopper';
							this.options.router.options.provider = 'graphhopper';
							this._formatter = new L.Routing.Formatter ( );
							this.route ( );
							this.fire ( 'providerchanged' );
						},
						this
					)
				);
			}
			if ( 0 < this.options.providerKeys.Mapzen.length ) {
				// Mapzen button
				mapzenButton = this._createRadioButton ( this._routingButtonsDiv, 'Mapzen', 'provider', 'lrm-extensions-MapzenButton', 'lrm-extensions-MapzenLabel');
				// event for the Mapzen button
				L.DomEvent.on ( 
					mapzenButton, 
					'click', 
					L.bind (
						function ( event ) 
						{ 
							this.options.provider = 'mapzen';
							this.options.router.options.provider = 'mapzen';
							require ( './L.Routing.Extensions.MapzenFormatter' );
							this._formatter = L.Routing.Extensions.mapzenFormatter ( );
							this.route ( );
							this.fire ( 'providerchanged' );
						},
						this
					)
				);
			}
			if ( 0 < this.options.providerKeys.Mapbox.length ) {
				// Mapbox button
				mapboxButton = this._createRadioButton ( this._routingButtonsDiv, 'Mapbox', 'provider', 'lrm-extensions-MapboxButton', 'lrm-extensions-MapboxLabel');
				// event for the Mapbox button
				L.DomEvent.on ( 
					mapboxButton, 
					'click', 
					L.bind (
						function ( event ) 
						{ 
							this.options.provider = 'mapbox';
							this.options.router.options.provider = 'mapbox';
							this._formatter = new L.Routing.Formatter ( );
							this.route ( );
							this.fire ( 'providerchanged' );
						},
						this
					)
				);
			}

			// The correct provider button is checked
			switch ( this.options.provider ) {
				case 'graphhopper':
					if ( graphHopperButton ) {
						graphHopperButton.checked = true;
					}
					break;
				case 'mapzen':
					if ( mapzenButton ) {
						mapzenButton.checked = true;
					}
					break;
				case 'mapbox':
					if ( mapboxButton ) {
						mapboxButton.checked = true;
					}
					break;
			}
			
			// the GPX button is created
			//var gpxAnchor = L.DomUtil.create ( 'a', 'lrm-extensions-ServicesAnchor', this._servicesButtonsDiv );
			//gpxAnchor.id = 'downloadGpx';
			//gpxAnchor.setAttribute ( 'download', 'lrm-extensions.gpx' ); 
			//gpxAnchor.innerHTML = '<span id="lrm-extensions-GpxButton" class="lrm-extensions-ServicesButton"></span>';

			var GpxButton = L.DomUtil.create ( 'span', 'lrm-extensions-ServicesButton', this._servicesButtonsDiv );
			GpxButton.id = 'lrm-extensions-GpxButton';
			L.DomEvent. on (
				GpxButton,
				'click',
				function ( event ) {
					if ( ! this._gpxRoute ) {
						return;
					}
					var utilities;
					if ( typeof module !== 'undefined' && module.exports ) {
						utilities = require ('./utilities' );
					}
					utilities.saveFile ( 'lrm-extensions.gpx', this.getGpxString ( ), 'application/xml' );
				},
				this
			);
				

			// the polyline button is created
			var routeToLineButton = L.DomUtil.create ( 'span', 'lrm-extensions-ServicesButton', this._servicesButtonsDiv );
			routeToLineButton.id = 'lrm-extensions-RouteToLineButton';

			// event for the polyline button
			L.DomEvent.on ( 
				routeToLineButton, 
				'click', 
				L.bind (
					function ( event ) 
					{ 
						var lineOptions = { color : '#ff0000', width : 5, clear : false, name : '' };
						if ( this._gpxRoute && this._gpxRoute.name && 0 < this._gpxRoute.name.length ) {
							lineOptions.name = this._gpxRoute.name;
						}
						else {
							lineOptions.name = '';
						}
							
						if ( typeof module !== 'undefined' && module.exports ) {
							lineOptions = require ('./L.Routing.Extensions.Dialogs' )( lineOptions, this._map, this );
						}
					},
					this
				)
			);
			var eraseButton = L.DomUtil.create ( 'span', 'lrm-extensions-ServicesButton', this._servicesButtonsDiv );
			eraseButton.id = 'lrm-extensions-EraseButton';
			L.DomEvent.on (
				eraseButton,
				'click',
				L.bind (
					function ( event )
					{
						this.setWaypoints ( [] );
					},
					this
				)
			);

			// buttons are added to the control
			container.insertBefore( this._routingButtonsDiv, container.firstChild);
			container.insertBefore( this._servicesButtonsDiv, container.firstChild);

			// the layer group for the polyline is added to the map
			this._routePolylines.addTo ( map );
			
			return container;
		},
		
		/*
		--- RouteToLine method -------------------------------------------------------------------------------------------------
		This method transforms the current route into a polyline
		------------------------------------------------------------------------------------------------------------------------
		*/

		RouteToLine  : function ( options ) {
			if ( this._gpxRoute && this._gpxRoute.coordinates && 0 < this._gpxRoute.coordinates.length ) {
				var polyline = L.polyline ( this._gpxRoute.coordinates, { color : options.color, weight : options.width } );	
				if ( 0 < options.name.length ) {
					polyline.bindTooltip ( options.name );
				}
				else
				{
					polyline.unbindTooltip ( );
				}
				polyline.LrmExtensionsName = options.name;

				var PolylineMenu;
				if ( typeof module !== 'undefined' && module.exports ) {
					PolylineMenu = require ('./L.Routing.Extensions.PolylineMenu' );
				}

				L.DomEvent.on ( 
					polyline,
					'click',
					L.bind (
						function ( MouseEvent ) {
							PolylineMenu ( MouseEvent, this._map, this );
						},
						this
					)
				);
				L.DomEvent.on ( 
					polyline,
					'contextmenu',
					L.bind (
						function ( MouseEvent ) {
							PolylineMenu ( MouseEvent, this._map, this );
						},
						this
					)
				);
				
				this._routePolylines.addLayer ( polyline );
				
				
				
				if ( options.clear ) {
					this.setWaypoints ( [] ); 
				}
			}
		},
		getPointAndDistance : function ( latLng ) {
			if ( ! this._gpxRoute || ! this._gpxRoute.coordinates || 2 > this._gpxRoute.coordinates.length ) {
				return null;
			}
			var minDistance = Number.MAX_VALUE;
			var distance;
			var pointIsBeforeIndex = 0;
			var point = L.Projection.SphericalMercator.project ( latLng );
			var point1;
			var point2;

			for ( var coordCounter = 0; coordCounter < this._gpxRoute.coordinates.length - 1; coordCounter ++ ) {
				point1 = L.Projection.SphericalMercator.project ( this._gpxRoute.coordinates [ coordCounter ] );
				point2 = L.Projection.SphericalMercator.project ( this._gpxRoute.coordinates [ coordCounter + 1] );
				distance = L.LineUtil.pointToSegmentDistance ( point, point1, point2 );
				if ( distance < minDistance )
				{
					minDistance = distance;
					pointIsBeforeIndex = coordCounter + 1;
				}
			}	

			if ( 0 === pointIsBeforeIndex ) {
				return null;
			}
			point1 = L.Projection.SphericalMercator.project ( this._gpxRoute.coordinates [ pointIsBeforeIndex -1 ] );
			point2 = L.Projection.SphericalMercator.project ( this._gpxRoute.coordinates [ pointIsBeforeIndex ] );
			point =  L.LineUtil.closestPointOnSegment ( point, point1, point2 );
			var newLatLng = L.Projection.SphericalMercator.unproject ( point );
			distance = 0;
			
			// to avoid differences between computed distance and distance given by the provider, we use 
			// the distance given by the provider to the previous instruction.

			var lastInstructionIndex = 0;
			var nextDistance = 0;
			for ( var instrCounter = 0; instrCounter < this._gpxRoute.instructions.length; instrCounter ++ ) {
				if ( this._gpxRoute.instructions [ instrCounter ].index >= pointIsBeforeIndex) {
					break;
				}
				distance += nextDistance;
				nextDistance =  this._gpxRoute.instructions [ instrCounter ].distance;
				lastInstructionIndex = this._gpxRoute.instructions [ instrCounter ].index;
			}
			
			//Mapzen gives distance in km...
			distance = 'mapzen' === this.options.provider ? distance * 1000 : distance;

			for ( coordCounter = lastInstructionIndex; coordCounter < pointIsBeforeIndex - 1;coordCounter ++ ) {
				distance += this._gpxRoute.coordinates[ coordCounter ].distanceTo ( this._gpxRoute.coordinates[ coordCounter + 1 ] );
			}

			distance += this._gpxRoute.coordinates[ pointIsBeforeIndex - 1 ].distanceTo ( newLatLng );

			return {
				latLng : newLatLng,
				distance : Math.round ( distance ) / 1000
			};
		},
		
		/*
		--- addPolyline method -------------------------------------------------------------------------------------------------
		This method add a polyline to the map and to the layergroup
		------------------------------------------------------------------------------------------------------------------------
		*/

		addPolyline : function ( pnts, options, name ) {
			var polyline = L.polyline ( pnts, options );	
			if ( 0 < name.length ) {
				polyline.bindTooltip ( name );
			}
			polyline.LrmExtensionsName = name;
			
			var PolylineMenu;
			if ( typeof module !== 'undefined' && module.exports ) {
				PolylineMenu = require ('./L.Routing.Extensions.PolylineMenu' );
			}

			L.DomEvent.on ( 
				polyline,
				'click',
				L.bind (
					function ( MouseEvent ) {
						PolylineMenu ( MouseEvent, this._map, this );
					},
					this
				)
			);
			L.DomEvent.on ( 
				polyline,
				'contextmenu',
				L.bind (
					function ( MouseEvent ) {
						PolylineMenu ( MouseEvent, this._map, this );
					},
					this
				)
			);
			
			this._routePolylines.addLayer ( polyline );
		
		},
		
		/*
		--- RouteToLine method -------------------------------------------------------------------------------------------------
		Simple get method...
		------------------------------------------------------------------------------------------------------------------------
		*/
		
		getRoutePolylines : function ( ) {
			return this._routePolylines;
		},
		
		/*
		--- show method --------------------------------------------------------------------------------------------------------
		overload of the show method
		------------------------------------------------------------------------------------------------------------------------
		*/
		
		show : function ( ) {
			L.Routing.Control.prototype.show.call ( this );
			this._routingButtonsDiv.setAttribute ( "style" , "display: block" );
			this._servicesButtonsDiv.setAttribute ( "style" , "display: block" );
		},
		
		/*
		--- hide method --------------------------------------------------------------------------------------------------------
		overload of the hide method
		------------------------------------------------------------------------------------------------------------------------
		*/
		
		hide : function ( ) {
			L.Routing.Control.prototype.hide.call ( this );
			this._routingButtonsDiv.setAttribute ( "style" , "display: none" );
			this._servicesButtonsDiv.setAttribute ( "style" , "display: none" );
		},

		/*
		--- _updateLines method ------------------------------------------------------------------------------------------------
		overload of the _updateLines method
		------------------------------------------------------------------------------------------------------------------------
		*/

		_updateLines: function ( routes ) {
			L.Routing.Control.prototype._updateLines.call ( this, routes );
			// route is saved for the GPX and polyline
			this._gpxRoute = routes.route;
			this.fire ( 'gpxchanged' );
		},
		
		getInstructionAtLatLng : function ( latLng ) {
			var distance = 0;
			for ( var instrCounter = 0; instrCounter < this._gpxRoute.instructions.length; instrCounter ++ ) {
				if ( latLng.equals (  this._gpxRoute.coordinates [ this._gpxRoute.instructions [ instrCounter ].index ] ) ) {
					return {
						iconName : this._formatter.getIconName ( this._gpxRoute.instructions [ instrCounter ], instrCounter ),
						distance : 'mapzen' === this.options.provider ? distance : ( distance / 1000.0 )
					};
				}
				distance += this._gpxRoute.instructions [ instrCounter ].distance;
			}
			return null;
		},
		
		/*
		--- _toXmlString -------------------------------------------------------------------------------------------------------
		Helper method to transform a string into a XML string
		------------------------------------------------------------------------------------------------------------------------
		*/

		_toXmlString : function ( XmlString ) {
			return XmlString.replace ( '&', '&amp;' ).replace ( '\'', '&apos;' ).replace ('\"', '&quote;').replace ( '>', '&gt;' ).replace ( '<', '&lt;');
		},

		/*
		--- getGpxString -------------------------------------------------------------------------------------------------------
		This method creates a GPX string from the route data
		------------------------------------------------------------------------------------------------------------------------
		*/
		
		getGpxString : function ( options ) {

			if ( undefined === options ) {
				options = options || {};
			}
			if ( undefined === options.gpxXmlDeclaration )
			{
				options.gpxXmlDeclaration = true;
			}
			if ( undefined === options.gpxDate )
			{
				options.gpxDate = 2;
			}
			if ( undefined === options.gpxWaypoints )
			{
				options.gpxWaypoints = true;
			}
			if ( undefined === options.gpxRoute )
			{
				options.gpxRoute = true;
			}
			if ( undefined === options.gpxTrack )
			{
				options.gpxTrack = true;
			}

			var tab0 = "\n";
			var tab1 = "\n\t";
			var tab2 = "\n\t\t";
			var tab3 = "\n\t\t\t";

			var timeStamp;
			switch ( options.gpxDate ) {
				case 0 :
					timeStamp = "";
					break;
				case 1 :
					timeStamp = "time='1970-01-01T00:00:00.000Z' ";
					break;
				default :
					timeStamp = "time='" + new Date ( ).toISOString ( ) + "' ";
					break;
			}
			
			var gpxString = "";
			
			if ( options.gpxXmlDeclaration ) {
				gpxString = "<?xml version='1.0'?>" + tab0;
			}
			gpxString += "<gpx xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xsi:schemaLocation='http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd' version='1.1' creator='Leaflet-Routing-Gpx'>";
			if ( this._gpxRoute ) {
				var counter = 0;
				if ( this._gpxRoute.waypoints && options.gpxWaypoints ) {
					for ( counter = 0; counter < this._gpxRoute.waypoints.length; counter ++ ) {
						gpxString += 
							tab1 + "<wpt lat='" + 
							this._gpxRoute.waypoints [ counter ].latLng.lat +
							"' lon='" +
							this._gpxRoute.waypoints [ counter ].latLng.lng +
							"' " +
							timeStamp +
							"name='" +
							counter +
							"' />";
					}
				}
				if ( this._gpxRoute.coordinates && 0 < this._gpxRoute.coordinates.length  ) {
					if ( options.gpxRoute  ) {
						gpxString += tab1 + "<rte>";
						if ( this._gpxRoute.instructions && 0 < this._gpxRoute.instructions.length ) {
							for ( counter = 0; counter < this._gpxRoute.instructions.length; counter++ ) {
								gpxString +=
									tab2 + "<rtept lat='" + 
									( 
										this._gpxRoute.coordinates [ this._gpxRoute.instructions [ counter ].index ].lat ? 
										this._gpxRoute.coordinates [ this._gpxRoute.instructions [ counter ].index ].lat : 
										this._gpxRoute.coordinates [ this._gpxRoute.instructions [ counter ].index ][ 0 ] ) +
									"' lon='" +
									(
										this._gpxRoute.coordinates [ this._gpxRoute.instructions [ counter ].index ].lng ?
										this._gpxRoute.coordinates [ this._gpxRoute.instructions [ counter ].index ].lng :
										this._gpxRoute.coordinates [ this._gpxRoute.instructions [ counter ].index ][ 1 ] ) +
									"' " +
									timeStamp +
									"name='" +
									counter +
									"' " +
									"desc='" +
									this._toXmlString ( this._formatter.formatInstruction ( this._gpxRoute.instructions [ counter ] ) )  +
									"' />" ;
							}
						}
						gpxString += tab1 + "</rte>";
					}

					if ( options.gpxTrack ) {
						gpxString += tab1 + "<trk>";
						gpxString += tab2 + "<trkseg>";
						for ( counter = 0; counter < this._gpxRoute.coordinates.length; counter ++ ) {
							gpxString +=
								tab3 + "<trkpt lat='" + 
								( this._gpxRoute.coordinates [ counter ].lat ? this._gpxRoute.coordinates [ counter ].lat : this._gpxRoute.coordinates [ counter ][ 0 ] ) +
								"' lon='" +
								( this._gpxRoute.coordinates [ counter ].lng ? this._gpxRoute.coordinates [ counter ].lng : this._gpxRoute.coordinates [ counter ][ 1 ] ) +
								"' " +
								timeStamp +
								"name='" +
								counter +
								"' />";
						}
						gpxString += tab2 + "</trkseg>";				
						gpxString += tab1 + "</trk>";
					}
				}
			}
			gpxString += tab0 + "</gpx>";

			return gpxString;
		},
		
		/*
		--- getRouteHTMLElement ------------------------------------------------------------------------------------------------
		This method creates an HTML element with the route description
		------------------------------------------------------------------------------------------------------------------------
		*/

		getRouteHTMLElement : function ( options ) {
			
			options = options || {};
			options.routeElement = options.routeElement || 'div';
			options.routeHeader = options.routeHeader || '<h1>Itinéraire&nbsp;{TransitMode}&nbsp;:</h1>';
			options.routeElementId = options.routeElementId || 'Route';
			options.routeDistanceSummaryTemplate = options.routeDistanceSummaryTemplate || '<div class="Route-Summary">Distance&nbsp;:&nbsp;{ Distance }</div>';
			options.routeTimeSummaryTemplate = options.routeTimeSummaryTemplate || '<div class="Route-Summary">Temps&nbsp;:&nbsp;{ Time }</div>';
			options.routeAscendSummaryTemplate = options.routeAscendSummaryTemplate || '<div class="Route-Summary">Montée&nbsp;:&nbsp;{ Ascend }</div>';
			options.routeDescendSummaryTemplate = options.routeDescendSummaryTemplate || '<div class="Route-Summary">Descente&nbsp;:&nbsp;{ Descend }</div>';
			options.routeTextInstructionTemplate = options.routeTextInstructionTemplate || '<div class="Route-TextInstruction">{Number}<span class="leaflet-routing-icon-big {IconClass}"></span>{TextInstruction}</div>'; 
			options.routeNextDistanceTemplate = options.routeNextDistanceTemplate || '<div class="Route-NextDistanceInstruction">Distance jusqu&apos;au prochain point: {NextDistance}</div>'; 
			options.routeNextTimeTemplate = options.routeNextTimeTemplate || '<div class="Route-NextDistanceInstruction">Temps jusqu&apos;au prochain point: {NextTime}</div>'; 
			options.routeCumulatedDistanceTemplate = options.routeCumulatedDistanceTemplate || '<div class="Route-NextDistanceInstruction">Distance cumulée jusqu&apos;à ce point: {CumulatedDistance}</div>'; 
			options.routeCumulatedTimeTemplate = options.routeCumulatedTimeTemplate || '<div class="Route-NextDistanceInstruction">Temps cumulé jusqu&apos;à ce point: {CumulatedTime}</div>'; 
			options.routeProviderTemplate = options.routeProviderTemplate || '<div class="Route-Provider">Ce trajet a été calculé par <a href="{ProviderUrl}" target="_blank">{Provider}<a> - © {Provider}.</div>';
			var routeElement = document.createElement ( options.routeElement );
			routeElement.id = options.routeElementId;
			var transitMode;
			switch ( this.getTransitMode ( ) ) {
				case 'bike':
					transitMode = 'vélo';
					break;
				case 'pedestrian':
					transitMode = 'piéton';
					break;
				case 'car':
					transitMode = 'voiture';
					break;
			}
			routeElement.innerHTML = L.Util.template (
				options.routeHeader,
				{
					'TransitMode' : transitMode
				}
			);

			if ( this._gpxRoute && this._gpxRoute.instructions && 0 < this._gpxRoute.instructions.length ) {

				var distanceSummaryElement = document.createElement ( 'div' );
				routeElement.appendChild ( distanceSummaryElement );
				distanceSummaryElement.outerHTML = L.Util.template (
					options.routeDistanceSummaryTemplate,
					{
						'Distance' : this._formatter.formatDistance ( this._gpxRoute.summary.totalDistance ),
					}
				);
				var timeSummaryElement = document.createElement ( 'div' );
				routeElement.appendChild ( timeSummaryElement );
				timeSummaryElement.outerHTML = L.Util.template (
					options.routeTimeSummaryTemplate,
					{
						'Time' : this._formatter.formatTime ( this._gpxRoute.summary.totalTime )
					}
				);
				if ( this._gpxRoute.summary.ascend && -1 < this._gpxRoute.summary.ascend )
				{
					var ascentSummaryElement = document.createElement ( 'div' );
					routeElement.appendChild ( ascentSummaryElement );
					ascentSummaryElement.outerHTML = L.Util.template (
						options.routeAscendSummaryTemplate,
						{
							'Ascend' : this._formatter.formatDistance ( this._gpxRoute.summary.ascend )
						}
					);
				}
				if ( this._gpxRoute.summary.descend && -1 < this._gpxRoute.summary.descend )
				{
					var descendSummaryElement = document.createElement ( 'div' );
					routeElement.appendChild ( descendSummaryElement );
					descendSummaryElement.outerHTML = L.Util.template (
						options.routeDescendSummaryTemplate,
						{
							'Descend' : this._formatter.formatDistance ( this._gpxRoute.summary.descend ),
						}
					);
				}
					
				var cumulatedDistance = 0;
				var cumulatedTime = 0;
				var instrCounter = 0;
				for ( instrCounter = 0; instrCounter < this._gpxRoute.instructions.length; instrCounter++ ) {
					this._gpxRoute.instructions [ instrCounter ].cumulatedDistance = cumulatedDistance;
					if ( this._gpxRoute.instructions [ instrCounter ].distance )
					{
						cumulatedDistance += this._gpxRoute.instructions [ instrCounter ].distance;
					}
					this._gpxRoute.instructions [ instrCounter ].cumulatedTime = cumulatedTime;
					if ( this._gpxRoute.instructions [ instrCounter ].time )
					{
						cumulatedTime += this._gpxRoute.instructions [ instrCounter ].time;
					}
					if ( this._gpxRoute.instructions [ instrCounter ].instruction )
					{
						// mapzen comes with 'instructions' and not 'text'
						this._gpxRoute.instructions [ instrCounter ].text = this._gpxRoute.instructions [ instrCounter ].instruction;
					}
				}

				for ( instrCounter = 0; instrCounter < this._gpxRoute.instructions.length; instrCounter++ ) {
					// text
					if ( this._gpxRoute.instructions [ instrCounter ].text ) {
						var textInstructionElement = document.createElement ( 'div' );
						routeElement.appendChild ( textInstructionElement );
						textInstructionElement.outerHTML = L.Util.template (
							options.routeTextInstructionTemplate,
							{
								'Number' : '' + ( instrCounter + 1 ),
								'IconClass' : 'leaflet-routing-icon-' + this._formatter.getIconName ( this._gpxRoute.instructions [ instrCounter ], instrCounter ) + '-big',
								'TextInstruction' : ' - ' + this._toXmlString ( this._gpxRoute.instructions [ instrCounter ].text )
							}
						);
					}
					
					if ( 0 !== this._gpxRoute.instructions [ instrCounter ].cumulatedDistance ) {
						// cumulated distance
						var cumulatedDistanceElement = document.createElement ( 'div' );
						routeElement.appendChild ( cumulatedDistanceElement );
						cumulatedDistanceElement.outerHTML = L.Util.template (
							options.routeCumulatedDistanceTemplate,
							{
								'CumulatedDistance' : this._formatter.formatDistance ( this._gpxRoute.instructions [ instrCounter ].cumulatedDistance )
							}
						);
					}
					if ( 0 !== this._gpxRoute.instructions [ instrCounter ].cumulatedTime ) {
						// cumulated time
						var cumulatedTimeElement = document.createElement ( 'div' );
						routeElement.appendChild ( cumulatedTimeElement );
						cumulatedTimeElement.outerHTML = L.Util.template (
							options.routeCumulatedTimeTemplate,
							{
								'CumulatedTime' : this._formatter.formatTime ( this._gpxRoute.instructions [ instrCounter ].cumulatedTime )
							}
						);
					}
					
					if ( 0 !== this._gpxRoute.instructions [ instrCounter ].distance ) {
						// distance
						var nextDistanceElement = document.createElement ( 'div' );
						routeElement.appendChild ( nextDistanceElement );
						nextDistanceElement.outerHTML = L.Util.template (
							options.routeNextDistanceTemplate,
							{
								'NextDistance' : this._formatter.formatDistance ( this._gpxRoute.instructions [ instrCounter ].distance )
							}
						);
					}
					if ( 0 !== this._gpxRoute.instructions [ instrCounter ].time ) {
						// time
						var nextTimeElement = document.createElement ( 'div' );
						routeElement.appendChild ( nextTimeElement );
						nextTimeElement.outerHTML = L.Util.template (
							options.routeNextTimeTemplate,
							{
								'NextTime' : this._formatter.formatTime ( this._gpxRoute.instructions [ instrCounter ].time )
							}
						);
					}
				} 
				var provider = 'OSRM';
				var providerUrl = 'http://project-osrm.org/';
				switch ( this.getProvider ( ) ) {
					case 'graphhopper':
						provider = 'GraphHopper';
						providerUrl = 'http://www.graphhopper.com/'; 
						break;
					case 'mapzen':
						provider = 'Mapzen';
						providerUrl = 'http://www.mapzen.com/'; 
						break;
					case 'mapbox':
						provider = 'Mapbox';
						providerUrl = 'http://www.mapbox.com/'; 
						break;
				}
				var providerElement = document.createElement ( 'div' );
				routeElement.appendChild ( providerElement );
				providerElement.outerHTML = L.Util.template (
					options.routeProviderTemplate,
					{
						'ProviderUrl' : providerUrl,
						'Provider': provider
					}
				);
			}
			return routeElement;
		},
		_addRowListeners: function ( row, coordinate ) {
			L.Routing.Control.prototype._addRowListeners.call ( this, row, coordinate );
			L.DomEvent.addListener ( row, 'contextmenu', function ( e ) {
				e.preventDefault ( );
				e.stopPropagation ( );
				this.fire ( 'instructioncontextmenu', coordinate );
			}, this);
		}
	});
	
	/*
	--- L.Routing.extensions function --------------------------------------------------------------------------------------
	L.Routing.Extensions factory function
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.extensions = function ( options ) {
		return new L.Routing.Extensions ( options );
	};

	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.extensions;
	}
} ) ( );

/* --- End of L.Routing.Extensions.js file --- */