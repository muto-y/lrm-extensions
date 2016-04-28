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

	L.Routing.Gpx = L.Routing.Control.extend ( {
		options: {
			GpxXmlDeclaration : true,
			GpxDate : 2,
			GpxWaypoints : true,
			GpxRoute : false,
			GpxTrack : true
		},
		_GpxRoute : null,
		initialize: function ( options ) {
			L.Util.setOptions ( this, options );
			L.Routing.Control.prototype.initialize.call ( this, options );
		},
		_updateLineCallback: function( err, routes ) {
			if ( err )
			{
				this._GpxRoute = null;
				this.fire ( 'gpxchanged' );
			}
			L.Routing.Control.prototype._updateLineCallback.call ( this, err, routes );
		},
		_updateLines: function ( routes ) {
			this._GpxRoute = routes.route;
			L.Routing.Control.prototype._updateLines.call ( this, routes );
			this.fire ( 'gpxchanged' );
		},
		getGpxString : function ( ) {

			var Tab0 = "\n";
			var Tab1 = "\n\t";
			var Tab2 = "\n\t\t";
			var Tab3 = "\n\t\t\t";

			var TimeStamp;
			switch ( this.options.GpxDate ) {
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
			
			if ( this.options.GpxXmlDeclaration ) {
				GPXString = "<?xml version='1.0'?>" + Tab0;
			}
			GPXString += "<gpx xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xsi:schemaLocation='http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd' version='1.1' creator='Leaflet-Routing-Gpx'>";
			if ( this._GpxRoute ) {
				var Counter = 0;
				if ( this._GpxRoute.waypoints && this.options.GpxWaypoints ) {
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
					if ( this.options.GpxRoute  ) {
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
									( this._formatter.formatInstruction ( this._GpxRoute.instructions [ Counter ] ) ).replace ( '\'', '&apos;' ).replace ('\"', '&quote;').replace ( '&', '&amp;' ).replace ( '>', '&gt;' ).replace ( '<', '&lt;')  +
									"' />" ;
							}
						}
						GPXString += Tab1 + "</rte>";
					}

					if ( this.options.GpxTrack ) {
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
		}
	});
	
	L.Routing.gpx = function ( options ) {
		return new L.Routing.Gpx ( options );
	};

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.gpx;
	}
} ) ( );	