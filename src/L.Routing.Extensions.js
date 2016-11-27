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

	var Lrm = null;
	L.Routing.Extensions = L.Routing.Control.extend ( {

		_GpxRoute : null,
		_TransitMode : 'bike',
		ProviderChange : function ( Provider ) {
			this.options.summaryTemplate = '';
			this.options.formatter = null;
			this.options.DefaultTransitMode = this._TransitMode;
			this.options.DefaultProvider = Provider;
			this.initialize ( this.options );
		},
		_setRouterAndFormatter : function ( options ) {
			switch ( options.DefaultProvider ) {
				case 'graphhopper':
				{
					var GraphHopperUrlParameters = {};
					GraphHopperUrlParameters.locale = options.language;
					switch ( options.DefaultTransitMode ) {
						case 'bike':
						{
							GraphHopperUrlParameters.vehicle = 'bike';
							break;
						}
						case 'pedestrian':
						{
							GraphHopperUrlParameters.vehicle = 'foot';
							break;
						}
						case 'car':
						{
							GraphHopperUrlParameters.vehicle = 'car';
							break;
						}
					}
					options.router = L.Routing.graphHopper ( options.ProvidersKey.GraphHopper, { urlParameters : GraphHopperUrlParameters } );
					break;
				}
				case 'mapzen':
				{
					var MapzenOptions = { directions_options: { language: options.language } };
					switch ( options.DefaultTransitMode ) {
						case 'bike':
						{
							MapzenOptions.costing = "bicycle";
							break;
						}
						case 'pedestrian':
						{
							MapzenOptions.costing = "pedestrian";
							break;
						}
						case 'car':
						{
							MapzenOptions.costing = "auto";
							break;
						}
					}
					MapzenOptions.costing_options = { bicycle: { bicycle_type: "Mountain", cycling_speed: "20.0", use_roads: "0", use_hills: "1"} };
					options.router = L.Routing.mapzen( options.ProvidersKey.Mapzen, MapzenOptions );
					options.formatter = new L.Routing.mapzenFormatter ( );
					options.summaryTemplate = '<div class="start">{name}</div><div class="info {costing}">{distance}, {time}</div>';
					options.routeWhileDragging = false;
					break;
				}
				case 'mapbox':
				{
					var MapboxProfile;
					switch ( options.DefaultTransitMode ) {
						case 'bike':
						{
							MapboxProfile = { profile: 'mapbox/cycling'};
							break;
						}
						case 'pedestrian':
						{
							MapboxProfile = { profile: 'mapbox/walking'};
							break;
						}
						case 'car':
						{
							MapboxProfile = { profile: 'mapbox/driving'};
							break;
						}
					}
					options.router = L.Routing.mapbox ( options.ProvidersKey.Mapbox, MapboxProfile );
					options.routeWhileDragging = false;
					break;
				}
			}
		},
	
		initialize: function ( options ) {
			Lrm = this;
			options.language = options.language  || 'en';
			options.DefaultProvider = options.DefaultProvider || 'osrm';
			options.DefaultProvider = options.DefaultProvider.toLowerCase();
			options.DefaultTransitMode = options.DefaultTransitMode || 'car';
			options.DefaultTransitMode = options.DefaultTransitMode.toLowerCase();
			options.ProvidersKey = options.ProvidersKey || {};
			options.ProvidersKey.GraphHopper = options.ProvidersKey.GraphHopper || '';
			options.ProvidersKey.Mapzen = options.ProvidersKey.Mapzen || '';
			options.ProvidersKey.Mapbox = options.ProvidersKey.Mapbox || '';
			if ( ( 0 === options.ProvidersKey.GraphHopper.length ) && ( 0 === options.ProvidersKey.Mapzen.length ) && ( 0 === options.ProvidersKey.Mapbox.length ) ) {
				options.DefaultProvider = 'osrm';
				options.DefaultTransitMode = 'car';				
			}
			if ( -1 === [ 'graphhopper', 'mapzen', 'mapbox', 'osrm' ].indexOf (  options.DefaultProvider ) ) {
				options.DefaultProvider = 'osrm';
			}
			if ( -1 === [ 'bike', 'pedestrian', 'car' ].indexOf (  options.DefaultTransitMode ) ) {
				options.DefaultTransitMode = 'car';				
			}
			if ( ( 0 === options.ProvidersKey.GraphHopper.length ) && ( 'graphhopper' === options.DefaultProvider )) {
				options.DefaultProvider = 'osrm';
				options.DefaultTransitMode = 'car';				
			}
			if ( ( 0 === options.ProvidersKey.Mapzen.length ) && ( 'mapzen' === options.DefaultProvider )) {
				options.DefaultProvider = 'osrm';
				options.DefaultTransitMode = 'car';				
			}
			if ( ( 0 === options.ProvidersKey.Mapbox.length ) && ( 'mapbox' === options.DefaultProvider )) {
				options.DefaultProvider = 'osrm';
				options.DefaultTransitMode = 'car';				
			}
			this._TransitMode = options.DefaultTransitMode;
			
			
			
			this._setRouterAndFormatter ( options );
			
			L.Util.setOptions ( this, options );
			
			
			L.Routing.Control.prototype.initialize.call ( this, options );

			console.log( JSON.stringify ( this.options ) );
			console.log ( this.options ); 
		},
		_ButtonsDiv : null,
		
		_createRadioButton: function ( parentHTML, titleAttribute, nameAttribute, ButtonId, LabelId ) {
			var RadioButton = L.DomUtil.create ( 'input', 'lrm-extensions-Button', parentHTML );
			RadioButton.type = 'radio';
			RadioButton.setAttribute ( 'title' , titleAttribute );
			RadioButton.setAttribute ( 'name' , nameAttribute );
			RadioButton.id = ButtonId;

			var RadioLabel = L.DomUtil.create ( 'label', 'lrm-extensions-Label', parentHTML );
			RadioLabel.setAttribute ( 'title' , titleAttribute );
			RadioLabel.setAttribute ( 'for' , ButtonId );
			RadioLabel.id = LabelId;
			
			return RadioButton;
		},
		
		onAdd: function ( map ) {
			var Container = L.Routing.Control.prototype.onAdd.call ( this, map );
			this._ButtonsDiv = L.DomUtil.create ( 'form', 'lrm-extensions-Buttons' );
			var BikeButton;
			var PedestrianButton;
			var CarButton;
			if ( ( 0 < this.options.ProvidersKey.GraphHopper.length ) || ( 0 < this.options.ProvidersKey.Mapzen.length ) || ( 0 < this.options.ProvidersKey.Mapbox.length ) ) {
				BikeButton = this._createRadioButton ( this._ButtonsDiv, 'Bike', 'transitmode', 'lrm-extensions-BikeButton', 'lrm-extensions-BikeLabel');
				PedestrianButton = this._createRadioButton ( this._ButtonsDiv, 'Pedestrian', 'transitmode', 'lrm-extensions-PedestrianButton', 'lrm-extensions-PedestrianLabel');
				CarButton = this._createRadioButton ( this._ButtonsDiv, 'Car', 'transitmode', 'lrm-extensions-CarButton', 'lrm-extensions-CarLabel');
				switch ( this.options.DefaultTransitMode ) {
					case 'bike':
						BikeButton.checked = true;
						break;
					case 'pedestrian':
						PedestrianButton.checked = true;
						break;
					case 'car':
						CarButton.checked = true;
						break;
					default:
						CarButton.checked = true;
						break;
				}
				L.DomEvent.on ( 
					BikeButton, 
					'click', 
					function ( event ) 
					{ 
						Lrm._TransitMode = 'bike';
						switch ( Lrm.options.DefaultProvider ) {
							case 'graphhopper':
							Lrm.options.router.options.urlParameters.vehicle = 'bike';
							break;
							case 'mapzen':
							Lrm.options.DefaultTransitMode = 'bike';
							Lrm.options.router.costing = 'bicycle';
							Lrm.options.router.options.costing = 'bicycle';
							break;
							case 'mapbox':
							Lrm.options.router.options.profile = 'mapbox/cycling';
							break;
						}
						Lrm.route ( );
					}
				);
				L.DomEvent.on ( 
					PedestrianButton, 
					'click', 
					function ( event ) 
					{ 
						Lrm._TransitMode = 'pedestrian';
						switch ( Lrm.options.DefaultProvider ) {
							case 'graphhopper':
							Lrm.options.router.options.urlParameters.vehicle = 'foot';
							break;
							case 'mapzen':
							Lrm.options.DefaultTransitMode = 'pedestrian';
							Lrm.options.router.costing = 'pedestrian';
							Lrm.options.router.options.costing = 'pedestrian';
							break;
							case 'mapbox':
							Lrm.options.router.options.profile = 'mapbox/walking';
							break;
						}
						Lrm.route ( );
					}
				);
				L.DomEvent.on ( 
					CarButton, 
					'click', 
					function ( event ) 
					{ 
						Lrm._TransitMode = 'car';
						switch ( Lrm.options.DefaultProvider ) {
							case 'graphhopper':
							Lrm.options.router.options.urlParameters.vehicle = 'car';
							break;
							case 'mapzen':
							Lrm.options.DefaultTransitMode = 'car';
							Lrm.options.router.costing = 'auto';
							Lrm.options.router.options.costing = 'auto';
							break;
							case 'mapbox':
							Lrm.options.router.options.profile = 'mapbox/driving';
							break;
						}
						Lrm.route ( );
					}
				);
			}
			else {
				this.options.DefaultProvider = 'osrm';
				this.options.DefaultTransitMode = 'car';				
			}
			
			
			var GraphHopperButton;
			var MapzenButton;
			var MapboxButton;
			if ( 0 < this.options.ProvidersKey.GraphHopper.length ) {
				GraphHopperButton = this._createRadioButton ( this._ButtonsDiv, 'GraphHopper', 'provider', 'lrm-extensions-GraphHopperButton', 'lrm-extensions-GraphHopperLabel');
				L.DomEvent.on ( 
					GraphHopperButton, 
					'click', 
					function ( event ) 
					{ 
						Lrm.ProviderChange ( 'graphhopper' );
						Lrm.fire ( 'providerchanged');
					}
				);
			}
			if ( 0 < this.options.ProvidersKey.Mapzen.length ) {
				MapzenButton = this._createRadioButton ( this._ButtonsDiv, 'Mapzen', 'provider', 'lrm-extensions-MapzenButton', 'lrm-extensions-MapzenLabel');
				L.DomEvent.on ( 
					MapzenButton, 
					'click', 
					function ( event ) 
					{ 
						Lrm.ProviderChange ( 'mapzen' );
						Lrm.fire ( 'providerchanged');
					}
				);
			}
			if ( 0 < this.options.ProvidersKey.Mapbox.length ) {
				MapboxButton = this._createRadioButton ( this._ButtonsDiv, 'Mapbox', 'provider', 'lrm-extensions-MapboxButton', 'lrm-extensions-MapboxLabel');
				L.DomEvent.on ( 
					MapboxButton, 
					'click', 
					function ( event ) 
					{ 
						Lrm.ProviderChange ( 'mapbox' );
						Lrm.fire ( 'providerchanged');
					}
				);
			}

			switch ( this.options.DefaultProvider ) {
				case 'graphhopper':
					if ( GraphHopperButton ) {
						GraphHopperButton.checked = true;
					}
					break;
				case 'mapzen':
					if ( MapzenButton ) {
						MapzenButton.checked = true;
					}
					break;
				case 'mapbox':
					if ( MapboxButton ) {
						MapboxButton.checked = true;
					}
					break;
			}
			
			var GpxButton = this._createRadioButton ( this._ButtonsDiv, 'GPX', 'gpx', 'lrm-extensions-GpxButton', 'lrm-extensions-GpxLabel');
			
			Container.insertBefore( this._ButtonsDiv, Container.firstChild);

			return Container;
		},
		
		show : function ( ) {
			L.Routing.Control.prototype.show.call ( this );
			this._ButtonsDiv.setAttribute ( "style" , "display: block" );
		},
		
		hide : function ( ) {
			L.Routing.Control.prototype.hide.call ( this );
			this._ButtonsDiv.setAttribute ( "style" , "display: none" );
		},
		_updateLines: function ( routes ) {
			this._GpxRoute = routes.route;
			if ( ! routes.route.waypoints && routes.route.actualWaypoints) {
				// GraphHopper route comes without waypoints. We use actualWaypoints as waypoints
				routes.route.waypoints = routes.route.actualWaypoints;
			}
			L.Routing.Control.prototype._updateLines.call ( this, routes );
			this.fire ( 'gpxchanged' );
		},
		
		_toXmlString : function ( XmlString ) {
			return XmlString.replace ( '&', '&amp;' ).replace ( '\'', '&apos;' ).replace ('\"', '&quote;').replace ( '>', '&gt;' ).replace ( '<', '&lt;');
		},
		
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
			if ( undefined === options.GpxRoute )
			{
				options.GpxRoute = true;
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
			if ( this._GpxRoute ) {
				var Counter = 0;
				if ( this._GpxRoute.waypoints && options.GpxWaypoints ) {
					for ( Counter = 0; Counter < this._GpxRoute.waypoints.length; Counter ++ ) {
						GPXString += 
							Tab1 + "<wpt lat='" + 
							this._GpxRoute.waypoints [ Counter ].latLng.lat +
							"' lon='" +
							this._GpxRoute.waypoints [ Counter ].latLng.lng +
							"' " +
							TimeStamp +
							"name='" +
							Counter +
							"' />";
					}
				}
				if ( this._GpxRoute.coordinates && 0 < this._GpxRoute.coordinates.length  ) {
					if ( options.GpxRoute  ) {
						GPXString += Tab1 + "<rte>";
						if ( this._GpxRoute.instructions && 0 < this._GpxRoute.instructions.length ) {
							for ( Counter = 0; Counter < this._GpxRoute.instructions.length; Counter++ ) {
								GPXString +=
									Tab2 + "<rtept lat='" + 
									( 
										this._GpxRoute.coordinates [ this._GpxRoute.instructions [ Counter ].index ].lat ? 
										this._GpxRoute.coordinates [ this._GpxRoute.instructions [ Counter ].index ].lat : 
										this._GpxRoute.coordinates [ this._GpxRoute.instructions [ Counter ].index ][ 0 ] ) +
									"' lon='" +
									(
										this._GpxRoute.coordinates [ this._GpxRoute.instructions [ Counter ].index ].lng ?
										this._GpxRoute.coordinates [ this._GpxRoute.instructions [ Counter ].index ].lng :
										this._GpxRoute.coordinates [ this._GpxRoute.instructions [ Counter ].index ][ 1 ] ) +
									"' " +
									TimeStamp +
									"name='" +
									Counter +
									"' " +
									"desc='" +
									this._toXmlString ( this._formatter.formatInstruction ( this._GpxRoute.instructions [ Counter ] ) )  +
									"' />" ;
							}
						}
						GPXString += Tab1 + "</rte>";
					}

					if ( options.GpxTrack ) {
						GPXString += Tab1 + "<trk>";
						GPXString += Tab2 + "<trkseg>";
						for ( Counter = 0; Counter < this._GpxRoute.coordinates.length; Counter ++ ) {
							GPXString +=
								Tab3 + "<trkpt lat='" + 
								( this._GpxRoute.coordinates [ Counter ].lat ? this._GpxRoute.coordinates [ Counter ].lat : this._GpxRoute.coordinates [ Counter ][ 0 ] ) +
								"' lon='" +
								( this._GpxRoute.coordinates [ Counter ].lng ? this._GpxRoute.coordinates [ Counter ].lng : this._GpxRoute.coordinates [ Counter ][ 1 ] ) +
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
		
		getRouteCoordinates : function ( ) {
			if ( this._GpxRoute && this._GpxRoute.coordinates && 0 < this._GpxRoute.coordinates.length ) {
				// we have coordinates...
				if ( this._GpxRoute.coordinates [ 0 ].lat ) {
					// ... in the Leaflet-routing-machine format 
					return JSON.stringify ( this._GpxRoute.coordinates );
				}
			}
			
			return null;
		},
		
		getRouteHTMLElement : function ( options ) {
			
			options = options || {};
			options.RouteElement = options.RouteElement || 'div';
			options.RouteHeader = options.RouteHeader || '<h1>Itinéraire:</h1>';
			options.RouteElementId = options.RouteElementId || 'Route';
			options.RouteSummaryTemplate = options.RouteSummaryTemplate || '<div class="Route-Summary">Distance&nbsp;:&nbsp;{ Distance }&nbsp;-&nbsp;Temps&nbsp;:&nbsp;{ Time }</div>';
			options.CumDistanceTemplate = options.CumDistanceTemplate || '<div class="Route-CumDistance"> Distance cumulée&nbsp;:&nbsp;{ CumDistance }<div>';
			// OSRM and GraphHopper only:
			options.RouteTextInstructionTemplate = options.RouteTextInstructionTemplate || '<div class="Route-TextInstruction">{TextInstruction}</div>'; 
			options.RouteNextDistanceTemplate = options.RouteNextDistanceTemplate || '<div class="Route-PostInstruction">Continuez pendant {NextDistance}</div>'; 
			// Mapzen only:
			options.RoutePreInstructionTemplate = options.RoutePreInstructionTemplate || '<div class="Route-PreInstruction">{PreInstruction}</div>'; 
			options.RoutePostInstructionTemplate = options.RoutePostInstructionTemplate || '<div class="Route-PostInstruction">{PostInstruction}</div>'; 

			var RouteElement = document.createElement ( options.RouteElement );
			RouteElement.id = options.RouteElementId;
			RouteElement.innerHTML = options.RouteHeader;
				
			if ( this._GpxRoute && this._GpxRoute.instructions && 0 < this._GpxRoute.instructions.length ) {
				var SummaryElement = document.createElement ( 'div' );
				RouteElement.appendChild ( SummaryElement );
				SummaryElement.outerHTML = L.Util.template (
					options.RouteSummaryTemplate,
					{
						'Distance' : this._formatter.formatDistance ( this._GpxRoute.summary.totalDistance ),
						'Time' : this._formatter.formatTime ( this._GpxRoute.summary.totalTime )
					}
				);
				var Counter = 0;
				var CumDistance = 0;
				// mapzen : instructions.instruction
				// graphhopper & OSRM: instructions.text
				
				for ( Counter = 0; Counter < this._GpxRoute.instructions.length; Counter++ ) {

					// GraphHopper and OSRM text
					if ( this._GpxRoute.instructions [ Counter ].text ) {
						var TextInstructionElement = document.createElement ( 'div' );
						RouteElement.appendChild ( TextInstructionElement );
						TextInstructionElement.outerHTML = L.Util.template (
							options.RouteTextInstructionTemplate,
							{
								'TextInstruction' : '' + ( Counter + 1 ) + ' - ' + this._toXmlString ( this._GpxRoute.instructions [ Counter ].text )
							}
						);
						if ( 0 < this._GpxRoute.instructions [ Counter ].distance ) {
							var NextDistanceElement = document.createElement ( 'div' );
							RouteElement.appendChild ( NextDistanceElement );
							NextDistanceElement.outerHTML = L.Util.template (
								options.RouteNextDistanceTemplate,
								{
									'NextDistance' : this._formatter.formatDistance ( Math.round ( this._GpxRoute.instructions [ Counter ].distance * 1000 ) / 1000 )
								}
							);
						}
					}

					// Mapzen pre-instruction
					if ( this._GpxRoute.instructions [ Counter ].verbal_pre_transition_instruction ) {
						var PreInstructionElement = document.createElement ( 'div' );
						RouteElement.appendChild ( PreInstructionElement );
						PreInstructionElement.outerHTML = L.Util.template (
							options.RoutePreInstructionTemplate,
							{
								'PreInstruction' : '' + ( Counter + 1 ) + ' - ' + this._toXmlString ( this._GpxRoute.instructions [ Counter ].verbal_pre_transition_instruction )
							}
						);
					}

					//Mapzen post-instruction
					if ( this._GpxRoute.instructions [ Counter ].verbal_post_transition_instruction ) {
						var PostInstructionElement = document.createElement ( 'div' );
						RouteElement.appendChild ( PostInstructionElement );
						PostInstructionElement.outerHTML = L.Util.template (
							options.RoutePostInstructionTemplate,
							{
								'PostInstruction' : this._toXmlString ( this._GpxRoute.instructions [ Counter ].verbal_post_transition_instruction )
							}
						);
					}
					if ( 0 < CumDistance ) {
						var CumDistanceElement = document.createElement ( 'div' );
						RouteElement.appendChild ( CumDistanceElement );
						CumDistanceElement.outerHTML = L.Util.template (
							options.CumDistanceTemplate,
							{
								'CumDistance' : this._formatter.formatDistance ( Math.round ( CumDistance * 1000 ) / 1000 )
							}
						);
					}
					CumDistance += this._GpxRoute.instructions [ Counter ].distance;

				}
			}
			return RouteElement;
		},
	});
	
	L.Routing.extensions = function ( options ) {
		return new L.Routing.Extensions ( options );
	};

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.extensions;
	}
} ) ( );