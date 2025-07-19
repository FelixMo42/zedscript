import process from "node:process"
import { watch } from "node:fs/promises"
import { exec } from "node:child_process "

async function main() {
    await run()
    
    for await (const _event of watch("./src")) {
        await run()
    }
}

async function run() {
    try {
        // clear the terminal
        process.stdout.write("\x1Bc")

        // run the scripts
        await $("deno run --allow-all src/main.ts > out/main.wat")
        await $("wat2wasm out/main.wat -o out/main.wasm")
        await $("deno run --allow-all src/test.ts")
    } catch { /* do nothing on error*/ }
}

function $(command: string) {
    return new Promise((res, rej) =>
        exec(command, (err: number, stdout: string, stderr: string) => {
            if (stderr) console.error(stderr.trim())
            if (stdout) console.log(stdout.trim())

            if (err) {
                rej(stderr)
            } else {
                res(stdout)
            }
        })
    )
}

main()