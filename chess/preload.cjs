const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('chess',{
  analyze:(fen,depth)=>ipcRenderer.invoke('chess-analyze',fen,depth),
  scan:()=>ipcRenderer.invoke('chess-scan'),
  quit:()=>ipcRenderer.invoke('chess-quit'),
  onError:fn=>ipcRenderer.on('engine-error',(_e,message)=>fn(message)),
  onShortcut:fn=>ipcRenderer.on('scan-shortcut',fn)
});
