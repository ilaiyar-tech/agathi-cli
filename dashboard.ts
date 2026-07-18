import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { spawn } from 'child_process';

const screen = blessed.screen({ smartCSR: true, title: 'tu2pu AI Lab' });
const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

const chatView = grid.set(0, 0, 9, 9, contrib.log, { label: 'tu2pu AI Lab (Local-First)', style: { fg: 'white' }, tags: false });
const cpuGauge = grid.set(0, 9, 9, 3, contrib.gauge, { label: 'System Load', stroke: 'magenta' });
const input = grid.set(9, 0, 3, 12, blessed.textbox, {
    label: 'Prompt tu2pu (Local Inference)',
    inputOnFocus: true,
    border: { type: 'line' },
    style: { focus: { border: { fg: 'blue' } } }
});

screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

input.on('submit', (value) => {
    const prompt = value.trim();
    if (prompt !== "") {
        chatView.log(`You: ${prompt}`);
        chatView.log('tu2pu: Thinking...');
        input.clearValue();
        
        // Spawn local model inference
        const proc = spawn('ollama', ['run', 'llama3', prompt]);
        
        proc.stdout.on('data', (data) => {
            chatView.log(`tu2pu: ${data.toString().trim()}`);
            screen.render();
        });
        
        input.focus();
        screen.render();
    }
});

setInterval(() => {
    cpuGauge.setData(Math.floor(Math.random() * 100));
    screen.render();
}, 2000);

input.focus();
screen.render();
