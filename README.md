# lrm-extensions

Warning : this plugin is under development. Unstable version!

lrm-extensions is a plugin for leaflet-routing-machine. With this plugin, you can:
- switch between Mapbox, Mapzen or Graphhopper as routing engine, using buttons in the control
- switch between car, bike or pedestrian, using buttons in the control
- export the route to a GPX file
- export the route description to an HTMLElement object
- transform the route into a leaflet polyline
- takes actions on a right click on an instruction in Leaflet Routing Machine control with the 'instructioncontextmenu' event 

See the [demo](http://wwwouaiebe.github.io/lrm-extensions/) page.

## Before starting using lrm-extensions

To access the routing engines, you need API keys ( also named access tokens). Visit [Mapbox] (https://www.mapbox.com/studio/signup/?plan=starter),
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

		options.color = options.color || '#000000';
		options.width = options.width || 5;
		options.name = options.name || '';
		options.clear = options.clear || false;


## lrm-extensions documentation

### getTransitMode ( )

This method get the transit mode currently used ( = 'pedestrian', 'bike' ' or 'car' )

## getProvider ( )

This method gives the current routing engine provider ( = 'mapbox', 'mapzen' or 'graphhopper' )

## routeToLine ( options )

This method transform the current route into a leaflet polyline and add this polyline to the routePolyline LayerGroup
Possible values for options:

| Option            | Type    | Default value | Description                                       |
| ----------------- | ------- | ------------- | ------------------------------------------------- |
| options.color     | String  | #000000       | The polyline color                                |
| options.width     | Number  | 5             | The polyline width                                |
| options.name      | String  | ''            | The polyline name                                 |
| options.clear     | Boolean | false         | Waypoints are removed when true                   |

## addPolyline ( pnts, options, name ) method

This method add a polyline to the routePolyline L.LayerGroup

- pnts : the polyline points as defined by the L.polyline object factory
- options : the polyline options as defined by the L.polyline object factory
- name : the text to put in the polyline tooltip

## getRoutePolylines ( ) method

this method returns a reference to the routePolyline L.LayerGroup

## getPointAndDistance ( latLng ) method

This method return the nearest point on the route and the distance from the beginning of the route to this point

Parameters:

- latLng the given point as L.LatLng

Return value: an object

| Property | type     | Description                                        |
| -------- |--------- |--------------------------------------------------- |
| latLng   | L.LatLng | the nearest point on the route                     |
| distance | Number   | the distance from the beginning of the route in km |

## getInstructionAtLatLng ( latLng ) method

This method search in the route instructions witch one is at the given point and return  an object with the corresponding
leaflet routing machine icon name and distance since the beginning of the route

Return value: an object if an instruction is found, null otherwise.

| Property | type     | Description                                        |
| -------- |--------- |--------------------------------------------------- |
| iconName | String   | the icon name used for the instruction             |
| distance | Number   | the distance from the beginning of the route in km |

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

### getRouteHTMLElement : function ( options ) 

This method gives an HTMLElement object with the complete route description

The HTML element can be configured with the templates defined in the options parameter:
	
| Option                         | Type    | Default value                                                                                                                                   |
| ------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| routeElement                   | string  | ```HTML 'div' ```                                                                                                                               | 
| routeElementId                 | string  | ```HTML 'Route' ```                                                                                                                             |
| routeHeaderTemplate            | string  | ```HTML '<h1>itinerary&nbsp;{TransitMode}&nbsp;:</h1>' ```                                                                                      |
| routeDistanceSummaryTemplate   | string  | ```HTML '<div class="Route-DistanceSummary">Distance&nbsp;:&nbsp;{ Distance }</div>' ```                                                        |
| routeTimeSummaryTemplate       | string  | ```HTML '<div class="Route-TimeSummary">Time&nbsp;:&nbsp;{ Time }</div>' ```                                                                    |
| routeAscendSummaryTemplate     | string  | ```HTML '<div class="Route-AscendSummary">Ascend&nbsp;:&nbsp;{ Ascend }</div>' ```                                                              |
| routeDescendSummaryTemplate    | string  | ```HTML '<div class="Route-DescendSummary">Descend&nbsp;:&nbsp;{ Descend }</div>' ```                                                           |
| routeTextInstructionTemplate   | string  | ```HTML '<div class="Route-TextInstruction">{Number}<span class="leaflet-routing-icon-big {IconClass}"></span>{TextInstruction}</div>' ```      |
| routeNextDistanceTemplate      | string  | ```HTML '<div class="Route-NextDistanceInstruction">Distance to the next instruction: {NextDistance}</div>' ```                                 |
| routeNextTimeTemplate          | string  | ```HTML '<div class="Route-NextTimeInstruction">Time to the next instruction: {NextTime}</div>' ```                                             |
| routeCumulatedDistanceTemplate | string  | ```HTML '<div class="Route-CumulatedDistanceInstruction">Cumulated distance to this instruction: {CumulatedDistance}</div>' ```                 |
| routeCumulatedTimeTemplate     | string  | ```HTML '<div class="Route-CumulatedTimeInstruction">Cumulated time to this instruction: {CumulatedTime}</div>' ```                             |
| routeProviderTemplate          | string  | ```HTML '<div class="Route-Provider">This route is computed by <a href="{ProviderUrl}" target="_blank">{Provider}<a> - © {Provider}.</div>' ``` |
| transitModeName                | object  | ```HTML { bike : 'bike', pedestrian : 'pedestrian', car : 'car' } ```                                                                           |

### gpxchanged event

This event is fired each time the route is modified.

### instructioncontextmenu event

This event is fired each time the user rigth clik on an instruction in the Leaflet Routing Machine control.
The event have a latLng property with the coordinates of the instruction clicked by the user.