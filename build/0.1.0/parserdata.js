const _    = require("lodash")
const Rule = require("./lpon/Rule")

let Pattern = (type, rules) => ({
    type: type,
    steps: rules
})

let lexerRules = [
	{
		"type": "qualifier",
		"steps": [
			{
				"rule": {
					"type": "set",
					"values": [
						{
							"type": "match",
							"value": 42
						},
						{
							"type": "match",
							"value": 43
						},
						{
							"type": "match",
							"value": 63
						},
						{
							"type": "match",
							"value": 94
						}
					]
				},
				"then": 0,
				"else": 2
			}
		]
	},
	{
		"type": "parentheses",
		"steps": [
			{
				"rule": {
					"type": "set",
					"values": [
						{
							"type": "match",
							"value": 40
						},
						{
							"type": "match",
							"value": 41
						}
					]
				},
				"then": 0,
				"else": 2
			}
		]
	},
	{
		"type": "newline",
		"steps": [
			{
				"rule": {
					"type": "match",
					"value": 10
				},
				"then": 0,
				"else": 2
			}
		]
	},
	{
		"type": "brackets",
		"steps": [
			{
				"rule": {
					"type": "set",
					"values": [
						{
							"type": "match",
							"value": 91
						},
						{
							"type": "match",
							"value": 93
						}
					]
				},
				"then": 0,
				"else": 2
			}
		]
	},
	{
		"type": "brackets",
		"steps": [
			{
				"rule": {
					"type": "set",
					"values": [
						{
							"type": "match",
							"value": 123
						},
						{
							"type": "match",
							"value": 125
						}
					]
				},
				"then": 0,
				"else": 2
			}
		]
	},
	{
		"type": "string",
		"steps": [
			{
				"rule": {
					"type": "match",
					"value": 39
				},
				"then": 0,
				"else": 2
			},
			{
				"rule": {
					"type": "not",
					"value": {
						"type": "set",
						"values": [
							{
								"type": "match",
								"value": 39
							}
						]
					}
				},
				"then": 0,
				"else": 2
			},
			{
				"rule": {
					"type": "match",
					"value": 39
				},
				"then": 0,
				"else": 2
			}
		]
	},
	{
		"type": "word",
		"steps": [
			{
				"rule": {
					"type": "set",
					"values": [
						{
							"type": "range",
							"start": 97,
							"end": 122
						},
						{
							"type": "range",
							"start": 65,
							"end": 90
						},
						{
							"type": "match",
							"value": 45
						},
						{
							"type": "match",
							"value": 95
						}
					]
				},
				"then": 0,
				"else": 2
			},
			{
				"rule": {
					"type": "set",
					"values": [
						{
							"type": "range",
							"start": 97,
							"end": 122
						},
						{
							"type": "range",
							"start": 65,
							"end": 90
						},
						{
							"type": "match",
							"value": 45
						},
						{
							"type": "match",
							"value": 95
						}
					]
				},
				"then": 1,
				"else": 0
			}
		]
	},
	{
		"type": "not",
		"steps": [
			{
				"rule": {
					"type": "match",
					"value": 33
				},
				"then": 0,
				"else": 2
			}
		]
	},
	{
		"type": "and",
		"steps": [
			{
				"rule": {
					"type": "match",
					"value": 38
				},
				"then": 0,
				"else": 2
			}
		]
	},
	{
		"type": "or",
		"steps": [
			{
				"rule": {
					"type": "match",
					"value": 124
				},
				"then": 0,
				"else": 2
			}
		]
	},
	{
		"type": "equal",
		"steps": [
			{
				"rule": {
					"type": "match",
					"value": 61
				},
				"then": 0,
				"else": 2
			}
		]
	},
	{
		"type": "colon",
		"steps": [
			{
				"rule": {
					"type": "match",
					"value": 58
				},
				"then": 0,
				"else": 2
			}
		]
	},
	{
		"type": "special_char",
		"steps": [
			{
				"rule": {
					"type": "match",
					"value": 92
				},
				"then": 0,
				"else": 2
			},
			{
				"rule": {
					"type": "not",
					"value": {
						"type": "set",
						"values": [
							{
								"type": "match",
								"value": 10
							},
							{
								"type": "match",
								"value": 32
							},
							{
								"type": "match",
								"value": 9
							}
						]
					}
				},
				"then": 0,
				"else": 2
			}
		]
	}
]

let parserRules = {
    rule: [
        Pattern("token", [
            {
                rule: {type: "word"},
                then: Rule.next,
                else: Rule.fail,

                as: "value"
            }
        ]),
        Pattern("value", [
            {
                rule: {type: "string"},
                then: Rule.next,
                else: Rule.fail,

                as: "value"
            }
        ])
    ],
    as: [
        Pattern("as", [
            {
                rule: {value: "{"},
                then: Rule.next,
                else: Rule.fail,
            },
            {
                rule: {type: "word"},
                then: Rule.next,
                else: Rule.fail,

                as: "value"
            },
            {
                rule: {value: "}"},
                then: Rule.next,
                else: Rule.fail,
            }
        ])
    ],
    step: [
        Pattern("step", [
            {
                rule: {type: "rule"},
                then: Rule.next,
                else: Rule.fail,

                as: "rule"
            },
            {
                rule: {type: "as"},
                then: Rule.next,
                else: Rule.next,

                as: "as"
            },
            {
                rule: {type: "qualifier"},
                then: Rule.next,
                else: Rule.next,

                as: "qualifier"
            }  
        ])
    ],
    pattern: [
        Pattern("pattern", [
            {
                rule: {type: "step"},
                then: Rule.loop,
                else: Rule.next,

                as: "rules"
            }
        ])
    ],
    subtype: [
        Pattern("subtype", [
            {
                rule: {type: "colon"},
                then: Rule.next,
                else: Rule.fail
            },
            {
                rule: {type: "word"},
                then: Rule.next,
                else: Rule.fail,

                as: "name"
            },
            {
                rule: {type: "equal"},
                then: Rule.next,
                else: Rule.fail
            },
            {
                rule: {type: "pattern"},
                then: Rule.next,
                else: Rule.fail,

                as: "pattern"
            },
            {
                rule: {type: "newline"},
                then: Rule.next,
                else: Rule.fail
            },
        ])
    ],
    type: [
        Pattern("type", [
            {
                rule: {type: "word"},
                then: Rule.next,
                else: Rule.fail,

                as: "name"
            },
            {
                rule: {type: "newline"},
                then: Rule.next,
                else: Rule.fail
            },
            {
                rule: {type: "subtype"},
                then: Rule.loop,
                else: Rule.next,

                as: "subtypes"
            }
        ])
    ],
    file: [
        Pattern("file", [
            {
                rule: {type: "newline"},
                then: Rule.loop,
                else: Rule.next
            },
            {
                rule: {type: "type"},
                then: Rule.loop,
                else: Rule.next,

                as: "types"
            }
        ])
    ]
}

let parserDefault = "file"

let formaterRules = {
    file: node => 
        node.types.reduce((types, type) => {
            types[type.name] = type.subtypes

            return types
        }, {}),
    subtype: node => ({
        type: node.name,
        steps: node.pattern 
    }),
    pattern: node =>
       node.rules.reduce((steps, step) => steps.concat(...step)),
    as: node => node.value,
    step: node =>
        Rule.step.make(node.rule, node.qualifier || "-", {as: node.as}),
    
    token: node => ({type: node.value}),
    value: node => ({value: node.value}),

    string: value => value.substring(1, value.length - 1)
}

module.exports = { lexerRules, parserRules, parserDefault,  formaterRules }