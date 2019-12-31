let defaultSteper = {
    start: (rule) => {},
    next: (step, match) => {},
    final: ({step, start, length, data}) => {},
    fail: ({}) => {}
}

let Ruleset = ({compare, steper}) => {
    const Rule = {}

    Rule.next = 0
    Rule.loop = 1
    Rule.fail = 2

    Rule.match = (rule, data, start) => {
        let length    = 0
        let ruleIndex = 0

        let step = steper.start(rule)

        while (true) {
            // does the data match the rule?
            let match = compare(rule[ruleIndex].rule, data, start + length)

            // only move on to the next position if the rule matchs
            if (match) {
                length += 1
            }

            step = steper.next({step, match})

            // what should we do next?
            let outcome = match ? rule[ruleIndex].then : rule[ruleIndex].else

            // lets move on to the next rule
            if (outcome == Rule.next) {
                ruleIndex += 1

                // weve reached the end, were done.
                // return the length or the callback
                if (ruleIndex == rule.length) {
                    return steper.final(step)
                }
            }

            // lets loop around and do the same thing again
            if (outcome == Rule.loop) {}

            // this is not a match, return 0 or the callback
            if (outcome == Rule.fail) {
                return steper.fail(step)
            }
        }
    }

    Rule.longest = (matchs) => matchs.reduce(
        (longest, match) => match.length > longest.length ? match : longest
    )

    Rule.longestMatch = (rules, data, start) => Rule.longest(
        rules.map(rule => Rule.match(rule, data, start))
    )

    return Rule
}

module.exports = {
    ...Ruleset({}),
    Ruleset
}