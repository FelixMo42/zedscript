const { Map } = require('immutable');

const base_scope = new Map({
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => a / b,
    "=": (a, b) => a == b,
    ">": (a, b) => a > b,
    ">=": (a, b) => a >= b,
    "<": (a, b) => a < b,
    ">=": (a, b) => a >= b,
    "and": (a, b) => a && b,
    "or": (a, b) => a || b,

    "print": (p) => {
        console.log(p)
        return p
    },
    "true": true,
    "false": false
})

function run(token, scope) {
    if (token.type == "call") {
        let params = token.params.map((param) => run(param, scope))
        return run(token.fn, scope)(...params)
    }
    if (token.type == "variable") {
        if ( !scope.has(token.name) ) {
            console.error(`Variable ${token.name} does not exist`)
        }
        return scope.get(token.name)
    }
    if (token.type == "decleration") {
        return run(  
            token.block,
            scope.set(
                token.name.name,
                run(token.value, scope)
            )
        )
    }
    if (token.type == "number") {
        return token.value
    }
    if (token.type == "string") {
        return token.value
    }
    if (token.type == "function") {
        return (...params) => {
            let func_scope = scope

            for (let index in token.params) {
                func_scope = func_scope.set(
                    token.params[index].name,
                    params[index]
                )
            }

            return run(token.block, func_scope)
        }
    }
    if (token.type == "if") {
        if (run(token.condition, scope)) {
            return run(token.then, scope)
        } else {
            return run(token.else, scope)
        }
    }
}

module.exports = (tokens) => run(tokens, base_scope)