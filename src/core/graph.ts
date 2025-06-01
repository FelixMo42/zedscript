type BlockData
    = { kind: "BRANCH", cond: string }
    | { kind: "LOOP", loop: Block[] }

export class Block {
    code: string[] = []

    children: Block[] = []
    parents: Block[] = []

    data?: BlockData

    with(line: string) {
        this.code.push(line)
        return this
    }

    private $add_edge(target: Block) {
        target.parents.push(this)
        this.children.push(target)
        return this
    }

    goes_to(target: Block) {
        if (this.children.length === 1 && !this.data) {
            throw new Error("Can't add second child!")
        }
    
        return this.$add_edge(target)
    }

    branch(cond: string, a: Block, b: Block) {
        this.data = { kind: "BRANCH", cond }
        return this.$add_edge(a).$add_edge(b)
    }
}

export function get_loops(graph: Block[]) {
    // Current algo: kosaraju
    // TODO: Figure out how the hell it works
    // TODO: Use better algoiryhm

    function dfs1(node: Block) {
        if (!graph.includes(node)) return
        visited.add(node)
        for (const neighbor of node.children) {
            if (!visited.has(neighbor)) dfs1(neighbor)
        }
        stack.push(node)
    }

    function dfs2(node: Block, component: Block[]) {
        if (!graph.includes(node)) return
        visited.add(node)
        component.push(node)
        for (const neighbor of node.parents) {
            if (!visited.has(neighbor)) dfs2(neighbor, component)
        }
    }

    const visited = new Set()
    const stack: Block[] = []

    for (const node of graph) {
        if (!visited.has(node)) dfs1(node)
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
