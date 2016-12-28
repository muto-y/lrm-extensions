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
			var gpxAnchor = L.DomUtil.create ( 'a', 'lrm-extensions-ServicesAnchor', this._servicesButtonsDiv );
			gpxAnchor.id = 'downloadGpx';
			gpxAnchor.setAttribute ( 'download', 'lrm-extensions.gpx' ); 
			gpxAnchor.innerHTML = '<span id="lrm-extensions-GpxButton" class="lrm-extensions-ServicesButton"></span>';

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
						else {
							lineOptions = polylineDialog ( lineOptions, this._map, this );
						}
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
				else {
					PolylineMenu = polylineMenu;
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
			else {
				PolylineMenu = polylineMenu;
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
			// GPX file
			this._prepareGpxLink ( );
			this.fire ( 'gpxchanged' );
		},
		
		/*
		--- _prepareGpxLink method ---------------------------------------------------------------------------------------------
		This method set the GPX data in the GPX button
		------------------------------------------------------------------------------------------------------------------------
		*/

		_prepareGpxLink : function ( ) {
			// gpx file is prepared
			// try... catch is needed because some browsers don't implement window.URL.createObjectURL correctly :-( 
			var GpxFile = null;

			try {
				var GpxData = new File ( [ this.getGpxString ( ) ], { type: 'application/xml' } );
				if ( GpxFile !== null ) {
					window.URL.revokeObjectURL ( GpxFile );
				}
				GpxFile = window.URL.createObjectURL ( GpxData );
			}
			catch ( Error ) {
			}
			
			if ( GpxFile ) {
				document.getElementById( 'downloadGpx').href = GpxFile;
			}
			else {
				document.getElementById( 'downloadGpx' ).style.visibility = 'hidden';
			}
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
			if ( undefined === options.GpxXmlDeclaration )
			{
				options.GpxXmlDeclaration = true;
			}
			if ( undefined === options.GpxDate )
			{
				options.GpxDate = 2;
			}
			if ( undefined === options.GpxWaypoints )
			{
				options.GpxWaypoints = true;
			}
			if ( undefined === options.gpxRoute )
			{
				options.gpxRoute = true;
			}
			if ( undefined === options.GpxTrack )
			{
				options.GpxTrack = true;
			}

			var Tab0 = "\n";
			var Tab1 = "\n\t";
			var Tab2 = "\n\t\t";
			var Tab3 = "\n\t\t\t";

			var TimeStamp;
			switch ( options.GpxDate ) {
				case 0 :
					TimeStamp = "";
					break;
				case 1 :
					TimeStamp = "time='1970-01-01T00:00:00.000Z' ";
					break;
				default :
					TimeStamp = "time='" + new Date ( ).toISOString ( ) + "' ";
					break;
			}
			
			var GPXString = "";
			
			if ( options.GpxXmlDeclaration ) {
				GPXString = "<?xml version='1.0'?>" + Tab0;
			}
			GPXString += "<gpx xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xsi:schemaLocation='http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd' version='1.1' creator='Leaflet-Routing-Gpx'>";
			if ( this._gpxRoute ) {
				var Counter = 0;
				if ( this._gpxRoute.waypoints && options.GpxWaypoints ) {
					for ( Counter = 0; Counter < this._gpxRoute.waypoints.length; Counter ++ ) {
						GPXString += 
							Tab1 + "<wpt lat='" + 
							this._gpxRoute.waypoints [ Counter ].latLng.lat +
							"' lon='" +
							this._gpxRoute.waypoints [ Counter ].latLng.lng +
							"' " +
							TimeStamp +
							"name='" +
							Counter +
							"' />";
					}
				}
				if ( this._gpxRoute.coordinates && 0 < this._gpxRoute.coordinates.length  ) {
					if ( options.gpxRoute  ) {
						GPXString += Tab1 + "<rte>";
						if ( this._gpxRoute.instructions && 0 < this._gpxRoute.instructions.length ) {
							for ( Counter = 0; Counter < this._gpxRoute.instructions.length; Counter++ ) {
								GPXString +=
									Tab2 + "<rtept lat='" + 
									( 
										this._gpxRoute.coordinates [ this._gpxRoute.instructions [ Counter ].index ].lat ? 
										this._gpxRoute.coordinates [ this._gpxRoute.instructions [ Counter ].index ].lat : 
										this._gpxRoute.coordinates [ this._gpxRoute.instructions [ Counter ].index ][ 0 ] ) +
									"' lon='" +
									(
										this._gpxRoute.coordinates [ this._gpxRoute.instructions [ Counter ].index ].lng ?
										this._gpxRoute.coordinates [ this._gpxRoute.instructions [ Counter ].index ].lng :
										this._gpxRoute.coordinates [ this._gpxRoute.instructions [ Counter ].index ][ 1 ] ) +
									"' " +
									TimeStamp +
									"name='" +
									Counter +
									"' " +
									"desc='" +
									this._toXmlString ( this._formatter.formatInstruction ( this._gpxRoute.instructions [ Counter ] ) )  +
									"' />" ;
							}
						}
						GPXString += Tab1 + "</rte>";
					}

					if ( options.GpxTrack ) {
						GPXString += Tab1 + "<trk>";
						GPXString += Tab2 + "<trkseg>";
						for ( Counter = 0; Counter < this._gpxRoute.coordinates.length; Counter ++ ) {
							GPXString +=
								Tab3 + "<trkpt lat='" + 
								( this._gpxRoute.coordinates [ Counter ].lat ? this._gpxRoute.coordinates [ Counter ].lat : this._gpxRoute.coordinates [ Counter ][ 0 ] ) +
								"' lon='" +
								( this._gpxRoute.coordinates [ Counter ].lng ? this._gpxRoute.coordinates [ Counter ].lng : this._gpxRoute.coordinates [ Counter ][ 1 ] ) +
								"' " +
								TimeStamp +
								"name='" +
								Counter +
								"' />";
						}
						GPXString += Tab2 + "</trkseg>";				
						GPXString += Tab1 + "</trk>";
					}
				}
			}
			GPXString += Tab0 + "</gpx>";

			return GPXString;
		},
		
		/*
		--- getRouteHTMLElement ------------------------------------------------------------------------------------------------
		This method creates an HTML element with the route description
		------------------------------------------------------------------------------------------------------------------------
		*/

		getRouteHTMLElement : function ( options ) {
			
			options = options || {};
			options.RouteElement = options.RouteElement || 'div';
			options.RouteHeader = options.RouteHeader || '<h1>Itinéraire:</h1>';
			options.RouteElementId = options.RouteElementId || 'Route';
			options.RouteDistanceSummaryTemplate = options.RouteDistanceSummaryTemplate || '<div class="Route-Summary">Distance&nbsp;:&nbsp;{ Distance }</div>';
			options.RouteTimeSummaryTemplate = options.RouteTimeSummaryTemplate || '<div class="Route-Summary">Temps&nbsp;:&nbsp;{ Time }</div>';
			options.RouteAscendSummaryTemplate = options.RouteAscendSummaryTemplate || '<div class="Route-Summary">Montée&nbsp;:&nbsp;{ Ascend }</div>';
			options.RouteDescendSummaryTemplate = options.RouteDescendSummaryTemplate || '<div class="Route-Summary">Descente&nbsp;:&nbsp;{ Descend }</div>';
			options.RouteTextInstructionTemplate = options.RouteTextInstructionTemplate || '<div class="Route-TextInstruction">{Number}<span class="leaflet-routing-icon-big {IconClass}"></span>{TextInstruction}</div>'; 
			options.RouteNextDistanceTemplate = options.RouteNextDistanceTemplate || '<div class="Route-NextDistanceInstruction">Distance jusqu&apos;au prochain point: {NextDistance}</div>'; 
			options.RouteNextTimeTemplate = options.RouteNextTimeTemplate || '<div class="Route-NextDistanceInstruction">Temps jusqu&apos;au prochain point: {NextTime}</div>'; 
			options.RouteCumulatedDistanceTemplate = options.RouteCumulatedDistanceTemplate || '<div class="Route-NextDistanceInstruction">Distance cumulée jusqu&apos;à ce point: {CumulatedDistance}</div>'; 
			options.RouteCumulatedTimeTemplate = options.RouteCumulatedTimeTemplate || '<div class="Route-NextDistanceInstruction">Temps cumulé jusqu&apos;à ce point: {CumulatedTime}</div>'; 
			options.RouteProviderTemplate = options.RouteProviderTemplate || '<div class="Route-Provider">Ce trajet a été calculé par <a href="{ProviderUrl}" target="_blank">{Provider}<a> - © {Provider}.</div>';
			var RouteElement = document.createElement ( options.RouteElement );
			RouteElement.id = options.RouteElementId;
			RouteElement.innerHTML = options.RouteHeader;

			if ( this._gpxRoute && this._gpxRoute.instructions && 0 < this._gpxRoute.instructions.length ) {

				var distanceSummaryElement = document.createElement ( 'div' );
				RouteElement.appendChild ( distanceSummaryElement );
				distanceSummaryElement.outerHTML = L.Util.template (
					options.RouteDistanceSummaryTemplate,
					{
						'Distance' : this._formatter.formatDistance ( this._gpxRoute.summary.totalDistance ),
					}
				);
				var timeSummaryElement = document.createElement ( 'div' );
				RouteElement.appendChild ( timeSummaryElement );
				timeSummaryElement.outerHTML = L.Util.template (
					options.RouteTimeSummaryTemplate,
					{
						'Time' : this._formatter.formatTime ( this._gpxRoute.summary.totalTime )
					}
				);
				if ( this._gpxRoute.summary.ascend && -1 < this._gpxRoute.summary.ascend )
				{
					var ascentSummaryElement = document.createElement ( 'div' );
					RouteElement.appendChild ( ascentSummaryElement );
					ascentSummaryElement.outerHTML = L.Util.template (
						options.RouteAscendSummaryTemplate,
						{
							'Ascend' : this._formatter.formatDistance ( this._gpxRoute.summary.ascend )
						}
					);
				}
				if ( this._gpxRoute.summary.descend && -1 < this._gpxRoute.summary.descend )
				{
					var descendSummaryElement = document.createElement ( 'div' );
					RouteElement.appendChild ( descendSummaryElement );
					descendSummaryElement.outerHTML = L.Util.template (
						options.RouteDescendSummaryTemplate,
						{
							'Descend' : this._formatter.formatDistance ( this._gpxRoute.summary.descend ),
						}
					);
				}
					
				var haveExactCumulatedDistance = true;
				var haveExactCumulatedTime = true;
				var cumulatedDistance = 0;
				var cumulatedTime = 0;
				var instrCounter = 0;
				for ( instrCounter = 0; instrCounter < this._gpxRoute.instructions.length; instrCounter++ ) {
					this._gpxRoute.instructions [ instrCounter ].cumulatedDistance = cumulatedDistance;
					if ( this._gpxRoute.instructions [ instrCounter ].distance )
					{
						cumulatedDistance += this._gpxRoute.instructions [ instrCounter ].distance;
					}
					/*
					else{
						haveExactCumulatedDistance = false;
					}
					*/
					this._gpxRoute.instructions [ instrCounter ].cumulatedTime = cumulatedTime;
					if ( this._gpxRoute.instructions [ instrCounter ].time )
					{
						cumulatedTime += this._gpxRoute.instructions [ instrCounter ].time;
					}
					else {
						haveExactCumulatedTime = false;
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
						var TextInstructionElement = document.createElement ( 'div' );
						RouteElement.appendChild ( TextInstructionElement );
						TextInstructionElement.outerHTML = L.Util.template (
							options.RouteTextInstructionTemplate,
							{
								'Number' : '' + ( instrCounter + 1 ),
								'IconClass' : 'leaflet-routing-icon-' + this._formatter.getIconName ( this._gpxRoute.instructions [ instrCounter ], instrCounter ) + '-big',
								'TextInstruction' : ' - ' + this._toXmlString ( this._gpxRoute.instructions [ instrCounter ].text )
							}
						);
					}
					
					
					if ( 0 !== this._gpxRoute.instructions [ instrCounter ].cumulatedDistance ) {
						// cumulated distance
						var CumulatedDistanceElement = document.createElement ( 'div' );
						RouteElement.appendChild ( CumulatedDistanceElement );
						CumulatedDistanceElement.outerHTML = L.Util.template (
							options.RouteCumulatedDistanceTemplate,
							{
								'CumulatedDistance' : this._formatter.formatDistance ( this._gpxRoute.instructions [ instrCounter ].cumulatedDistance )
							}
						);
					}
					if ( 0 !== this._gpxRoute.instructions [ instrCounter ].cumulatedTime ) {
						// cumulated time
						var CumulatedTimeElement = document.createElement ( 'div' );
						RouteElement.appendChild ( CumulatedTimeElement );
						CumulatedTimeElement.outerHTML = L.Util.template (
							options.RouteCumulatedTimeTemplate,
							{
								'CumulatedTime' : this._formatter.formatTime ( this._gpxRoute.instructions [ instrCounter ].cumulatedTime )
							}
						);
					}
					
					
					
					
					
					if ( 0 !== this._gpxRoute.instructions [ instrCounter ].distance ) {
						// distance
						var NextDistanceElement = document.createElement ( 'div' );
						RouteElement.appendChild ( NextDistanceElement );
						NextDistanceElement.outerHTML = L.Util.template (
							options.RouteNextDistanceTemplate,
							{
								'NextDistance' : this._formatter.formatDistance ( this._gpxRoute.instructions [ instrCounter ].distance )
							}
						);
					}
					if ( 0 !== this._gpxRoute.instructions [ instrCounter ].time ) {
						// time
						var NextTimeElement = document.createElement ( 'div' );
						RouteElement.appendChild ( NextTimeElement );
						NextTimeElement.outerHTML = L.Util.template (
							options.RouteNextTimeTemplate,
							{
								'NextTime' : this._formatter.formatTime ( this._gpxRoute.instructions [ instrCounter ].time )
							}
						);
					}
				} 
				var Provider = 'OSRM';
				var ProviderUrl = 'http://project-osrm.org/';
				switch ( this.getProvider ( ) ) {
					case 'graphhopper':
						Provider = 'GraphHopper';
						ProviderUrl = 'http://www.graphhopper.com/'; 
						break;
					case 'mapzen':
						Provider = 'Mapzen';
						ProviderUrl = 'http://www.mapzen.com/'; 
						break;
					case 'mapbox':
						Provider = 'Mapbox';
						ProviderUrl = 'http://www.mapbox.com/'; 
						break;
				}
				var ProviderElement = document.createElement ( 'div' );
				RouteElement.appendChild ( ProviderElement );
				ProviderElement.outerHTML = L.Util.template (
					options.RouteProviderTemplate,
					{
						'ProviderUrl' : ProviderUrl,
						'Provider': Provider
					}
				);
			}
			return RouteElement;
		},
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