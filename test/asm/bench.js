
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
  var N = 0, M = 0, f = 0, s = 0, t = 0, i = 0, $SP = 0;
  U4[1] = totalSize;
  U4[0] = 4;
  N = 20000;
  M = 7000;
  f = 0;
  s = 0;
  start();
  for (t = 0; (t | 0) < (M | 0); t = (t | 0) + 1 | 0) {
    for (i = 0; (i | 0) < (N | 0); i = (i | 0) + 1 | 0) {
      f = ((f >>> 0) + ((i | 0) / (((t | 0) % 5 | 0 | 0) + 1 | 0 | 0) | 0 | 0) | 0) >>> 0;
      if (f >>> 0 > 1000)
        f = ((f >>> 0) / ((((t | 0) % 3 | 0 | 0) + 1 | 0) >>> 0 >>> 0) | 0) >>> 0;
      if (((i | 0) % 4 | 0 | 0) == 0)
        f = ((f >>> 0) + (imul(i, ((i | 0) % 8 | 0 | 0) == 0 ? 1 : -1) | 0) | 0) >>> 0;
      s = ((s >>> 0) + ((imul(f & 65535, f & 65535) | 0) % 256 | 0 | 0) | 0) & 65535;
    }
  }
  print(end() | 0);
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
