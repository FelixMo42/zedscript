#include "zed.h"

size_t add_node(Parser* p, NodeKind tag, char* token, size_t l, size_t r) {
    if (p->len == p->cap) {
        // we have filled up our current array, time to double the size
        p->cap *= 2;

        // reallocate everything
        p->tags  = realloc(p->tags,  p->cap * sizeof(NodeKind));
        p->token = realloc(p->token, p->cap * sizeof(char*));
        p->l     = realloc(p->l,     p->cap * sizeof(size_t));
        p->r     = realloc(p->r,     p->cap * sizeof(size_t));
    }

    // Add the data to the ast
    p->tags[p->len]  = tag;
    p->token[p->len] = token;
    p->l[p->len]     = l;
    p->r[p->len]     = r;

    // Increment the len and return the index of this node
    return p->len++;
}

size_t parse_function(Parser *p) {
    Token name = ceat(p, IDENT);
    if (name.tag == ERROR) return ERROR;

    // args
    if (ceat(p, PARAN_O).tag == ERROR) return ERROR;
    if (ceat(p, PARAN_C).tag == ERROR) return ERROR;

    // body
    if (ceat(p, BRACE_O).tag == ERROR) return ERROR;
    if (ceat(p, BRACE_C).tag == ERROR) return ERROR;

    return add_node(p,
        N_FN_DEF,
        name.txt,
        0,
        0
    );
}

Parser parse(char* src, char* path) {
    // Parser init
    Parser p;

    p.src = src;
    p.ptr = 0;

    p.len = 0;
    p.cap = 1024;

    p.origin = path;

    p.tags  = malloc(p.cap * sizeof(NodeKind));
    p.token = malloc(p.cap * sizeof(char*));
    p.l     = malloc(p.cap * sizeof(size_t));
    p.r     = malloc(p.cap * sizeof(size_t));

    p.err_len = 0;
    p.err_cap = 8;
    p.errors  = malloc(p.err_cap * sizeof(Error));

    // Parse the file
    Token t = eat(&p);

    if (t.tag == KW_FUNCTION) {
        parse_function(&p);
    }

    // Return the parser with the AST inside of it
    return p;
}

Parser handle_file(char *path) {
    FILE* fd = fopen(path, "r");

    size_t capacity = 1024;
    char* buffer = malloc(capacity);
    while (1) {
        int got = fread(buffer, sizeof(char), capacity, fd);
        if (got == 0) break;

        buffer[got] = '\0';

        // todo: realloc and keep reading.
        // We want the whole file. None of this
        // incramental parsing bs
    }

    return parse(buffer, path);
}

int main(int argc, char** argv) {
    Parser ast = handle_file(argv[1]);
    for (size_t i = 0; i < ast.err_len; i++) {
        print_error(&ast, ast.errors[i]);
    }
    return 0;
}
