#include <stdlib.h>
#include <ctype.h>
#include <stdio.h>
#include <stdbool.h>
#include <string.h>
#include <limits.h>

typedef enum e_Tag {
    // Atom node
    IDENT = 1,

    // Operators
    __OP_START__,
        ASSIGN,

        IS_EQ,
        IS_GT,
        IS_LT,
        IS_GE,
        IS_LE,

        OP_ADD,
        OP_SUB,
        OP_MUL,
        OP_DIV,
        OP_MOD,
        OP_POW,

        DOT,
    __OP_END__,

    // Keywords
    KW_FUNCTION,
    KW_WHILE,
    KW_IF,
    KW_ELSE,
    KW_FOR,
    KW_RETURN,

    // Punctuation marks
    BRACE_O  , BRACE_C  ,
    PARAN_O  , PARAN_C  ,
    SQUARE_O , SQUARE_C ,

    COMMA,

    LIST,

    //
    FN_SIGN,
    FN_CALL,

    // Exceptions,
    ERROR = -2147483647,
    T_EOF = -1,
} Tag;

typedef struct s_Token {
    char*  txt;
    Tag    tag;    
    size_t len;
} Token;

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
    size_t  len;
    size_t  cap;

    Tag*    tags;
    char**  token;
    size_t* l;
    size_t* r;

    // Errors
    size_t err_len;
    size_t err_cap;
    Error* errors;
} Parser;

// parser.c
Parser handle_file(char *path);

// errors.c
int add_error(Parser* p, Token loc, char* msg);
void print_error(Parser* p, Error e);

// tokens.c
Token peek(Parser* p);
Token eat(Parser* p);
Token ceat(Parser* p, Tag tag);
bool  meat(Parser* p, Tag tag);
void  skip(Parser* p, Token t);
char* get_tag_name(Tag tag);
