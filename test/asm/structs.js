
var MB = 1024 * 1024;
var SIZE = 256 * MB;
var STACK_SIZE = 2 * MB;
var HEAP_SIZE = SIZE - STACK_SIZE;
var buffer = new ArrayBuffer(SIZE);

var asm = (function (global, env, buffer) {
    "use asm";

    var stackSize = env.STACK_SIZE|0;
    var heapSize = env.HEAP_SIZE|0;
    var totalSize = env.TOTAL_SIZE|0;

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
    var $SP = 0;
    F8[(thisPtr) >> 3] = x;
    F8[(thisPtr) + 8 >> 3] = y;
  }
function add1(x) {
  x = x | 0;
  var $SP = 0;
  return x + 1 | 0 | 0;
}
function square(x, y) {
  x = +x;
  y = +y;
  var $SP = 0;
  return +(x * x + +add1(~~(y * y)) + +~~4.4);
}
function main() {
  var _ = 0.0, p1 = 0, p2 = 0, p3 = 0, p4 = 0, p5 = 0, $SP = 0;
  U4[1] = (U4[1] | 0) - 80;
  $SP = U4[1] | 0;
  (Point$Point(($SP), 1.2, 3.4), F8[($SP) >> 3]);
  (Point$Point(($SP) + 16, 1.2, 3.4), F8[($SP) + 16 >> 3]);
  (Point$Point(($SP) + 32, 1.2, 3.4), F8[($SP) + 32 >> 3]);
  (Point$Point(($SP) + 48, 1.2, 3.4), F8[($SP) + 48 >> 3]);
  (Point$Point(($SP) + 64, 1.2, +5), F8[($SP) + 64 >> 3]);
  return _ = +square(+F8[(($SP)) >> 3], +F8[(($SP) + 64) + 8 >> 3]), U4[1] = (U4[1] | 0) + 80, _;
  U4[1] = (U4[1] | 0) + 80;
  return 0.0;
}
    function _main() {
        U4[0] = 4;
        U4[1] = totalSize;
        return +main();
    }

    return { main: _main };

})({ Uint8Array: Uint8Array,
     Int8Array: Int8Array,
     Uint16Array: Uint16Array,
     Int16Array: Int16Array,
     Uint32Array: Uint32Array,
     Int32Array: Int32Array,
     Float32Array: Float32Array,
     Float64Array: Float64Array },
   { HEAP_SIZE: HEAP_SIZE,
     STACK_SIZE: STACK_SIZE,
     TOTAL_SIZE: SIZE },
   buffer);

var display = ((typeof console !== 'undefined' && console.log) || print);

display(asm.main());
