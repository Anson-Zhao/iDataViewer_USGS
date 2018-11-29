requirejs(['./worldwind.min'], function (WorldWindow) {
    var MyWorldWindController = function(worldWindow) {
        WorldWind.BasicWorldWindowController.call(this, worldWindow);
    };

    MyWorldWindController.prototype = Object.create(WorldWind.BasicWorldWindowController);

    MyWorldWindController.prototype.handleWheelEvent = function() {

    };

   return MyWorldWindController;
});