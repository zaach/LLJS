
int main() {
    int N = 20000;
    int M = 7000;
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

    printf("%d", s);
}
