const Rule = module.exports = {}

Rule.next = 0
Rule.loop = 1
Rule.fail = 2

Rule.Matcher = ({compare, generate, update, finish, failure}) => {
    let match = (rule, data, start) => {
        // the length of the match
        let length = 0

        // how far along we are in the rule
        let ruleIndex = 0

        // generate a value to keep track of info if given a function to do so
        // else just leave it undefined
        let value = generate != undefined ?
            generate({rule, data, start}) :
            undefined

        while (true) {
            // get a match on the data
            let match = compare(rule[ruleIndex].rule, data, start + length)

            // if return true or false then map to a lengthed value
            if (match == true ) { match = {length: 1} }
            if (match == false) { match = {length: 0} }

            // was it succsefull
            let succses = match.length != 0

            // skip over whats allready been matched
            length += match.length

            // update the value if there is an update function
            if (succses && update != undefined) {
                value = update({
                    value  : value,
                    match  : match.value,
                    rule   : rule[ruleIndex],
                    data   : data,
                    length : length
                })
            }

            // what should we do next?
            let outcome = succses ? rule[ruleIndex].then : rule[ruleIndex].else

            // lets move on to the next rule
            if (outcome == Rule.next) {
                ruleIndex += 1

                // weve reached the end, were done.
                // return the length or the callback
                if (ruleIndex == rule.length) {
                    if (finish != undefined) {
                        return {
                            value: finish({value, rule, data, start, length}),
                            length: length
                        }
                    } else {
                        return {
                            value: value,
                            length: length
                        }
                    }
                }
            }

            // lets loop around and do the same thing again
            if (outcome == Rule.loop) {}

            // this is not a match, return a match of length 0
            if (outcome == Rule.fail) {
                return { value: failure, length: 0 }
            }
        }
    }

    let Matcher = {}

    Matcher.match = (rule, data, start) => match(rule, data, start).value

    Matcher.longestMatch = (rules, data, start, unwrap) => {
        // get all the matchs with the given rules
        let matchs = rules.map(rule => match(rule, data, start))

        // start out with the max being the first match
        let max = matchs[0]

        // iterate throught the remaining matchs to find the longest
        let length = matchs.length
        for (let i = 1; i < length; i++) {
            if (matchs[i].length > max.length) {
                max = matchs[i]
            }
        }

        // return the value of the maximum element
        return unwrap ? max : max.value
    }

    return Matcher
}