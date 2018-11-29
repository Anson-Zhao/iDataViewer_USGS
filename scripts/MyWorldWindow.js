requirejs(['./worldwind.min',
            './MyWorldWindController'], function(WorldWind,
                                                 MyWorldWindController) {
    var ArgumentError = WorldWind.ArgumentError;
    var Logger = WorldWind.Logger;
    var DrawContext = WorldWind.DrawContext;
    var Matrix = WorldWind.Matrix;
    var Rectangle = WorldWind.Rectangle;
    var Globe = WorldWind.Globe;
    var EarthElevationModel = WorldWind.EarthElevationModel;
    var LookAtNavigator = WorldWind.LookAtNavigator;
    var FrameStatistics = WorldWind.FrameStatistics;
    var GoToAnimator = WorldWind.GoToAnimator;



    var MyWorldWindow = function(canvasElem, elevationModel) {
        if (!(window.WebGLRenderingContext)) {
            throw new WorldWind.ArgumentError(
                Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "constructor", "webglNotSupported"));
        }

        // Get the actual canvas element either directly or by ID.
        var canvas;
        if (canvasElem instanceof HTMLCanvasElement) {
            canvas = canvasElem;
        } else {
            // Attempt to get the HTML canvas with the specified ID.
            canvas = document.getElementById(canvasElem);

            if (!canvas) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "constructor",
                        "The specified canvas ID is not in the document."));
            }
        }

        // Create the WebGL context associated with the HTML canvas.
        var gl = this.createContext(canvas);
        if (!gl) {
            throw new ArgumentError(
                Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "constructor", "webglNotSupported"));
        }

        // Internal. Intentionally not documented.
        this.drawContext = new DrawContext(gl);

        // Internal. Intentionally not documented. Must be initialized before the navigator is created.
        this.eventListeners = {};

        // Internal. Intentionally not documented. Initially true in order to redraw at least once.
        this.redrawRequested = true;

        // Internal. Intentionally not documented.
        this.redrawRequestId = null;

        // Internal. Intentionally not documented.
        this.scratchModelview = Matrix.fromIdentity();

        // Internal. Intentionally not documented.
        this.scratchProjection = Matrix.fromIdentity();

        // Internal. Intentionally not documented.
        this.hasStencilBuffer = gl.getContextAttributes().stencil;

        /**
         * The HTML canvas associated with this WorldWindow.
         * @type {HTMLElement}
         * @readonly
         */
        this.canvas = canvas;

        /**
         * The number of bits in the depth buffer associated with this WorldWindow.
         * @type {number}
         * @readonly
         */
        this.depthBits = gl.getParameter(gl.DEPTH_BITS);

        /**
         * The current viewport of this WorldWindow.
         * @type {Rectangle}
         * @readonly
         */
        this.viewport = new Rectangle(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        /**
         * The globe displayed.
         * @type {Globe}
         */
        this.globe = new Globe(elevationModel || new EarthElevationModel());

        /**
         * The layers to display in this WorldWindow.
         * This property is read-only. Use [addLayer]{@link WorldWindow#addLayer} or
         * [insertLayer]{@link WorldWindow#insertLayer} to add layers to this WorldWindow.
         * Use [removeLayer]{@link WorldWindow#removeLayer} to remove layers from this WorldWindow.
         * @type {Layer[]}
         * @readonly
         */
        this.layers = [];

        /**
         * The navigator used to manipulate the globe.
         * @type {LookAtNavigator}
         * @default [LookAtNavigator]{@link LookAtNavigator}
         */
        this.navigator = new LookAtNavigator();

        /**
         * The controller used to manipulate the globe.
         * @type {WorldWindowController}
         * @default [BasicWorldWindowController]{@link BasicWorldWindowController}
         */
        this.worldWindowController = new MyWorldWindController(this);

        /**
         * The vertical exaggeration to apply to the terrain.
         * @type {Number}
         */
        this.verticalExaggeration = 1;

        /**
         * Indicates that picking will return all objects at the pick point, if any. The top-most object will have
         * its isOnTop flag set to true.
         * If deep picking is false, the default, only the top-most object is returned, plus
         * the picked-terrain object if the pick point is over the terrain.
         * @type {boolean}
         * @default false
         */
        this.deepPicking = false;

        /**
         * Indicates whether this WorldWindow should be configured for sub-surface rendering. If true, shapes
         * below the terrain can be seen when the terrain is made transparent. If false, sub-surface shapes are
         * not visible, however, performance is slightly increased.
         * @type {boolean}
         * @default false
         */
        this.subsurfaceMode = false;

        /**
         * The opacity to apply to terrain and surface shapes. This property is typically used when viewing
         * the sub-surface. It modifies the opacity of the terrain and surface shapes as a whole. It should be
         * a number between 0 and 1. It is compounded with the individual opacities of the image layers and
         * surface shapes on the terrain.
         * @type {Number}
         * @default 1
         */
        this.surfaceOpacity = 1;

        /**
         * Performance statistics for this WorldWindow.
         * @type {FrameStatistics}
         */
        this.frameStatistics = new FrameStatistics();

        /**
         * The {@link GoToAnimator} used by this WorldWindow to respond to its goTo method.
         * @type {GoToAnimator}
         */
        this.goToAnimator = new GoToAnimator(this);

        // Documented with its property accessor below.
        this._redrawCallbacks = [];

        // Documented with its property accessor below.
        this._orderedRenderingFilters = [
            function (dc) {
                thisWindow.declutter(dc, 1);
            },
            function (dc) {
                thisWindow.declutter(dc, 2);
            }
        ];

        // Intentionally not documented.
        this.pixelScale = 1;

        // Prevent the browser's default actions in response to mouse and touch events, which interfere with
        // navigation. Register these event listeners  before any others to ensure that they're called last.
        function preventDefaultListener(event) {
            event.preventDefault();
        }

        this.addEventListener("mousedown", preventDefaultListener);
        this.addEventListener("touchstart", preventDefaultListener);
        this.addEventListener("contextmenu", preventDefaultListener);
        this.addEventListener("wheel", preventDefaultListener);

        var thisWindow = this;

        // Redirect various UI interactions to the appropriate handler.
        function onGestureEvent(event) {
            thisWindow.onGestureEvent(event);
        }

        if (window.PointerEvent) {
            // Prevent the browser's default actions in response to pointer events which interfere with navigation.
            // This CSS style property is configured here to ensure that it's set for all applications.
            this.canvas.style.setProperty("touch-action", "none");

            this.addEventListener("pointerdown", onGestureEvent, false);
            window.addEventListener("pointermove", onGestureEvent, false); // get pointermove events outside event target
            window.addEventListener("pointercancel", onGestureEvent, false); // get pointercancel events outside event target
            window.addEventListener("pointerup", onGestureEvent, false); // get pointerup events outside event target
        } else {
            this.addEventListener("mousedown", onGestureEvent, false);
            window.addEventListener("mousemove", onGestureEvent, false); // get mousemove events outside event target
            window.addEventListener("mouseup", onGestureEvent, false); // get mouseup events outside event target
            this.addEventListener("touchstart", onGestureEvent, false);
            this.addEventListener("touchmove", onGestureEvent, false);
            this.addEventListener("touchend", onGestureEvent, false);
            this.addEventListener("touchcancel", onGestureEvent, false);
        }

        // Register wheel event listeners on the WorldWindow's canvas.
        this.addEventListener("wheel", function (event) {
            onGestureEvent(event);
        });

        // Set up to handle WebGL context lost events.
        function handleContextLost(event) {
            thisWindow.handleContextLost(event);
        }

        this.canvas.addEventListener("webglcontextlost", handleContextLost, false);

        // Set up to handle WebGL context restored events.
        function handleContextRestored(event) {
            thisWindow.handleContextRestored(event);
        }

        this.canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

        // Set up to handle WebGL context events and WorldWind redraw request events. Imagery uses the canvas
        // redraw events because images are generally specific to the WebGL context associated with the canvas.
        // Elevation models use the global window redraw events because they can be shared among WorldWindows.
        function handleRedrawEvent(event) {
            thisWindow.handleRedrawEvent(event)
        }

        this.canvas.addEventListener(WorldWind.REDRAW_EVENT_TYPE, handleRedrawEvent, false);
        window.addEventListener(WorldWind.REDRAW_EVENT_TYPE, handleRedrawEvent, false);

        // Render to the WebGL context in an animation frame loop until the WebGL context is lost.
        this.animationFrameLoop();
    };

    MyWorldWindow.prototype = Object.create(WorldWind.WorldWindow);

    return MyWorldWindow;
});