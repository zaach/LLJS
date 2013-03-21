
    function _main() {
        U4[0] = 4;
        U4[1] = totalSize;
        return +main();
    }

    return { main: _main };

})(this,
   { HEAP_SIZE: HEAP_SIZE,
     STACK_SIZE: STACK_SIZE,
     TOTAL_SIZE: SIZE },
   buffer);

print(asm.main());