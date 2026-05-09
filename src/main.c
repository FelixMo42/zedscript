#include "zed.h"

int main(int argc, char** argv) {
    // Parse the file
    Parser ast = handle_file(argv[1]);
    
    // Check if we have any errors
    for (size_t i = 0; i < ast.err_len; i++) {
        print_error(&ast, ast.errors[i]);
    }
    if (ast.err_len > 0) return 1;

    // 
    size_t func_id = 1;
    char* name = ast.token[ast.l[func_id]];
    printf("%.*s\n", 5, name);

    return 0;
}

