(function() {

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

    {% imports %}

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

    function memcpy(dest, src, num) {
        dest = dest|0; src = src|0; num = num|0;
        var ret = 0;
        ret = dest|0;
        if ((dest&3) == (src&3)) {
            while (dest & 3) {
                if ((num|0) == 0) return ret|0;
                U1[(dest)]=U1[(src)];
                dest = (dest+1)|0;
                src = (src+1)|0;
                num = (num-1)|0;
            }
            while ((num|0) >= 4) {
                U4[((dest)>>2)]=U4[((src)>>2)];
                dest = (dest+4)|0;
                src = (src+4)|0;
                num = (num-4)|0;
            }
        }
        while ((num|0) > 0) {
            U1[(dest)]=U1[(src)];
            dest = (dest+1)|0;
            src = (src+1)|0;
            num = (num-1)|0;
        }
        return ret|0;
    }

    function memset(ptr, value, num) {
        ptr = ptr|0; value = value|0; num = num|0;
        var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
        stop = (ptr + num)|0;
        if ((num|0) >= 20) {
            // This is unaligned, but quite large, so work hard to get to aligned settings
            value = value & 0xff;
            unaligned = ptr & 3;
            value4 = value | (value << 8) | (value << 16) | (value << 24);
            stop4 = stop & ~3;
            if (unaligned) {
                unaligned = (ptr + 4 - unaligned)|0;
                while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
                    U1[(ptr)]=value;
                    ptr = (ptr+1)|0;
                }
            }
            while ((ptr|0) < (stop4|0)) {
                U4[((ptr)>>2)]=value4;
                ptr = (ptr+4)|0;
            }
        }
        while ((ptr|0) < (stop|0)) {
            U1[(ptr)]=value;
            ptr = (ptr+1)|0;
        }
    }

