#include "zed.h"

size_t parse_block(Parser *p);
size_t parse_expr(Parser *p);
size_t parse_expression(Parser *p, int min_precedence);

size_t add_node(Parser* p, Tag tag, char* token, size_t l, size_t r) {
    if (p->len == p->cap) {
        // we have filled up our current array, time to double the size
        p->cap *= 2;

        // reallocate everything
        // todo: make this one big block,
        //       then partion between the sub arrays
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

    size_t first = parse_expr(p);
    size_t last  = first;
    if (first == ERROR) return ERROR;
    if (first != 0) {
        while (1) {
            if (!meat(p, COMMA)) break;
            last = parse_expr(p);
            if (last == ERROR) return ERROR;
            if (last == 0) return add_error(p, peek(p), "Expected expression");
        }
    }

    if (ceat(p, PARAN_C).tag == ERROR) return ERROR;

    return first;
}

size_t parse_atom(Parser *p) {
    Token t = peek(p);
    if (t.tag != IDENT) return 0;
    skip(p, t);

    return add_node(p, IDENT, t.txt, 0, 0);
}

bool is_op(Tag tag) {
    return __OP_START__ < tag && tag < __OP_END__;
}

size_t parse_increasing_precedence(Parser *p, int min_precedence, size_t l) {
    Token op = peek(p);

    // We have a function call!
    if (op.tag == PARAN_O) {
        size_t args = parse_args(p);
        if (args == ERROR) return ERROR;
        return add_node(p, FN_CALL, p->token[l], l, args);
    }

    // Check if we have an operator
    if (!is_op(op.tag)) return l;
    if (op.tag <= min_precedence) return l;
    skip(p, op);

    // The default case is to assume this is a binary operator
    size_t r = parse_expression(p, op.tag);
    if (r == ERROR) return ERROR;
    if (r == 0) return add_error(p, op, "Expected expression 2");
    return add_node(p, op.tag, p->token[l], l, r);
}

size_t parse_expression(Parser *p, int min_precedence) {
    size_t l = parse_atom(p);
    if (l == ERROR) return ERROR;
    if (l == 0) return 0;

    while (true) {
        size_t n = parse_increasing_precedence(p, min_precedence, l);
        if (n == ERROR) return ERROR;
        if (n == l) return l;
        l = n;
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

    // Make the function node
    size_t func_node = add_node(p,
        KW_FUNCTION,
        t.txt,
        0,
        0
    );

    // the name
    Token name = ceat(p, IDENT);
    if (name.tag == ERROR) return ERROR;

    // args
    size_t args = parse_args(p);
    if (args == ERROR) return ERROR;
    p->l[func_node] = add_node(p, FN_SIGN,
        name.txt,
        args,
        0
    );

    // body
    size_t body = parse_block(p);
    if (body == ERROR) return ERROR;
    p->r[func_node] = args;

    return func_node;
}

size_t parse_expr(Parser *p) {
    size_t a
        = parse_function(p)
        | parse_return(p)
        | parse_expression(p, 0)
    ;

    if (a == 0) return add_error(p, peek(p), "Expected expression 1");

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

    p.len = 1;
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
