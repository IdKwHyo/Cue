const { app, BrowserWindow, ipcMain, screen, globalShortcut, desktopCapturer, systemPreferences }=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {Stockfish}=require('./engine.cjs');
const {createCapture}=require('../desktop/capture.cjs');
app.setName('Cue Chess');
let win,engine,capture;
const page=pathToFileURL(path.join(__dirname,'index.html')).href;
const trusted=e=>{if(e.sender!==win?.webContents||e.senderFrame?.url!==page) throw Error('Untrusted request');};
app.whenReady().then(()=>{
  const area=screen.getPrimaryDisplay().workArea;
  win=new BrowserWindow({width:460,height:150,minWidth:360,minHeight:130,frame:false,transparent:true,alwaysOnTop:true,resizable:true,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.setBounds({x:area.x+Math.max(0,Math.floor((area.width-460)/2)),y:area.y+30,width:460,height:150});
  win.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  capture=createCapture({capturer:desktopCapturer,screen,windows:()=>BrowserWindow.getAllWindows(),permission:()=>systemPreferences.getMediaAccessStatus('screen'),log:()=>{}});
  try{engine=new Stockfish();engine.on('failure',e=>win.webContents.send('engine-error',e.message));}
  catch(e){win.webContents.once('did-finish-load',()=>win.webContents.send('engine-error',e.message));}
  ipcMain.handle('chess-analyze',(e,fen,depth)=>{trusted(e);if(!engine)throw Error('Stockfish unavailable');return engine.analyze(fen,depth);});
  ipcMain.handle('chess-scan',async e=>{trusted(e);return capture();});
  ipcMain.handle('chess-quit',e=>{trusted(e);app.quit();});
  win.loadURL(page);
  globalShortcut.register('CommandOrControl+Shift+Space',()=>win.webContents.send('scan-shortcut'));
});
app.on('will-quit',()=>{globalShortcut.unregisterAll();engine?.close();});
app.on('window-all-closed',()=>app.quit());
