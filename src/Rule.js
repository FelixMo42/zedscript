let Ruleset = ({tokenize = () => ({})}) => {
    const Rule = {}

    Rule.next = 0
    Rule.loop = 1
    Rule.fail = 2

    makeToken = (start, length) => ({
        ...tokenize(rule, data, start, length),
        start: start, end: start + length, length: length
    })

    Rule.match = (rule, data, start) => {
        let length    = 0
        let ruleIndex = 0

        while (true) {
            // does the char match the rule?
            let match = rule[ruleIndex].rule( data[start + length] )

            // only move on to the next char if the rule matchs
            if (match) {
                length += 1
            }

            // what should we do next?
            let outcome = match ? rule[ruleIndex].then : rule[ruleIndex].else

            // lets move on to the next rule
            if (outcome == Rule.next) {
                ruleIndex += 1

                // weve reached the end, were done.
                // return the length or the callback
                if (ruleIndex == rule.length) {
                    return {
                        ...tokenize(rule, data, start, length),
                        start: start, end: start + length, length: length
                    }
                }
            }

            // lets loop around and do the same thing again
            if (outcome == Rule.loop) {}

            // this is not a match, return 0 or the callback
            if (outcome == Rule.fail) {
                return {
                    start: start, end: start + length, length: length
                }
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