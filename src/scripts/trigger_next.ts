
import { DB } from '../db';
import { ProcessRunner } from '../business/process_runner';

async function main() {
    await DB.getInstance().init();
    console.log("Triggering next step for Process Run 10...");

    const runner = new ProcessRunner(0);
    await runner.executeNextStep(10);
    console.log("Triggered.");
}

main();
