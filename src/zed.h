#include <stdlib.h>
#include <ctype.h>
#include <stdio.h>
#include <stdbool.h>
#include <string.h>

#include "style.h"

typedef enum e_TokenKind {
    // Ident
    IDENT,
    T_EOF,

    // Operators
    IS_EQ,
    IS_GT,
    IS_LT,
    IS_GE,
    IS_LE,

    // Key words
    KW_FUNCTION,
    KW_WHILE,
    KW_IF,
    KW_ELSE,
    KW_FOR,
    KW_RETURN,

    // Punctuation marks
    BRACE_O = '{',
    BRACE_C = '}',
    PARAN_O = '(',
    PARAN_C = ')',
    SQUARE_O = '[',
    SQUARE_C = ']',
    COMMA = ',',
    DOT   = '.',
    AT    = '@',

    ERROR,
} TokenKind;

typedef struct s_Token {
    char*     txt;
    char      tag;    
    size_t    len;
} Token;

typedef enum e_NodeKind {
    N_FN_DEF,
} NodeKind;

typedef struct s_Error {
    char* msg;
    Token loc;
} Error;

typedef struct s_Parser {
    // 
    char*  src;
    size_t ptr;

    // What file are we parsing?
    char*  origin;

    // Node data
    size_t    len;
    size_t    cap;
    NodeKind* tags;
    char**    token;
    size_t*   l;
    size_t*   r;

    // Errors
    size_t err_len;
    size_t err_cap;
    Error* errors;
} Parser;

// errors.c
void add_error(Parser* p, Token loc, char* msg);
void print_error(Parser* p, Error e);

// tokens.c
Token eat(Parser* p);
Token ceat(Parser* p, TokenKind tag);