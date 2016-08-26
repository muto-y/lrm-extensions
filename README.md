# lrm-extensions

Warning : this plugin is under development. Unstable version!

lrm-extensions is a plugin for leaflet-routing-machine. With this plugin, you can export to a GPS the route created with leaflet-routing-machine.
The plugin work with leaflet-routing-machine and with lrm-mapzen (and perhaps also with others lrm plugin, but not tested... :-( ).
See the [demo](http://wwwouaiebe.github.io/lrm-extensions/) page.

On the demo, add waypoints or drag and drop the start or end waypoint to see the gpx file changes.
You can also select another option on the top right.

## Loading lrm-extensions

You have first to have Leaflet and Leaflet-Routing-Machine loaded and eventually lrm-mapzen:
in the header:

```HTML
		<link rel="stylesheet" href="leaflet.css" />
		<link rel="stylesheet" href="leaflet-routing-machine.css" />
```

and in the header or the body:

```HTML
		<script src="leaflet.js"></script>
		<script src="leaflet-routing-machine.min.js"></script>
```

After, you have to load lrm-extensions:
```HTML
		<script src="lrm-extensions.min.js"></script>
```

## What's you have to do in the javascript?

You have to replace the call to the L.Routing.control factory method by a call to the L.Routing.extensions factory method:

```JavaScript
var Routing = L.Routing.extensions ( { 	waypoints: [ L.latLng ( 50.51490,5.47101 ), L.latLng ( 50.50891,5.49330 ) ] /*,and eventually others lrm options */	} ).addTo( Map );
```

All the options of the L.Routing.control method remains valid, of course. 
You have also to implement something for finally saving the GPX file. Due to the fact that currently, there isn't a common way for all browsers to save 
a file on the local drive, this part is not implemented in lrm-extensions, but you can have a look on the demo file to understand how it's made for Firefox, 
Chrome or Opera.

## lrm-extensions documentation

### getGpxString ( options ) method

This method get the GPX string corresponding to the current route found with leaflet-routing-machine

Possible values for options:

| Option            | Type    | Default value | Description                                       |
| ----------------- | ------- | ------------- | ------------------------------------------------- |
| GpxXmlDeclaration | Boolean | true          | The XML declaration is added to the XML string    |
| GpxDate           | Number  | 2             | 0 : date is not added to the XML string           |
|                   |         |               | 1 : the date is 1970-01-01T00:00:00.000Z          |
|                   |         |               | 2 : the date is the current date                  |
| GpxWaypoints      | Boolean | true          |  Waypoints are added to the XML string            |
| GpxRoute          | Boolean | false         |  The route description is added to the XML string |
| GpxTrack          | Boolean | true          |  The track is added to the XML string             |

### gpxchanged event

This event is fired each time the route is modified.