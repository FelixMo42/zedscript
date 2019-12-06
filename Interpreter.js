const { Map } = require('immutable');

const base_scope = new Map({
    "+": (a, b) => a + b,
    "*": (a, b) => a * b,
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5
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
}

module.exports = (tokens) => run(tokens, base_scope)