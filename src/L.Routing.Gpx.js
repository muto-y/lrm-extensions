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
		options: {},
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
		getGpxDocument : function ( ) {
			var TimeStamp = new Date ( ).toISOString ( );
			var GpxDocument = document.implementation.createDocument ( "", "" );
			
			var GpxElement = GpxDocument.createElement ( "gpx" );
			
			GpxElement.setAttribute ( "xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance" );
			GpxElement.setAttribute ( "xmlns:xsd", "http://www.w3.org/2001/XMLSchema" );
			GpxElement.setAttribute ( "xsi:schemaLocation", "http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" );
			GpxElement.setAttribute ( "version", "1.1" );
			GpxElement.setAttribute ( "creator", "Leaflet-Routing-Gpx" );
			GpxDocument.appendChild ( GpxElement );
				
			if ( this._GpxRoute ) {
				for ( var Counter = 0; Counter < this._GpxRoute.waypoints.length; Counter++ ) {
					var WayPointElement = GpxDocument.createElement ( "wpt" );
					WayPointElement.setAttribute ( "lat", this._GpxRoute.waypoints [ Counter ].latLng.lat );
					WayPointElement.setAttribute ( "lon", this._GpxRoute.waypoints [ Counter ].latLng.lng );
					WayPointElement.setAttribute ( "time", TimeStamp );
					WayPointElement.setAttribute ( "name", "" + Counter );
					GpxElement.appendChild ( WayPointElement );
				}
				
				var TrackElement = GpxDocument.createElement ( "trk" );
				GpxElement.appendChild ( TrackElement );
				
				var SegmentElement = GpxDocument.createElement ( "trkseg" );
				TrackElement.appendChild ( SegmentElement );
				
				for ( Counter = 0; Counter < this._GpxRoute.coordinates.length; Counter++ ) {
					var TrackPointElement = GpxDocument.createElement ( "trkpt" );
					TrackPointElement.setAttribute ( "lat", this._GpxRoute.coordinates [ Counter ].lat );
					TrackPointElement.setAttribute ( "lon", this._GpxRoute.coordinates [ Counter ].lng );
					TrackPointElement.setAttribute ( "time", TimeStamp );
					TrackPointElement.setAttribute ( "name", "" + Counter );
					SegmentElement.appendChild ( TrackPointElement );
				}
			}	
			return GpxDocument;
		},
		getGpxString : function ( ) {
			var Serializer = new XMLSerializer();
			var GPXString = Serializer.serializeToString ( this.getGpxDocument ( ) );	
			
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