#include "zed.h"

int add_error(Parser* p, Token loc, char* msg) {
    if (p->err_len == p->err_cap) {
        p->cap *= 2;
        p->errors = realloc(p->errors, p->err_cap * sizeof(Error));
    }

    p->errors[p->err_len].loc = loc;
    p->errors[p->err_len].msg = msg;

    p->err_len++;

    return ERROR;
}

Token get_line(Parser *p, Token t) {
    Token line;

    line.txt = t.txt;
    while (line.txt != p->src && *(line.txt - 1) != '\n') line.txt--;

    line.len = 0;
    while (line.txt[line.len] != '\n' && line.txt[line.len] != '\0') line.len++;

    return line;
}

int get_line_number(Parser* p, char* txt) {
    int line = 1;
    char* s = p->src;
    while (s != txt) {
        if (*s == '\n') line++;
        s++;
    }
    return line;
}

void print_error(Parser* p, Error e) {
    Token line = get_line(p, e.loc);

    int row = get_line_number(p, e.loc.txt);
    int col = e.loc.txt - line.txt;

    printf("\n");
    printf("\033[1m%s:%d:%d: \033[31merror:\033[0m %s\n",
        p->origin,
        row,
        col + 1,
        e.msg
    );

    int a = e.loc.txt - line.txt;
    int b = e.loc.len;
    printf(" %d | %.*s\033[4m%.*s\033[0m%.*s\n",
        row,
        (int)(col), (line.txt + 0),
        (int)(b), (line.txt + col),
        (int)(line.len - col - b), (line.txt + col + b)
    );
    printf("\n");
}
