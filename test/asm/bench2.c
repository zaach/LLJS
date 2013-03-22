
#include<stdio.h>
#include<string.h>
#include<stdlib.h>

int run() {
    int N = 16384;
    int M = 200;
    int final = 0;
    int i, t;

    char *buf = (char*)malloc(N);
    for (t = 0; t < M; t++) {
        for (i = 0; i < N; i++)
            buf[i] = (i + final)%256;
        for (i = 0; i < N; i++)
            final += buf[i] & 1;
        final = final % 1000;
    }

    return final;
}

int main() {
    int f, i;

    for(i = 0; i < 1000; i++) {
        f = run();
    }

    // Needed so that gcc doesn't remove the code as dead
    printf("%d", f);
    return 0;
}
