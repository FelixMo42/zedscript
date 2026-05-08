#include "zed.h"

size_t parse_block(Parser *p);
size_t parse_expr(Parser *p);

size_t add_node(Parser* p, Tag tag, char* token, size_t l, size_t r) {
    if (p->len == p->cap) {
        // we have filled up our current array, time to double the size
        p->cap *= 2;

        // reallocate everything
        p->tags  = realloc(p->tags,  p->cap * sizeof(Tag));
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

size_t parse_args(Parser *p) {
    if (ceat(p, PARAN_O).tag == ERROR) return ERROR;

    size_t first_arg_id = p->len;

    Token t = eat(p);
    if (t.tag == IDENT) {
        while (1) {
            add_node(p, IDENT, t.txt, 0, 0);

            t = eat(p);
            if (t.tag == COMMA) t = eat(p);
            else break;

            if (t.tag != IDENT) return add_error(p, t, "Expected identifier");
        }
    }

    if (t.tag != PARAN_C) return add_error(p, t, "Expected ')'");

    return first_arg_id;
}

size_t parse_atom(Parser *p) {
    Token t = peek(p);
    if (t.tag != IDENT) return 0;
    eat(p);

    return add_node(p, IDENT, t.txt, 0, 0);
}

size_t parse_op(Parser *p, int level) {
    if (level == 0) {
        size_t l = parse_op(p, level + 1);
        if (l == 0) return 0;
        if (l == ERROR) return ERROR;
        if (meat(p, ASSIGN)) {
            size_t r = parse_op(p, 0);
            if (r == 0) {
                add_error(p, peek(p), "Expected expression");
                return ERROR;
            }
            if (r == ERROR) return ERROR;
            return add_node(p, ASSIGN, 0, l, r);
        }
        return l;
    } else if (level == 1) {
        size_t l = parse_op(p, level + 1);
        if (l == 0) return 0;
        if (l == ERROR) return ERROR;
        if (meat(p, OP_ADD)) {
            size_t r = parse_op(p, 0);
            if (r == 0) {
                add_error(p, peek(p), "Expected expression");
                return ERROR;
            }
            if (r == ERROR) return ERROR;
            return add_node(p, OP_ADD, 0, l, r);
        }
        if (meat(p, OP_SUB)) {
            size_t r = parse_op(p, 0);
            if (r == 0) {
                add_error(p, peek(p), "Expected expression");
                return ERROR;
            }
            if (r == ERROR) return ERROR;
            return add_node(p, OP_SUB, 0, l, r);
        }
        return l;
    } else if (level == 2) {
        size_t l = parse_op(p, level + 1);
        if (l == 0) return 0;
        if (l == ERROR) return ERROR;
        if (peek(p).tag == PARAN_O) {
            size_t r = parse_args(p);
            if (r == 0) {
                add_error(p, peek(p), "Expected expression");
                return ERROR;
            }
            if (r == ERROR) return ERROR;
            return add_node(p, PARAN_O, 0, l, r);
        }
        return l;
    } else {
        return parse_atom(p);
    }
}

size_t parse_return(Parser *p) {
    // the keyword
    Token t = peek(p);
    if (t.tag != KW_RETURN) return 0;
    eat(p);

    // the value
    size_t value = parse_expr(p);
    if (value == ERROR) return ERROR;

    return add_node(p, 
        KW_RETURN,
        t.txt,
        value,
        0
    );
}

size_t parse_function(Parser *p) {
    // the keyword
    Token t = peek(p);
    if (t.tag != KW_FUNCTION) return 0;
    eat(p);

    // the name
    Token name = ceat(p, IDENT);
    if (name.tag == ERROR) return ERROR;

    // args
    size_t args = parse_args(p);
    if (args == ERROR) return ERROR;

    // body
    size_t body = parse_block(p);
    if (body == ERROR) return ERROR;

    return add_node(p,
        KW_FUNCTION,
        name.txt,
        args,
        body
    );
}

size_t parse_expr(Parser *p) {
    size_t a
        = parse_function(p)
        | parse_return(p)
        | parse_op(p, 0)
    ;

    if (a == 0) return add_error(p, peek(p), "Expected expression");

    return a;
}

size_t parse_block(Parser *p) {
    if (ceat(p, BRACE_O).tag == ERROR) return ERROR;

    size_t first_line_id = p->len;

    while (peek(p).tag != BRACE_C) {
        if (parse_expr(p) == ERROR) return ERROR;
    }
    if (ceat(p, BRACE_C).tag == ERROR) return ERROR;

    return first_line_id;
}

Parser parse(char* src, char* path) {
    // Parser init
    Parser p;

    p.src = src;
    p.ptr = 0;

    p.len = 0;
    p.cap = 1024;

    p.origin = path;

    p.tags  = malloc(p.cap * sizeof(Tag));
    p.token = malloc(p.cap * sizeof(char*));
    p.l     = malloc(p.cap * sizeof(size_t));
    p.r     = malloc(p.cap * sizeof(size_t));

    p.err_len = 0;
    p.err_cap = 8;
    p.errors  = malloc(p.err_cap * sizeof(Error));

    while (peek(&p).tag != EOF) {
        size_t a = parse_expr(&p);
        if (a == ERROR || a == 0) break;
        printf("%zu\n", a);
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
