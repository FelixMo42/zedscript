import { exec } from "./backends/js/index.ts"

async function main() {
    console.log(exec(await Deno.readTextFile("./test.zed")))
}

main()
