
if(!Math.imul) {
    Math.imul = function(x, y) { return x * y; };
}

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
    var assertEqual = env.assertEqual;
    var print = env.print;
    var start = env.start;
    var end = env.end;

    var U1 = new global.Uint8Array(buffer);
    var I1 = new global.Int8Array(buffer);
    var U2 = new global.Uint16Array(buffer);
    var I2 = new global.Int16Array(buffer);
    var U4 = new global.Uint32Array(buffer);
    var I4 = new global.Int32Array(buffer);
    var F4 = new global.Float32Array(buffer);
    var F8 = new global.Float64Array(buffer);

    var acos = global.Math.acos;
    var asin = global.Math.asin;
    var atan = global.Math.atan;
    var cos = global.Math.cos;
    var sin = global.Math.sin;
    var tan = global.Math.tan;
    var ceil = global.Math.ceil;
    var floor = global.Math.floor;
    var exp = global.Math.exp;
    var log = global.Math.log;
    var sqrt = global.Math.sqrt;
    var abs = global.Math.abs;
    var atan2 = global.Math.atan2;
    var pow = global.Math.pow;
    var imul = global.Math.imul;

function main() {
  var _ = 0, x = 0, y = 0, z = 0.0, w = 0.0, i = 0, $SP = 0;
  U4[1] = totalSize;
  U4[0] = 4;
  assertEqual(1, 1);
  assertEqual(1, 1);
  assertEqual(2, 2);
  assertEqual(2, 2);
  assertEqual(4, 4);
  assertEqual(4, 4);
  assertEqual(4, 4);
  assertEqual(8, 8);
  assertEqual(-1 & 255, 255);
  assertEqual(-1, -1);
  assertEqual(-1 & 65535, 65535);
  assertEqual(-1, -1);
  assertEqual(-1 >>> 0, 4294967295);
  assertEqual(-1, -1);
  x = 8;
  y = 6;
  assertEqual((x | 0) + (y | 0) | 0, 14);
  assertEqual((x | 0) - (y | 0) | 0, 2);
  assertEqual((x | 0) / (y | 0) | 0, 1);
  assertEqual(imul(x, y), 48);
  assertEqual((x | 0) % (y | 0) | 0, 2);
  z = 5.1;
  w = +6.0;
  assertEqual(z + w, 11.1);
  assertEqual(z - w, -0.9);
  assertEqual(z / w, 0.85);
  assertEqual(z * w, 30.6);
  // mixing ints and doubles coerces everything to doubles
  assertEqual(z * +(x | 0), 40.8);
  // while loop
  x = 0;
  y = 1;
  while ((x | 0) < 10) {
    x = (x | 0) + 1 | 0;
    y = imul(y, 2);
  }
  assertEqual(y | 0, 1024);
  // for loop
  y = 1;
  // only works when declaring outside loop (for now)
  for (i = 0; (i | 0) < 10; _ = i, i = (i | 0) + 1 | 0, _) {
    y = imul(y, 2);
  }
  assertEqual(y | 0, 1024);
}

    return { main: main };

})({ Uint8Array: Uint8Array,
     Int8Array: Int8Array,
     Uint16Array: Uint16Array,
     Int16Array: Int16Array,
     Uint32Array: Uint32Array,
     Int32Array: Int32Array,
     Float32Array: Float32Array,
     Float64Array: Float64Array,
     Math: Math },
   { HEAP_SIZE: HEAP_SIZE,
     STACK_SIZE: STACK_SIZE,
     TOTAL_SIZE: SIZE,
     assertEqual: assertEqual,
     print: _print,
     start: start,
     end: end },
   buffer);


function assertEqual(val1, val2) {
  var err = true;
  var msg;
  if(val1 | 0 !== val1) {
    if(Math.abs(val1 - val2) < .00000001) {
      err = false;
    }
    else {
      msg = 'eps';
    }
  }
  else if(val1 === val2) {
    err = false;
  }

  if(err) {
    throw new Error(val1 + ' does not equal ' + val2);
  }
}

function _print(/* arg1, arg2, ..., argN */) {
    var func = ((typeof console !== 'undefined' && console.log) || print);
    func.apply(null, arguments);
}

var _time;
function start() {
  _time = Date.now();
}

function end() {
  return Date.now() - _time;
}

asm.main();
