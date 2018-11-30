requirejs([
        // '../node_modules/worldwindjs/build/dist/worldwind.min.js',
        // './LayerManager',
        '../src/util/WWMath',
        '../src/geom/Angle',
        '../src/geom/Location',
        '../config/mainconf'],
    function (
        // WorldWind,
        // LayerManager,
        WWMath,
        Angle,
        Location
    ) {

        $(document).ready(function () {
            "use strict";
            const BING_API_KEY = "";
            if (BING_API_KEY) {
                // Initialize WorldWind properties before creating the first WorldWindow
                WorldWind.BingMapsKey = BING_API_KEY;
            } else {
                console.error("app.js: A Bing API key is required to use the Bing maps in production. Get your API key at https://www.bingmapsportal.com/");
            }


            var placemark = [];
            var autoSuggestion = [];
            var suggestedLayer;
            var clickedLayer;
            var valueColor;

            var mainconfig = config;
            console.log(mainconfig);

            class Globe {
                constructor(canvasId) {
                    // Create a WorldWindow globe on the specified HTML5 canvas
                    this.wwd = new WorldWind.WorldWindow(canvasId);

                    // Holds the next unique id to be assigned to a layer
                    this.nextLayerId = 1;

                    // Holds a map of category and observable timestamp pairs
                    this.categoryTimestamps = new Map();


                    // Add a BMNGOneImageLayer background layer. We're overriding the default
                    // minimum altitude of the BMNGOneImageLayer so this layer always available.
                    this.addLayer(new WorldWind.BMNGOneImageLayer(), {
                        category: "background",
                        minActiveAltitude: 0
                    });

                }

                getCategoryTimestamp(category) {
                    if (!this.categoryTimestamps.has(category)) {
                        this.categoryTimestamps.set(category, ko.observable());
                    }
                    return this.categoryTimestamps.get(category);
                }

                updateCategoryTimestamp(category) {
                    let timestamp = this.getCategoryTimestamp(category);
                    timestamp(new Date());
                }

                toggleLayer(layer) {

                    // Multiplicity Rule: only [0..1] "base" layers can be enabled at a time
                    if (layer.category === 'base') {
                        this.wwd.layers.forEach(function (item) {
                            if (item.category === 'base' && item !== layer) {
                                item.enabled = false;
                            }
                        });
                    }
                    // Toggle the selected layer's visibility
                    layer.enabled = !layer.enabled;
                    // Trigger a redraw so the globe shows the new layer state ASAP
                    this.wwd.redraw();

                    // Signal a change in the category
                    this.updateCategoryTimestamp(layer.category);
                }

                addLayer(layer, options) {
                    // Copy all properties defined on the options object to the layer
                    if (options) {
                        for (let prop in options) {
                            if (!options.hasOwnProperty(prop)) {
                                continue; // skip inherited props
                            }
                            layer[prop] = options[prop];
                        }
                    }
                    // Assign a default category property if not already assigned
                    if (typeof layer.category === 'undefined') {
                        layer.category = 'overlay'; // the default category
                    }

                    // Assign a unique layer ID to ease layer management
                    layer.uniqueId = this.nextLayerId++;

                    // Add the layer to the globe
                    this.wwd.addLayer(layer);

                    // Signal that this layer category has changed
                    this.getCategoryTimestamp(layer.category);
                }

                getLayers(category) {
                    return this.wwd.layers.filter(layer => layer.category === category);
                }
            }

            function LayersViewModel(globe) {
                var self = this;
                self.baseLayers = ko.observableArray(globe.getLayers('base').reverse());
                self.overlayLayers = ko.observableArray(globe.getLayers('overlay').reverse());

                // Update the view model whenever the model changes
                globe.getCategoryTimestamp('base').subscribe(newValue =>
                    self.loadLayers(globe.getLayers('base'), self.baseLayers));

                globe.getCategoryTimestamp('overlay').subscribe(newValue =>
                    self.loadLayers(globe.getLayers('overlay'), self.overlayLayers));

                // Utility to load the layers in reverse order to show last rendered on top
                self.loadLayers = function (layers, observableArray) {
                    observableArray.removeAll();
                    layers.reverse().forEach(layer => observableArray.push(layer));
                };

                // Click event handler for the layer panel's buttons
                self.toggleLayer = function (layer) {
                    globe.toggleLayer(layer);
                };
            }

            function SettingsViewModel(globe) {
                var self = this;
                self.settingLayers = ko.observableArray(globe.getLayers('setting').reverse());

                // Update the view model whenever the model changes
                globe.getCategoryTimestamp('setting').subscribe(newValue =>
                    self.loadLayers(globe.getLayers('setting'), self.settingLayers));

                // Utility to load layers in reverse order
                self.loadLayers = function (layers, observableArray) {
                    observableArray.removeAll();
                    layers.reverse().forEach(layer => observableArray.push(layer));
                };

                // Click event handler for the setting panel's buttons
                self.toggleLayer = function (layer) {
                    globe.toggleLayer(layer);
                };
            }

            // Create a globe
            let globe = new Globe("globe-canvas");
            // Add layers to the globe
            // Add layers ordered by drawing order: first to last
            globe.addLayer(new WorldWind.BMNGLayer(), {
                category: "base"
            });
            globe.addLayer(new WorldWind.BMNGLandsatLayer(), {
                category: "base",
                enabled: false
            });
            globe.addLayer(new WorldWind.BingAerialLayer(), {
                category: "base",
                enabled: false
            });
            globe.addLayer(new WorldWind.BingAerialWithLabelsLayer(), {
                category: "base",
                enabled: false,
                detailControl: 1.5
            });
            globe.addLayer(new WorldWind.BingRoadsLayer(), {
                category: "overlay",
                enabled: false,
                detailControl: 1.5,
                opacity: 0.75
            });
            globe.addLayer(new WorldWind.CoordinatesDisplayLayer(globe.wwd), {
                category: "setting"
            });
            globe.addLayer(new WorldWind.ViewControlsLayer(globe.wwd), {
                category: "setting"
            });
            globe.addLayer(new WorldWind.CompassLayer(), {
                category: "setting",
                enabled: false
            });
            globe.addLayer(new WorldWind.StarFieldLayer(), {
                category: "setting",
                enabled: false,
                displayName: "Stars"
            });
            globe.addLayer(new WorldWind.AtmosphereLayer(), {
                category: "setting",
                enabled: false,
                time: null // or new Date()
            });


            // Create the view models
            let layers = new LayersViewModel(globe);
            let settings = new SettingsViewModel(globe);

            // Bind the views to the view models
            ko.applyBindings(layers, document.getElementById('layers'));
            ko.applyBindings(settings, document.getElementById('settings'));

            // Auto-collapse the main menu when its button items are clicked
            $('.navbar-collapse a[role="button"]').click(function () {
                $('.navbar-collapse').collapse('hide');
            });

            // Collapse card ancestors when the close icon is clicked
            $('.collapse .close').on('click', function () {
                $(this).closest('.collapse').collapse('hide');
            });

            function hue2rgb(p, q, t) {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            }

            function hslToRgb(h, s, l) {
                var r, g, b;

                if (s === 0) {
                    r = g = b = l; // achromatic
                } else {

                    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    var p = 2 * l - q;
                    r = hue2rgb(p, q, h + 1 / 3);
                    g = hue2rgb(p, q, h);
                    b = hue2rgb(p, q, h - 1 / 3);
                }

                return 'rgb(' + [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), 0.8] + ')';
            }

            function percentageToHsl(value) {
                var hue = (value * (5 - 215)) + 215;
                var hueF = hue / 360;
                return hslToRgb(hueF, 0.8, 0.5);
            }


            $("#switchMethod").on('click', function () {
                var switchLayer = $($("#switchLayer")[0].parentElement);
                switchLayer.css('pointer-events', (this.checked === true) ? 'none' : 'auto');
                $("#manualSwitch").css('display', (this.checked === true) ? 'none' : 'block');
            });

            $("#switchLayer").on("click", function () {
                document.getElementById("placemarkButton").style.pointerEvents = (this.checked === true) ? "auto" : "none";

                globe.wwd.layers[globe.wwd.layers.length - 1].enabled = !this.checked;

                if (this.checked) {
                    $("#placemarkButton").find("input").each(function () {
                        if ($(this).is(':checked')) {
                            var id = "#" + $(this)[0].id;

                            $(id).click();
                        }
                    })
                } else {
                    for (var i = 0; i < placemark.length; i++) {
                        var circle = document.createElement("canvas"),
                            ctx = circle.getContext('2d'),
                            radius = 15,
                            r2 = radius + radius;

                        circle.width = circle.height = r2;

                        var gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);

                        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');

                        ctx.beginPath();
                        ctx.arc(radius, radius, radius, 0, Math.PI * 2, true);

                        ctx.fillStyle = gradient;
                        ctx.fill();

                        ctx.closePath();

                        placemark[i].updateImage = true;
                        placemark[i].attributes.imageSource.image = circle;
                    }
                }
            });

            $("#none, #p_year_color, #p_avgcap_color, #t_ttlh_color").on("click", function () {
                var category = this.id;
                var minColor;
                var maxColor;

                // console.log(category);
                var color = {
                    "grey": "rgba(192, 192, 192, 0.5)",
                    "blue": "rgba(0, 0, 255, 0.5)",
                    "green": "rgba(0, 255, 0, 0.5)",
                    "yellow": "rgba(255, 255, 0, 0.5)",
                    "orange": "rgba(255, 127.5, 0, 0.5)",
                    "red": "rgba(255, 0, 0, 0.5)",
                    'undefined': "rgba(255, 255, 255, 1)"
                };

                var scale = {
                    "none": ["", ""],
                    "p_year_color": ["1980", "2017"],
                    "p_avgcap_color": ["<1MW", ">3 MW"],
                    "t_ttlh_color": ["5m", "185m"],
                };

                var ymi, yma, cmi, cma, hmi, hma;

                $.ajax({
                    url: '/gradientValue',
                    type: 'GET',
                    dataType: 'json',
                    async: false,
                    success: function (resp) {
                        var left = $("#leftScale");
                        var right = $("#rightScale");
                        ymi = resp.data[0].yearMin;
                        yma = resp.data[0].yearMax;
                        cmi = resp.data[0].capMin;
                        cma = resp.data[0].capMax;
                        hmi = resp.data[0].heightMin;
                        hma = resp.data[0].heightMax;
                        if (category === "p_year_color") {
                            left.html(resp.data[0].yearMin);
                            right.html(resp.data[0].yearMax);

                            minColor = ymi;
                            maxColor = yma;

                        } else if (category === "p_avgcap_color") {
                            left.html("<" + resp.data[0].capMin + "MW");
                            right.html(">" + resp.data[0].capMax + "MW");
                            minColor = cmi;
                            maxColor = cma;
                        } else if (category === "t_ttlh_color") {
                            left.html(resp.data[0].heightMin + "m");
                            right.html(resp.data[0].heightMax + "m");
                            minColor = hmi;
                            maxColor = hma;
                        } else {
                            left.html(scale[category][0]);
                            right.html(scale[category][1]);
                            minColor = 0;
                            maxColor = 0;
                        }

                    }
                });

                for (var i = 0; i < placemark.length; i++) {
                    var circle = document.createElement("canvas"),
                        ctx = circle.getContext('2d'),
                        radius = 10,
                        r2 = radius + radius;

                    circle.width = circle.height = r2;

                    valueColor = placemark[i].userProperties[category];

                    var result = (valueColor - minColor) / (maxColor - minColor) * (255 - 5) + 5;

                    var resultF = result / 255;

                    var gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);

                    if (valueColor < minColor || valueColor > maxColor || (minColor === 0 && maxColor === 0)) {
                        gradient.addColorStop(0, 'rgb(255, 255, 255)');
                    } else {
                        gradient.addColorStop(0, percentageToHsl(resultF));
                    }


                    ctx.beginPath();
                    ctx.arc(radius, radius, radius, 0, Math.PI * 2, true);

                    ctx.fillStyle = gradient;
                    ctx.fill();
                    // ctx.strokeStyle = "rgb(255, 255, 255)";
                    // ctx.stroke();

                    ctx.closePath();

                    placemark[i].attributes.imageSource.image = circle;
                    placemark[i].updateImage = true;

                    if (i === placemark.length - 1) {
                        // console.log("B");
                        // console.log(placemark);
                    }
                }

                $("#edit").on("click", function () {
                    var cancel = $("#cancel");

                    $("#editContainer").css("display", "block");
                    $("#edit").css("display", "none");

                    $("#valSubmit").css("display", "block");
                    cancel.css("display", "inline-block");

                    cancel.on("click", function () {
                        $("#edit").css("display", "block");
                        $("#editContainer").css("display", "none");
                    });

                    var sliderY = $("#sliderYear");
                    sliderY.slider({
                        range: true,
                        step: 1,
                        min: 1980,
                        max: 2017,
                        values: [ymi, yma],
                        slide: function (event, ui) {
                            yearMin = ui.values[0];
                            yearMax = ui.values[1];
                            $("#amountY").val(yearMin + " - " + yearMax);
                        }
                    });
                    var yearMin = sliderY.slider('values', 0);
                    var yearMax = sliderY.slider('values', 1);
                    minColor = sliderY.slider('values', 0);
                    maxColor = sliderY.slider('values', 1);
                    $("#amountY").val(sliderY.slider("values", 0) +
                        " - " + sliderY.slider("values", 1));

                    var sliderC = $("#sliderCap");
                    sliderC.slider({
                        range: true,
                        step: 0.01,
                        min: 0,
                        max: 4,
                        values: [cmi, cma],
                        slide: function (event, ui) {
                            capMin = ui.values[0];
                            capMax = ui.values[1];
                            $("#amountC").val("<" + capMin + "MW - >" + capMax + "MW");

                        }
                    });
                    var capMin = sliderC.slider('values', 0);
                    var capMax = sliderC.slider('values', 1);
                    $("#amountC").val("<" + sliderC.slider("values", 0) +
                        "MW - >" + sliderC.slider("values", 1) + "MW");

                    var sliderH = $("#sliderHeight");
                    sliderH.slider({
                        range: true,
                        step: 1,
                        min: 5,
                        max: 185,
                        values: [hmi, hma],
                        slide: function (event, ui) {
                            heightMin = ui.values[0];
                            heightMax = ui.values[1];
                            $("#amountH").val(heightMin + "m - " + heightMax + "m");

                        }
                    });
                    var heightMin = sliderH.slider('values', 0);
                    var heightMax = sliderH.slider('values', 1);
                    $("#amountH").val(sliderH.slider("values", 0) +
                        "m - " + sliderH.slider("values", 1) + "m");

                    minColor = capMin;
                    maxColor = capMax;

                    $("#p_avgcap_color").click();



                    $("#p1").css("display", "none");
                    $("#p2").css("display", "block");
                    $("#p3").css("display", "none");
                    sliderC.css("display", "block");
                    $("#amountC").css("display", "inline-block");
                    sliderY.css("display", "none");
                    $("#amountY").css("display", "none");
                    sliderH.css("display", "none");
                    $("#amountH").css("display", "none");
                    $("#none, #p_year_color, #p_avgcap_color, #t_ttlh_color").change(function () {
                        var category = this.id;
                        if (category === "p_year_color") {
                            minColor = yearMin;
                            maxColor = yearMax;
                            $("#p1").css("display", "block");
                            $("#p2").css("display", "none");
                            $("#p3").css("display", "none");
                            sliderY.css("display", "block");
                            $("#amountY").css("display", "inline-block");
                            sliderC.css("display", "none");
                            $("#amountC").css("display", "none");
                            sliderH.css("display", "none");
                            $("#amountH").css("display", "none");
                        } else if (category === "p_avgcap_color") {
                            minColor = capMin;
                            maxColor = capMax;
                            $("#p1").css("display", "none");
                            $("#p2").css("display", "block");
                            $("#p3").css("display", "none");
                            sliderC.css("display", "block");
                            $("#amountC").css("display", "inline-block");
                            sliderY.css("display", "none");
                            $("#amountY").css("display", "none");
                            sliderH.css("display", "none");
                            $("#amountH").css("display", "none");
                        } else if (category === "t_ttlh_color") {
                            minColor = heightMin;
                            maxColor = heightMax;
                            $("#p1").css("display", "none");
                            $("#p2").css("display", "none");
                            $("#p3").css("display", "block");
                            sliderH.css("display", "block");
                            $("#amountH").css("display", "inline-block");
                            sliderC.css("display", "none");
                            $("#amountC").css("display", "none");
                            sliderY.css("display", "none");
                            $("#amountY").css("display", "none");
                        } else {
                            minColor = 0;
                            maxColor = 0;
                            $("#p1").css("display", "none");
                            $("#p2").css("display", "none");
                            $("#p3").css("display", "none");
                            sliderH.css("display", "none");
                            $("#amountH").css("display", "none");
                            sliderC.css("display", "none");
                            $("#amountC").css("display", "none");
                            sliderY.css("display", "none");
                            $("#amountY").css("display", "none");
                        }

                        var colorData = "yearMin=" + yearMin + "&" + "yearMax=" + yearMax + "&" + "capMin=" + capMin + "&" + "capMax=" + capMax + "&" + "heightMin=" + heightMin + "&" + "heightMax=" + heightMax;

                        $("#valSubmit").on("click", function () {
                            $.ajax({
                                url: '/gradientValue',
                                method: "POST",
                                data: colorData,
                                dataType: 'json',
                                success: function (resp) {
                                    $.ajax({
                                        url: '/gradientValue',
                                        type: 'GET',
                                        dataType: 'json',
                                        async: false,
                                        success: function (resp) {
                                            ymi = resp.data[0].yearMin;
                                            yma = resp.data[0].yearMax;
                                            cmi = resp.data[0].capMin;
                                            cma = resp.data[0].capMax;
                                            hmi = resp.data[0].heightMin;
                                            hma = resp.data[0].heightMax;
                                            var left = $("#leftScale");
                                            var right = $("#rightScale");
                                            if (category === "p_year_color") {
                                                left.html(resp.data[0].yearMin);
                                                right.html(resp.data[0].yearMax);

                                            } else if (category === "p_avgcap_color") {
                                                left.html("<" + resp.data[0].capMin + "MW");
                                                right.html(">" + resp.data[0].capMax + "MW");
                                            } else if (category === "t_ttlh_color") {
                                                left.html(resp.data[0].heightMin + "m");
                                                right.html(resp.data[0].heightMax + "m");
                                            } else {
                                                left.html(scale[category][0]);
                                                right.html(scale[category][1]);
                                            }

                                        }
                                    });
                                }
                            });
                        });

                    });


                });

            });

            $(".sortButton").on("click", function () {
                var category = this.id;
                var status = this.getAttribute("data-status");
                $(".sortButton").attr('data-status', 'false');
                this.setAttribute('data-status', (status === 'true') ? 'false' : 'true');
                status = !(status === 'true');

                $(".sortButton").find("span").html("");
                $(this).find("span").html(status ? " &#9650;" : " &#9660;");

                $(".sortButton").css("background-color", "rgb(128, 128, 128)");
                $(this).css("background-color", "rgb(0, 128, 255)");

                function sort(arr, isNotReverse) {
                    arr.sort(function (a, b) {
                        if ($(a).attr("data-" + category) > $(b).attr("data-" + category)) return isNotReverse ? 1 : -1;
                        if ($(a).attr("data-" + category) < $(b).attr("data-" + category)) return isNotReverse ? -1 : 1;
                        return 0;
                    });
                    return arr;
                }

                var parent = $("#layerMenu");
                // console.log(status);
                var arr = sort(parent.children(), status);
                // console.log(arr);
                arr.detach().appendTo(parent);

                if (clickedLayer) {
                    $("#" + clickedLayer).detach().prependTo(parent);
                }
            });

            function moveList(id) {
                if (!clickedLayer) {
                    clickedLayer = id;

                    var item = $("#" + clickedLayer);
                    item.css('background-color', 'rgb(191, 191, 191)');
                    item.prependTo($("#layerMenu"));
                    refreshEvent();
                } else if (clickedLayer === id) {
                    clickedLayer = "";
                    $(".sortButton").find("span").each(function () {
                        if ($(this).html()) {
                            var id = "#" + $(this)[0].parentElement.id;

                            $(id).click();
                            $(id).click();
                        }
                    })

                } else if (clickedLayer !== id) {
                    clickedLayer = id;

                    var item = $("#" + clickedLayer);
                    item.css('background-color', 'rgb(191, 191, 191)');
                    item.prependTo($("#layerMenu"));
                    refreshEvent();
                }

                function refreshEvent() {
                    $(".layer").off('click', highlightLayer);
                    $(".layer").on('click', highlightLayer);
                }
            }

            function highlightLayer(e) {

                var id = this.id;

                clearHighlight(true, false);

                if (!$("#switchLayer").is(':checked')) {
                    $("#switchLayer").click();
                }
                if (clickedLayer && clickedLayer !== id) {

                    var oldLayerIndex = clickedLayer.toString().split('-');
                    var status = (clickedLayer === id);
                    for (var z = 0; z < oldLayerIndex.length; z++) {
                        // oldRenderables[z].highlighted = !oldRenderables[z].highlighted;
                        globe.wwd.layers[oldLayerIndex[z]].renderables[0].highlighted = status;

                        if (z === oldLayerIndex.length - 1) {
                            highlight();
                        }
                    }
                } else {
                    highlight();
                }


                function highlight() {

                    var layerIndex = id.toString().split('-');
                    // console.log("C");
                    for (var i = 0; i < layerIndex.length; i++) {

                        globe.wwd.layers[layerIndex[i]].renderables[0].highlighted = !globe.wwd.layers[layerIndex[i]].renderables[0].highlighted;

                        if (i === layerIndex.length - 1) {

                            if (globe.wwd.goToAnimator.targetPosition.latitude === globe.wwd.layers[layerIndex[0]].renderables[0].position.latitude && globe.wwd.goToAnimator.targetPosition.longitude === globe.wwd.layers[layerIndex[0]].renderables[0].position.longitude) {
                                totalWTCap();
                                layerMenu();
                                // console.log("B");
                                moveList(id);
                            } else {
                                globe.wwd.goTo(new WorldWind.Position(globe.wwd.layers[layerIndex[0]].renderables[0].position.latitude, globe.wwd.layers[layerIndex[0]].renderables[0].position.longitude), function () {
                                    totalWTCap();
                                    layerMenu();
                                    // console.log("A");
                                    moveList(id);
                                });
                            }
                        }
                    }
                }
            }

            globe.wwd.worldWindowController.__proto__.handleWheelEvent = function (event) {
                var navigator = this.wwd.navigator;
                var normalizedDelta;
                if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
                    normalizedDelta = event.deltaY;
                } else if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
                    normalizedDelta = event.deltaY * 40;
                } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
                    normalizedDelta = event.deltaY * 400;
                }
                var scale = 1 + (normalizedDelta / 1000);

                navigator.range *= scale;
                this.applyLimits();
                this.wwd.redraw();

                autoSwitch();
                totalWTCap();
                layerMenu();
                clearHighlight(true, true);
            };

            globe.wwd.worldWindowController.__proto__.handlePanOrDrag3D = function (recognizer) {
                var state = recognizer.state,
                    tx = recognizer.translationX,
                    ty = recognizer.translationY;

                var navigator = this.wwd.navigator;
                if (state === WorldWind.BEGAN) {
                    this.lastPoint.set(0, 0);
                } else if (state === WorldWind.CHANGED) {

                    // to arc degrees.
                    var canvas = this.wwd.canvas,
                        globe = this.wwd.globe,
                        globeRadius = WWMath.max(globe.equatorialRadius, globe.polarRadius),
                        distance = WWMath.max(1, navigator.range),
                        metersPerPixel = WWMath.perspectivePixelSize(canvas.clientWidth, canvas.clientHeight, distance),
                        forwardMeters = (ty - this.lastPoint[1]) * metersPerPixel,
                        sideMeters = -(tx - this.lastPoint[0]) * metersPerPixel,
                        forwardDegrees = (forwardMeters / globeRadius) * Angle.RADIANS_TO_DEGREES,
                        sideDegrees = (sideMeters / globeRadius) * Angle.RADIANS_TO_DEGREES;

                    // Apply the change in latitude and longitude to this navigator, relative to the current heading.
                    var sinHeading = Math.sin(navigator.heading * Angle.DEGREES_TO_RADIANS),
                        cosHeading = Math.cos(navigator.heading * Angle.DEGREES_TO_RADIANS);

                    navigator.lookAtLocation.latitude += forwardDegrees * cosHeading - sideDegrees * sinHeading;
                    navigator.lookAtLocation.longitude += forwardDegrees * sinHeading + sideDegrees * cosHeading;
                    this.lastPoint.set(tx, ty);
                    this.applyLimits();
                    this.wwd.redraw();

                    totalWTCap();
                    layerMenu();
                    clearHighlight(true, true);
                }
            };

            globe.wwd.worldWindowController.allGestureListeners[0].__proto__.handleZoom = function (e, control) {
                var handled = false;

                if (this.isPointerDown(e) || this.isTouchStart(e)) {
                    this.activeControl = control;
                    this.activeOperation = this.handleZoom;
                    e.preventDefault();
                    if (this.isTouchStart(e)) {
                        this.currentTouchId = e.changedTouches.item(0).identifier; // capture the touch identifier
                    }
                    var thisLayer = this; // capture 'this' for use in the function
                    var setRange = function () {
                        if (thisLayer.activeControl) {
                            if (thisLayer.activeControl === thisLayer.zoomInControl) {
                                thisLayer.globe.wwd.navigator.range *= (1 - thisLayer.zoomIncrement);
                            } else if (thisLayer.activeControl === thisLayer.zoomOutControl) {
                                thisLayer.globe.wwd.navigator.range *= (1 + thisLayer.zoomIncrement);
                            }
                            thisLayer.globe.wwd.redraw();

                            setTimeout(function () {
                                autoSwitch();
                                totalWTCap();
                                layerMenu();
                                clearHighlight(true, true);
                            }, 25);

                            setTimeout(setRange, 50);
                        }
                    };

                    setTimeout(setRange, 50);
                    handled = true;
                }
                return handled;
            };

            globe.wwd.worldWindowController.allGestureListeners[0].__proto__.handlePan = function (e, control) {
                var handled = false;
                // Capture the current position.
                if (this.isPointerDown(e) || this.isPointerMove(e)) {
                    this.currentEventPoint = this.wwd.canvasCoordinates(e.clientX, e.clientY);
                } else if (this.isTouchStart(e) || this.isTouchMove(e)) {
                    var touch = e.changedTouches.item(0);
                    this.currentEventPoint = this.wwd.canvasCoordinates(touch.clientX, touch.clientY);
                }
                // Start an operation on left button down or touch start.
                if (this.isPointerDown(e) || this.isTouchStart(e)) {
                    this.activeControl = control;
                    this.activeOperation = this.handlePan;
                    e.preventDefault();
                    if (this.isTouchStart(e)) {
                        this.currentTouchId = e.changedTouches.item(0).identifier; // capture the touch identifier
                    }
                    // This function is called by the timer to perform the operation.
                    var thisLayer = this; // capture 'this' for use in the function
                    var setLookAtLocation = function () {
                        if (thisLayer.activeControl) {
                            var dx = thisLayer.panControlCenter[0] - thisLayer.currentEventPoint[0],
                                dy = thisLayer.panControlCenter[1]
                                    - (thisLayer.globe.wwd.viewport.height - thisLayer.currentEventPoint[1]),
                                oldLat = thisLayer.globe.wwd.navigator.lookAtLocation.latitude,
                                oldLon = thisLayer.globe.wwd.navigator.lookAtLocation.longitude,
                                // Scale the increment by a constant and the relative distance of the eye to the surface.
                                scale = thisLayer.panIncrement
                                    * (thisLayer.globe.wwd.navigator.range / thisLayer.globe.wwd.globe.radiusAt(oldLat, oldLon)),
                                heading = thisLayer.globe.wwd.navigator.heading + (Math.atan2(dx, dy) * Angle.RADIANS_TO_DEGREES),
                                distance = scale * Math.sqrt(dx * dx + dy * dy);
                            Location.greatCircleLocation(thisLayer.globe.wwd.navigator.lookAtLocation, heading, -distance,
                                thisLayer.globe.wwd.navigator.lookAtLocation);
                            thisLayer.globe.wwd.redraw();
                            setTimeout(function () {
                                totalWTCap();
                                layerMenu();
                                clearHighlight(true, true);
                            }, 25);

                            setTimeout(setLookAtLocation, 50);
                        }
                    };
                    setTimeout(setLookAtLocation, 50);
                    handled = true;
                }
                return handled;

            };

            function autoSwitch() {
                if ($("#switchMethod").is(':checked')) {
                    var altitude = globe.wwd.layers[6].eyeText.text;

                    if (altitude.substring(altitude.length - 2, altitude.length) === "km") {
                        altitude = altitude.replace(/Eye  |,| km/g, '');
                    } else {
                        altitude = (altitude.replace(/Eye  |,| m/g, '')) / 1000;
                    }

                    if (altitude <= mainconfig.eyeDistance_Heatmap && !$("#switchLayer").is(':checked')) {
                        $("#switchLayer").click();
                        $("#switchNote").html("");
                        $("#switchNote").append("NOTE: Toggle switch to temporarily view density heatmap.");
                        $("#globeNote").html("");
                        $("#globeNote").append("NOTE: Zoom in to an eye distance of more than 4,500 km to view the density heatmap.");

                    } else if (altitude > mainconfig.eyeDistance_Heatmap && $("#switchLayer").is(':checked')) {
                        $("#switchNote").html("");
                        $("#switchNote").append("NOTE: Toggle switch to temporarily view point locations.");
                        $("#globeNote").html("");
                        $("#globeNote").append("NOTE: Zoom in to an eye distance of less than 4,500 km to view the point locations.");

                        $("#switchLayer").click();
                    }

                    if (altitude <= mainconfig.eyeDistance_PL && $("#switchLayer").is(':checked')) {
                        $("#menuNote").html("");
                        $("#menuNote").append("NOTE: Click the items listed below in the menu to fly to and highlight point location(s).");
                    } else if (altitude > mainconfig.eyeDistance_PL && $("#switchLayer").is(':checked')) {
                        $("#menuNote").html("");
                        $("#menuNote").append("NOTE: Zoom in to an eye distance of less than 1,500 km to display a menu for wind turbines.");
                    }
                }
            }

            function totalWTCap() {
                var totalWT = 0;
                var totalCap = 0;

                for (var i = layers.length; i < globe.wwd.layers.length - 1; i++) {

                    if (globe.wwd.layers[i].inCurrentFrame) {
                        totalWT++;
                        if (globe.wwd.layers[i].renderables[0].userProperties.p_avgcap !== "N/A") {
                            totalCap += globe.wwd.layers[i].renderables[0].userProperties.p_avgcap;
                        }
                    }

                    if (i === globe.wwd.layers.length - 2) {
                        // console.log(totalWT);
                        // console.log(totalCap);
                        $("#totalWTCap").html("Showing <strong>" + totalWT + "</strong> turbines on screen with a total rated capacity of <strong>" + Math.round(totalCap) + "</strong> MW");
                    }
                }
            }

            function layerMenu() {
                var altitude = globe.wwd.layers[6].eyeText.text;

                if (altitude.substring(altitude.length - 2, altitude.length) === "km") {
                    altitude = altitude.replace(/Eye  |,| km/g, '');
                } else {
                    altitude = (altitude.replace(/Eye  |,| m/g, '')) / 1000;
                }

                $("#layerMenu").empty();
                $("#layerMenuButton").hide();

                if (altitude <= mainconfig.eyeDistance_PL) {
                    // console.log(globe.wwd.layers);
                    var projectNumber = 0;
                    var id;
                    var previousProject;

                    for (var i = layers.length; i < globe.wwd.layers.length - 1; i++) {

                        if (globe.wwd.layers[i].inCurrentFrame) {
                            var projectName = globe.wwd.layers[i].renderables[0].userProperties.p_name,
                                state = globe.wwd.layers[i].renderables[0].userProperties.t_state,
                                year = globe.wwd.layers[i].renderables[0].userProperties.p_year,
                                number = globe.wwd.layers[i].renderables[0].userProperties.p_tnum,
                                cap = globe.wwd.layers[i].renderables[0].userProperties.p_cap,
                                avgcap = globe.wwd.layers[i].renderables[0].userProperties.p_avgcap;

                            if (i === layers.length || projectName !== previousProject) {
                                id = i;
                                $("#layerMenu").append($("<div id='" + i + "' data-name='" + projectName + "' data-year='" + year + "' data-capacity='" + avgcap + "' class='layers'>" +
                                    "<p><strong>" + projectName + ", " + state + "</strong></p>" +
                                    "<p>&nbsp;&nbsp;&nbsp;&nbsp;Year Online: " + year + "</p>" +
                                    "<p>&nbsp;&nbsp;&nbsp;&nbsp;" + number + " Turbines</p>" +
                                    "<p>&nbsp;&nbsp;&nbsp;&nbsp;Total Capacity: " + cap + ((cap === "N/A") ? "" : " MW") + "</p>" +
                                    "<p>&nbsp;&nbsp;&nbsp;&nbsp;Rated Capacity: " + avgcap + ((avgcap === "N/A") ? "" : " MW") + "</p>" +
                                    "</div>"));
                                projectNumber++;
                            } else {
                                $("#" + id).attr('id', id + "-" + i);
                                id += ('-' + i);
                            }

                            previousProject = projectName;
                        }

                        if (i === globe.wwd.layers.length - 2) {
                            $("#projectNumber").html(projectNumber);
                            $("#layerMenuButton").show();
                            // $(".layers").on('mouseenter', highlightLayer);
                            // $(".layers").on('mouseleave', highlightLayer);
                            $(".layers").on('click', highlightLayer);
                        }
                    }
                }
            }

            function clearHighlight(suggested, clicked) {
                if (suggestedLayer && suggested) {

                    var layerIndex = suggestedLayer.toString().split('-');
                    for (var i = 0; i < layerIndex.length; i++) {
                        globe.wwd.layers[layerIndex[i]].renderables[0].highlighted = false;

                        if (i === layerIndex.length - 1) {
                            suggestedLayer = "";
                        }
                    }
                }

                if (clickedLayer && clicked) {
                    var layerIndex = clickedLayer.toString().split('-');
                    for (var i = 0; i < layerIndex.length; i++) {
                        globe.wwd.layers[layerIndex[i]].renderables[0].highlighted = false;

                        if (i === layerIndex.length - 1) {
                            clickedLayer = "";
                        }
                    }
                }
            }

            function handleMouseMove(o) {
                var popoverC = $("#popover");

                if (popoverC.is(":visible")) {
                    popoverC.hide();
                }

                var x = o.clientX,
                    y = o.clientY;
                var pickList = globe.wwd.pick(globe.wwd.canvasCoordinates(x, y));
                // console.log(pickList.objects);
                for (var q = 0; q < pickList.objects.length; q++) {
                    var pickedPL = pickList.objects[q].userObject;
                    // console.log(pickedPL);
                    if (pickedPL instanceof WorldWind.Placemark) {
                        // console.log("A");

                        var xOffset = Math.max(document.documentElement.scrollLeft, document.body.scrollLeft);
                        var yOffset = Math.max(document.documentElement.scrollTop, document.body.scrollTop);

                        var popover = document.getElementById('popover');
                        popover.style.position = "absolute";
                        popover.style.left = (x + xOffset - 3) + 'px';
                        popover.style.top = (y + yOffset - 3) + 'px';

                        var content = "<p><strong>Project Name:</strong> " + pickedPL.userProperties.p_name +
                            "<br>" + "<strong>Year Online:</strong> " + pickedPL.userProperties.p_year +
                            "<br>" + "<strong>Rated Capacity:</strong> " + pickedPL.userProperties.p_avgcap +
                            "<br>" + "<strong>Total Height:</strong> " + pickedPL.userProperties.t_ttlh + "</p>";

                        popoverC.attr('data-content', content);
                        popoverC.show();
                    }
                }

                pickList = [];
            }

            $.ajax({
                url: '/uswtdb',
                type: 'GET',
                dataType: 'json',
                // data: data,
                async: false,
                success: function (resp) {
                    if (!resp.error) {
                        var data = [];

                        var circle = document.createElement("canvas"),
                            ctx = circle.getContext('2d'),
                            radius = 10,
                            r2 = radius + radius;

                        circle.width = circle.height = r2;

                        var gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
                        gradient.addColorStop(0, "rgba(255, 255, 255, 0)");

                        ctx.beginPath();
                        ctx.arc(radius, radius, radius, 0, Math.PI * 2, true);

                        ctx.fillStyle = gradient;
                        ctx.fill();

                        ctx.closePath();

                        for (var i = 0; i < resp.data.length; i++) {
                            // data[i] = new WorldWind.IntensityLocation(resp.data[i].ylat, resp.data[i].xlong, 1);
                            data[i] = new WorldWind.MeasuredLocation(resp.data[i].ylat, resp.data[i].xlong, 0.8);

                            var placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
                            placemarkAttributes.imageSource = new WorldWind.ImageSource(circle);
                            placemarkAttributes.imageScale = 0.5;

                            var highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
                            highlightAttributes.imageScale = 2.0;

                            var placemarkPosition = new WorldWind.Position(resp.data[i].ylat, resp.data[i].xlong, 0);
                            placemark[i] = new WorldWind.Placemark(placemarkPosition, false, placemarkAttributes);
                            placemark[i].altitudeMode = WorldWind.RELATIVE_TO_GROUND;
                            placemark[i].highlightAttributes = highlightAttributes;
                            placemark[i].userProperties.p_name = resp.data[i].p_name;
                            placemark[i].userProperties.t_state = resp.data[i].t_state;
                            placemark[i].userProperties.p_year = (resp.data[i].p_year === -9999) ? 'N/A' : resp.data[i].p_year;
                            placemark[i].userProperties.p_tnum = resp.data[i].p_tnum;
                            placemark[i].userProperties.p_cap = (resp.data[i].p_cap === -9999) ? 'N/A' : resp.data[i].p_cap;
                            placemark[i].userProperties.p_avgcap = (resp.data[i].p_avgcap === -9999) ? 'N/A' : resp.data[i].p_avgcap;
                            placemark[i].userProperties.t_ttlh = (resp.data[i].t_ttlh === -9999) ? 'N/A' : resp.data[i].t_ttlh;
                            placemark[i].userProperties.p_year_color = resp.data[i].p_year;
                            placemark[i].userProperties.p_avgcap_color = resp.data[i].p_avgcap;
                            placemark[i].userProperties.t_ttlh_color = resp.data[i].t_ttlh;

                            var placemarkLayer = new WorldWind.RenderableLayer(resp.data[i].case_id);
                            globe.wwd.addLayer(placemarkLayer);
                            globe.wwd.layers[globe.wwd.layers.length - 1].addRenderable(placemark[i]);

                            if (i === 0 || resp.data[i].p_name !== resp.data[i - 1].p_name) {
                                autoSuggestion.push({"value": resp.data[i].p_name, "lati": resp.data[i].ylat, "long": resp.data[i].xlong, "i": globe.wwd.layers.length - 1});
                                // autoSuggestion.push({"value": resp.data[i].p_name, "lati": resp.data[i].ylat, "long": resp.data[i].xlong, "i": [wwd.layers.length - 1]});
                            } else {
                                autoSuggestion[autoSuggestion.length - 1].i += ('-' + (globe.wwd.layers.length - 1));
                                // autoSuggestion[autoSuggestion.length - 1].i.push(wwd.layers.length - 1);
                            }

                            if (i === resp.data.length - 1) {

                                var HeatMapLayer = new WorldWind.HeatMapLayer("Heatmap", data);

                                HeatMapLayer.scale = ['#000000', '#ffffff', '#0ffff0', '#00ff00', '#ffff00', '#ff0000'];
                                HeatMapLayer._gradient = {
                                    0: "#000000",
                                    0.4: "#ffffff",
                                    0.5: "#0ffff0",
                                    0.7: "#00ff00",
                                    0.9: "#ffff00",
                                    1: "#ff0000"
                                };
                                HeatMapLayer._radius = 8;
                                HeatMapLayer._incrementPerIntensity = 1;
                                console.log(HeatMapLayer);

                                HeatMapLayer.enabled = false;
                                globe.wwd.addLayer(HeatMapLayer);

                                globe.wwd.goTo(new WorldWind.Position(37.0902, -95.7129, mainconfig.eyeDistance_initial));
                                //console.log(wwd.layers);


                            }
                        }
                    }
                }
            });

            $("#autoSuggestion").autocomplete({
                lookup: autoSuggestion,
                lookupLimit: 5,
                onSelect: function(suggestion) {
                    console.log(suggestion);
                    $("#autoSuggestion").val("");
                    clearHighlight(true, true);

                    wwd.goTo(new WorldWind.Position(suggestion.lati, suggestion.long, 50000), function() {
                        // console.log(wwd.layers[0].eyeText.text.substring(5, wwd.layers[0].eyeText.text.length - 3));
                        suggestedLayer = suggestion.i;
                        autoSwitch();
                        // console.log(wwd.layers[suggestion.i].inCurrentFrame);
                        // console.log(wwd.layers[wwd.layers.length - 1].inCurrentFrame);

                        setTimeout(function() {
                            // console.log(wwd.layers[suggestion.i].inCurrentFrame);
                            // console.log(wwd.layers[wwd.layers.length - 1].inCurrentFrame);
                            totalWTCap();
                            layerMenu();

                            console.log(suggestedLayer);
                            var layerIndex = suggestedLayer.toString().split('-');
                            console.log(layerIndex);
                            for (var i = 0; i < layerIndex.length; i++) {
                                wwd.layers[layerIndex[i]].renderables[0].highlighted = true;
                            }
                        }, 1)
                    });
                }
            });

            // $("#p_avgcap_color").click();

            // Listen for mouse moves and highlight the placemarks that the cursor rolls over.
            globe.wwd.addEventListener("mousemove", handleMouseMove);
            $("#popover").popover({html: true, placement: "top", trigger: "hover"});
        });
    });