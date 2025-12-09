var makerjs = require('makerjs');

// GLOBAL ORIGIN
var GLOBAL_ORIGIN = [0, 0];

// GLOBAL HELPERS
function MoveFromGlobal(model, x, y) {
    makerjs.model.move(model, [GLOBAL_ORIGIN[0] + x, GLOBAL_ORIGIN[1] + y]);
}

// MAIN TESTING MODEL WRAPPER
function testingModel() {

    this.origin = [0, 0];
    this.models = {};

    // FIRST RECTANGLE
    var rect1 = new makerjs.models.Rectangle(100, 50);
    MoveFromGlobal(rect1, 100, 100);
    this.models.rect1 = rect1;

    // SECOND RECTANGLE
    var rect2 = new makerjs.models.Rectangle(50, 50);
    MoveFromGlobal(rect2, 250, 100);
    this.models.rect2 = rect2;
  
    // THIRD RECTANGLE
    var rect3 = new makerjs.models.Rectangle(150, 50);
    MoveFromGlobal(rect3, 350, 100);
    this.models.rect3 = rect3;
}

module.exports = testingModel;
