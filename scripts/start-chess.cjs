const {spawn}=require('node:child_process');const path=require('node:path');
const electron=require('electron');
const child=spawn(electron,[path.join(__dirname,'../chess/main.cjs')],{stdio:'inherit',env:process.env});
child.on('exit',code=>process.exit(code||0));
