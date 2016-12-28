(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function corslite(url, callback, cors) {
    var sent = false;

    if (typeof window.XMLHttpRequest === 'undefined') {
        return callback(Error('Browser not supported'));
    }

    if (typeof cors === 'undefined') {
        var m = url.match(/^\s*https?:\/\/[^\/]*/);
        cors = m && (m[0] !== location.protocol + '//' + location.hostname +
                (location.port ? ':' + location.port : ''));
    }

    var x = new window.XMLHttpRequest();

    function isSuccessful(status) {
        return status >= 200 && status < 300 || status === 304;
    }

    if (cors && !('withCredentials' in x)) {
        // IE8-9
        x = new window.XDomainRequest();

        // Ensure callback is never called synchronously, i.e., before
        // x.send() returns (this has been observed in the wild).
        // See https://github.com/mapbox/mapbox.js/issues/472
        var original = callback;
        callback = function() {
            if (sent) {
                original.apply(this, arguments);
            } else {
                var that = this, args = arguments;
                setTimeout(function() {
                    original.apply(that, args);
                }, 0);
            }
        }
    }

    function loaded() {
        if (
            // XDomainRequest
            x.status === undefined ||
            // modern browsers
            isSuccessful(x.status)) callback.call(x, null, x);
        else callback.call(x, x, null);
    }

    // Both `onreadystatechange` and `onload` can fire. `onreadystatechange`
    // has [been supported for longer](http://stackoverflow.com/a/9181508/229001).
    if ('onload' in x) {
        x.onload = loaded;
    } else {
        x.onreadystatechange = function readystate() {
            if (x.readyState === 4) {
                loaded();
            }
        };
    }

    // Call the callback with the XMLHttpRequest object as an error and prevent
    // it from ever being called again by reassigning it to `noop`
    x.onerror = function error(evt) {
        // XDomainRequest provides no evt parameter
        callback.call(this, evt || true, null);
        callback = function() { };
    };

    // IE9 must have onprogress be set to a unique function.
    x.onprogress = function() { };

    x.ontimeout = function(evt) {
        callback.call(this, evt, null);
        callback = function() { };
    };

    x.onabort = function(evt) {
        callback.call(this, evt, null);
        callback = function() { };
    };

    // GET is the only supported HTTP Verb by XDomainRequest and is the
    // only one supported here.
    x.open('GET', url, true);

    // Send the request. Sending data is not supported.
    x.send(null);
    sent = true;

    return x;
}

if (typeof module !== 'undefined') module.exports = corslite;

},{}],2:[function(require,module,exports){
module.exports = function(version, language, options) {
    // load instructions
    var instructions = require('./instructions').get(language);
    if (Object !== instructions.constructor) throw 'instructions must be object';
    if (!instructions[version]) { throw 'invalid version ' + version; }

    return {
        capitalizeFirstLetter: function(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        },
        ordinalize: function(number) {
            // Transform numbers to their translated ordinalized value
            return instructions[version].constants.ordinalize[number.toString()] || '';
        },
        directionFromDegree: function(degree) {
            // Transform degrees to their translated compass direction
            if (!degree && degree !== 0) {
                // step had no bearing_after degree, ignoring
                return '';
            } else if (degree >= 0 && degree <= 20) {
                return instructions[version].constants.direction.north;
            } else if (degree > 20 && degree < 70) {
                return instructions[version].constants.direction.northeast;
            } else if (degree >= 70 && degree < 110) {
                return instructions[version].constants.direction.east;
            } else if (degree >= 110 && degree <= 160) {
                return instructions[version].constants.direction.southeast;
            } else if (degree > 160 && degree <= 200) {
                return instructions[version].constants.direction.south;
            } else if (degree > 200 && degree < 250) {
                return instructions[version].constants.direction.southwest;
            } else if (degree >= 250 && degree <= 290) {
                return instructions[version].constants.direction.west;
            } else if (degree > 290 && degree < 340) {
                return instructions[version].constants.direction.northwest;
            } else if (degree >= 340 && degree <= 360) {
                return instructions[version].constants.direction.north;
            } else {
                throw new Error('Degree ' + degree + ' invalid');
            }
        },
        laneConfig: function(step) {
            // Reduce any lane combination down to a contracted lane diagram
            if (!step.intersections || !step.intersections[0].lanes) throw new Error('No lanes object');

            var config = [];
            var currentLaneValidity = null;

            step.intersections[0].lanes.forEach(function (lane) {
                if (currentLaneValidity === null || currentLaneValidity !== lane.valid) {
                    if (lane.valid) {
                        config.push('o');
                    } else {
                        config.push('x');
                    }
                    currentLaneValidity = lane.valid;
                }
            });

            return config.join('');
        },
        compile: function(step) {
            if (!step.maneuver) throw new Error('No step maneuver provided');

            var type = step.maneuver.type;
            var modifier = step.maneuver.modifier;
            var mode = step.mode;

            if (!type) { throw new Error('Missing step maneuver type'); }
            if (type !== 'depart' && type !== 'arrive' && !modifier) { throw new Error('Missing step maneuver modifier'); }

            if (!instructions[version][type]) {
                // Log for debugging
                console.log('Encountered unknown instruction type: ' + type); // eslint-disable-line no-console
                // OSRM specification assumes turn types can be added without
                // major version changes. Unknown types are to be treated as
                // type `turn` by clients
                type = 'turn';
            }

            // Use special instructions if available, otherwise `defaultinstruction`
            var instructionObject;
            if (instructions[version].modes[mode]) {
                instructionObject = instructions[version].modes[mode];
            } else if (instructions[version][type][modifier]) {
                instructionObject = instructions[version][type][modifier];
            } else {
                instructionObject = instructions[version][type].default;
            }

            // Special case handling
            var laneInstruction;
            switch (type) {
            case 'use lane':
                laneInstruction = instructions[version].constants.lanes[this.laneConfig(step)];

                if (!laneInstruction) {
                    // If the lane combination is not found, default to continue straight
                    instructionObject = instructions[version]['use lane'].no_lanes;
                }
                break;
            case 'rotary':
            case 'roundabout':
                if (step.rotary_name && step.maneuver.exit && instructionObject.name_exit) {
                    instructionObject = instructionObject.name_exit;
                } else if (step.rotary_name && instructionObject.name) {
                    instructionObject = instructionObject.name;
                } else if (step.maneuver.exit && instructionObject.exit) {
                    instructionObject = instructionObject.exit;
                } else {
                    instructionObject = instructionObject.default;
                }
                break;
            default:
                // NOOP, since no special logic for that type
            }

            // Decide way_name with special handling for name and ref
            var wayName;
            var name = step.name || '';
            var ref = (step.ref || '').split(';')[0];

            // Remove hacks from Mapbox Directions mixing ref into name
            if (name === step.ref) {
                // if both are the same we assume that there used to be an empty name, with the ref being filled in for it
                // we only need to retain the ref then
                name = '';
            }
            name = name.replace(' (' + step.ref + ')', '');

            if (name && ref && name !== ref) {
                wayName = name + ' (' + ref + ')';
            } else if (!name && ref) {
                wayName = ref;
            } else {
                wayName = name;
            }

            // Decide which instruction string to use
            // Destination takes precedence over name
            var instruction;
            if (step.destinations && instructionObject.destination) {
                instruction = instructionObject.destination;
            } else if (wayName && instructionObject.name) {
                instruction = instructionObject.name;
            } else {
                instruction = instructionObject.default;
            }

            var tokenizedInstructionHook = ((options || {}).hooks || {}).tokenizedInstruction;
            if (tokenizedInstructionHook) {
                instruction = tokenizedInstructionHook(instruction);
            }

            // Replace tokens
            // NOOP if they don't exist
            var nthWaypoint = ''; // TODO, add correct waypoint counting
            instruction = instruction
                .replace('{way_name}', wayName)
                .replace('{destination}', (step.destinations || '').split(',')[0])
                .replace('{exit_number}', this.ordinalize(step.maneuver.exit || 1))
                .replace('{rotary_name}', step.rotary_name)
                .replace('{lane_instruction}', laneInstruction)
                .replace('{modifier}', instructions[version].constants.modifier[modifier])
                .replace('{direction}', this.directionFromDegree(step.maneuver.bearing_after))
                .replace('{nth}', nthWaypoint)
                .replace(/ {2}/g, ' '); // remove excess spaces

            if (instructions.meta.capitalizeFirstLetter) {
                instruction = this.capitalizeFirstLetter(instruction);
            }

            return instruction;
        }
    };
};

},{"./instructions":3}],3:[function(require,module,exports){
var instructionsDe = require('./instructions/de.json');
var instructionsEn = require('./instructions/en.json');
var instructionsFr = require('./instructions/fr.json');
var instructionsNl = require('./instructions/nl.json');
var instructionsZhHans = require('./instructions/zh-Hans.json');

module.exports = {
    get: function(language) {
        switch (language) {
        case 'en':
            return instructionsEn;
        case 'de':
            return instructionsDe;
        case 'fr':
            return instructionsFr;
        case 'nl':
            return instructionsNl;
        case 'zh':
        case 'zh-Hans':
            return instructionsZhHans;
        default:
            throw 'invalid language ' + language;
        }
    }
};

},{"./instructions/de.json":4,"./instructions/en.json":5,"./instructions/fr.json":6,"./instructions/nl.json":7,"./instructions/zh-Hans.json":8}],4:[function(require,module,exports){
module.exports={
    "meta": {
        "capitalizeFirstLetter": true
    },
    "v5": {
        "constants": {
            "ordinalize": {
                "1": "erste",
                "2": "zweite",
                "3": "dritte",
                "4": "vierte",
                "5": "fünfte",
                "6": "sechste",
                "7": "siebente",
                "8": "achte",
                "9": "neunte",
                "10": "zehnte"
            },
            "direction": {
                "north": "Norden",
                "northeast": "Nordosten",
                "east": "Osten",
                "southeast": "Südosten",
                "south": "Süden",
                "southwest": "Südwesten",
                "west": "Westen",
                "northwest": "Nordwesten"
            },
            "modifier": {
                "left": "links",
                "right": "rechts",
                "sharp left": "scharf links",
                "sharp right": "scharf rechts",
                "slight left": "leicht links",
                "slight right": "leicht rechts",
                "straight": "geradeaus",
                "uturn": "180°-Wendung"
            },
            "lanes": {
                "xo": "Rechts halten",
                "ox": "Links halten",
                "xox": "Mittlere Spur nutzen",
                "oxo": "Rechts oder links halten"
            }
        },
        "modes": {
            "ferry": {
                "default": "Fähre nehmen",
                "name": "Fähre nehmen {way_name}",
                "destination": "Fähre nehmen Richtung {destination}"
            }
        },
        "arrive": {
            "default": {
                "default": "Sie haben Ihr {nth} Ziel erreicht"
            },
            "left": {
                "default": "Sie haben Ihr {nth} Ziel erreicht, es befindet sich links von Ihnen"
            },
            "right": {
                "default": "Sie haben Ihr {nth} Ziel erreicht, es befindet sich rechts von Ihnen"
            },
            "sharp left": {
                "default": "Sie haben Ihr {nth} Ziel erreicht, es befindet sich links von Ihnen"
            },
            "sharp right": {
                "default": "Sie haben Ihr {nth} Ziel erreicht, es befindet sich rechts von Ihnen"
            },
            "slight right": {
                "default": "Sie haben Ihr {nth} Ziel erreicht, es befindet sich rechts von Ihnen"
            },
            "slight left": {
                "default": "Sie haben Ihr {nth} Ziel erreicht, es befindet sich links von Ihnen"
            },
            "straight": {
                "default": "Sie haben Ihr {nth} Ziel erreicht, es befindet sich direkt vor Ihnen"
            }
        },
        "continue": {
            "default": {
                "default": "{modifier} weiterfahren",
                "name": "{modifier} weiterfahren auf {way_name}",
                "destination": "{modifier} weiterfahren Richtung {destination}"
            },
            "slight left": {
                "default": "Leicht links weiter",
                "name": "Leicht links weiter auf {way_name}",
                "destination": "Leicht links weiter Richtung {destination}"
            },
            "slight right": {
                "default": "Leicht rechts weiter",
                "name": "Leicht rechts weiter auf {way_name}",
                "destination": "Leicht rechts weiter Richtung {destination}"
            },
            "uturn": {
                "default": "180°-Wendung",
                "name": "180°-Wendung auf {way_name}",
                "destination": "180°-Wendung Richtung {destination}"
            }
        },
        "depart": {
            "default": {
                "default": "Fahren Sie Richtung {direction}",
                "name": "Fahren Sie Richtung {direction} auf {way_name}"
            }
        },
        "end of road": {
            "default": {
                "default": "{modifier} abbiegen",
                "name": "{modifier} abbiegen auf {way_name}",
                "destination": "{modifier} abbiegen Richtung {destination}"
            },
            "straight": {
                "default": "Geradeaus weiterfahren",
                "name": "Geradeaus weiterfahren auf {way_name}",
                "destination": "Geradeaus weiterfahren Richtung {destination}"
            },
            "uturn": {
                "default": "180°-Wendung am Ende der Straße",
                "name": "180°-Wendung auf {way_name} am Ende der Straße",
                "destination": "180°-Wendung Richtung {destination} am Ende der Straße"
            }
        },
        "fork": {
            "default": {
                "default": "{modifier} halten an der Gabelung",
                "name": "{modifier} halten an der Gabelung auf {way_name}",
                "destination": "{modifier}  halten an der Gabelung Richtung {destination}"
            },
            "slight left": {
                "default": "Links halten an der Gabelung",
                "name": "Links halten an der Gabelung auf {way_name}",
                "destination": "Links halten an der Gabelung Richtung {destination}"
            },
            "slight right": {
                "default": "Rechts halten an der Gabelung",
                "name": "Rechts halten an der Gabelung auf {way_name}",
                "destination": "Rechts halten an der Gabelung Richtung {destination}"
            },
            "sharp left": {
                "default": "Scharf links abbiegen an der Gabelung",
                "name": "Scharf links abbiegen an der Gabelung auf {way_name}",
                "destination": "Scharf links abbiegen an der Gabelung Richtung {destination}"
            },
            "sharp right": {
                "default": "Scharf rechts abbiegen an der Gabelung",
                "name": "Scharf rechts abbiegen an der Gabelung auf {way_name}",
                "destination": "Scharf rechts abbiegen an der Gabelung Richtung {destination}"
            },
            "uturn": {
                "default": "180°-Wendung",
                "name": "180°-Wendung auf {way_name}",
                "destination": "180°-Wendung Richtung {destination}"
            }
        },
        "merge": {
            "default": {
                "default": "{modifier} auffahren",
                "name": "{modifier} auffahren auf {way_name}",
                "destination": "{modifier} auffahren Richtung {destination}"
            },
            "slight left": {
                "default": "Leicht links auffahren",
                "name": "Leicht links auffahren auf {way_name}",
                "destination": "Leicht links auffahren Richtung {destination}"
            },
            "slight right": {
                "default": "Leicht rechts auffahren",
                "name": "Leicht rechts auffahren auf {way_name}",
                "destination": "Leicht rechts auffahren Richtung {destination}"
            },
            "sharp left": {
                "default": "Scharf links auffahren",
                "name": "Scharf links auffahren auf {way_name}",
                "destination": "Scharf links auffahren Richtung {destination}"
            },
            "sharp right": {
                "default": "Scharf rechts auffahren",
                "name": "Scharf rechts auffahren auf {way_name}",
                "destination": "Scharf rechts auffahren Richtung {destination}"
            },
            "uturn": {
                "default": "180°-Wendung",
                "name": "180°-Wendung auf {way_name}",
                "destination": "180°-Wendung Richtung {destination}"
            }
        },
        "new name": {
            "default": {
                "default": "{modifier} weiterfahren",
                "name": "{modifier} weiterfahren auf {way_name}",
                "destination": "{modifier} weiterfahren Richtung {destination}"
            },
            "sharp left": {
                "default": "Scharf links",
                "name": "Scharf links auf {way_name}",
                "destination": "Scharf links Richtung {destination}"
            },
            "sharp right": {
                "default": "Scharf rechts",
                "name": "Scharf rechts auf {way_name}",
                "destination": "Scharf rechts Richtung {destination}"
            },
            "slight left": {
                "default": "Leicht links weiter",
                "name": "Leicht links weiter auf {way_name}",
                "destination": "Leicht links weiter Richtung {destination}"
            },
            "slight right": {
                "default": "Leicht rechts weiter",
                "name": "Leicht rechts weiter auf {way_name}",
                "destination": "Leicht rechts weiter Richtung {destination}"
            },
            "uturn": {
                "default": "180°-Wendung",
                "name": "180°-Wendung auf {way_name}",
                "destination": "180°-Wendung Richtung {destination}"
            }
        },
        "notification": {
            "default": {
                "default": "{modifier} weiterfahren",
                "name": "{modifier} weiterfahren auf {way_name}",
                "destination" : "{modifier} weiterfahren Richtung {destination}"
            },
            "uturn": {
                "default": "180°-Wendung",
                "name": "180°-Wendung auf {way_name}",
                "destination": "180°-Wendung Richtung {destination}"
            }
        },
        "off ramp": {
            "default": {
                "default": "Rampe nehmen",
                "name": "Rampe nehmen auf {way_name}",
                "destination": "Rampe nehmen Richtung {destination}"
            },
            "left": {
                "default": "Rampe auf der linken Seite nehmen",
                "name": "Rampe auf der linken Seite nehmen auf {way_name}",
                "destination": "Rampe auf der linken Seite nehmen Richtung {destination}"
            },
            "right": {
                "default": "Rampe auf der rechten Seite nehmen",
                "name": "Rampe auf der rechten Seite nehmen auf {way_name}",
                "destination": "Rampe auf der rechten Seite nehmen Richtung {destination}"
            },
            "sharp left": {
                "default": "Rampe auf der linken Seite nehmen",
                "name": "Rampe auf der linken Seite nehmen auf {way_name}",
                "destination": "Rampe auf der linken Seite nehmen Richtung {destination}"
            },
            "sharp right": {
                "default": "Rampe auf der rechten Seite nehmen",
                "name": "Rampe auf der rechten Seite nehmen auf {way_name}",
                "destination": "Rampe auf der rechten Seite nehmen Richtung {destination}"
            },
            "slight left": {
                "default": "Rampe auf der linken Seite nehmen",
                "name": "Rampe auf der linken Seite nehmen auf {way_name}",
                "destination": "Rampe auf der linken Seite nehmen Richtung {destination}"
            },
            "slight right": {
                "default": "Rampe auf der rechten Seite nehmen",
                "name": "Rampe auf der rechten Seite nehmen auf {way_name}",
                "destination": "Rampe auf der rechten Seite nehmen Richtung {destination}"
            }
        },
        "on ramp": {
            "default": {
                "default": "Rampe nehmen",
                "name": "Rampe nehmen auf {way_name}",
                "destination": "Rampe nehmen Richtung {destination}"
            },
            "left": {
                "default": "Rampe auf der linken Seite nehmen",
                "name": "Rampe auf der linken Seite nehmen auf {way_name}",
                "destination": "Rampe auf der linken Seite nehmen Richtung {destination}"
            },
            "right": {
                "default": "Rampe auf der rechten Seite nehmen",
                "name": "Rampe auf der rechten Seite nehmen auf {way_name}",
                "destination": "Rampe auf der rechten Seite nehmen Richtung {destination}"
            },
            "sharp left": {
                "default": "Rampe auf der linken Seite nehmen",
                "name": "Rampe auf der linken Seite nehmen auf {way_name}",
                "destination": "Rampe auf der linken Seite nehmen Richtung {destination}"
            },
            "sharp right": {
                "default": "Rampe auf der rechten Seite nehmen",
                "name": "Rampe auf der rechten Seite nehmen auf {way_name}",
                "destination": "Rampe auf der rechten Seite nehmen Richtung {destination}"
            },
            "slight left": {
                "default": "Rampe auf der linken Seite nehmen",
                "name": "Rampe auf der linken Seite nehmen auf {way_name}",
                "destination": "Rampe auf der linken Seite nehmen Richtung {destination}"
            },
            "slight right": {
                "default": "Rampe auf der rechten Seite nehmen",
                "name": "Rampe auf der rechten Seite nehmen auf {way_name}",
                "destination": "Rampe auf der rechten Seite nehmen Richtung {destination}"
            }
        },
        "rotary": {
            "default": {
                "default": {
                    "default": "In den Kreisverkehr fahren",
                    "name": "In den Kreisverkehr fahren und auf {way_name} verlassen",
                    "destination": "In den Kreisverkehr fahren und Richtung {destination} verlassen"
                },
                "name": {
                    "default": "In {rotary_name} fahren",
                    "name": "In {rotary_name} fahren und auf {way_name} verlassen",
                    "destination": "In {rotary_name} fahren und Richtung {destination} verlassen"
                },
                "exit": {
                    "default": "In den Kreisverkehr fahren und {exit_number} Ausfahrt nehmen",
                    "name": "In den Kreisverkehr fahren und {exit_number} Ausfahrt nehmen auf {way_name}",
                    "destination": "In den Kreisverkehr fahren und {exit_number} Ausfahrt nehmen Richtung {destination}"
                },
                "name_exit": {
                    "default": "In den Kreisverkehr fahren und {exit_number} Ausfahrt nehmen",
                    "name": "In den Kreisverkehr fahren und {exit_number} Ausfahrt nehmen auf {way_name}",
                    "destination": "In den Kreisverkehr fahren und {exit_number} Ausfahrt nehmen Richtung {destination}"
                }
            }
        },
        "roundabout": {
            "default": {
                "exit": {
                    "default": "In den Kreisverkehr fahren und {exit_number} Ausfahrt nehmen",
                    "name": "In den Kreisverkehr fahren und {exit_number} Ausfahrt nehmen auf {way_name}",
                    "destination": "In den Kreisverkehr fahren und {exit_number} Ausfahrt nehmen Richtung {destination}"
                },
                "default": {
                    "default": "In den Kreisverkehr fahren",
                    "name": "In den Kreisverkehr fahren und auf {way_name} verlassen",
                    "destination": "In den Kreisverkehr fahren und Richtung {destination} verlassen"
                }
            }
        },
        "roundabout turn": {
            "default": {
                "default": "Am Kreisverkehr {modifier}",
                "name": "Am Kreisverkehr {modifier} auf {way_name}",
                "destination": "Am Kreisverkehr {modifier} Richtung {destination}"
            },
            "left": {
                "default": "Am Kreisverkehr links",
                "name": "Am Kreisverkehr links auf {way_name}",
                "destination": "Am Kreisverkehr links Richtung {destination}"
            },
            "right": {
                "default": "Am Kreisverkehr rechts",
                "name": "Am Kreisverkehr rechts auf {way_name}",
                "destination": "Am Kreisverkehr rechts Richtung {destination}"
            },
            "straight": {
                "default": "Am Kreisverkehr geradeaus weiterfahren",
                "name": "Am Kreisverkehr geradeaus weiterfahren auf {way_name}",
                "destination": "Am Kreisverkehr geradeaus weiterfahren Richtung {destination}"
            }
        },
        "turn": {
            "default": {
                "default": "{modifier} abbiegen",
                "name": "{modifier} abbiegen auf {way_name}",
                "destination": "{modifier} abbiegen Richtung {destination}"
            },
            "left": {
                "default": "Links abbiegen",
                "name": "Links abbiegen auf {way_name}",
                "destination": "Links abbiegen Richtung {destination}"
            },
            "right": {
                "default": "Rechts abbiegen",
                "name": "Rechts abbiegen auf {way_name}",
                "destination": "Rechts abbiegen Richtung {destination}"
            },
            "straight": {
                "default": "Geradeaus weiterfahren",
                "name": "Geradeaus weiterfahren auf {way_name}",
                "destination": "Geradeaus weiterfahren Richtung {destination}"
            }
        },
        "use lane": {
            "no_lanes": {
                "default": "Geradeaus weiterfahren"
            },
            "default": {
                "default": "{lane_instruction}"
            }
        }
    }
}

},{}],5:[function(require,module,exports){
module.exports={
    "meta": {
        "capitalizeFirstLetter": true
    },
    "v5": {
        "constants": {
            "ordinalize": {
                "1": "1st",
                "2": "2nd",
                "3": "3rd",
                "4": "4th",
                "5": "5th",
                "6": "6th",
                "7": "7th",
                "8": "8th",
                "9": "9th",
                "10": "10th"
            },
            "direction": {
                "north": "north",
                "northeast": "northeast",
                "east": "east",
                "southeast": "southeast",
                "south": "south",
                "southwest": "southwest",
                "west": "west",
                "northwest": "northwest"
            },
            "modifier": {
                "left": "left",
                "right": "right",
                "sharp left": "sharp left",
                "sharp right": "sharp right",
                "slight left": "slight left",
                "slight right": "slight right",
                "straight": "straight",
                "uturn": "U-turn"
            },
            "lanes": {
                "xo": "Keep right",
                "ox": "Keep left",
                "xox": "Keep in the middle",
                "oxo": "Keep left or right"
            }
        },
        "modes": {
            "ferry": {
                "default": "Take the ferry",
                "name": "Take the ferry {way_name}",
                "destination": "Take the ferry towards {destination}"
            }
        },
        "arrive": {
            "default": {
                "default": "You have arrived at your {nth} destination"
            },
            "left": {
                "default": "You have arrived at your {nth} destination, on the left"
            },
            "right": {
                "default": "You have arrived at your {nth} destination, on the right"
            },
            "sharp left": {
                "default": "You have arrived at your {nth} destination, on the left"
            },
            "sharp right": {
                "default": "You have arrived at your {nth} destination, on the right"
            },
            "slight right": {
                "default": "You have arrived at your {nth} destination, on the right"
            },
            "slight left": {
                "default": "You have arrived at your {nth} destination, on the left"
            },
            "straight": {
                "default": "You have arrived at your {nth} destination, straight ahead"
            }
        },
        "continue": {
            "default": {
                "default": "Continue {modifier}",
                "name": "Continue {modifier} onto {way_name}",
                "destination": "Continue {modifier} towards {destination}"
            },
            "slight left": {
                "default": "Continue slightly left",
                "name": "Continue slightly left onto {way_name}",
                "destination": "Continue slightly left towards {destination}"
            },
            "slight right": {
                "default": "Continue slightly right",
                "name": "Continue slightly right onto {way_name}",
                "destination": "Continue slightly right towards {destination}"
            },
            "uturn": {
                "default": "Make a U-turn",
                "name": "Make a U-turn onto {way_name}",
                "destination": "Make a U-turn towards {destination}"
            }
        },
        "depart": {
            "default": {
                "default": "Head {direction}",
                "name": "Head {direction} on {way_name}"
            }
        },
        "end of road": {
            "default": {
                "default": "Turn {modifier}",
                "name": "Turn {modifier} onto {way_name}",
                "destination": "Turn {modifier} towards {destination}"
            },
            "straight": {
                "default": "Continue straight",
                "name": "Continue straight onto {way_name}",
                "destination": "Continue straight towards {destination}"
            },
            "uturn": {
                "default": "Make a U-turn at the end of the road",
                "name": "Make a U-turn onto {way_name} at the end of the road",
                "destination": "Make a U-turn towards {destination} at the end of the road"
            }
        },
        "fork": {
            "default": {
                "default": "Keep {modifier} at the fork",
                "name": "Keep {modifier} at the fork onto {way_name}",
                "destination": "Keep {modifier} at the fork towards {destination}"
            },
            "slight left": {
                "default": "Keep left at the fork",
                "name": "Keep left at the fork onto {way_name}",
                "destination": "Keep left at the fork towards {destination}"
            },
            "slight right": {
                "default": "Keep right at the fork",
                "name": "Keep right at the fork onto {way_name}",
                "destination": "Keep right at the fork towards {destination}"
            },
            "sharp left": {
                "default": "Take a sharp left at the fork",
                "name": "Take a sharp left at the fork onto {way_name}",
                "destination": "Take a sharp left at the fork towards {destination}"
            },
            "sharp right": {
                "default": "Take a sharp right at the fork",
                "name": "Take a sharp right at the fork onto {way_name}",
                "destination": "Take a sharp right at the fork towards {destination}"
            },
            "uturn": {
                "default": "Make a U-turn",
                "name": "Make a U-turn onto {way_name}",
                "destination": "Make a U-turn towards {destination}"
            }
        },
        "merge": {
            "default": {
                "default": "Merge {modifier}",
                "name": "Merge {modifier} onto {way_name}",
                "destination": "Merge {modifier} towards {destination}"
            },
            "slight left": {
                "default": "Merge left",
                "name": "Merge left onto {way_name}",
                "destination": "Merge left towards {destination}"
            },
            "slight right": {
                "default": "Merge right",
                "name": "Merge right onto {way_name}",
                "destination": "Merge right towards {destination}"
            },
            "sharp left": {
                "default": "Merge left",
                "name": "Merge left onto {way_name}",
                "destination": "Merge left towards {destination}"
            },
            "sharp right": {
                "default": "Merge right",
                "name": "Merge right onto {way_name}",
                "destination": "Merge right towards {destination}"
            },
            "uturn": {
                "default": "Make a U-turn",
                "name": "Make a U-turn onto {way_name}",
                "destination": "Make a U-turn towards {destination}"
            }
        },
        "new name": {
            "default": {
                "default": "Continue {modifier}",
                "name": "Continue {modifier} onto {way_name}",
                "destination": "Continue {modifier} towards {destination}"
            },
            "sharp left": {
                "default": "Take a sharp left",
                "name": "Take a sharp left onto {way_name}",
                "destination": "Take a sharp left towards {destination}"
            },
            "sharp right": {
                "default": "Take a sharp right",
                "name": "Take a sharp right onto {way_name}",
                "destination": "Take a sharp right towards {destination}"
            },
            "slight left": {
                "default": "Continue slightly left",
                "name": "Continue slightly left onto {way_name}",
                "destination": "Continue slightly left towards {destination}"
            },
            "slight right": {
                "default": "Continue slightly right",
                "name": "Continue slightly right onto {way_name}",
                "destination": "Continue slightly right towards {destination}"
            },
            "uturn": {
                "default": "Make a U-turn",
                "name": "Make a U-turn onto {way_name}",
                "destination": "Make a U-turn towards {destination}"
            }
        },
        "notification": {
            "default": {
                "default": "Continue {modifier}",
                "name": "Continue {modifier} onto {way_name}",
                "destination" : "Continue {modifier} towards {destination}"
            },
            "uturn": {
                "default": "Make a U-turn",
                "name": "Make a U-turn onto {way_name}",
                "destination": "Make a U-turn towards {destination}"
            }
        },
        "off ramp": {
            "default": {
                "default": "Take the ramp",
                "name": "Take the ramp onto {way_name}",
                "destination": "Take the ramp towards {destination}"
            },
            "left": {
                "default": "Take the ramp on the left",
                "name": "Take the ramp on the left onto {way_name}",
                "destination": "Take the ramp on the left towards {destination}"
            },
            "right": {
                "default": "Take the ramp on the right",
                "name": "Take the ramp on the right onto {way_name}",
                "destination": "Take the ramp on the right towards {destination}"
            },
            "sharp left": {
                "default": "Take the ramp on the left",
                "name": "Take the ramp on the left onto {way_name}",
                "destination": "Take the ramp on the left towards {destination}"
            },
            "sharp right": {
                "default": "Take the ramp on the right",
                "name": "Take the ramp on the right onto {way_name}",
                "destination": "Take the ramp on the right towards {destination}"
            },
            "slight left": {
                "default": "Take the ramp on the left",
                "name": "Take the ramp on the left onto {way_name}",
                "destination": "Take the ramp on the left towards {destination}"
            },
            "slight right": {
                "default": "Take the ramp on the right",
                "name": "Take the ramp on the right onto {way_name}",
                "destination": "Take the ramp on the right towards {destination}"
            }
        },
        "on ramp": {
            "default": {
                "default": "Take the ramp",
                "name": "Take the ramp onto {way_name}",
                "destination": "Take the ramp towards {destination}"
            },
            "left": {
                "default": "Take the ramp on the left",
                "name": "Take the ramp on the left onto {way_name}",
                "destination": "Take the ramp on the left towards {destination}"
            },
            "right": {
                "default": "Take the ramp on the right",
                "name": "Take the ramp on the right onto {way_name}",
                "destination": "Take the ramp on the right towards {destination}"
            },
            "sharp left": {
                "default": "Take the ramp on the left",
                "name": "Take the ramp on the left onto {way_name}",
                "destination": "Take the ramp on the left towards {destination}"
            },
            "sharp right": {
                "default": "Take the ramp on the right",
                "name": "Take the ramp on the right onto {way_name}",
                "destination": "Take the ramp on the right towards {destination}"
            },
            "slight left": {
                "default": "Take the ramp on the left",
                "name": "Take the ramp on the left onto {way_name}",
                "destination": "Take the ramp on the left towards {destination}"
            },
            "slight right": {
                "default": "Take the ramp on the right",
                "name": "Take the ramp on the right onto {way_name}",
                "destination": "Take the ramp on the right towards {destination}"
            }
        },
        "rotary": {
            "default": {
                "default": {
                    "default": "Enter the rotary",
                    "name": "Enter the rotary and exit onto {way_name}",
                    "destination": "Enter the rotary and exit towards {destination}"
                },
                "name": {
                    "default": "Enter {rotary_name}",
                    "name": "Enter {rotary_name} and exit onto {way_name}",
                    "destination": "Enter {rotary_name} and exit towards {destination}"
                },
                "exit": {
                    "default": "Enter the rotary and take the {exit_number} exit",
                    "name": "Enter the rotary and take the {exit_number} exit onto {way_name}",
                    "destination": "Enter the rotary and take the {exit_number} exit towards {destination}"
                },
                "name_exit": {
                    "default": "Enter {rotary_name} and take the {exit_number} exit",
                    "name": "Enter {rotary_name} and take the {exit_number} exit onto {way_name}",
                    "destination": "Enter {rotary_name} and take the {exit_number} exit towards {destination}"
                }
            }
        },
        "roundabout": {
            "default": {
                "exit": {
                    "default": "Enter the roundabout and take the {exit_number} exit",
                    "name": "Enter the roundabout and take the {exit_number} exit onto {way_name}",
                    "destination": "Enter the roundabout and take the {exit_number} exit towards {destination}"
                },
                "default": {
                    "default": "Enter the roundabout",
                    "name": "Enter the roundabout and exit onto {way_name}",
                    "destination": "Enter the roundabout and exit towards {destination}"
                }
            }
        },
        "roundabout turn": {
            "default": {
                "default": "At the roundabout make a {modifier}",
                "name": "At the roundabout make a {modifier} onto {way_name}",
                "destination": "At the roundabout make a {modifier} towards {destination}"
            },
            "left": {
                "default": "At the roundabout turn left",
                "name": "At the roundabout turn left onto {way_name}",
                "destination": "At the roundabout turn left towards {destination}"
            },
            "right": {
                "default": "At the roundabout turn right",
                "name": "At the roundabout turn right onto {way_name}",
                "destination": "At the roundabout turn right towards {destination}"
            },
            "straight": {
                "default": "At the roundabout continue straight",
                "name": "At the roundabout continue straight onto {way_name}",
                "destination": "At the roundabout continue straight towards {destination}"
            }
        },
        "turn": {
            "default": {
                "default": "Make a {modifier}",
                "name": "Make a {modifier} onto {way_name}",
                "destination": "Make a {modifier} towards {destination}"
            },
            "left": {
                "default": "Turn left",
                "name": "Turn left onto {way_name}",
                "destination": "Turn left towards {destination}"
            },
            "right": {
                "default": "Turn right",
                "name": "Turn right onto {way_name}",
                "destination": "Turn right towards {destination}"
            },
            "straight": {
                "default": "Go straight",
                "name": "Go straight onto {way_name}",
                "destination": "Go straight towards {destination}"
            }
        },
        "use lane": {
            "no_lanes": {
                "default": "Continue straight"
            },
            "default": {
                "default": "{lane_instruction}"
            }
        }
    }
}

},{}],6:[function(require,module,exports){
module.exports={
    "meta": {
        "capitalizeFirstLetter": true
    },
    "v5": {
        "constants": {
            "ordinalize": {
                "1": "première",
                "2": "seconde",
                "3": "troisième",
                "4": "quatrième",
                "5": "cinquième",
                "6": "sixième",
                "7": "setpième",
                "8": "huitième",
                "9": "neuvième",
                "10": "dixième"
            },
            "direction": {
                "north": "le nord",
                "northeast": "le nord-est",
                "east": "l'est",
                "southeast": "le sud-est",
                "south": "le sud",
                "southwest": "le sud-ouest",
                "west": "l'ouest",
                "northwest": "le nord-ouest"
            },
            "modifier": {
                "left": "à gauche",
                "right": "à droite",
                "sharp left": "franchement à gauche",
                "sharp right": "franchement à droite",
                "slight left": "légèrement à gauche",
                "slight right": "légèrement à droite",
                "straight": "tout droit",
                "uturn": "demi-tour"
            },
            "lanes": {
                "xo": "Serrer à droite",
                "ox": "Serrer à gauche",
                "xox": "Rester au milieu",
                "oxo": "Rester à gauche ou à droite"
            }
        },
        "modes": {
            "ferry": {
                "default": "Prendre le ferry",
                "name": "Prendre le ferry {way_name}",
                "destination": "Prendre le ferry en direction de {destination}"
            }
        },
        "arrive": {
            "default": {
                "default": "Vous êtes arrivés à votre {nth} destination"
            },
            "left": {
                "default": "Vous êtes arrivés à votre {nth} destination, sur la gauche"
            },
            "right": {
                "default": "Vous êtes arrivés à votre {nth} destination, sur la droite"
            },
            "sharp left": {
                "default": "Vous êtes arrivés à votre {nth} destination, sur la gauche"
            },
            "sharp right": {
                "default": "Vous êtes arrivés à votre {nth} destination, sur la droite"
            },
            "slight right": {
                "default": "Vous êtes arrivés à votre {nth} destination, sur la droite"
            },
            "slight left": {
                "default": "Vous êtes arrivés à votre {nth} destination, sur la gauche"
            },
            "straight": {
                "default": "Vous êtes arrivés à votre {nth} destination, droit devant"
            }
        },
        "continue": {
            "default": {
                "default": "Continuer {modifier}",
                "name": "Continuer {modifier} sur {way_name}",
                "destination": "Continuer {modifier} en direction de {destination}"
            },
            "slight left": {
                "default": "Continuer légèrement à gauche",
                "name": "Continuer légèrement à gauche sur {way_name}",
                "destination": "Continuer légèrement à gauche en direction de {destination}"
            },
            "slight right": {
                "default": "Continuer légèrement à droite",
                "name": "Continuer légèrement à droite sur {way_name}",
                "destination": "Continuer légèrement à droite en direction de {destination}"
            },
            "uturn": {
                "default": "Faire demi-tour",
                "name": "Faire demi-tour sur {way_name}",
                "destination": "Faire demi-tour en direction de {destination}"
            }
        },
        "depart": {
            "default": {
                "default": "Rouler vers {direction}",
                "name": "Rouler vers {direction} sur {way_name}"
            }
        },
        "end of road": {
            "default": {
                "default": "Tourner {modifier}",
                "name": "Tourner {modifier} sur {way_name}",
                "destination": "Tourner {modifier} en direction de {destination}"
            },
            "straight": {
                "default": "Continuer tout droit",
                "name": "Continuer tout droit sur {way_name}",
                "destination": "Continuer tout droit en direction de {destination}"
            },
            "uturn": {
                "default": "Faire demi-tour à la fin de la route",
                "name": "Faire demi-tour à la fin de la route {way_name}",
                "destination": "Faire demi-tour à la fin de la route en direction de {destination}"
            }
        },
        "fork": {
            "default": {
                "default": "Rester {modifier} à l'embranchement",
                "name": "Rester {modifier} à l'embranchement sur {way_name}",
                "destination": "Rester {modifier} à l'embranchement en direction de {destination}"
            },
            "slight left": {
                "default": "Rester à gauche à l'embranchement",
                "name": "Rester à gauche à l'embranchement sur {way_name}",
                "destination": "Rester à gauche à l'embranchement en direction de {destination}"
            },
            "slight right": {
                "default": "Rester à droite à l'embranchement",
                "name": "Rester à droite à l'embranchement sur {way_name}",
                "destination": "Rester à droite à l'embranchement en direction de {destination}"
            },
            "sharp left": {
                "default": "Prendre à gauche à l'embranchement",
                "name": "Prendre à gauche à l'embranchement sur {way_name}",
                "destination": "Prendre à gauche à l'embranchement en direction de {destination}"
            },
            "sharp right": {
                "default": "Prendre à droite à l'embranchement",
                "name": "Prendre à droite à l'embranchement sur {way_name}",
                "destination": "Prendre à droite à l'embranchement en direction de {destination}"
            },
            "uturn": {
                "default": "Faire demi-tour",
                "name": "Faire demi-tour sur {way_name}",
                "destination": "Faire demi-tour en direction de {destination}"
            }
        },
        "merge": {
            "default": {
                "default": "Rejoindre {modifier}",
                "name": "Rejoindre {modifier} sur {way_name}",
                "destination": "Rejoindre {modifier} en direction de {destination}"
            },
            "slight left": {
                "default": "Rejoindre légèrement par la gauche",
                "name": "Rejoindre {way_name} légèrement par la gauche",
                "destination": "Rejoindre légèrement par la gauche la route en direction de {destination}"
            },
            "slight right": {
                "default": "Rejoindre légèrement par la droite",
                "name": "Rejoindre {way_name} légèrement par la droite",
                "destination": "Rejoindre légèrement par la droite la route en direction de {destination}"
            },
            "sharp left": {
                "default": "Rejoindre par la gauche",
                "name": "Rejoindre {way_name} par la gauche",
                "destination": "Rejoindre par la gauche la route en direction de {destination}"
            },
            "sharp right": {
                "default": "Rejoindre par la droite",
                "name": "Rejoindre {way_name} par la droite",
                "destination": "Rejoindre par la droite la route en direction de {destination}"
            },
            "uturn": {
                "default": "Fair demi-tour",
                "name": "Fair demi-tour sur {way_name}",
                "destination": "Fair demi-tour en direction de {destination}"
            }
        },
        "new name": {
            "default": {
                "default": "Continuer {modifier}",
                "name": "Continuer {modifier} sur {way_name}",
                "destination": "Continuer {modifier} en direction de {destination}"
            },
            "sharp left": {
                "default": "Prendre à gauche",
                "name": "Prendre à gauche sur {way_name}",
                "destination": "Prendre à gauche en direction de {destination}"
            },
            "sharp right": {
                "default": "Prendre à droite",
                "name": "Prendre à droite sur {way_name}",
                "destination": "Prendre à droite en direction de {destination}"
            },
            "slight left": {
                "default": "Continuer légèrement à gauche",
                "name": "Continuer légèrement à gauche sur {way_name}",
                "destination": "Continuer légèrement à gauche en direction de {destination}"
            },
            "slight right": {
                "default": "Continuer légèrement à droite",
                "name": "Continuer légèrement à droite sur {way_name}",
                "destination": "Continuer légèrement à droite en direction de {destination}"
            },
            "uturn": {
                "default": "Fair demi-tour",
                "name": "Fair demi-tour sur {way_name}",
                "destination": "Fair demi-tour en direction de {destination}"
            }
        },
        "notification": {
            "default": {
                "default": "Continuer {modifier}",
                "name": "Continuer {modifier} sur {way_name}",
                "destination" : "Continuer {modifier} en direction de {destination}"
            },
            "uturn": {
                "default": "Fair demi-tour",
                "name": "Fair demi-tour sur {way_name}",
                "destination": "Fair demi-tour en direction de {destination}"
            }
        },
        "off ramp": {
            "default": {
                "default": "Prendre la sortie",
                "name": "Prendre la sortie sur {way_name}",
                "destination": "Prendre la sortie en direction de {destination}"
            },
            "left": {
                "default": "Prendre la sortie à gauche",
                "name": "Prendre la sortie à gauche sur {way_name}",
                "destination": "Prendre la sortie à gauche en direction de {destination}"
            },
            "right": {
                "default": "Prendre la sortie à droite",
                "name": "Prendre la sortie à droite sur {way_name}",
                "destination": "Prendre la sortie à droite en direction de {destination}"
            },
            "sharp left": {
                "default": "Prendre la sortie à gauche",
                "name": "Prendre la sortie à gauche sur {way_name}",
                "destination": "Prendre la sortie à gauche en direction de {destination}"
            },
            "sharp right": {
                "default": "Prendre la sortie à droite",
                "name": "Prendre la sortie à droite sur {way_name}",
                "destination": "Prendre la sortie à droite en direction de {destination}"
            },
            "slight left": {
                "default": "Prendre la sortie à gauche",
                "name": "Prendre la sortie à gauche sur {way_name}",
                "destination": "Prendre la sortie à gauche en direction de {destination}"
            },
            "slight right": {
                "default": "Prendre la sortie à droite",
                "name": "Prendre la sortie à droite sur {way_name}",
                "destination": "Prendre la sortie à droite en direction de {destination}"
            }
        },
        "on ramp": {
            "default": {
                "default": "Prendre la sortie",
                "name": "Prendre la sortie sur {way_name}",
                "destination": "Prendre la sortie en direction de {destination}"
            },
            "left": {
                "default": "Prendre la sortie à gauche",
                "name": "Prendre la sortie à gauche sur {way_name}",
                "destination": "Prendre la sortie à gauche en direction de {destination}"
            },
            "right": {
                "default": "Prendre la sortie à droite",
                "name": "Prendre la sortie à droite sur {way_name}",
                "destination": "Prendre la sortie à droite en direction de {destination}"
            },
            "sharp left": {
                "default": "Prendre la sortie à gauche",
                "name": "Prendre la sortie à gauche sur {way_name}",
                "destination": "Prendre la sortie à gauche en direction de {destination}"
            },
            "sharp right": {
                "default": "Prendre la sortie à droite",
                "name": "Prendre la sortie à droite sur {way_name}",
                "destination": "Prendre la sortie à droite en direction de {destination}"
            },
            "slight left": {
                "default": "Prendre la sortie à gauche",
                "name": "Prendre la sortie à gauche sur {way_name}",
                "destination": "Prendre la sortie à gauche en direction de {destination}"
            },
            "slight right": {
                "default": "Prendre la sortie à droite",
                "name": "Prendre la sortie à droite sur {way_name}",
                "destination": "Prendre la sortie à droite en direction de {destination}"
            }
        },
        "rotary": {
            "default": {
                "default": {
                    "default": "Entrer dans le rond-point",
                    "name": "Entrer dans le rond-point et sortir par {way_name}",
                    "destination": "Entrer dans le rond-point et sortir en direction de {destination}"
                },
                "name": {
                    "default": "Entrer dans le rond-point {rotary_name}",
                    "name": "Entrer dans le rond-point {rotary_name} et sortir par {way_name}",
                    "destination": "Entrer dans le rond-point {rotary_name} et sortir en direction de {destination}"
                },
                "exit": {
                    "default": "Entrer dans le rond-point et prendre la {exit_number} sortie",
                    "name": "Entrer dans le rond-point et prendre la {exit_number} sortie sur {way_name}",
                    "destination": "Entrer dans le rond-point et prendre la {exit_number} sortie en direction de {destination}"
                },
                "name_exit": {
                    "default": "Entrer dans le rond-point {rotary_name} et prendre la {exit_number} sortie",
                    "name": "Entrer dans le rond-point {rotary_name} et prendre la {exit_number} sortie sur {way_name}",
                    "destination": "Entrer dans le rond-point {rotary_name} et prendre la {exit_number} sortie en direction de {destination}"
                }
            }
        },
        "roundabout": {
            "default": {
                "exit": {
                    "default": "Entrer dans le rond-point et prendre la {exit_number} sortie",
                    "name": "Entrer dans le rond-point et prendre la {exit_number} sortie sur {way_name}",
                    "destination": "Entrer dans le rond-point et prendre la {exit_number} sortie en direction de {destination}"
                },
                "default": {
                    "default": "Entrer dans le rond-point",
                    "name": "Entrer dans le rond-point et sortir par {way_name}",
                    "destination": "Entrer dans le rond-point et sortir en direction de {destination}"
                }
            }
        },
        "roundabout turn": {
            "default": {
                "default": "Au rond-point, tourner {modifier}",
                "name": "Au rond-point, tourner {modifier} sur {way_name}",
                "destination": "Au rond-point, tourner {modifier} en direction de {destination}"
            },
            "left": {
                "default": "Au rond-point, tourner à gauche",
                "name": "Au rond-point, tourner à gauche sur {way_name}",
                "destination": "Au rond-point, tourner à gauche en direction de {destination}"
            },
            "right": {
                "default": "Au rond-point, tourner à droite",
                "name": "Au rond-point, tourner à droite sur {way_name}",
                "destination": "Au rond-point, tourner à droite en direction de {destination}"
            },
            "straight": {
                "default": "Au rond-point, continuer tout droit",
                "name": "Au rond-point, continuer tout droit sur {way_name}",
                "destination": "Au rond-point, continuer tout droit en direction de {destination}"
            }
        },
        "turn": {
            "default": {
                "default": "Tourner {modifier}",
                "name": "Tourner {modifier} sur {way_name}",
                "destination": "Tourner {modifier} en direction de {destination}"
            },
            "left": {
                "default": "Tourner à gauche",
                "name": "Tourner à gauche sur {way_name}",
                "destination": "Tourner à gauche en direction de {destination}"
            },
            "right": {
                "default": "Tourner à droite",
                "name": "Tourner à droite sur {way_name}",
                "destination": "Tourner à droite en direction de {destination}"
            },
            "straight": {
                "default": "Aller tout droit",
                "name": "Aller tout droit sur {way_name}",
                "destination": "Aller tout droit en direction de {destination}"
            }
        },
        "use lane": {
            "no_lanes": {
                "default": "Continuer tout droit"
            },
            "default": {
                "default": "{lane_instruction} pour continuer {modifier}"
            },
            "straight": {
                "default": "{lane_instruction}"
            },
            "left": {
                "default": "{lane_instruction} pour tourner à gauche"
            },
            "right": {
                "default": "{lane_instruction} pour tourner à droite"
            }
        }
    }
}

},{}],7:[function(require,module,exports){
module.exports={
    "meta": {
        "capitalizeFirstLetter": true
    },
    "v5": {
        "constants": {
            "ordinalize": {
                "1": "eerste",
                "2": "tweede",
                "3": "derde",
                "4": "vierde",
                "5": "vijfde",
                "6": "zesde",
                "7": "zevende",
                "8": "achtste",
                "9": "negende",
                "10": "tiende"
            },
            "direction": {
                "north": "noord",
                "northeast": "noordoost",
                "east": "oost",
                "southeast": "zuidoost",
                "south": "zuid",
                "southwest": "zuidwest",
                "west": "west",
                "northwest": "noordwest"
            },
            "modifier": {
                "left": "links",
                "right": "rechts",
                "sharp left": "linksaf",
                "sharp right": "rechtsaf",
                "slight left": "links",
                "slight right": "rechts",
                "straight": "rechtdoor",
                "uturn": "omkeren"
            },
            "lanes": {
                "xo": "Rechts aanhouden",
                "ox": "Links aanhouden",
                "xox": "In het midden blijven",
                "oxo": "Links of rechts blijven"
            }
        },
        "modes": {
            "ferry": {
                "default": "Neem het veer",
                "name": "Neem het veer {way_name}",
                "destination": "Neem het veer naar {destination}"
            }
        },
        "arrive": {
            "default": {
                "default": "Je bent gearriveerd op de {nth} bestemming."
            },
            "left": {
                "default": "Je bent gearriveerd. De {nth} bestemming bevindt zich links."
            },
            "right": {
                "default": "Je bent gearriveerd. De {nth} bestemming bevindt zich rechts."
            },
            "sharp left": {
                "default": "Je bent gearriveerd. De {nth} bestemming bevindt zich links."
            },
            "sharp right": {
                "default": "Je bent gearriveerd. De {nth} bestemming bevindt zich rechts."
            },
            "slight right": {
                "default": "Je bent gearriveerd. De {nth} bestemming bevindt zich rechts."
            },
            "slight left": {
                "default": "Je bent gearriveerd. De {nth} bestemming bevindt zich links."
            },
            "straight": {
                "default": "Je bent gearriveerd. De {nth} bestemming bevindt zich voor je."
            }
        },
        "continue": {
            "default": {
                "default": "Ga {modifier}",
                "name": "Ga {modifier} naar {way_name}",
                "destination": "Ga {modifier} richting {destination}"
            },
            "slight left": {
                "default": "Links aanhouden",
                "name": "Links aanhouden naar {way_name}",
                "destination": "Links aanhouden richting {destination}"
            },
            "slight right": {
                "default": "Rechts aanhouden",
                "name": "Rechts aanhouden naar {way_name}",
                "destination": "Rechts aanhouden richting {destination}"
            },
            "uturn": {
                "default": "Keer om",
                "name": "Keer om naar {way_name}",
                "destination": "Keer om richting {destination}"
            }
        },
        "depart": {
            "default": {
                "default": "Vertrek in {direction}elijke richting",
                "name": "Neem {way_name} in {direction}elijke richting"
            }
        },
        "end of road": {
            "default": {
                "default": "Ga {modifier}",
                "name": "Ga {modifier} naar {way_name}",
                "destination": "Ga {modifier} richting {destination}"
            },
            "straight": {
                "default": "Ga in de aangegeven richting",
                "name": "Ga naar {way_name}",
                "destination": "Ga richting {destination}"
            },
            "uturn": {
                "default": "Keer om",
                "name": "Keer om naar {way_name}",
                "destination": "Keer om richting {destination}"
            }
        },
        "fork": {
            "default": {
                "default": "Ga {modifier} op de splitsing",
                "name": "Ga {modifier} op de splitsing naar {way_name}",
                "destination": "Ga {modifier} op de splitsing richting {destination}"
            },
            "slight left": {
                "default": "Links aanhouden op de splitsing",
                "name": "Links aanhouden op de splitsing naar {way_name}",
                "destination": "Links aanhouden op de splitsing richting {destination}"
            },
            "slight right": {
                "default": "Rechts aanhouden op de splitsing",
                "name": "Rechts aanhouden op de splitsing naar {way_name}",
                "destination": "Rechts aanhouden op de splitsing richting {destination}"
            },
            "sharp left": {
                "default": "Linksaf op de splitsing",
                "name": "Linksaf op de splitsing naar {way_name}",
                "destination": "Linksaf op de splitsing richting {destination}"
            },
            "sharp right": {
              "default": "Rechtsaf op de splitsing",
              "name": "Rechtsaf op de splitsing naar {way_name}",
              "destination": "Rechtsaf op de splitsing richting {destination}"
            },
            "uturn": {
                "default": "Keer om",
                "name": "Keer om naar {way_name}",
                "destination": "Keer om richting {destination}"
            }
        },
        "merge": {
            "default": {
                "default": "Bij de splitsing {modifier}",
                "name": "Bij de splitsing {modifier} naar {way_name}",
                "destination": "Bij de splitsing {modifier} richting {destination}"
            },
            "slight left": {
                "default": "Bij de splitsing links aanhouden",
                "name": "Bij de splitsing links aanhouden naar {way_name}",
                "destination": "Bij de splitsing links aanhouden richting {destination}"
            },
            "slight right": {
                "default": "Bij de splitsing rechts aanhouden",
                "name": "Bij de splitsing rechts aanhouden naar {way_name}",
                "destination": "Bij de splitsing rechts aanhouden richting {destination}"
            },
            "sharp left": {
                "default": "Bij de splitsing linksaf",
                "name": "Bij de splitsing linksaf naar {way_name}",
                "destination": "Bij de splitsing linksaf richting {destination}"
            },
            "sharp right": {
                "default": "Bij de splitsing rechtsaf",
                "name": "Bij de splitsing rechtsaf naar {way_name}",
                "destination": "Bij de splitsing rechtsaf richting {destination}"
            },
            "uturn": {
                "default": "Keer om",
                "name": "Keer om naar {way_name}",
                "destination": "Keer om richting {destination}"
            }
        },
        "new name": {
            "default": {
                "default": "Ga {modifier}",
                "name": "Ga {modifier} naar {way_name}",
                "destination": "Ga {modifier} richting {destination}"
            },
            "sharp left": {
                "default": "Linksaf",
                "name": "Linksaf naar {way_name}",
                "destination": "Linksaf richting {destination}"
            },
            "sharp right": {
                "default": "Rechtsaf",
                "name": "Rechtsaf naar {way_name}",
                "destination": "Rechtsaf richting {destination}"
            },
            "slight left": {
                "default": "Links aanhouden",
                "name": "Links aanhouden naar {way_name}",
                "destination": "Links aanhouden richting {destination}"
            },
            "slight right": {
                "default": "Rechts aanhouden",
                "name": "Rechts aanhouden naar {way_name}",
                "destination": "Rechts aanhouden richting {destination}"
            },
            "uturn": {
                "default": "Keer om",
                "name": "Keer om naar {way_name}",
                "destination": "Keer om richting {destination}"
            }
        },
        "notification": {
            "default": {
                "default": "Ga {modifier}",
                "name": "Ga {modifier} naar {way_name}",
                "destination" : "Ga {modifier} richting {destination}"
            },
            "uturn": {
                "default": "Keer om",
                "name": "Keer om naar {way_name}",
                "destination": "Keer om richting {destination}"
            }
        },
        "off ramp": {
            "default": {
                "default": "Neem de afrit",
                "name": "Neem de afrit naar {way_name}",
                "destination": "Neem de afrit richting {destination}"
            },
            "left": {
                "default": "Neem de afrit links",
                "name": "Neem de afrit links naar {way_name}",
                "destination": "Neem de afrit links richting {destination}"
            },
            "right": {
              "default": "Neem de afrit rechts",
              "name": "Neem de afrit rechts naar {way_name}",
              "destination": "Neem de afrit rechts richting {destination}"
            },
            "sharp left": {
                "default": "Neem de afrit links",
                "name": "Neem de afrit links naar {way_name}",
                "destination": "Neem de afrit links richting {destination}"
            },
            "sharp right": {
                "default": "Neem de afrit rechts",
                "name": "Neem de afrit rechts naar {way_name}",
                "destination": "Neem de afrit rechts richting {destination}"
            },
            "slight left": {
                "default": "Neem de afrit links",
                "name": "Neem de afrit links naar {way_name}",
                "destination": "Neem de afrit links richting {destination}"
            },
            "slight right": {
                "default": "Neem de afrit rechts",
                "name": "Neem de afrit rechts naar {way_name}",
                "destination": "Neem de afrit rechts richting {destination}"
            }
        },
        "on ramp": {
            "default": {
                "default": "Neem de oprit",
                "name": "Neem de oprit naar {way_name}",
                "destination": "Neem de oprit richting {destination}"
            },
            "left": {
                "default": "Neem de oprit links",
                "name": "Neem de oprit links naar {way_name}",
                "destination": "Neem de oprit links richting {destination}"
            },
            "right": {
              "default": "Neem de oprit rechts",
              "name": "Neem de oprit rechts naar {way_name}",
              "destination": "Neem de oprit rechts richting {destination}"
            },
            "sharp left": {
                "default": "Neem de oprit links",
                "name": "Neem de oprit links naar {way_name}",
                "destination": "Neem de oprit links richting {destination}"
            },
            "sharp right": {
                "default": "Neem de oprit rechts",
                "name": "Neem de oprit rechts naar {way_name}",
                "destination": "Neem de oprit rechts richting {destination}"
            },
            "slight left": {
                "default": "Neem de oprit links",
                "name": "Neem de oprit links naar {way_name}",
                "destination": "Neem de oprit links richting {destination}"
            },
            "slight right": {
                "default": "Neem de oprit rechts",
                "name": "Neem de oprit rechts naar {way_name}",
                "destination": "Neem de oprit rechts richting {destination}"
            }
        },
        "rotary": {
            "default": {
                "default": {
                    "default": "Ga het knooppunt op",
                    "name": "Verlaat het knooppunt naar {way_name}",
                    "destination": "Verlaat het knooppunt richting {destination}"
                },
                "name": {
                    "default": "Ga het knooppunt {rotary_name} op",
                    "name": "Verlaat het knooppunt {rotary_name} naar {way_name}",
                    "destination": "Verlaat het knooppunt {rotary_name} richting {destination}"
                },
                "exit": {
                    "default": "Ga het knooppunt op en neem afslag {exit_number}",
                    "name": "Ga het knooppunt op en neem afslag {exit_number} naar {way_name}",
                    "destination": "Ga het knooppunt op en neem afslag {exit_number} richting {destination}"
                },
                "name_exit": {
                    "default": "Ga het knooppunt {rotary_name} op en neem afslag {exit_number}",
                    "name": "Ga het knooppunt {rotary_name} op en neem afslag {exit_number} naar {way_name}",
                    "destination": "Ga het knooppunt {rotary_name} op en neem afslag {exit_number} richting {destination}"

                }
            }
        },
        "roundabout": {
            "default": {
                "exit": {
                    "default": "Ga de rotonde op en neem afslag {exit_number}",
                    "name": "Ga de rotonde op en neem afslag {exit_number} naar {way_name}",
                    "destination": "Ga de rotonde op en neem afslag {exit_number} richting {destination}"
                },
                "default": {
                    "default": "Ga de rotonde op",
                    "name": "Verlaat de rotonde naar {way_name}",
                    "destination": "Verlaat de rotonde richting {destination}"
                }
            }
        },
        "roundabout turn": {
            "default": {
                "default": "Ga {modifier} op de rotonde",
                "name": "Ga {modifier} op de rotonde naar {way_name}",
                "destination": "Ga {modifier} op de rotonde richting {destination}"
            },
            "left": {
                "default": "Ga links op de rotonde",
                "name": "Ga links op de rotonde naar {way_name}",
                "destination": "Ga links op de rotonde richting {destination}"
            },
            "right": {
                "default": "Ga rechts op de rotonde",
                "name": "Ga rechts op de rotonde naar {way_name}",
                "destination": "Ga rechts op de rotonde richting {destination}"
            },
            "straight": {
                "default": "Rechtdoor op de rotonde",
                "name": "Rechtdoor op de rotonde naar {way_name}",
                "destination": "Rechtdoor op de rotonde richting {destination}"
            }
        },
        "turn": {
            "default": {
                "default": "Ga {modifier}",
                "name": "Ga {modifier} naar {way_name}",
                "destination": "Ga {modifier} richting {destination}"
            },
            "left": {
                "default": "Ga linksaf",
                "name": "Ga linksaf naar {way_name}",
                "destination": "Ga linksaf richting {destination}"
            },
            "right": {
                "default": "Ga rechtsaf",
                "name": "Ga rechtsaf naar {way_name}",
                "destination": "Ga rechtsaf richting {destination}"
            },
            "straight": {
                "default": "Ga rechtdoor",
                "name": "Ga rechtdoor naar {way_name}",
                "destination": "Ga rechtdoor richting {destination}"
            }
        },
        "use lane": {
            "no_lanes": {
                "default": "Rechtdoor"
            },
            "default": {
                "default": "{lane_instruction} ga {modifier}"
            },
            "straight": {
                "default": "{lane_instruction}"
            },
            "left": {
                "default": "{lane_instruction} om links te gaan"
            },
            "right": {
                "default": "{lane_instruction} om rechts te gaan"
            }
        }
    }
}

},{}],8:[function(require,module,exports){
module.exports={
    "meta": {
        "capitalizeFirstLetter": false
    },
    "v5": {
        "constants": {
            "ordinalize": {
                "1": "第一",
                "2": "第二",
                "3": "第三",
                "4": "第四",
                "5": "第五",
                "6": "第六",
                "7": "第七",
                "8": "第八",
                "9": "第九",
                "10": "第十"
            },
            "direction": {
                "north": "北",
                "northeast": "东北",
                "east": "东",
                "southeast": "东南",
                "south": "南",
                "southwest": "西南",
                "west": "西",
                "northwest": "西北"
            },
            "modifier": {
                "left": "向左",
                "right": "向右",
                "sharp left": "向左",
                "sharp right": "向右",
                "slight left": "向左",
                "slight right": "向右",
                "straight": "直行",
                "uturn": "调头"
            },
            "lanes": {
                "xo": "靠右直行",
                "ox": "靠左直行",
                "xox": "保持在道路中间直行",
                "oxo": "保持在道路两侧直行"
            }
        },
        "modes": {
            "ferry": {
                "default": "乘坐轮渡",
                "name": "乘坐{way_name}轮渡",
                "destination": "乘坐开往{destination}的轮渡"
            }
        },
        "arrive": {
            "default": {
                "default": "您已经到达您的{nth}个目的地"
            },
            "left": {
                "default": "您已经到达您的{nth}个目的地，在道路左侧"
            },
            "right": {
                "default": "您已经到达您的{nth}个目的地，在道路右侧"
            },
            "sharp left": {
                "default": "您已经到达您的{nth}个目的地，在道路左侧"
            },
            "sharp right": {
                "default": "您已经到达您的{nth}个目的地，在道路右侧"
            },
            "slight right": {
                "default": "您已经到达您的{nth}个目的地，在道路右侧"
            },
            "slight left": {
                "default": "您已经到达您的{nth}个目的地，在道路左侧"
            },
            "straight": {
                "default": "您已经到达您的{nth}个目的地，在您正前方"
            }
        },
        "continue": {
            "default": {
                "default": "继续{modifier}",
                "name": "继续{modifier}，上{way_name}",
                "destination": "继续{modifier}行驶，前往{destination}"
            },
            "uturn": {
                "default": "调头",
                "name": "调头上{way_name}",
                "destination": "调头后前往{destination}"
            }
        },
        "depart": {
            "default": {
                "default": "出发向{direction}",
                "name": "出发向{direction}，上{way_name}"
            }
        },
        "end of road": {
            "default": {
                "default": "{modifier}行驶",
                "name": "{modifier}行驶，上{way_name}",
                "destination": "{modifier}行驶，前往{destination}"
            },
            "straight": {
                "default": "继续直行",
                "name": "继续直行，上{way_name}",
                "destination": "继续直行，前往{destination}"
            },
            "uturn": {
                "default": "在道路尽头调头",
                "name": "在道路尽头调头上{way_name}",
                "destination": "在道路尽头调头，前往{destination}"
            }
        },
        "fork": {
            "default": {
                "default": "在岔道保持{modifier}",
                "name": "在岔道保持{modifier}，上{way_name}",
                "destination": "在岔道保持{modifier}，前往{destination}"
            },
            "uturn": {
                "default": "调头",
                "name": "调头，上{way_name}",
                "destination": "调头，前往{destination}"
            }
        },
        "merge": {
            "default": {
                "default": "{modifier}并道",
                "name": "{modifier}并道，上{way_name}",
                "destination": "{modifier}并道，前往{destination}"
            },
            "uturn": {
                "default": "调头",
                "name": "调头，上{way_name}",
                "destination": "调头，前往{destination}"
            }
        },
        "new name": {
            "default": {
                "default": "继续{modifier}",
                "name": "继续{modifier}，上{way_name}",
                "destination": "继续{modifier}，前往{destination}"
            },
             "uturn": {
                "default": "调头",
                "name": "调头，上{way_name}",
                "destination": "调头，前往{destination}"
            }
        },
        "notification": {
            "default": {
                "default": "继续{modifier}",
                "name": "继续{modifier}，上{way_name}",
                "destination" : "继续{modifier}，前往{destination}"
            },
            "uturn": {
                "default": "调头",
                "name": "调头，上{way_name}",
                "destination": "调头，前往{destination}"
            }
        },
        "off ramp": {
            "default": {
                "default": "上匝道",
                "name": "通过匝道驶入{way_name}",
                "destination": "通过匝道前往{destination}"
            },
            "left": {
                "default": "通过左边的匝道",
                "name": "通过左边的匝道驶入{way_name}",
                "destination": "通过左边的匝道前往{destination}"
            },
            "right": {
                "default": "通过右边的匝道",
                "name": "通过右边的匝道驶入{way_name}",
                "destination": "通过右边的匝道前往{destination}"
            }
        },
        "on ramp": {
            "default": {
                "default": "通过匝道",
                "name": "通过匝道驶入{way_name}",
                "destination": "通过匝道前往{destination}"
            },
            "left": {
                "default": "通过左边的匝道",
                "name": "通过左边的匝道驶入{way_name}",
                "destination": "通过左边的匝道前往{destination}"
            },
            "right": {
                "default": "通过右边的匝道",
                "name": "通过右边的匝道驶入{way_name}",
                "destination": "通过右边的匝道前往{destination}"
            }
        },
        "rotary": {
            "default": {
                "default": {
                    "default": "进入环岛",
                    "name": "通过环岛后驶入{way_name}",
                    "destination": "通过环岛前往{destination}"
                },
                "name": {
                    "default": "进入{rotary_name}环岛",
                    "name": "通过{rotary_name}环岛后驶入{way_name}",
                    "destination": "通过{rotary_name}环岛后前往{destination}"
                },
                "exit": {
                    "default": "进入环岛并从{exit_number}出口驶出",
                    "name": "进入环岛后从{exit_number}出口驶出进入{way_name}",
                    "destination": "进入环岛后从{exit_number}出口驶出前往{destination}"
                },
                "name_exit": {
                    "default": "进入{rotary_name}环岛后从{exit_number}出口驶出",
                    "name": "进入{rotary_name}环岛后从{exit_number}出口驶出进入{way_name}",
                    "destination": "进入{rotary_name}环岛后从{exit_number}出口驶出前往{destination}"
                }
            }
        },
        "roundabout": {
            "default": {
                "exit": {
                    "default": "进入环岛后从{exit_number}出口驶出",
                    "name": "进入环岛后从{exit_number}出口驶出前往{way_name}",
                    "destination": "进入环岛后从{exit_number}出口驶出前往{destination}"
                },
                "default": {
                    "default": "进入环岛",
                    "name": "通过环岛后驶入{way_name}",
                    "destination": "通过环岛后前往{destination}"
                }
            }
        },
        "roundabout turn": {
            "default": {
                "default": "在环岛{modifier}行驶",
                "name": "在环岛{modifier}行驶，上{way_name}",
                "destination": "在环岛{modifier}行驶，前往{destination}"
            },
            "left": {
                "default": "在环岛左转",
                "name": "在环岛左转，上{way_name}",
                "destination": "在环岛左转，前往{destination}"
            },
            "right": {
                "default": "在环岛右转",
                "name": "在环岛右转，上{way_name}",
                "destination": "在环岛右转，前往{destination}"
            },
            "straight": {
                "default": "在环岛继续直行",
                "name": "在环岛继续直行，上{way_name}",
                "destination": "在环岛继续直行，前往{destination}"
            }
        },
        "turn": {
            "default": {
                "default": "{modifier}转弯",
                "name": "{modifier}转弯，上{way_name}",
                "destination": "{modifier}转弯，前往{destination}"
            },
            "left": {
                "default": "左转",
                "name": "左转，上{way_name}",
                "destination": "左转，前往{destination}"
            },
            "right": {
                "default": "右转",
                "name": "右转，上{way_name}",
                "destination": "右转，前往{destination}"
            },
            "straight": {
                "default": "直行",
                "name": "直行，上{way_name}",
                "destination": "直行，前往{destination}"
            }
        },
        "use lane": {
            "no_lanes": {
                "default": "继续直行"
            },
            "default": {
                "default": "{lane_instruction}然后{modifier}"
            },
            "straight": {
                "default": "{lane_instruction}"
            },
            "left": {
                "default": "{lane_instruction}然后左转"
            },
            "right": {
                "default": "{lane_instruction}然后右转"
            }
        }
    }
}

},{}],9:[function(require,module,exports){
'use strict';

/**
 * Based off of [the offical Google document](https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
 *
 * Some parts from [this implementation](http://facstaff.unca.edu/mcmcclur/GoogleMaps/EncodePolyline/PolylineEncoder.js)
 * by [Mark McClure](http://facstaff.unca.edu/mcmcclur/)
 *
 * @module polyline
 */

var polyline = {};

function encode(coordinate, factor) {
    coordinate = Math.round(coordinate * factor);
    coordinate <<= 1;
    if (coordinate < 0) {
        coordinate = ~coordinate;
    }
    var output = '';
    while (coordinate >= 0x20) {
        output += String.fromCharCode((0x20 | (coordinate & 0x1f)) + 63);
        coordinate >>= 5;
    }
    output += String.fromCharCode(coordinate + 63);
    return output;
}

/**
 * Decodes to a [latitude, longitude] coordinates array.
 *
 * This is adapted from the implementation in Project-OSRM.
 *
 * @param {String} str
 * @param {Number} precision
 * @returns {Array}
 *
 * @see https://github.com/Project-OSRM/osrm-frontend/blob/master/WebContent/routing/OSRM.RoutingGeometry.js
 */
polyline.decode = function(str, precision) {
    var index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision || 5);

    // Coordinates have variable length when encoded, so just keep
    // track of whether we've hit the end of the string. In each
    // loop iteration, a single coordinate is decoded.
    while (index < str.length) {

        // Reset shift, result, and byte
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
};

/**
 * Encodes the given [latitude, longitude] coordinates array.
 *
 * @param {Array.<Array.<Number>>} coordinates
 * @param {Number} precision
 * @returns {String}
 */
polyline.encode = function(coordinates, precision) {
    if (!coordinates.length) { return ''; }

    var factor = Math.pow(10, precision || 5),
        output = encode(coordinates[0][0], factor) + encode(coordinates[0][1], factor);

    for (var i = 1; i < coordinates.length; i++) {
        var a = coordinates[i], b = coordinates[i - 1];
        output += encode(a[0] - b[0], factor);
        output += encode(a[1] - b[1], factor);
    }

    return output;
};

function flipped(coords) {
    var flipped = [];
    for (var i = 0; i < coords.length; i++) {
        flipped.push(coords[i].slice().reverse());
    }
    return flipped;
}

/**
 * Encodes a GeoJSON LineString feature/geometry.
 *
 * @param {Object} geojson
 * @param {Number} precision
 * @returns {String}
 */
polyline.fromGeoJSON = function(geojson, precision) {
    if (geojson && geojson.type === 'Feature') {
        geojson = geojson.geometry;
    }
    if (!geojson || geojson.type !== 'LineString') {
        throw new Error('Input must be a GeoJSON LineString');
    }
    return polyline.encode(flipped(geojson.coordinates), precision);
};

/**
 * Decodes to a GeoJSON LineString geometry.
 *
 * @param {String} str
 * @param {Number} precision
 * @returns {Object}
 */
polyline.toGeoJSON = function(str, precision) {
    var coords = polyline.decode(str, precision);
    return {
        type: 'LineString',
        coordinates: flipped(coords)
    };
};

if (typeof module === 'object' && module.exports) {
    module.exports = polyline;
}

},{}],10:[function(require,module,exports){
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
--- L.Routing.Extensions.Dialogs.js file -------------------------------------------------------------------------------
This file contains:
	- 
	- 
Changes:
	- v1.0.1:
		- created
		
Doc not reviewed...
Tests to do...
------------------------------------------------------------------------------------------------------------------------
*/

(function() {
	'use strict';

	/*
	--- PolylineDialog object ----------------------------------------------------------------------------------------------
	------------------------------------------------------------------------------------------------------------------------
	*/

	function PolylineDialog ( options, map, routingMachine, polyline ) {	
	
		// options
		options = options || {};
		options.color = options.color || '#000000';
		options.width = options.width || 5;
		options.name = options.name || '';
		options.clear = options.clear || false;
		
		// Main div
		var polylineDialogMainDiv = L.DomUtil.create ( 'div','cyPolylineDialogMainDiv' );

		var polylineDialogInputDiv = L.DomUtil.create ( 'div','cyPolylineDialogInputDiv', polylineDialogMainDiv );

		// Color
		var polylineDialogColorDiv = L.DomUtil.create ( 'div','cyPolylineDialogColorDiv', polylineDialogInputDiv );
		polylineDialogColorDiv.innerHTML = 'Color:&nbsp;';
		
		var colorInput = L.DomUtil.create( 'input', 'cyPolylineDialogColorInput', polylineDialogColorDiv );
		colorInput.type = 'color';
		colorInput.value = options.color;
		colorInput.id = 'cyPolylineDialogColorInput';

		// Width
		var polylineDialogWidthDiv = L.DomUtil.create ( 'div','cyPolylineDialogColorDiv', polylineDialogInputDiv );
		polylineDialogWidthDiv.innerHTML = 'Width:&nbsp;';

		var widthInput = L.DomUtil.create( 'input', 'cyPolylineDialogWidthInput', polylineDialogWidthDiv );
		widthInput.type = 'number';
		widthInput.setAttribute ( 'min', 0 );
		widthInput.setAttribute ( 'max', 20 );
		widthInput.setAttribute ( 'step', 1 );
		widthInput.value = options.width;
		widthInput.id = 'cyPolylineDialogWidthInput';
		
		// Name
		var polylineDialogNameDiv = L.DomUtil.create ( 'div','cyPolylineDialogNameDiv', polylineDialogInputDiv );
		polylineDialogNameDiv.innerHTML = 'Name:&nbsp;';
		
		var nameInput = L.DomUtil.create( 'input', 'cyPolylineDialogNameDiv', polylineDialogNameDiv );
		nameInput.id = 'cyPolylineDialogNameInput';
		nameInput.value = options.name;

		if ( ! polyline ) {
			// Clear route
			var polylineDialogClearDiv = L.DomUtil.create ( 'div','cyPolylineDialogClearDiv', polylineDialogInputDiv );
			polylineDialogClearDiv.innerHTML = 'Clear route:&nbsp;';
			
			var clearInput = L.DomUtil.create( 'input', 'cyPolylineDialogClearDiv', polylineDialogClearDiv );
			clearInput.type = 'checkbox';
			clearInput.checked = options.clear;
			clearInput.id = 'cyPolylineDialogNameInput';		
		}
		// Buttons div
		var polylineDialogButtonsDiv = L.DomUtil.create ( 'div','cyPolylineDialogButtonsDiv', polylineDialogMainDiv );
		
		// OK button
		var okButton = L.DomUtil.create( 'button', 'cyPolylineDialogOkButton', polylineDialogButtonsDiv );
		okButton.setAttribute( 'type' , 'button' );
		okButton.innerHTML = 'OK';
		if ( ! polyline ) {
			L.DomEvent.on ( 
				okButton, 
				'click', 
				function() { 
					options.color = colorInput.value;
					options.width = widthInput.value;
					options.name = nameInput.value;
					options.clear = clearInput.checked;
					map.closePopup ( );
					routingMachine.RouteToLine ( options );
				} 
			);
		} 
		else {
			L.DomEvent.on ( 
				okButton, 
				'click', 
				function() { 
					options.color = colorInput.value;
					options.width = widthInput.value;
					options.name = nameInput.value;
					options.clear = false;
					map.closePopup ( );
					polyline.setStyle ( { color : options.color, weight : options.width } );
					if ( 0 < options.name.length ) {
						polyline.bindTooltip ( options.name );
					}
					else
					{
						polyline.unbindTooltip ( );
					}
					polyline.LrmExtensionsName = options.name;
				} 
			);
			
		}

		// Cancel button
		var cancelButton = L.DomUtil.create( 'button', 'cyPolylineDialogCancelButton', polylineDialogButtonsDiv );
		cancelButton.setAttribute( 'type' , 'button' );
		cancelButton.innerHTML = 'Cancel';
		L.DomEvent.on ( 
			cancelButton, 
			'click', 
			function() { 
				map.closePopup ( );
			} 
		);
		
		// show dialog
		L.popup
			(
				{
					keepInView : true,
					closeButton : true,
					maxWidth : 200,
					className : 'cyPolylineDialog',
					autoClose : false
				}
			)
			.setContent ( polylineDialogMainDiv )
			.setLatLng( map.getCenter() )
			.openOn( map );
		return options;
	}
	
	/*
	--- polylineDialog function --------------------------------------------------------------------------------------------
	PolylineDialog factory function
	------------------------------------------------------------------------------------------------------------------------
	*/
	
	function polylineDialog ( options, map, routingMachine, polyline ) {	
		return new PolylineDialog ( options, map, routingMachine, polyline );
	}
	
	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = polylineDialog;
	}
} ) ( );

/* --- End of L.Routing.Extensions.Dialogs.js file --- */
},{}],11:[function(require,module,exports){
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
+----------------------------------------------------------------------------------------------------------------------+
| This code is mainly coming from lrm-graphhopper by Per Liedman.                                                      |
| See https://github.com/perliedman/lrm-graphhopper                                                                    |
+----------------------------------------------------------------------------------------------------------------------+
*/

/*
--- L.Routing.Extensions.GraphHopperConverter.js file ---------------------------------------------------------------------------------------
This file contains:
	- 
	- 
Changes:
	- v1.0.1:
		- created
		
Doc not reviewed...
Tests to do...
------------------------------------------------------------------------------------------------------------------------
*/

(function() {
	'use strict';

	/*
	--- L.Routing.Extensions.GraphHopperConverter object ---------------------------------------------------------------
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.GraphHopperConverter = L.Class.extend ( {	

		/*
		--- initialize method --------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		initialize: function ( options ) {
			L.Util.setOptions( this, options );
		},
		
		/*
		--- createRoutes method ------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		createRoutes : function ( response, inputWaypoints, routeOptions ) {

			var routes = [];

			for ( var pathCounter = 0; pathCounter < response.paths.length; pathCounter ++ ) {
				var path = response.paths [ pathCounter ];
				var coordinates = this._decodePolyline ( path.points );
				var mappedWaypoints = this._mapWaypointIndices ( inputWaypoints, path.instructions, coordinates );

				routes.push (
					{
						name : '',
						coordinates : coordinates,
						instructions : this._convertInstructions(path.instructions),
						summary : {
							totalDistance: path.distance,
							totalTime: path.time / 1000,
							descend : ( path.descend ? path.descend : -1 ),
							ascend : ( path.ascend ? path.ascend : -1 )
						},
						inputWaypoints : inputWaypoints,
						waypoints : mappedWaypoints.waypoints, // added wwwouaiebe
						actualWaypoints : mappedWaypoints.waypoints,
						waypointIndices : mappedWaypoints.waypointIndices,
					}
				);
			}

			return routes;
		},
		
		/*
		--- _toWaypoints method ------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_toWaypoints : function ( inputWaypoints, responseWaypoints ) {

			var wayPoints = [ ];
		
			for ( var counter = 0; counter < responseWaypoints.length; counter ++ ) {
				wayPoints.push (
					{
						latLng: L.latLng ( responseWaypoints [ counter ] ),
						name: inputWaypoints [ counter ].name,
						options: inputWaypoints [ counter ].options
					}
				);
			}

			return wayPoints;
		},

		/*
		--- _decodePolyline method ---------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/
		_decodePolyline: function ( routeGeometry ) {

		var	polyline = require ( 'polyline' );
			
			var coordinates = polyline.decode ( routeGeometry, 5 );
			var result = new Array ( coordinates.length );

			for ( var coordCounter = 0; coordCounter < coordinates.length; coordCounter ++ ) {
				result [ coordCounter ] = L.latLng ( coordinates [ coordCounter ][ 0 ], coordinates [ coordCounter ][ 1 ]);
			}

			return result;
		},

		/*
		--- _convertInstructions method ----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_convertInstructions : function ( instructions ) {

			var signToType = {
					4: 'DestinationReached', 
					5: 'WaypointReached',
					6: 'Roundabout' 
				};
			var signToModifier = {
					'-3': 'SharpLeft', 
					'-2': 'Left', 
					'-1': 'SlightLeft', 
					0: 'Straight', 
					1: 'SlightRight', 
					2: 'Right', 
					3: 'SharpRight', 
				};
			var	result = [ ];

			for ( var instrCounter = 0; instructions && instrCounter < instructions.length; instrCounter ++) {
				var instruction = instructions [ instrCounter ];
				result.push (
					{
						modifier : signToModifier [ instruction.sign ],
						type : signToType [ instruction.sign ],
						text : instruction.text,
						distance : instruction.distance,
						time : instruction.time / 1000,
						index : instruction.interval[0],
						exit : instruction.exit_number
					}
				);
			}

			return result;
		},

		/*
		--- _mapWaypointIndices method -----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_mapWaypointIndices: function ( waypoints, instructions, coordinates ) {
			var tmpWaypoints = [ ];
			var wpIndices = [ ];
			var idx;

			wpIndices.push ( 0 );
			tmpWaypoints.push ( L.Routing.waypoint ( coordinates [ 0 ], waypoints [ 0 ].name ) );

			for ( var instrCounter = 0; instructions && instrCounter < instructions.length; instrCounter ++ ) {
				if ( instructions [ instrCounter ].sign === 5) { // WaypointReached
					idx = instructions [ instrCounter ].interval[0];
					wpIndices.push ( idx );
					tmpWaypoints.push (
						{
							latLng: coordinates[idx],
							name: waypoints[tmpWaypoints.length + 1].name
						}
					);
				}
			}

			wpIndices.push ( coordinates.length - 1 );
			tmpWaypoints.push ( 
				{
					latLng: coordinates[coordinates.length - 1],
					name: waypoints[waypoints.length - 1].name
				}
			);

			return {
				waypointIndices: wpIndices,
				waypoints: tmpWaypoints
			};
		}		
	} );
	
	/*
	--- L.Routing.extensions.graphHopperConverter function -----------------------------------------------------------------
	L.Routing.Extensions.MapzenRouteConverter factory function
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.graphHopperConverter = function ( options ) {
		return new L.Routing.Extensions.GraphHopperConverter ( options );
	};

	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.Extensions.graphHopperConverter;
	}
} ) ( );

/* --- End of L.Routing.Extensions.GraphHopperConverter.js file --- */
},{"polyline":9}],12:[function(require,module,exports){
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
+----------------------------------------------------------------------------------------------------------------------+
| This code is mainly coming from leaflet-routing-machine by Per Liedman.                                              |
| See https://github.com/perliedman/leaflet-routing-machine                                                            |
+----------------------------------------------------------------------------------------------------------------------+
*/

/*
--- L.Routing.Extensions.MapboxOsrmRouteConverter.js file --------------------------------------------------------------

This file contains:
	- 
	- 
Changes:
	- v1.0.1:
		- created
		
Doc not reviewed...
Tests to do...
------------------------------------------------------------------------------------------------------------------------
*/

(function() {
	'use strict';

	/*
	--- L.Routing.Extensions.MapboxOsrmRouteConverter object ---------------------------------------------------------------
	------------------------------------------------------------------------------------------------------------------------
	*/
	
	L.Routing.Extensions.MapboxOsrmRouteConverter = L.Class.extend ( {	

		/*
		--- initialize method --------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		initialize: function ( options ) {
			L.Util.setOptions( this, options );
		},

		/*
		--- createRoutes method ------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		createRoutes : function ( response, inputWaypoints, options ) {
			var routes = [];
			var route;
			for ( var counter = 0; counter < response.routes.length; counter++) {
				route = this._convertRoute ( response.routes [ counter ] );
				route.inputWaypoints = inputWaypoints;
				route.waypoints = this._toWaypoints ( inputWaypoints, response.waypoints );
				route.properties = { isSimplified: ! options || !options.geometryOnly || options.simplifyGeometry };
				routes.push ( route );
			}
			
			return routes;
		},
		
		/*
		--- _convertRoute method -----------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_convertRoute : function ( responseRoute ) {

			var	stepToText;
			if ( this.options.stepToText ) {
				stepToText = this.options.stepToText;
			} 
			else {
				var osrmTextInstructions = require('osrm-text-instructions');
				var textInstructions = osrmTextInstructions( 'v5', this.options.language );
				stepToText = textInstructions.compile.bind ( textInstructions );
			}
			
			var result = {
				name: '',
				coordinates: [ ],
				instructions: [ ],
				summary: {
					totalDistance: responseRoute.distance,
					totalTime: responseRoute.duration
				}
			};
			var	legNames = [ ];
			var	waypointIndices = [ ];
			var legsCount = responseRoute.legs.length;
			var hasSteps = responseRoute.legs [ 0 ].steps.length > 0;
			var	index = 0;
			
			for ( var legsCounter = 0; legsCounter < legsCount; legsCounter ++ ) {
				var leg = responseRoute.legs [ legsCounter ];
				legNames.push ( leg.summary && leg.summary.charAt ( 0 ).toUpperCase ( ) + leg.summary.substring ( 1 ) );

				for ( var stepsCounter = 0; stepsCounter < leg.steps.length; stepsCounter++) {
					var step = leg.steps [ stepsCounter ];
					var geometry = this._decodePolyline( step.geometry );
					result.coordinates.push.apply ( result.coordinates, geometry );
					var type = this._maneuverToInstructionType ( step.maneuver, legsCounter === legsCount - 1 );
					var modifier = this._maneuverToModifier ( step.maneuver );
					var stepText = stepToText ( step );

					if ( type ) {
						if ( ( legsCounter === 0 && step.maneuver.type === 'depart' ) || step.maneuver.type === 'arrive' ) {
							waypointIndices.push ( index );
						}

						result.instructions.push (
							{
								type : type,
								distance : step.distance,
								time : step.duration,
								road : step.name,
								direction : this._bearingToDirection ( step.maneuver.bearing_after ),
								exit : step.maneuver.exit,
								index : index,
								mode : step.mode,
								modifier : modifier,
								text : stepText
							}
						);
					}

					index += geometry.length;
				}

			}

			result.name = legNames.join ( ', ' );
			if ( ! hasSteps ) {
				result.coordinates = this._decodePolyline ( responseRoute.geometry );
			} 
			else {
				result.waypointIndices = waypointIndices;
			}

			return result;
		},

		/*
		--- _toWaypoints method ------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_toWaypoints : function ( inputWaypoints, responseWaypoints ) {
			
			var wayPoints = [];
			
			for ( var counter = 0; counter < responseWaypoints.length; counter ++ ) {
				wayPoints.push ( 
					L.Routing.waypoint ( 
						L.latLng ( responseWaypoints [ counter ].location [ 1 ], responseWaypoints [ counter].location [ 0 ] ),
						inputWaypoints [ counter ].name,
						inputWaypoints [ counter ].options
					)
				);
			}

			return wayPoints;
		},

		/*
		--- _decodePolyline method ---------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_decodePolyline : function ( routeGeometry ) {
			
			var	polyline = require('polyline');
	
			var coordinates = polyline.decode ( routeGeometry, this.options.polylinePrecision );
			var result = new Array ( coordinates.length );
			
			for ( var coordCounter = coordinates.length - 1; coordCounter >= 0; coordCounter -- ) {
				result [ coordCounter ] = L.latLng ( coordinates [ coordCounter ] );
			}

			return result;
		},

		/*
		--- _bearingToDirection method -----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_bearingToDirection : function ( bearing ) {
			var oct = Math.round ( bearing / 45 ) % 8;
			return [ 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW' ][ oct ];
		},
		
		/*
		--- _maneuverToInstructionType method ----------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_maneuverToInstructionType : function ( maneuver, lastLeg ) {
			switch ( maneuver.type ) {
				case 'new name':
					return 'Continue';
				case 'depart':
					return 'Head';
				case 'arrive':
					return lastLeg ? 'DestinationReached' : 'WaypointReached';
				case 'roundabout':
				case 'rotary':
					return 'Roundabout';
				case 'merge':
				case 'fork':
				case 'on ramp':
				case 'off ramp':
				case 'end of road':
					return this._camelCase(maneuver.type);
				// These are all reduced to the same instruction in the current model
				//case 'turn':
				//case 'ramp': // deprecated in v5.1
				default:
					return this._camelCase ( maneuver.modifier );
			}
		},
		
		/*
		--- _maneuverToModifier method -----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_maneuverToModifier : function(maneuver) {
			var modifier = maneuver.modifier;

			switch (maneuver.type) {
			case 'merge':
			case 'fork':
			case 'on ramp':
			case 'off ramp':
			case 'end of road':
				modifier = this._leftOrRight ( modifier );
			}

			return modifier && this._camelCase ( modifier );
		},

		/*
		--- _camelCase method --------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_camelCase: function ( text ) {
			var words = text.split(' ');
			var result = '';
			for (var wordsCounter = 0; wordsCounter < words.length; wordsCounter++) {
				result += words [ wordsCounter ].charAt ( 0 ).toUpperCase ( ) + words [ wordsCounter ].substring ( 1 );
			}

			return result;
		},

		/*
		--- _leftOrRight method ------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_leftOrRight: function ( d ) {
			return d.indexOf ( 'left' ) >= 0 ? 'Left' : 'Right';
		}		
	} );
	
	/*
	--- L.Routing.extensions.mapboxOsrmRouteConverter function -------------------------------------------------------------
	L.Routing.Extensions.MapboxOsrmRouteConverter factory function
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.mapboxOsrmRouteConverter = function ( options ) {
		return new L.Routing.Extensions.MapboxOsrmRouteConverter ( options );
	};

	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.Extensions.mapboxOsrmRouteConverter;
	}
} ) ( );

/* --- End of L.Routing.Extensions.MapboxOsrmRouteConverter.js file --- */
},{"osrm-text-instructions":2,"polyline":9}],13:[function(require,module,exports){
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
+----------------------------------------------------------------------------------------------------------------------+
| This code is mainly coming from lrm-mapzen by mapzen.                                                                |
| See https://github.com/mapzen/lrm-mapzen                                                                             |
+----------------------------------------------------------------------------------------------------------------------+
*/

/*
--- L.Routing.Extensions.MapzenFormatter.js file -----------------------------------------------------------------------

This file contains:
	- 
	- 
Changes:
	- v1.0.1:
		- created
		
Doc not reviewed...
Tests to do...
------------------------------------------------------------------------------------------------------------------------
*/
(function() {
	'use strict';

	L.Routing.Extensions.MapzenFormatter = L.Class.extend ( {

		options : {
			units: 'metric',
			unitNames: {
				meters: 'm',
				kilometers: 'km',
				yards: 'yd',
				miles: 'mi',
				hours: 'h',
				minutes: 'mín',
				seconds: 's'
			},
			language: 'en',			
			roundingSensitivity : 1,			
			distanceTemplate : '{value} {unit}',
			whiteSpace : ' ' // So we can use &nbsp; if needed...
		},

		/*
		--- initialize method --------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/
		
		initialize : function ( options ) {
			L.setOptions( this, options );
		},

		/*
		--- formatDistance method ----------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/
		
		formatDistance : function ( distance ) {

			//valhalla returns distance in km
			var data;
			if ( this.options.units === 'imperial' ) {
				distance = distance * 1000;
				distance = distance / 1.609344;
				if ( distance >= 1000 ) {
					data = {
						value: ( this._round ( distance ) / 1000 ),
						unit: this.options.unitNames.miles
					};
				} 
				else {
					data = {
						value: this._round ( distance / 1.760 ),
						unit: this.options.unitNames.yards
					};
				}
			} 
			else {
				data = {
					value: distance >= 1 ? distance : distance * 1000,
					unit: distance >= 1 ? this.options.unitNames.kilometers : this.options.unitNames.meters
				};
			}

			return L.Util.template ( this.options.distanceTemplate, data );
		},

		/*
		--- _round method ------------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/
		
		_round : function ( d ) {
			var pow10 = Math.pow ( 10, ( Math.floor ( d / this.options.roundingSensitivity ) + '' ).length - 1 ),
				r = Math.floor ( d / pow10 ),
				p = (r > 5) ? pow10 : pow10 / 2;

			return Math.round( d / p ) * p;
		},

		/*
		--- formatTime method --------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/
		
		formatTime: function ( time /* Number (seconds) */ ) {
			if ( time > 86400 ) {
				return Math.round( time / 3600) + 
					this.options.whiteSpace + 
					this.options.unitNames.hours;
			} 
			else if ( time > 3600 ) {
				return Math.floor ( time / 3600 ) + 
					this.options.whiteSpace + 
					this.options.unitNames.hours +
					this.options.whiteSpace + 
					Math.round ( ( time % 3600 ) / 60 ) +
					this.options.whiteSpace + 
					this.options.unitNames.minutes ;
			} 
			else if ( time > 300 ) {
				return Math.round ( time / 60 ) + 
					this.options.whiteSpace + 
					this.options.unitNames.minutes ;
			} 
			else if ( time > 60) {
				return Math.floor ( time / 60 ) + 
					this.options.whiteSpace + 
					this.options.unitNames.minutes +
					( time % 60 !== 0 ? this.options.whiteSpace + ( time % 60 ) + this.options.whiteSpace +  this.options.unitNames.seconds : '' );
			} 
			else {
				return time + 
					this.options.whiteSpace + 
					this.options.unitNames.seconds ;
			}
		},

		/*
		--- formatInstruction method -------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		formatInstruction: function ( instr, i ) {
		// Valhalla returns instructions itself.
			return instr.instruction;
		},

		/*
		--- getIconName method -------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		getIconName: function ( instr, i ) {
			// you can find all Valhalla's direction types at https://github.com/valhalla/odin/blob/master/proto/tripdirections.proto
			if ( instr.type < 30 )
			{
				return [
					'kNone', 'kStart', 'kStartRight', 'kStartLeft', 'kDestination', 'kDestinationRight', 'kDestinationLeft', 'kBecomes',
					'kContinue', 'kSlightRight', 'kRight', 'kSharpRight', 'kUturnRight', 'kUturnLeft', 'kSharpLeft', 'kLeft', 'kSlightLeft',
					'kRampStraight', 'kRampRight', 'kRampLeft', 'kExitRight', 'kExitLeft', 'kStayStraight',
					'kStayRight', 'kStayLeft', 'kMerge', 'kRoundaboutEnter', 'kRoundaboutExit', 'kFerryEnter', 'kFerryExit'
					] [ instr.type ];
			}
			else if ( instr.type < 37 ) {
				if ( instr.edited_travel_type ) {
					return 'kTransit' + this._getCapitalizedName ( instr.edited_travel_type );
				}
				else {
					return 'kTransit';
				}
			}
		},

		/*
		--- _getInstructionTemplate method -------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_getInstructionTemplate: function ( instr, i ) {
			return instr.instruction + " " + instr.length;
		},
		
		/*
		--- _getCapitalizedName method -----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_getCapitalizedName: function ( name ) {
			return name.charAt ( 0 ).toUpperCase ( ) + name.slice ( 1 );
		}
	});

	/*
	--- L.Routing.extensions.mapzenFormatter function ----------------------------------------------------------------------
	L.Routing.Extensions.MapboxOsrmRouteConverter factory function
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.mapzenFormatter = function ( options ) {
		return new L.Routing.Extensions.MapzenFormatter ( options );
	};

	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.Extensions.mapzenFormatter;
	}
})();

/* --- End of L.Routing.Extensions.MapzenFormatter.js file --- */
},{}],14:[function(require,module,exports){
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
+----------------------------------------------------------------------------------------------------------------------+
| This code is mainly coming from lrm-mapzen by mapzen.                                                                |
| See https://github.com/mapzen/lrm-mapzen                                                                             |
+----------------------------------------------------------------------------------------------------------------------+
*/

/*
--- L.Routing.Extensions.MapzenRouteConverter.js file ------------------------------------------------------------------
This file contains:
	- 
	- 
Changes:
	- v1.0.1:
		- created
		
Doc not reviewed...
Tests to do...
------------------------------------------------------------------------------------------------------------------------
*/

(function() {
	'use strict';

	var	polyline = require('polyline');

	/*
	--- L.Routing.Extensions.MapzenRouteConverter object ---------------------------------------------------------------
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.MapzenRouteConverter = L.Class.extend ( {	

		/*
		--- initialize method --------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		initialize: function ( options ) {
			L.Util.setOptions( this, options );
		},
		
		/*
		--- createRoutes method ------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		createRoutes : function ( response, inputWaypoints, routeOptions ) {

			var insts = [ ];
			var coordinates = [ ];
			var shapeIndex =  0;

			for ( var legsCounter = 0; legsCounter < response.trip.legs.length; legsCounter++ ) {
				var coord = polyline.decode ( response.trip.legs [ legsCounter ].shape, 6 );

				for ( var coordCounter = 0; coordCounter < coord.length; coordCounter++ ) {
					coordinates.push ( L.latLng ( coord [ coordCounter ][ 0 ], coord [ coordCounter ][ 1 ] ) );
				}

				for ( var maneuversCounter = 0; maneuversCounter < response.trip.legs [ legsCounter ].maneuvers.length; maneuversCounter++ ){
					var res = response.trip.legs [ legsCounter ].maneuvers [ maneuversCounter ];
					res.distance = response.trip.legs [ legsCounter ].maneuvers [ maneuversCounter ].length;
					res.index = shapeIndex + response.trip.legs [ legsCounter ].maneuvers [ maneuversCounter ].begin_shape_index;
					insts.push ( res );
				}

				if ( routeOptions.costing === 'multimodal' ) {
					insts = this._unifyTransitManeuver ( insts );
				}

				shapeIndex += response.trip.legs [ legsCounter ].maneuvers [ response.trip.legs [ legsCounter ].maneuvers.length-1 ].begin_shape_index;
			}

			var actualWaypoints = this._toWaypoints ( inputWaypoints, response.trip.locations );

			var subRoutes;
			if ( routeOptions.costing == 'multimodal' ) {
				subRoutes = this._getSubRoutes ( response.trip.legs );
			}

			var alts = [
				{
					name : '',
					unit : response.trip.units,
					costing : routeOptions.costing,
					coordinates : coordinates,
					subRoutes : subRoutes,
					instructions : insts,//response.route_instructions ? this._convertInstructions(response.route_instructions) : [],
					summary : response.trip.summary ? this._convertSummary ( response.trip.summary ) : [ ],
					inputWaypoints: inputWaypoints,
					waypoints: actualWaypoints,
					waypointIndices: this._clampIndices ( [ 0, response.trip.legs [ 0 ].maneuvers.length ], coordinates )
				}
			];

			return alts;
		},
		
		/*
		--- _unifyTransitManeuver method ---------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_unifyTransitManeuver: function ( insts ) {

			var transitType;
			var newInsts = insts;

			for ( var i = 0; i < newInsts.length; i ++ ) {
				if ( newInsts [ i ].type == 30) {
				  transitType = newInsts [ i ].travel_type;
				  break;
				}
			}

			for ( var j = 0; j < newInsts.length; j ++) {
				if ( newInsts [ j ].type > 29 ) {
					newInsts [ j ].edited_travel_type = transitType;
				}
			}

			return newInsts;
		},
		
		/*
		--- _toWaypoints method ------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_toWaypoints: function ( inputWaypoints, responseWaypoints ) {
		
			var wayPoints = [ ];
			for ( var counter = 0; counter < responseWaypoints.length; counter ++) {
				wayPoints.push (
					L.Routing.waypoint (
						L.latLng ( [ responseWaypoints [ counter ].lat, responseWaypoints [ counter ].lon ] ),
						inputWaypoints [ counter ].name,
						inputWaypoints [ counter ].options
					)
				);
			}

			return wayPoints;
		},
		
		/*
		--- _getSubRoutes method -----------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_getSubRoutes: function(legs) {

			var subRoute = [];

			for ( var i = 0; i < legs.length; i ++ ) {
				var coords = polyline.decode(legs[i].shape, 6);

				var lastTravelType;
				var transitIndices = [ ];
				for( var j = 0; j < legs [ i ].maneuvers.length; j ++ ) {
					var res = legs [ i ].maneuvers [ j ];
					var travelType = res.travel_type;

					if ( travelType !== lastTravelType || res.type === 31 /*this is for transfer*/) {
						//transit_info only exists in the transit maneuvers
						//loop thru maneuvers and populate indices array with begin shape index
						//also populate subRoute array to contain the travel type & color associated with the transit polyline sub-section
						//otherwise just populate with travel type and use fallback style
						if(res.begin_shape_index > 0) {
							transitIndices.push(res.begin_shape_index);
						}
						if( res.transit_info ) {
							subRoute.push (
								{ 
									travel_type: travelType, 
									styles: this._getPolylineColor ( res.transit_info.color )
								}
							);
						}
						else {
							subRoute.push ( 
								{
									travel_type: travelType
								}
							);
						}
					}

					lastTravelType = travelType;
				}

				//add coords length to indices array
				transitIndices.push ( coords.length );

				//logic to create the subsets of the polyline by indexing into the shape
				var index_marker = 0;
				for ( var index = 0; index < transitIndices.length; index ++ ) {
					var subRouteArr = [ ];
					var overwrapping = 0;
					//if index != the last indice, we want to overwrap (or add 1) so that routes connect
					if ( index !== transitIndices.length-1 ) {
						overwrapping = 1;
					}
					for ( var ti = index_marker; ti < transitIndices [ index ] + overwrapping; ti ++ ) {
						subRouteArr.push ( coords [ ti ] );
					}

					var temp_array = subRouteArr;
					index_marker = transitIndices [ index ];
					subRoute[index].coordinates = temp_array;
				}
			}
			return subRoute;
		},		
		
		/*
		--- _trimLocationKey method --------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_trimLocationKey: function ( location ) {
			return ( Math.floor ( location.lat * 1000 ) / 1000 ) + ' , ' + (  Math.floor ( location.lng * 1000 ) / 1000 );
		},
		
		/*
		--- _convertSummary method ---------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_convertSummary: function(route) {
			return {
				totalDistance: route.length,
				totalTime: route.time
			};
		},
		
		/*
		--- _getPolylineColor method -------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

	   _getPolylineColor: function(intColor) {

			// isolate red, green, and blue components
			var red = (intColor >> 16) & 0xff;
			var green = (intColor >> 8) & 0xff;
			var blue = (intColor >> 0) & 0xff;

			// calculate luminance in YUV colorspace based on
			// https://en.wikipedia.org/wiki/YUV#Conversion_to.2Ffrom_RGB
			var lum = 0.299 * red + 0.587 * green + 0.114 * blue;
			var is_light = (lum > 0xbb);

			// generate a CSS color string like 'RRGGBB'
			var paddedHex = 0x1000000 | ( intColor & 0xffffff );
			var lineColor = paddedHex.toString ( 16 ).substring ( 1, 7 );

			var polylineColor = [
				// Color of outline depending on luminance against background.
				( is_light ? { color: '#000', opacity: 0.4, weight: 10 } : { color: '#fff', opacity: 0.8, weight: 10 } ),
				// Color of the polyline subset.
				{ color: '#' + lineColor.toUpperCase ( ), opacity: 1, weight: 6 }
			];

			return polylineColor;
	   },
	   
		/*
		--- _clampIndices method -----------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_clampIndices: function ( indices, coords ) {
			
			var maxCoordIndex = coords.length - 1;
			
			for ( var i = 0; i < indices.length; i ++ ) {
				indices [ i ] = Math.min ( maxCoordIndex, Math.max ( indices [ i ], 0 ) );
			}
		}
	} );
	
	/*
	--- L.Routing.extensions.mapzenRouteConverter function -----------------------------------------------------------------
	L.Routing.Extensions.MapzenRouteConverter factory function
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.mapzenRouteConverter = function ( options ) {
		return new L.Routing.Extensions.MapzenRouteConverter ( options );
	};

	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.Extensions.mapzenRouteConverter;
	}
} ) ( );

/* --- End of L.Routing.Extensions.MapzenRouteConverter.js file --- */
},{"polyline":9}],15:[function(require,module,exports){
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
--- L.Routing.Extensions.PolylineMenu.js file --------------------------------------------------------------------------------
This file contains:
	- 
	- 
Changes:
	- v1.0.1:
		- created
		
Doc not reviewed...
Tests to do...
------------------------------------------------------------------------------------------------------------------------
*/

(function() {
	'use strict';

	
	/*
	--- L.Routing.Extensions.PolylineMenu function -------------------------------------------------------------------------
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.PolylineMenu = function ( mouseEvent, map, routingMachine ) {	

		L.DomEvent.stopPropagation ( mouseEvent ); 

		// menu creation		
		var mainDiv = L.DomUtil.create ( 'div', 'PolylineMenu-MainDiv' );

		// Edition button
		var editPolylineButton = L.DomUtil.create ( 'button', 'PolylineMenu-EditPolylineButton', mainDiv );
		editPolylineButton.setAttribute ( 'type' , 'button' );
		editPolylineButton.innerHTML = 'Edit';

		var editDialog;
		if ( typeof module !== 'undefined' && module.exports ) {
			editDialog = require ('./L.Routing.Extensions.Dialogs' );
		}

		L.DomEvent.on ( 
			editPolylineButton, 
			'click', 
			function ( ) 
			{ 
				map.closePopup(); 
				var LineOptions = { 
					color : mouseEvent.target.options.color,
					width : mouseEvent.target.options.weight,
					name : mouseEvent.target.LrmExtensionsName
				};
				if ( typeof module !== 'undefined' && module.exports ) {
					LineOptions = require ('./L.Routing.Extensions.Dialogs' )( LineOptions, map, null, mouseEvent.target );
				}
			}
		);

		// Delete button
		var deletePolylineButton = L.DomUtil.create ( 'button', 'PolylineMenu-DeletePolylineButton', mainDiv );
		deletePolylineButton.setAttribute ( 'type' , 'button' );
		deletePolylineButton.innerHTML = 'Delete';
		L.DomEvent.on ( 
			deletePolylineButton, 
			'click', 
			function ( ) 
			{ 
				map.closePopup ( ); 
				//mouseEvent.target.remove ( );
				routingMachine.getRoutePolylines ( ).removeLayer ( mouseEvent.target );
			} 
		);

		// Cancel button
		var cancelPolylineButton = L.DomUtil.create( 'button', 'PolylineMenu-CancelPolylineButton', mainDiv );
		cancelPolylineButton.setAttribute( 'type' , 'button' );
		cancelPolylineButton.innerHTML = 'Cancel';	
		cancelPolylineButton.id = 'CancelPolylineButton';
		
		L.DomEvent.on ( 
			cancelPolylineButton, 
			'click', function ( )
			{ 
				map.closePopup ( ); 
			} 
		);

		// The dialog is displayed
		L.popup (
			{
				keepInView : true,
				closeButton : false,
				maxWidth : 300,
				className : 'PolylineMenu'
			}
		).setContent ( mainDiv ).setLatLng( mouseEvent.latlng ).openOn( map );
		document.getElementById ( 'CancelPolylineButton' ).focus ( );
	};
	
	/*
	--- L.Routing.Extensions.polylineMenu function ----------------------------------------------------------------------------------------------
	L.Routing.Extensions.PolylineMenu factory function
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.polylineMenu = function ( mouseEvent, map, routingMachine ) {	
		return new L.Routing.Extensions.PolylineMenu ( mouseEvent, map, routingMachine );
	};
	
	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.Extensions.PolylineMenu;
	}
} ) ( );

/* --- End of L.Routing.Extensions.PolylineMenu.js file --- */
},{"./L.Routing.Extensions.Dialogs":10}],16:[function(require,module,exports){
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
+----------------------------------------------------------------------------------------------------------------------+
| This code is partialy coming from:                                                                                   |
| - leaflet-routing-machine by Per Liedman. See https://github.com/perliedman/leaflet-routing-machine                  |
| - lrm-graphhopper by Per Liedman. See https://github.com/perliedman/lrm-graphhopper                                  |
| - lrm-mapzen by mapzen. See https://github.com/mapzen/lrm-mapzen                                                     |
+----------------------------------------------------------------------------------------------------------------------+
*/

/*
--- L.Routing.Extensions.Router.js file --------------------------------------------------------------------------------
This file contains:
	- 
	- 
Changes:
	- v1.0.1:
		- created
		
Doc not reviewed...
Tests to do...
------------------------------------------------------------------------------------------------------------------------
*/

(function() {
	'use strict';

	/*
	--- L.Routing.Extensions.Router object ---------------------------------------------------------------------------------
	------------------------------------------------------------------------------------------------------------------------
	*/
	
	L.Routing.Extensions.Router = L.Class.extend ( {	
	
		options: {
			serviceUrl: 'https://router.project-osrm.org/route/v1',
			profile: 'driving',
			timeout: 30 * 1000,
			routingOptions: {
				alternatives: true,
				steps: true
			},
			polylinePrecision: 5,
			useHints: true,
			suppressDemoServerWarning: false,
			language: 'en'
		},
		
		transitMode : 'car',

		/*
		--- initialize method --------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		initialize: function ( routerOptions ) {
			L.Util.setOptions( this, routerOptions );
			this._hints = {
				locations: {}
			};

			if ( ! this.options.suppressDemoServerWarning && this.options.serviceUrl.indexOf('//router.project-osrm.org') >= 0 && 'osrm' === this.options.provider ) {
				console.log ('You are using OSRM\'s demo server. ' +
					'Please note that it is **NOT SUITABLE FOR PRODUCTION USE**.\n' +
					'Refer to the demo server\'s usage policy: ' +
					'https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy\n\n' +
					'To change, set the serviceUrl option.\n\n' +
					'Please do not report issues with this server to neither ' +
					'Leaflet Routing Machine or OSRM or lrm-extensions - it\'s for\n' +
					'demo only, and will sometimes not be available, or work in ' +
					'unexpected ways.\n\n' +
					'Please set up your own OSRM server, or use a paid service ' +
					'provider for production.');
			}
		},

		/*
		--- route method -------------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		route: function ( waypoints, callback, context, options ) {

			options = L.extend ( { }, this.options.routingOptions, options );
			
			var url = this.buildRouteUrl ( waypoints, options );
			
			var timedOut = false;
			var	timer;

			timer = setTimeout ( 
				function ( ) {
					timedOut = true;
					callback.call ( context || callback, {
						status: -1,
						message: this.options.provider + ' request timed out.'
					} );
				}, 
				this.options.timeout
			);

			// Create a copy of the waypoints, since they
			// might otherwise be asynchronously modified while
			// the request is being processed.
			var	tmpWaypoints = [];
			var	tmpWaypoint;
			for ( var counter = 0; counter < waypoints.length; counter++ ) {
				tmpWaypoint = waypoints [ counter ];
				tmpWaypoints.push ( new L.Routing.Waypoint ( tmpWaypoint.latLng, tmpWaypoint.name, tmpWaypoint.options ) );
			}

			var corslite = require('corslite');

			var xhr = corslite ( 
				url, 
				L.bind (
					function ( err, resp ) {
						var data;
						var error = { };

						clearTimeout ( timer );

						if ( ! timedOut ) {
							if ( ! err ) {
								try {
									data = JSON.parse ( resp.responseText );
									try {
										return this._routeDone( data, tmpWaypoints, options, callback, context );
									} 
									catch ( ex ) {
										error.status = -3;
										error.message = ex.toString ( );
									}
								} 
								catch ( ex ) {
									error.status = -2;
									error.message = 'Error parsing ' + this.options.provider + ' response: ' + ex.toString ( );
								}
							}
							else {
								error.message = 'HTTP request failed: ' + 
									err.type +
									(err.target && err.target.status ? ' HTTP ' + err.target.status + ': ' + err.target.statusText : '');
								error.url = url;
								error.status = -1;
								error.target = err;
							}

							callback.call ( context || callback, error );
						} 
						else {
							xhr.abort();
						}
					}, 
					this 
				)
			);
			return xhr;
		},

		/*
		--- _routeDoneMapboxOsrm method ----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_routeDoneMapboxOsrm : function ( response, inputWaypoints, options, callback, context ) {

			context = context || callback;
			if ( response.code !== 'Ok' ) {
				callback.call ( 
					context, 
					{
						status: response.code
					}
				);
				return;
			}

			var mapboxOsrmRouteConverter = require ( './L.Routing.Extensions.MapboxOsrmRouteConverter' ) ( this.options ) ;
			var routes = mapboxOsrmRouteConverter.createRoutes ( response, inputWaypoints, options );

			// this._saveHintData( response.waypoints, inputWaypoints );

			callback.call ( context, null, routes );
		},
		
		/*
		--- _routeDoneGraphHopper method ----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_routeDoneGraphHopper : function ( response, inputWaypoints, options, callback, context ) {


			context = context || callback;
			if ( response.info.errors && 0 < response.info.errors.length ) {
				callback.call(
					context,
					{
						// TODO: include all errors
						status : response.info.errors[0].details,
						message : response.info.errors[0].message
					}
				);
				return;
			}

			var graphHopperRouteConverter = require ( './L.Routing.Extensions.GraphHopperRouteConverter' ) ( this.options ) ;
			var routes = graphHopperRouteConverter.createRoutes ( response, inputWaypoints, options );

			callback.call( context, null, routes );
		},

		/*
		--- _routeDoneMapzen method --------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_routeDoneMapzen: function(response, inputWaypoints, options, callback, context) {

			context = context || callback;
			if ( response.trip.status !== 0 ) {
				callback.call (
					context, 
					{
						status: response.status,
						message: response.status_message
					}
				);
				return;
			}
			
			var mapzenRouteConverter = require ( './L.Routing.Extensions.MapzenRouteConverter' ) ( this.options ) ;
			var routes = mapzenRouteConverter.createRoutes ( response, inputWaypoints, options );

			callback.call ( context, null, routes );
		},

		/*
		--- _routeDone method --------------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_routeDone : function ( response, inputWaypoints, options, callback, context )	 {
			switch ( this.options.provider ) {
				case 'graphhopper':
					return this._routeDoneGraphHopper ( response, inputWaypoints, options, callback, context );
				case 'mapbox':
					return this._routeDoneMapboxOsrm ( response, inputWaypoints, options, callback, context );
				case 'mapzen':
					return this._routeDoneMapzen ( response, inputWaypoints, options, callback, context );
				case 'osrm':
					return this._routeDoneMapboxOsrm ( response, inputWaypoints, options, callback, context );
				default:
					break;
			}
		},
		
		/*
		--- _buildRouteUrlGraphHopper method -----------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_buildRouteUrlGraphHopper : function ( waypoints, options) {
			
			var vehicle;
			switch ( this.options.transitMode ) {
				case 'bike':
				{
					vehicle = 'bike';
					break;
				}
				case 'pedestrian':
				{
					vehicle = 'foot';
					break;
				}
				case 'car':
				{
					vehicle = 'car';
					break;
				}
			}
			
			var	locations = [];

			for ( var counter = 0; counter < waypoints.length; counter++ ) {
				locations.push ( 'point=' + waypoints [ counter ].latLng.lat + ',' + waypoints [ counter ].latLng.lng );
			}

			return 'https://graphhopper.com/api/1/route' + 
				'?' +
				locations.join('&') +
				'&instructions=true&type=json&key=' + 
				this.options.providerKeys.GraphHopper +
				'&locale=' +
				this.options.language +
				'&vehicle=' +
				vehicle;
		},
		
		/*
		--- _buildRouteUrlMapboxOsrm method ------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_buildRouteUrlMapboxOsrm: function( waypoints, options ) {
			var profile;
			var serviceUrl;
			var useHints;
			if ( 'osrm' === this.options.provider ) {
				serviceUrl = 'https://router.project-osrm.org/route/v1';
				profile = 'driving';
				useHints = true;
			}
			else if ( 'mapbox' === this.options.provider ) {
				serviceUrl = 'https://api.mapbox.com/directions/v5';
				useHints = false;
				switch ( this.options.transitMode ) {
					case 'bike':
					{
						profile = 'mapbox/cycling';
						break;
					}
					case 'pedestrian':
					{
						profile = 'mapbox/walking';
						break;
					}
					case 'car':
					{
						profile = 'mapbox/driving';
						break;
					}
				}
			}
			
			var locations = [];
			var hints = [];
			var	waypoint;
			var latLng;

			for ( var counter = 0; counter < waypoints.length; counter ++ ) {
				waypoint = waypoints [ counter ];
				latLng = waypoint.latLng;
				locations.push ( latLng.lng + ',' + latLng.lat );
				hints.push ( this._hints.locations [ latLng.lat + ',' + latLng.lng ] || '' );
			}

			return serviceUrl + 
				'/' + 
				profile + 
				'/' +
				locations.join(';') + 
				'?' +
				( options.geometryOnly ? ( options.simplifyGeometry ? '' : 'overview=full' ) : 'overview=false' ) +
				'&alternatives=true' + 
				'&steps=true' + 
				( useHints ? '&hints=' + hints.join(';') : '' ) +
				( options.allowUTurns ? '&continue_straight=' + !options.allowUTurns : '') +
				( 'mapbox' === this.options.provider ? '&access_token=' + this.options.providerKeys.Mapbox : '' );
		},
		
		/*
		--- _buildRouteUrlMapzen method ----------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		_buildRouteUrlMapzen : function ( waypoints, options ) {
			var costing;
			var costingOptions;
			switch ( this.options.transitMode ) {
				case 'bike':
				{
					costing = "bicycle";
					costingOptions = { bicycle: { bicycle_type: "Mountain", cycling_speed: "20.0", use_roads: "0", use_hills: "1" } };
					break;
				}
				case 'pedestrian':
				{
					costing = "pedestrian";
					costingOptions = { pedestrian: { walking_speed: "4.0" } };
					break;
				}
				case 'car':
				{
					costing = "auto";
					costingOptions = { auto: { country_crossing_cost : "60" } };
					break;
				}
			}
			
			var locations = [];
			for (var counter = 0; counter < waypoints.length; counter ++ ) {
				var locationType =  ( ( 0 === counter ) || ( waypoints.length - 1 === counter ) ) ? "break" : "through";
				locations.push (
					{ 
						lat: waypoints [ counter ].latLng.lat ,
						lon : waypoints [ counter ].latLng.lng , 
						type : locationType
					}
				);
			}
			
			var locationsString = JSON.stringify ( {
				locations: locations,
				costing: costing,
				costing_options: costingOptions,
				directions_options: { language: this.options.language }
			});
			
			return 'https://valhalla.mapzen.com/route?json=' +
				locationsString + 
				'&api_key=' + 
				this.options.providerKeys.Mapzen;
		},
		
		/*
		--- buildRouteUrl method -----------------------------------------------------------------------------------------------
		------------------------------------------------------------------------------------------------------------------------
		*/

		buildRouteUrl : function ( waypoints, options )	 {
			switch ( this.options.provider ) {
				case 'graphhopper':
					return this._buildRouteUrlGraphHopper ( waypoints, options );
				case 'mapbox':
					return this._buildRouteUrlMapboxOsrm ( waypoints, options );
				case 'mapzen':
					return this._buildRouteUrlMapzen ( waypoints, options );
				case 'osrm':
					return this._buildRouteUrlMapboxOsrm ( waypoints, options );
				default:
					break;
			}
		}
	});
	
	/*
	--- L.Routing.extensions function --------------------------------------------------------------------------------------
	L.Routing.Extensions factory function
	------------------------------------------------------------------------------------------------------------------------
	*/

	L.Routing.Extensions.router = function ( options ) {
		return new L.Routing.Extensions.Router ( options );
	};

	/*
	--- Exports ------------------------------------------------------------------------------------------------------------
	*/

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = L.Routing.Extensions.router;
	}
} ) ( );

/* --- End of L.Routing.Extensions.Router.js file --- */
},{"./L.Routing.Extensions.GraphHopperRouteConverter":11,"./L.Routing.Extensions.MapboxOsrmRouteConverter":12,"./L.Routing.Extensions.MapzenRouteConverter":14,"corslite":1}],17:[function(require,module,exports){
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
			var gpxFile = null;

			try {
				var gpxData = new File ( [ this.getGpxString ( ) ], { type: 'application/xml' } );
				if ( gpxFile !== null ) {
					window.URL.revokeObjectURL ( gpxFile );
				}
				gpxFile = window.URL.createObjectURL ( gpxData );
			}
			catch ( Error ) {
			}
			
			if ( gpxFile ) {
				document.getElementById( 'downloadGpx').href = gpxFile;
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
},{"./L.Routing.Extensions.Dialogs":10,"./L.Routing.Extensions.MapzenFormatter":13,"./L.Routing.Extensions.PolylineMenu":15,"./L.Routing.Extensions.Router":16}]},{},[17]);
