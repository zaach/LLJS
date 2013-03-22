

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
     print: _print },
   buffer);


function assertEqual(val1, val2) {
    if(val1 !== val2) {
        throw new Error(val1 + ' does not equal ' + val2);
    }
}

function _print(/* arg1, arg2, ..., argN */) {
    var func = ((typeof console !== 'undefined' && console.log) || print);
    func.apply(null, arguments);
}

_print(asm.main());