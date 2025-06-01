import { Block, get_loops } from "@src/core/graph.ts";
import assert from "node:assert";

// Inspiration:
// https://medium.com/leaningtech/solving-the-structured-control-flow-problem-once-and-for-all-5123117b1ee2

function loop_graph(g: Block[]): Block[] {
    for (const loop of get_loops(g)) {
        // Loooop block!
        const loop_block = new Block()
        loop_block.with("/* loop */")
        loop_block.data = { kind: "LOOP", loop: [] }
        g.push(loop_block)

        // Remove nodes from graph who are part of the loop 
        g = g.filter(block => !loop.includes(block))
    
        // Figure out loop entry point.
        // TODO: make sure there is only one entry point to the loop
        const entry = loop.find((b) => b.parents.some(parent => !loop.includes(parent)))
        if (!entry) throw new Error("Could not find entry point of loop!")
        loop_block.parents = entry.parents.filter(p => !loop.includes(p))
        entry.parents = []

        // Figure out possible targets of the loop.
        for (const node of loop) {
            for (const child of node.children) {
                if (!loop.includes(child)) {
                    loop_block.goes_to(child)
                }
            }
        }

        // Map entry node targets to the loop.
        for (const node of loop) {
            node.children = node
                .children
                .map(e => e === entry ? loop_block : e)
        }

        // Map graph nodes targets to the loop, instead of the entry node
        for (const node of g) {
            node.children = node.children
                .map(node => node === entry ? loop_block : node)

            node.parents = node.parents
                .map(node => node === entry ? loop_block : node)
        }

        // Sort the subgraph.
        loop_block.data = {
            kind: "LOOP",
            loop: sort_graph(loop_graph(loop)).reverse()
        }
    }

    return g
}

function sort_graph(g: Block[]): Block[] {
    // GOAL: Sort the nodes in topoloical order. In laymens terms it means that
    // for every forward edge A-B, A comes befor B in the ordering.

    const graph = []

    while (g.length > 1) {
        // Find a node who DOMINATES all the remaining nodes.
        const index = g.findIndex(n => g.every(n2 => !n2.children.includes(n)))
        if (index === -1) throw new Error("Failed to find dominator node!")

        // Remove the dominator node from the list, and add it to our new graph.
        graph.push(g[index])
        g.splice(index, 1)
    }

    // Add in the trailing node.
    graph.push(g[0])

    return graph
}

const gotos = new Map<Block, string>
function build_graph(g: Block[], level=0): string {
    // GOAL: Take a looped & sorted controle flow graph and turn it into code.

    let src = ""

    // The scope level increases when we wrap the node, so this label
    // will be unique withing it's scope, but can be reused elsewhere.
    const label = `l${level}`

    if (g.length > 1) {
        // Is g[1] this only way to access g[0], and does it not branch?
        const linar_from_parent = (
            g[0].parents.length === 1
            && g[0].parents[0] === g[1]
            && g[1].children.length === 1
        )

        if (linar_from_parent) {
            // If this node is linar from the parent, then no special action is
            // needed to get to this node.
            gotos.set(g[0], ``)

            // We didn't use the label, so we don't need to increase our level.
            src += build_graph(g.slice(1), level)
        } else {
            // We are wraping the upper blocks in a while loop, so to go to this
            // node they simply need to break out it.
            gotos.set(g[0], `break ${label}`)

            // Wrap upper nodes in a while loop, and increase the scope level.
            src += `${label}: do {`
            src += build_graph(g.slice(1), level + 1)
            src += `} while (0);`
        }
    }

    // Add the code
    src += g[0].code.join(";") + ";"

    // Add the target
    if (g[0].data?.kind === "LOOP") {
        // In a loop to target the entry point we need to continue, not break.
        gotos.set(g[0], `continue ${label}`)

        // Wrap the loop in a loop. This is why multiple entry points
        // loops don't work with this algorithm, nor any relooping algorithm.
        src += `${label}: while (1) {`
        src += build_graph(g[0].data.loop, level + 1)
        src += `}`
    } else if (g[0].data?.kind === "BRANCH") {
        assert(g[0].children.length === 2, "!2 children for branch block!")

        src += `if (${g[0].data.cond}) {`
        src += gotos.get(g[0].children[0])
        src += `} else {`
        src += gotos.get(g[0].children[1])
        src += `}`
    } else if (g[0].data?.kind === "RETURN") {
        src += `return ${g[0].data?.value};`
    } else if (g[0].children.length === 1) {
        src += gotos.get(g[0].children[0])
    } else {
        throw new Error("Invald block targets.")
    }

    return src
}

function get_graph_from_block(block: Block, graph=new Set<Block>()) {
    if (graph.has(block)) return []
    graph.add(block)
    block.children.forEach((child) => get_graph_from_block(child, graph))
    return graph.values().toArray()
}

export function stackify(block: Block) {
    const graph = get_graph_from_block(block)
    return build_graph(sort_graph(loop_graph(graph)).reverse())
}
