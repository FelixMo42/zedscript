const { Map } = require('immutable')

class Iterator {
    constructor(value, next, done, isDone) {
        this.value = value

        this.done = isDone

        this._next = next
        this._done = done
    }

    next() {
        if (this.done) {
            return this
        }

        let nextVal = this._next(this.value)
        let isDone = !this._done(nextVal)

        if ( isDone ) {
            return new Iterator(
                this.value,
                (n) => n,
                () => false,
                true
            )
        }

        return new Iterator(
            nextVal,
            this._next,
            this._done,
            false
        )
    }
}

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

    "true": true,
    "false": false,

    "print": (p) => {
        return p
    },

    "for": (inital, next, done = () => false) => {
        return new Iterator(inital, next, done, false)
    },
    "final": (iterator) => {
        while ( !iterator.done ) {
            iterator = iterator.next()
        }

        return iterator.value
    }
})

function run(token, scope) {

    /* simple data types */
    if (token.type == "number") {
        return token.value
    }
    if (token.type == "string") {
        return token.value
    }

    /* complex data types */
    if (token.type == "tuple") {
        return {
            type: "tuple",
            values: token.values.map((param) => run(param, scope))
        }
    }
    if (token.type == "function") {
        return (...params) => {
            let func_scope = scope

            for (let index in token.params) {
                func_scope = func_scope.set(
                    token.params[index].value,
                    params[index]
                )
            }

            return run(token.block, func_scope)
        }
    }

    /* controlle flow */
    if (token.type == "call") {
        let params = []

        for (let param of token.params) {
            let value = run(param, scope)
            if ( value.type == "tuple" ) {
                for (let val of value.values) {
                    params.push(val)
                }
            } else {
                params.push(value)
            }
        }

        // let params = token.params.map((param) => run(param, scope))
        return run(token.fn, scope)(...params)
    }
    if (token.type == "decleration") {
        return run(  
            token.block,
            scope.set(
                token.name.value,
                run(token.value, scope)
            )
        )
    }
    if (token.type == "if") {
        if (run(token.condition, scope)) {
            return run(token.then, scope)
        } else {
            return run(token.else, scope)
        }
    }

    /* index variable */
    if (token.type == "identifier") {
        if ( !scope.has(token.value) ) {
            console.error(`Variable ${token.value} does not exist`)
        }
        return scope.get(token.value)
    }

    console.warn("Cant interprete token: ", token)
}

module.exports = (tokens) => run(tokens, base_scope)