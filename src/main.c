#include "zed.h"

int main(int argc, char** argv) {
    Parser ast = handle_file(argv[1]);
    for (size_t i = 0; i < ast.err_len; i++) {
        print_error(&ast, ast.errors[i]);
    }
    return 0;
}
