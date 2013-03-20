
var TOTAL_MEMORY = 134217728;
var buffer = new ArrayBuffer(TOTAL_MEMORY);

var MB = 1024 * 1024 | 0;
var WORD_SIZE = 4;
var SIZE = 256 * MB / WORD_SIZE;
var STACK_SIZE = 2 * MB / WORD_SIZE;
var HEAP_SIZE = SIZE - STACK_SIZE;

var asm = (function (global, env, buffer) {
    "use asm";

    var U1 = new global.Uint8Array(buffer);
    var I1 = new global.Int8Array(buffer);
    var U2 = new global.Uint16Array(buffer);
    var I2 = new global.Int16Array(buffer);
    var U4 = new global.Uint32Array(buffer);
    var I4 = new global.Int32Array(buffer);
    var F4 = new global.Float32Array(buffer);
    var F8 = new global.Float64Array(buffer);

  function Point$Point(thisPtr, x, y) {
    thisPtr = thisPtr | 0;
    x = +x;
    y = +y;
    F8[thisPtr] = x;
    F8[(thisPtr) + 1] = y;
  }
function square(x, y) {
  x = +x;
  y = +y;
  return +((x + y) * 2 + 3);
}
function main() {
  var $SP = U4[1] -= 4;
  var _, p = 0;
  Point$Point(($SP) >> 1, 1.2, 3.4);
  return _ = +square(F8[($SP) >> 1], F8[(($SP) >> 1) + 1]), U4[1] += 4, _;
  U4[1] += 4;
}
return { main: main };

})(this,
   { HEAP_SIZE: HEAP_SIZE },
   buffer);

asm.main();
