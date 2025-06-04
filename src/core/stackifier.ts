import { Block, get_loops } from "@src/core/graph.ts"
import { Expr } from "@src/core/ir.ts";

function loop_graph(graph: Block[]): Block[] {
    for (const loop of get_loops(graph)) {
        // Loooop block!
        const loop_block = new Block()
        loop_block.data = { kind: "LOOP", loop: [] }
        graph.push(loop_block)

        // Remove nodes from graph who are part of the loop 
        graph = graph.filter(block => !loop.includes(block))

        // Figure out loop entry point.
        // TODO: make sure there is only one entry point to the loop
        const entry = loop.find((b) => b.parents.some(p => !loop.includes(p)))
        if (!entry) throw new Error("Could not find entry point of loop!")
        loop_block.parents = entry.parents.filter(p => !loop.includes(p))
        entry.parents = []

        // Figure out possible targets of the loop.
        // Note: one flaw here is that this add's a second imaginary parent,
        // causing problems with the building of the code.
        for (const node of loop) {
            for (const child of node.children) {
                if (!loop.includes(child)) {
                    loop_block.goes_to(child)
                }
            }
        }

        // Map entry node targets to the loop.
        for (const node of loop) {
            node.children = node.children.map(e => e === entry ? loop_block : e)
        }

        // Map graph nodes targets to the loop, instead of the entry node
        for (const node of graph) {
            node.children = node.children.map(n => n === entry ? loop_block : n)
            node.parents = node.parents.map(n => n === entry ? loop_block : n)
        }

        // Sort the subgraph.
        loop_block.data = {
            kind: "LOOP",
            loop: sort_graph(loop_graph(loop))
        }
    }

    return graph
}

function sort_graph(g: Block[]): Block[] {
    // GOAL: Sort the nodes in topoloical order. In laymens terms it means that
    // for every forward edge A-B, A comes befor B in the ordering.

    const graph = []

    while (g.length > 0) {
        // Find a node who DOMINATES all the remaining nodes.
        const index = g.findIndex(n => g.every(n2 => !n2.children.includes(n)))
        if (index === -1) throw new Error("Failed to find dominator node!")

        // Remove the dominator node from the list, and add it to our new graph.
        graph.push(g[index])
        g.splice(index, 1)
    }

    // Relooping the graph requires it in reverse so order, so such we do.
    return graph.reverse()
}

function build_graph(g: Block[], level=0, gotos=new Map<Block, Expr[]>): Expr[] {
    // GOAL: Take a looped & sorted controle flow graph and turn it into code.

    // The scope level increases when we wrap the node, so this label
    // will be unique withing it's scope, but can be reused elsewhere.
    const label = `l${level}`

    // Add the code
    const src = [...g[0].code] as Expr[]

    // Add code to go the target node
    if (g[0].data?.kind === "LOOP") {
        // In a loop to target the entry point we need to continue, not break.
        gotos.set(g[0], [["continue", label]])

        // Wrap the loop in a loop. This is why multiple entry points
        // loops don't work with this algorithm, nor any relooping algorithm.
        src.push([ "@while", "1",
            build_graph(g[0].data.loop, level + 1, gotos),
        label ])
    } else if (g[0].data?.kind === "BRANCH" && g[0].children.length === 2) {
        src.push(["@if", g[0].data.cond, gotos.get(g[0].children[0])!, []])
        src.push(...gotos.get(g[0].children[1])!)
    } else if (g[0].children.length === 1) {
        src.push(...gotos.get(g[0].children[0])!)
    } else if (g[0].data?.kind === "RETURN") {
        src.push(["@return", g[0].data?.value])
    } else {
        throw new Error("Invald block targets.")
    }

    // Add in next nodes
    if (g.length > 1) {
        if (g[0].parents.length === 1) {
            // If we only have one parent then go to this code, we just need to
            // paste it in directly. 
            gotos.set(g[0], src)

            // We didn't use the label, so we don't need to increase our level.
            return build_graph(g.slice(1), level, gotos)
        } else {
            // We are wraping the upper blocks in a while loop, so to go to this
            // node they need to break out it.
            gotos.set(g[0], [["break", label]])

            // Wrap upper nodes in a while loop, and increase the scope level.
            return [
                ["@block", build_graph(g.slice(1), level + 1, gotos), label],
                ...src
            ]
        }
    } else {
        return src
    }
}

function get_graph_from_block(block: Block, graph=new Set<Block>()) {
    if (graph.has(block)) return []
    graph.add(block)
    block.children.forEach((child) => get_graph_from_block(child, graph))
    return graph.values().toArray()
}

export function stackify(block: Block): Expr {
    const graph = get_graph_from_block(block)
    return build_graph(sort_graph(loop_graph(graph)))
}
