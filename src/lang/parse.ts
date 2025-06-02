import { build_parser } from "@src/core/parser_builder.ts";
import { FileNode } from "@out/types.ts";

export const parse = build_parser<FileNode>`
    file_node = items:top_level_decl_node*

    top_level_decl_node = :func_node
    top_level_decl_node = :struct_node

    struct_node =
        "struct" name:ident "{"
            fields:param_node*
        "}"

    func_node =
        "fn" name:ident "(" params:param_node, ")" return_type:expr_node "{"
            body:statment_node*
        "}"

    param_node = name:ident type:expr_node

    statment_node = :while_node
    statment_node = :return_node
    statment_node = :if_node
    statment_node = :assignment_node
    statment_node = :discard_node

    while_node  = "while" cond:expr_node "{" body:statment_node* "}"
    return_node = "return" value:expr_node

    if_node = "if" cond:expr_node "{" a:statment_node* "}" "else" "{" b:statment_node* "}"
    if_node = "if" cond:expr_node "{" a:statment_node* "}" "else" b:if_node
    if_node = "if" cond:expr_node "{" a:statment_node* "}"

    assignment_node = name:expr_node "=" value:expr_node
    discard_node    = value:expr_node

    expr_node = :ternary_node

    ternary_node = a:v1_node "if" cond:expr_node "else" b:expr_node
    ternary_node = :v1_node

    v1_node = a:v2_node op:"==" b:v1_node
    v1_node = a:v2_node op:">"  b:v1_node
    v1_node = a:v2_node op:"<"  b:v1_node
    v1_node = a:v2_node op:">=" b:v1_node
    v1_node = a:v2_node op:"<=" b:v1_node
    v1_node = :v2_node

    v2_node = a:v3_node op:"+" b:v2_node
    v2_node = a:v3_node op:"-" b:v2_node
    v2_node = :v3_node

    v3_node = a:v4_node op:"*" b:v3_node
    v3_node = a:v4_node op:"/" b:v3_node
    v3_node = :v4_node

    v4_node = a:value_node op:"**" b:v4_node
    v4_node = :value_node

    value_node = :index_node
    value_node = :field_node
    value_node = :call_node
    value_node = :object_node
    value_node = :array_node
    value_node = :ident_node
    value_node = :number_node
    value_node = "(" :expr_node ")"

    index_node  = value:value_node "[" index:expr_node "]"
    field_node  = value:value_node "." field:ident
    call_node   = func:value_node "(" args:expr_node, ")"

    object_node = "{" items:arg_node, "}"
    array_node  = "[" items:expr_node, "]"

    ident_node  = value:ident
    number_node = value:number

    arg_node = name:ident ":" value:expr_node
`
