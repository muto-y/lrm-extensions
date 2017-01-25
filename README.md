# lrm-extensions

Warning : this plugin is under development. Unstable version!

lrm-extensions is a plugin for leaflet-routing-machine. With this plugin, you can:
- switch between Mapbox, Mapzen or Graphhopper as routing engine, using buttons in the control
- switch between car, bike or pedestrian, using buttons in the control
- export the route to a GPX file
- transform the route into a leaflet polyline

see the [demo](http://wwwouaiebe.github.io/lrm-extensions/) page.

## Before starting using lrm-extensions

To access the routing engines, you need an API key ( also named access token). Visit [Mapbox] (https://www.mapbox.com/studio/signup/?plan=starter),
[Mapzen] (https://mapzen.com/developers/sign_in) and/or [GraphHopper] (https://graphhopper.com/dashboard/#/register) to obtain an API key.

Notice also that when you don't have any API key, lrm-extensions uses OSRM as routing engine. Remember that OSRM is only usable for demo and not for production. 
See [OSRM usage policy] (https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy).

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
in the header:
```HTML
		<link rel="stylesheet" href="lrm-extensions.css" />
```

and in the header or the body:

```HTML
		<script src="lrm-extensions.min.js"></script>
```

## What's you have to do in the javascript?

You have to replace the call to the L.Routing.control factory method by a call to the L.Routing.extensions factory method:

```JavaScript
var Routing = L.Routing.extensions ( options ).addTo( Map );
```

All the options of the L.Routing.control method remains valid (but not tested... too mutch options... ).

In the options, you have also to gives your API keys for Mapbox, Mapzen and / or Graphhopper and eventually witch one is the default. 

```JavaScript
	{
		providerKeys : { 
			GraphHopper: "Your GraphHopper API key", // not mandatory, case sensitive. GraphHopper cannot be used when missing or empty.
			Mapzen: "Your Mapzen API key", // not mandatory, case sensitive. Mapzen cannot be used when missing or empty.
			Mapbox: "Your Mapbox API key" // not mandatory, case sensitive. Mapbox cannot be used when missing or empty.
		},
		provider: "Your prefered provider", // not mandatory, case insensitive, must be "GraphHopper", "Mapzen" or "Mapbox". Default value : the first provider with an API key completed or OSRM if any.
		transitMode: "Your prefered transit mode" // not mandatory, case insensitive, must be "car", "bike" or "pedestrian". Default value: "car". Switch also to "car" if the provider is OSRM.
	}
```
<!---

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
-->