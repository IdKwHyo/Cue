const { spawn } = require('node:child_process');
const { EventEmitter } = require('node:events');
class Stockfish extends EventEmitter {
  constructor(binary = process.env.STOCKFISH_PATH || 'stockfish') {
    super(); this.proc = spawn(binary, [], { stdio: ['pipe','pipe','pipe'] });
    this.buffer = ''; this.pending = null; this.ready = false;
    this.proc.stdout.on('data', data => { this.buffer += data.toString(); let n; while ((n=this.buffer.indexOf('\n')) >= 0) { const line=this.buffer.slice(0,n).trim(); this.buffer=this.buffer.slice(n+1); this.onLine(line); } });
    this.proc.on('error', err => this.emit('failure', err));
    this.proc.on('exit', () => { if(this.pending) { this.pending.reject(new Error('Stockfish exited')); this.pending=null; } });
    this.send('uci'); this.send('isready');
  }
  send(command) { if(this.proc.stdin.writable) this.proc.stdin.write(command+'\n'); }
  onLine(line) {
    if(line==='readyok') { this.ready=true; this.emit('ready'); }
    if(line.startsWith('info ') && this.pending) {
      const depth=Number(line.match(/\bdepth (\d+)/)?.[1]||0);
      const cp=line.match(/\bscore cp (-?\d+)/), mate=line.match(/\bscore mate (-?\d+)/);
      const pv=line.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/);
      if(pv) this.pending.info={depth, move:pv[1], evaluation:cp?Number(cp[1])/100:null, mate:mate?Number(mate[1]):null};
    }
    if(line.startsWith('bestmove ') && this.pending) {
      const p=this.pending; this.pending=null; clearTimeout(p.timer);
      const move=line.split(' ')[1];
      if(!move || move==='(none)') p.reject(new Error('No legal move available'));
      else p.resolve({...p.info, move});
    }
  }
  analyze(fen, depth=14) {
    if(!this.ready) return Promise.reject(new Error('Stockfish is still starting'));
    if(this.pending) return Promise.reject(new Error('Analysis already running'));
    if(typeof fen!=='string' || !/^[prnbqkPRNBQK1-8/]+ [wb] (?:-|[KQkq]+) (?:-|[a-h][36]) \d+ \d+$/.test(fen)) return Promise.reject(new Error('Enter a valid FEN position'));
    const d=Math.max(1,Math.min(22,Number(depth)||14));
    return new Promise((resolve,reject)=>{
      const p={resolve,reject,info:{},timer:null}; this.pending=p;
      p.timer=setTimeout(()=>{this.send('stop'); if(this.pending===p){this.pending=null;reject(new Error('Analysis timed out'));}},30000);
      this.send('position fen '+fen); this.send('go depth '+d);
    });
  }
  close(){this.send('quit');this.proc.kill();}
}
module.exports={Stockfish};
