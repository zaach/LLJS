
int run() {
    int N = 200;
    int M = 700;
    unsigned int f = 0;
    unsigned short s = 0;
    int i, t;

    for(t = 0; t < M; t++) {
        for(i = 0; i < N; i++) {
            f = f + i / ((t % 5) + 1);
            if(f > 1000) f = f / ((t % 3) + 1);
            if(i % 4 == 0) f = f + i * (i % 8 == 0 ? 1 : -1);
            s = s + f*f % 256;
        }
    }

    return f;
}

int main() {
    unsigned int f;
    int i;

    for(i = 0; i < 1000; i++) {
        f = run();
    }

    // Needed so that gcc doesn't remove the code as dead
    printf("%d", f);
    return 0;
}
