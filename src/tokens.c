#include "zed.h"

void skip_whitespace(char* src, size_t* ptr) {
    while (isspace(src[*ptr])) *ptr = *ptr + 1;
}

bool is_punctuation(char c) {
    return (
        c == '[' ||
        c == ']' ||
        c == '(' ||
        c == ')' ||
        c == '}' ||
        c == '{' ||
        c == '.' ||
        c == ',' ||
        c == '@'
    );
}

bool is_ident(char c) {
    return (
        ('a' <= c && c <= 'z') || 
        ('A' <= c && c <= 'Z') || 
        ('0' <= c && c <= '9') || 
        c == '_'
    );
}

Tag get_op_kind(Parser* p, Token t) {
    if (strncmp(t.txt, "=", t.len) == 0) return IS_EQ;

    if (strncmp(t.txt, "+", t.len) == 0) return OP_ADD;
    if (strncmp(t.txt, "-", t.len) == 0) return OP_SUB;
    if (strncmp(t.txt, "*", t.len) == 0) return OP_MUL;
    if (strncmp(t.txt, "/", t.len) == 0) return OP_DIV;
    if (strncmp(t.txt, "%", t.len) == 0) return OP_MOD;
    if (strncmp(t.txt, "^", t.len) == 0) return OP_POW;

    if (strncmp(t.txt, "==", t.len) == 0) return IS_EQ;
    if (strncmp(t.txt, "<=", t.len) == 0) return IS_LE;
    if (strncmp(t.txt, ">=", t.len) == 0) return IS_GE;
    if (strncmp(t.txt, "<",  t.len) == 0) return IS_LT;
    if (strncmp(t.txt, ">",  t.len) == 0) return IS_GT;

    add_error(p, t, "Unknown operator kind!");

    return ERROR;
}

Tag get_keyword_kind(Token t) {
    if (strncmp(t.txt, "function", t.len) == 0) return KW_FUNCTION;
    if (strncmp(t.txt, "while",    t.len) == 0) return KW_WHILE;
    if (strncmp(t.txt, "if",       t.len) == 0) return KW_IF;
    if (strncmp(t.txt, "else",     t.len) == 0) return KW_ELSE;
    if (strncmp(t.txt, "return",   t.len) == 0) return KW_RETURN;

    return IDENT;
}

char* get_tag_name(Tag tag) {
    switch (tag) {
        case IDENT: return "an identifier";
        case IS_EQ: return "'=='";
        case IS_GT: return "'>'";
        case IS_LT: return "'<'";
        case IS_GE: return "'>='";
        case IS_LE: return "'<='";
        case KW_FUNCTION: return "'function'";
        case KW_WHILE: return "'while'";
        case KW_IF: return "'if'";
        case KW_ELSE: return "'else'";
        case KW_RETURN: return "'return'";
        case T_EOF: return "EOF";
        case ERROR: return "ERROR";
        case SQUARE_O: return "'['";
        case SQUARE_C: return "']'";
        case PARAN_O: return "'('";
        case PARAN_C: return "')'";
        case BRACE_O: return "'{'";
        case BRACE_C: return "'}'";
        case COMMA: return "','";
        case DOT: return "'.'";
        case AT: return "'@'";
        default: return "UNKNOWN";
    }
}

bool is_not_op(char c) {
    return is_punctuation(c) || is_ident(c) || isspace(c) || c == '\0';
}

Token peek(Parser *p) {
    skip_whitespace(p->src, &p->ptr);
    
    Token t; 
    t.txt = &p->src[p->ptr];
    t.len = 1;

    if (is_punctuation(p->src[p->ptr])) {
        t.tag = p->src[p->ptr];
    }

    else if (is_ident(p->src[p->ptr])) {
        while (is_ident(p->src[p->ptr + t.len])) t.len++;
        t.tag = get_keyword_kind(t);
    }

    else if (p->src[p->ptr] != '\0') {
        while (!is_not_op(p->src[p->ptr + t.len])) t.len++;
        t.tag = get_op_kind(p, t);
    }

    else {
        t.tag = EOF;
    }

    return t;
}

Token eat(Parser *p) {
    Token t = peek(p);
    p->ptr += t.len;
    return t;
}

Token ceat(Parser *p, Tag tag) {
    Token t = eat(p);
    if (t.tag != tag) {
        char *msg;
        asprintf(&msg, "Expected %s, got %s!", 
            get_tag_name(tag),
            get_tag_name(t.tag)
        );
        add_error(p, t, msg);
        t.tag = ERROR;
    }
    return t;
}

bool meat(Parser *p, Tag tag) {
    Token t = peek(p);
    if (t.tag == tag) {
        p->ptr += t.len;
        return true;
    }
    return false;
}
