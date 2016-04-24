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
			GpxDate : 2, // 0 = no date, 1 = 1970-01-01T00:00:00.000Z 2 = now 
			GpxWaypoints : true,
			GpxRoute : false,
			GpxTrack : true
		},
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
		/*
		// Yes I know... I can do this (work perfect with Firefox, Chrome, Opera, or Vivaldi...) :
		// but due to a lot of problems with IE, Edge and Safari, as usual, I prefer the below solution...
		// This &?@$£ of IE write an HTML document when using document.implementation.createDocument...
		getGpxDocument : function ( ) {
			var TimeStamp;
			switch ( this.options.GpxDate ) {
				case 0 :
					break;
				case 1 :
					TimeStamp = "1970-01-01T00:00:00.000Z";
					break;
				default :
					TimeStamp = new Date ( ).toISOString ( );
					break;
			}

			var GpxDocument = document.implementation.createDocument ( "", "", null );
			
			var GpxElement = GpxDocument.createElement ( "gpx" );
			
			GpxElement.setAttribute ( "xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance" );
			GpxElement.setAttribute ( "xmlns:xsd", "http://www.w3.org/2001/XMLSchema" );
			GpxElement.setAttribute ( "xsi:schemaLocation", "http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" );
			GpxElement.setAttribute ( "version", "1.1" );
			GpxElement.setAttribute ( "creator", "Leaflet-Routing-Gpx" );
			GpxDocument.appendChild ( GpxElement );
				
			if ( this._GpxRoute ) {
				var Counter = 0;
				if ( this._GpxRoute.waypoints && this.options.GpxWaypoints ) {
					for ( Counter = 0; Counter < this._GpxRoute.waypoints.length; Counter ++ ) {
						var WayPointElement = GpxDocument.createElement ( "wpt" );
						WayPointElement.setAttribute ( "lat", this._GpxRoute.waypoints [ Counter ].latLng.lat );
						WayPointElement.setAttribute ( "lon", this._GpxRoute.waypoints [ Counter ].latLng.lng );
						if ( TimeStamp ) {
							WayPointElement.setAttribute ( "time", TimeStamp );
						}
						WayPointElement.setAttribute ( "name", "" + Counter );
						GpxElement.appendChild ( WayPointElement );
					}
				}

				if ( this._GpxRoute.coordinates && 0 < this._GpxRoute.coordinates.length ) {
					if ( this.options.GpxRoute ) {
						var RouteElement = GpxDocument.createElement ( "rte" );
						GpxElement.appendChild ( RouteElement );
						for ( Counter = 0; Counter < this._GpxRoute.coordinates.length; Counter++ ) {
							var RoutePointElement = GpxDocument.createElement ( "rtept" );
							RoutePointElement.setAttribute ( "lat", this._GpxRoute.coordinates [ Counter ].lat );
							RoutePointElement.setAttribute ( "lon", this._GpxRoute.coordinates [ Counter ].lng );
							if ( TimeStamp ) {
								RoutePointElement.setAttribute ( "time", TimeStamp );
							}
							RoutePointElement.setAttribute ( "name", "" + Counter );
							RouteElement.appendChild ( RoutePointElement );
						}
					}

					if ( this.options.GpxTrack ) {
						var TrackElement = GpxDocument.createElement ( "trk" );
						GpxElement.appendChild ( TrackElement );
						
						var SegmentElement = GpxDocument.createElement ( "trkseg" );
						TrackElement.appendChild ( SegmentElement );
						
						for ( Counter = 0; Counter < this._GpxRoute.coordinates.length; Counter++ ) {
							var TrackPointElement = GpxDocument.createElement ( "trkpt" );
							TrackPointElement.setAttribute ( "lat", this._GpxRoute.coordinates [ Counter ].lat );
							TrackPointElement.setAttribute ( "lon", this._GpxRoute.coordinates [ Counter ].lng );
							if ( TimeStamp ) {
								TrackPointElement.setAttribute ( "time", TimeStamp );
							}
							TrackPointElement.setAttribute ( "name", "" + Counter );
							SegmentElement.appendChild ( TrackPointElement );
						}
					}
				}
			}	
			
			return GpxDocument;
		},
		getGpxString : function ( ) {
			var Serializer = new XMLSerializer();
			var GPXString = Serializer.serializeToString ( this.getGpxDocument ( ) );	
			if ( this.options.GpxXmlDeclaration ) {
				GPXString = "<?xml version='1.0'?>\n" + GPXString;
			}

			return GPXString;
		},
		*/
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
				if ( this._GpxRoute.coordinates && 0 < this._GpxRoute.coordinates.length ) {
					if ( this.options.GpxRoute ) {
						GPXString += Tab1 + "<rte>";
						for ( Counter = 0; Counter < this._GpxRoute.coordinates.length; Counter ++ ) {
							GPXString +=
								Tab2 + "<rtept lat='" + 
								this._GpxRoute.coordinates [ Counter ].lat +
								"' lon='" +
								this._GpxRoute.coordinates [ Counter ].lng +
								"' " +
								TimeStamp +
								"name='" +
								Counter +
								"' />";
						}
						GPXString += Tab1 + "</rte>";
					}

					if ( this.options.GpxTrack ) {
						GPXString += Tab1 + "<trk>";
						GPXString += Tab2 + "<trkseg>";
						for ( Counter = 0; Counter < this._GpxRoute.coordinates.length; Counter ++ ) {
							GPXString +=
								Tab3 + "<trkpt lat='" + 
								this._GpxRoute.coordinates [ Counter ].lat +
								"' lon='" +
								this._GpxRoute.coordinates [ Counter ].lng +
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