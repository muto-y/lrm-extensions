(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

	L.Routing.Extensions = L.Routing.Control.extend ( {
		_GpxRoute : null,
		initialize: function ( options ) {
			L.Util.setOptions ( this, options );
			L.Routing.Control.prototype.initialize.call ( this, options );
		},
		_updateLines: function ( routes ) {
			this._GpxRoute = routes.route;
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
				options.GpxRoute = false;
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
			if ( this._GpxRoute &&this._GpxRoute.coordinates && 0 < this._GpxRoute.coordinates.length ) {
				return JSON.stringify ( this._GpxRoute.coordinates );
			}
			else {
				return null;
			}
		},
		getRouteHTMLElement : function ( options ) {
			options = options || {};
			options.RouteElement = options.RouteElement || 'div';
			options.RouteHeader = options.RouteHeader || '<h1>Itinéraire:</h1>';
			options.RouteElementId = options.RouteElementId || 'Route';
			options.RouteSummaryTemplate = options.RouteSummaryTemplate || '<div class="Route-Summary">Distance&nbsp;:&nbsp;{ Distance }&nbsp;-&nbsp;Temps&nbsp;:&nbsp;{ Time }</div>';
			options.CumDistanceTemplate = options.CumDistanceTemplate || '<div class="Route-CumDistance"> Distance cumulée&nbsp;:&nbsp;{ CumDistance }<div>';
			options.RoutePreInstructionTemplate = options.RoutePreInstructionTemplate || '<div class="Route-PreInstruction">{Instruction}</div>'; 
			options.RouteNextDistanceTemplate = options.RouteNextDistanceTemplate || '<div class="Route-PostInstruction">Continuez sur {NextDistance}</div>'; 

			var RouteElement = document.createElement ( 'div' /*options.RouteElement*/ );
			RouteElement.id = options.RouteElementId;
			RouteElement.innerHTML = options.RouteHeader;
			if ( this._GpxRoute.instructions && 0 < this._GpxRoute.instructions.length ) {
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
				for ( Counter = 0; Counter < this._GpxRoute.instructions.length; Counter++ ) {
					if ( this._GpxRoute.coordinates [ this._GpxRoute.instructions [ Counter ].index ].lat ) {
						//we suppose Leaflet-routing-machine is used
					}
					else {
						// we suppose lrm-mapzen is used
						if ( this._GpxRoute.instructions [ Counter ].verbal_pre_transition_instruction ) {
							
							var PreInstructionElement = document.createElement ( 'div' );
							RouteElement.appendChild ( PreInstructionElement );
							PreInstructionElement.outerHTML = L.Util.template (
								options.RoutePreInstructionTemplate,
								{
									'Instruction' : '' + ( Counter + 1 ) + ' - ' + this._toXmlString ( this._getFrenchInstruction ( this._GpxRoute.instructions [ Counter ] ) )
								}
							);
						}
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
			}
			return RouteElement;
		},
	_getFrenchInstruction : function ( instruction ) {
		var StreetNames = '';
		var StreetCounter = 0;
		if ( instruction.street_names ) {
			for ( StreetCounter = 0; StreetCounter < instruction.street_names.length; StreetCounter ++ ) {
				if ( 0 < StreetCounter ) {
					StreetNames += ' - ';
				}
				StreetNames += instruction.street_names [ StreetCounter ];
			}
		}
		if ( 0 < StreetNames.length && 28 != instruction.type ) {
			StreetNames = 'sur ' + StreetNames;
		}
		
		return this._getFrenchInstructionPrefix ( instruction.type ) + StreetNames;
		
	},
	_getFrenchInstructionPrefix : function ( type ) {
		switch (type) {
			case 1:
			return 'Départ ';
			case 2:
			return 'Le départ est à votre droite ';
			case 3:
			return 'Le départ est à votre gauche ';
			case 4:
			return 'Arrivée ';
			case 5:
			return 'L\'arrivée est à votre droite ';
			case 6:
			return 'L\'arrivée est à votre gauche ';
			case 7:
			return 'Devient ';
			case 8:
			return 'Continuez ';
			case 9:
			return 'Tournez légèrement à droite ';
			case 10:
			return 'Tournez à droite ';
			case 11:
			return 'Tournez fortement à droite ';
			case 12:
			return 'Faites demi-tour à droite ';
			case 13:
			return 'Faites demi-tour à gauche ';
			case 14:
			return 'Tournez fortement à gauche ';
			case 15:
			return 'Tournez à gauche ';
			case 16:
			return 'Tournez légèrement à gauche ';
			case 17:
			return 'Descendez tout droit ';
			case 18:
			return 'Descendez à droite';
			case 19:
			return 'Descendez à gauche ';
			case 20:
			return 'Sortez à droite ';
			case 21:
			return 'Sortez à gauche ';
			case 22:
			return 'kStayStraight';
			case 23:
			return 'Restez à droite ';
			case 24:
			return 'Restez à gauche ';
			case 25:
			return 'kMerge';
			case 26:
			return 'Entrez dans le rond-point ';
			case 27:
			return 'Sortez du rond-point ';
			case 28:
			return 'Entrez dans le ferry ';
			case 29:
			return 'Sortez du ferry ';
		}	
		return '';
	}
	});
	
	L.Routing.extensions = function ( options ) {
		return new L.Routing.Extensions ( options );
	};

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.extensions;
	}
} ) ( );
},{}]},{},[1]);
