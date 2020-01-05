const Rule = module.exports = {}

Rule.next = 0
Rule.loop = 1
Rule.fail = 2

Rule.Matcher = ({compare, generate, update, finish, failure}) => {
    let match = (pattern, data, start) => {
        // the length of the match
        let length = 0

        // the maximum length for the match
        let maxLength = data.length - start

        // how far along we are in the rule
        let index = 0

        // generate a value to keep track of info if given a function to do so
        // else just leave it undefined
        let value = generate != undefined ?
            generate({pattern, data, start}) :
            undefined

        while (true) {
            // get current rule
            let step = pattern.steps[index]

            // get a match on the data
            let match = length >= maxLength ? false :
                compare(step.rule, data, start + length)

            // if return true or false then map to a lengthed value
            if (match == true ) { match = {length: 1} }
            if (match == false) { match = {length: 0} }

            // was it successful
            let successful = match.length != 0

            // skip over whats allready been matched
            length += match.length

            // update the value if there is an update function
            if (successful && update != undefined) {
                value = update({
                    value  : value,
                    match  : match.value,
                    step   : step,
                    data   : data,
                    length : length
                })
            }

            // what should we do next?
            let outcome = successful ? step.then : step.else

            // lets move on to the next step
            if (outcome == Rule.next) {
                index += 1

                // weve reached the end, were done.
                // return the length or the callback
                if (index == pattern.steps.length) {
                    if (finish != undefined) {
                        return {
                            value: finish({
                                value,
                                pattern,
                                data,
                                start,
                                length
                            }),
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

            // lets loop around and do the same step again
            if (outcome == Rule.loop) {}

            // this is not a match, return a match of length 0
            if (outcome == Rule.fail) {
                // console.log("failed at: ", data[index])
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

Rule.step = {}

Rule.step.qualifiers = {
    "*": (rule, extra) => [
        {
            rule: rule,
            then: Rule.loop,
            else: Rule.next,
            ...extra
        }
    ],
    "+": (rule, extra) => [
        {
            rule: rule,
            then: Rule.next,
            else: Rule.fail,
            ...extra
        },
        {
            rule: rule,
            then: Rule.loop,
            else: Rule.next,
            ...extra
        }
    ],
    "?": (rule, extra) => [
        {
            rule: rule,
            then: Rule.next,
            else: Rule.next,
            ...extra
        }    
    ],
    "-": (rule, extra) => [
        {
            rule: rule,
            then: Rule.next,
            else: Rule.fail,
            ...extra
        }
    ]
}

Rule.step.make = (rule, qualifier, extra) => {
    if (!(qualifier in Rule.step.qualifiers)) {
        console.log(`Invalid step qualifier: "${qualifier}"`)
    }

    return Rule.step.qualifiers[qualifier](rule, extra)
}