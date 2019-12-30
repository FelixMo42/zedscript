const Rule = (text) => {

}

Rule.done = 0
Rule.fail = 1
Rule.next = 2
Rule.loop = 3

Rule.match = (rule, string, start) => {
    let length    = 0
    let ruleIndex = 0

    while (true) {
        let char = string[start + length]

        let outcome =
            rule[ruleIndex].rule(char) ?
            rule[ruleIndex].then :
            rule[ruleIndex].else

        length += 1

        if (outcome == Rule.done) {
            return length
        }
        
        if (outcome == Rule.fail) {
            return -1
        }
        
        if (outcome == Rule.loop) {

        }
        
        if (outcome == Rule.next) {
            ruleIndex += 1
        }
    }
}

let length = Rule.match([
    {
        rule: (char) => char == "i",
        then: Rule.next,
        else: Rule.fail
    },
    {
        rule: (char) => char == "f",
        then: Rule.done,
        else: Rule.fail
    }
], "if  ", 0)

console.log(length)

// let line = "(+ 12.5 abc) if"

// let tokens = {
//     syntax: [
//         "if",
//         "fn",
//         ":",
//         "(",
//         ")"
//     ],
//     number: [
//         "0-9"
//     ],
//     word: [
//         "^:\(\)"
//     ],
// }

// // let Lexer = (types) => (file) => {
// //     for (let type in types) {
// //         console.log("==", type)
// //         for (let rule of types[type]) {
// //             let token = file.match(rule)
// //             console.log(token)
// //         }
// //     }
// // }

// // let myLexer = Lexer(tokens)

// // console.log( myLexer(line) )