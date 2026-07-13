import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function processWebData(rawData: string) {
    const tools = [
        { name: 'grep', cmd: `grep -i "title"` },
        { name: 'awk',  cmd: `awk '{print $1}'` },
        { name: 'head', cmd: `head -n 1` },
        { name: 'sed',  cmd: `sed 's/[^a-zA-Z0-9 ]//g'` }
    ];

    const tasks = tools.map(t => 
        execPromise(`echo "${rawData.replace(/"/g, '\\"')}" | ${t.cmd}`)
        .catch(() => ({ stdout: "" }))
    );

    const results = await Promise.all(tasks);
    const bestResult = results.sort((a, b) => b.stdout.length - a.stdout.length)[0];

    if (!bestResult || !bestResult.stdout.trim()) {
        return {
            "status": "Failure",
            "result": "N/A",
            "note": "Macha, indha page-la dataae illa, vera URL-ah try pannu!"
        };
    }

    return {
        "status": "Success",
        "result": bestResult.stdout.trim(),
        "note": "Macha, namma parallel engine solid-a output eduthuduchu!"
    };
}
