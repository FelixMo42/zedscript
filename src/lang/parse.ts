import { p3 } from "../parser/exp.ts";
import { lexer } from "./lexer.ts";
import { FileNode } from "../../out/types.ts";

// EXPR //

// function parse_ops(tks: TokenStream) {
//     return parse_op_util(parse_value, [
//         ["==", ">", "<", ">=", "<="],
//         ["+", "-"],
//         ["*", "/"],
//         ["**"]
//     ])(tks)
// }

// TOP LEVEL //

const parse_file = p3<FileNode>("file_node")`
    file_node = items:top_level_decl_node*

    top_level_decl_node = :func_node
    top_level_decl_node = :struct_node

    struct_node =
        "struct" name:ident "{"
            fields:param_node*
        "}"

    func_node =
        "fn" name:ident "(" params:param_node, ")" return_type:type_node "{"
            body:statment_node*
        "}"

    param_node = name:ident type:type_node

    type_node = name:ident "<" args:type_node, ">"
    type_node = name:ident

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

    ternary_node = a:value_node "if" cond:expr_node "else" b:expr_node
    ternary_node = :value_node

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

export function parse(src: string) {
    return parse_file(lexer(src))!
}

// function parse_op_util(sub: (tks: TokenStream) => ExprNode | undefined, ops: Op[][]): (tks: TokenStream) => ExprNode | undefined {
//     const s = ops.length > 1 ? parse_op_util(sub, ops.slice(1)) : sub

//     return function self(tks: TokenStream): ExprNode | undefined {
//         const a = s(tks)
//         if (!a) return undefined
//         const save = tks.save()

//         for (const op of ops[0]) {
//             if (tks.take(op)) {
//                 const b = self(tks)!
//                 return { kind: "OP_NODE", op, a, b }
//             }
//         }

//         tks.load(save)
//         return a
//     }
// }
