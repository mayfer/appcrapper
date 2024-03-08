
import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import io from 'socket.io-client';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';


import { FileInfo, FileChunk } from '../shared/types';
import './index.css';

const socket = io();

function App() {
  const [files, setFiles] = useState<{ [path: string]: string }>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [appDesc, setAppDesc] = useState<string>('');
  const [manuallyClickedFile, setManuallyClickedFile] = useState<boolean>(false);

  const manuallyClickedFileRef = useRef(manuallyClickedFile);

  // Update the ref whenever manuallyClickedFile changes
  useEffect(() => {
    manuallyClickedFileRef.current = manuallyClickedFile;
  }, [manuallyClickedFile]);

  useEffect(() => {
    socket.on('file-chunk', (fileChunk: FileChunk) => {
      console.log('file-chunk', fileChunk);
      const filename = fileChunk.relativePath;
      setFiles((prevFiles) => ({
        ...prevFiles,
        [filename]: (prevFiles[filename] || '') + fileChunk.chunk,
      }));

      if(!manuallyClickedFileRef.current) {
        setSelectedFile(filename);
      }
    });
  }, []);

  const extension: string = selectedFile ? selectedFile.split('.').pop()! : '';

  const langs = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
  };
  // @ts-ignore
  const language = langs[extension] || 'plaintext';

  return (
    <div className="container">
      <h1>AppCrapper</h1>
      <img src="/client/appcrapper.svg" alt="logo" />
      <textarea
        placeholder="Enter app description"
        className="app-desc"
        onChange={(e) => {
          setAppDesc(e.target.value);
        }}
      ></textarea>
      <button
        className="generate"
        onClick={() => {
          socket.emit('generate', { app_desc: appDesc });
          console.log('generate', appDesc);
        }}
      >
        Generate
      </button>
      
      <div className="app">
        <div className="file-list">
          {Object.entries(files).map(([path, content]) => (
            <div
              key={path}
              className={`file-item ${selectedFile === path ? 'selected' : ''}`}
              onClick={() => {
                setManuallyClickedFile(true);
                setSelectedFile(path);
              }}
            >
              {path}
            </div>
          ))}
        </div>
        <div className="file-content">

            {selectedFile && (
              <SyntaxHighlighter
                language={language}
                style={docco}
                customStyle={{
                  backgroundColor: '#fff',
                  padding: '10px 15px',
                }}
                lineNumberStyle={{
                  opacity: 0.5,
                }}
                showLineNumbers={false}
                wrapLongLines
              >
                {files[selectedFile]}
              </SyntaxHighlighter>
            )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
