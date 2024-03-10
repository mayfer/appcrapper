
import fs from 'fs';
import path from 'path';
import { app, io } from './run_express';
import { FileInfo, FileChunk } from '../shared/types';
import generate from './generator';


const filesDir = path.join(__dirname, '../generated_apps/app-w90fgo/');
function getFileInfos(dir: string): FileInfo[] {
  const fileInfos: FileInfo[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    // check hidden files
    if (entry.name == "node_modules" || (entry.name.startsWith("."))) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    fileInfos.push({
      relativePath: path.relative(filesDir, fullPath),
      name: entry.name,
      isDirectory: entry.isDirectory(),
    });

    if (entry.isDirectory()) {
      fileInfos.push(...getFileInfos(fullPath));
    }
  }

  return fileInfos;
}

function streamFile(filePath: string) {
  const readStream = fs.createReadStream(path.join(filesDir, filePath), { encoding: 'utf8' });

  readStream.on('data', (chunk: string) => {
    const fileChunk: FileChunk = {
      relativePath: filePath,
      chunk,
    };
    io.emit('file-chunk', fileChunk);
  });
}

io.on('connection', (socket) => {
  console.log('Client connected');

  // for testing:
  // const fileInfos = getFileInfos(filesDir);

  // fileInfos.forEach((fileInfo) => {
  //   if (!fileInfo.isDirectory) {
  //     streamFile(fileInfo.relativePath);
  //   }
  // });

  socket.on('generate', async ({app_desc} : {app_desc: string}) => {
    return;
    console.log('generate', app_desc);

    await generate(app_desc, (stream: any, filename: string, text: string, replace?: boolean) => {
      const fileChunk: FileChunk = {
        // path: filename,
        relativePath: filename,
        chunk: text,
      };
      if(replace) {
        socket.emit('file-full', fileChunk);
      } else {
        socket.emit('file-chunk', fileChunk);
      }
    });

    socket.emit('done');
  });

});

