const $=id=>document.getElementById(id);
const name={p:'Pawn',n:'Knight',b:'Bishop',r:'Rook',q:'Queen',k:'King'};
function describe(fen,uci){
  const ranks=fen.split(' ')[0].split('/'),from=uci.slice(0,2),to=uci.slice(2,4);
  const row=ranks[8-Number(from[1])];let col=0,piece='?';
  for(const c of row){if(/[1-8]/.test(c))col+=Number(c);else {if(col===from.charCodeAt(0)-97){piece=name[c.toLowerCase()]||'Piece';break;}col++;}}
  return piece+' '+from+' → '+to+(uci.length===5?' (promote to '+name[uci[4]]+')':'');
}
$('form').onsubmit=async e=>{
 e.preventDefault();const fen=$('fen').value.trim();$('move').textContent='Thinking…';$('detail').textContent='Stockfish · local';
 try{const result=await window.chess.analyze(fen,14);$('move').textContent=describe(fen,result.move);$('detail').textContent='Depth '+result.depth+' · '+(result.mate!==null?'Mate in '+result.mate:result.evaluation!==null?'Evaluation '+(result.evaluation>=0?'+':'')+result.evaluation.toFixed(2):'Evaluation unavailable')+' (side to move)';}
 catch(err){$('move').textContent='Analysis unavailable';$('detail').textContent=err.message;}
};
$('scan').onclick=async()=>{try{const shot=await window.chess.scan();$('preview').src=shot.dataUrl;$('preview').hidden=false;$('captureNote').textContent='Screen captured; position recognition not yet implemented';}catch(e){$('captureNote').textContent=e.message;}};
$('close').onclick=()=>window.chess.quit();
window.chess.onError(message=>{$('status').textContent='ENGINE ERROR';$('detail').textContent=message+' · install Stockfish or set STOCKFISH_PATH';});
window.chess.onShortcut(()=>$('scan').click());
