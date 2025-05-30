import { writeFile } from "node:fs/promises";

interface Block {
    code: string[]
    loop?: Block[]
    target: Target
    parents: Block[]
}

type Target = [string, Block, Block] | Set<Block>

export function Block(code: string[], target: Target) {
    const block = {
        code,
        target,
        parents: []
    } as Block

    if (Array.isArray(target)) {
        target[1].parents.push(block)
        target[2].parents.push(block)
    } else if (target) {
        target.forEach((child => child.parents.push(block)))
    }

    return block
}

export function build(b: Block) {
    let src = b.code.join(";") + ";"

    if (Array.isArray(b.target)) {
        src += `if (${b.target[0]}) {;`
        if (b.target[1].parents.length === 1) {
            src += build(b.target[1])
        }
        src += `} else {;`
        if (b.target[1].parents.length === 1) {
            src += build(b.target[2])
        }
        src += `};`
    } else if (b.target?.values().toArray().length === 1) {
        if (b.target.values().toArray()[0].parents.length === 1) {
            src += build(b.target.values().toArray()[0])
        }
    }

    return src
}

export function make_graph() {
    const e = Block([
        "console.log('e')"
    ], new Set())

    const c = Block([
        "console.log('c')"
    ], new Set<Block>().add(e))

    const s = new Set<Block>()
    const b = Block([
        "console.log('b')"
    ], s)
    const d = Block([
        "console.log('d')"
    ], ["1 > 2", b, e])
    s.add(d)
    d.parents.push(b)

    const a = Block([
        "console.log('a')"
    ], ["1 > 2", b, c])

    return [a, b, c, d, e]
}

function children(b: Block): Block[] {
    if (Array.isArray(b.target)) {
        return [b.target[1], b.target[2]]
    } else if (b.target) {
        return b.target.values().toArray()
    } else {
        return []
    }
}

function get_loops(graph: Block[]) {
    // kosaraju

    function dfs1(node: Block) {
        visited.add(node)
        for (const neighbor of children(node)) {
            if (!visited.has(neighbor)) {
                dfs1(neighbor)
            }
        }
        stack.push(node)
    }

    function dfs2(node: Block, component: Block[]) {
        visited.add(node)
        component.push(node)
        for (const neighbor of node.parents) {
            if (!visited.has(neighbor)) {
                dfs2(neighbor, component)
            }
        }
    }

    const visited = new Set()
    const stack: Block[] = []

    for (const node of graph) {
        if (!visited.has(node)) {
            dfs1(node)
        }
    }

    visited.clear()

    const strongly_connected_components: Block[][] = []
    while (stack.length > 0) {
        const node = stack.pop()!
        if (!visited.has(node)) {
            const component: Block[] = []
            dfs2(node, component)
            if (component.length > 1) {
                strongly_connected_components.push(component)
            }
        }
    }

    return strongly_connected_components
}

function loop_graph(g: Block[]): Block[] {
    const loops = get_loops(g)

    for (const loop of loops) {
        g = g.filter(block => !loop.includes(block))
        
        // figure out loop entry point
        // TODO: make sure there is only one entry point to the loop
        const entry = loop.find((b) => b.parents.some(parent => !loop.includes(parent)))
        if (!entry) throw new Error("Could not find loop entry!")
        const parents = entry.parents
        entry.parents = []

        // figure out possible targets of the loop
        const s = new Set<Block>()
        for (const b of loop) {
            for (const c of children(b)) {
                s.add(c)
            }
        }
        for (const c of loop) {
            s.delete(c)
        }

        // loooop block!
        const loop_block = Block(["/* loop */"], s)
        loop_block.parents = parents
        g.push(loop_block)

        // map entry node targets to the loop
        for (const b of loop) {
            for (const c of children(b)) {
                if (Array.isArray(c.target)) {
                    c.target = c.target.map(e => e === entry ? loop_block : e) as Target
                } else if (c.target.has(entry)) {
                    c.target.delete(entry)
                    c.target.add(loop_block)
                }
            }
        }
        for (const c of loop) {
            s.delete(c)
        }

        // sort the subgraph
        loop_block.loop = sort_graph(loop).reverse()
    }

    return g
}

function sort_graph(g: Block[]): Block[] {
    // goal: Sort the nodes in topoloical order. In laymens terms it means that
    // for every forward edge A-B, A comes befor B in the ordering.

    const graph = []

    while (g.length > 1) {
        // find a node who DOMINATES all the other remaining nodes
        const index = g.findIndex(b1 => g.every(b2 => !children(b2).includes(b1)))
        if (index === undefined) throw new Error("wtf!?!")

        // remove the dominator node from the list, and add it to our new graph
        graph.push(g[index])
        g.splice(index, 1)
    }

    // add in the trailing node
    graph.push(g[0])
    return graph
}

function is_loop(b: Block) {
    return b.loop !== undefined
}

const gotos = new Map<Block, string>
function build_graph(g: Block[], level=0): string {
    const label = `l${level}`

    let src = ""
   
    gotos.set(g[0], `break ${label}`)

    if (g.length > 1) {
        src += " ".repeat(level) +`${label}: do {\n`
        src += build_graph(g.slice(1), level + 1)
        src += " ".repeat(level) + `} while (0);\n`
    }

    if (is_loop(g[0])) {
        gotos.set(g[0], `continue ${label}`)

        src += " ".repeat(level) + `${label}: while (1) {\n`
        src += build_graph(g[0].loop!, level + 1)
        src += " ".repeat(level) + `}`
    } else {
        src += g[0].code.map(l => " ".repeat(level) + l).join("\n") + "\n"

        if (Array.isArray(g[0].target)) {
            src += " ".repeat(level) + `if (${g[0].target[0]}) {\n`
            src += " ".repeat(level) + `${gotos.get(g[0].target[1])}\n`
            src += " ".repeat(level) + `} else {\n`
            src += " ".repeat(level) + `${gotos.get(g[0].target[2])}\n`
            src += " ".repeat(level) + `}\n`
        } else if (g[0].target.size === 1) {
            src += " ".repeat(level) + `${gotos.get(g[0].target.values().toArray()[0])}\n`
        }
    }

    

    return src
}

export function main() {
    let graph: Block[];

    graph = make_graph()
    graph = loop_graph(graph)
    graph = sort_graph(graph)

    console.log(graph.map(g => g.code))

    const code = build_graph(graph.reverse())

    console.log(code)


    const src = `function test() {\n${code}}\ntest()`
    writeFile("./out/stack.js", src)

    // console.log(eval(src))
}

main()