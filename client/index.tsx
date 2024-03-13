
import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import io from 'socket.io-client';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FileInfo, FileChunk } from '../shared/types';
import './index.css';


async function createAndDownloadZip(files: { [key: string]: string }): Promise<void> {
  const zip = new JSZip();

  // Iterate over the object, adding files to the zip archive
  Object.entries(files).forEach(([path, content]) => {
    content = content.replace(/\/\* FINISHED \*\//gm, '');
    zip.file(path, content);
  });

  try {
    // Generate the zip file as a Blob
    const content = await zip.generateAsync({ type: 'blob' });
    // Use FileSaver to save the file
    saveAs(content, 'app.zip');
  } catch (error) {
    console.error('Error creating or downloading zip:', error);
  }
}

const socket = io();

function App() {
  const [files, setFiles] = useState<{ [path: string]: string }>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [appDesc, setAppDesc] = useState<string>('');
  const [manuallyClickedFile, setManuallyClickedFile] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);
  const [inProgress, setInProgress] = useState<boolean>(false);

  const [apiKey, setApiKey] = useState<string>('');

  const [email, setEmail] = useState<string>('');
  const [emailSent, setEmailSent] = useState<boolean>(false);

  const saveApiKey = (apiKey: string) => {
    setApiKey(apiKey);
    localStorage.setItem('apiKey', apiKey);
  };
  const getApiKey = () => {
    return localStorage.getItem('apiKey');
  };

  const manuallyClickedFileRef = useRef(manuallyClickedFile);

  // Update the ref whenever manuallyClickedFile changes
  useEffect(() => {
    manuallyClickedFileRef.current = manuallyClickedFile;
  }, [manuallyClickedFile]);

  useEffect(() => {
    // load api key from local storage
    const apiKeyFromLocalStorage = getApiKey();
    if (apiKeyFromLocalStorage) {
      setApiKey(apiKeyFromLocalStorage);
    }
    socket.on('file-chunk', (fileChunk: FileChunk) => {
      const filename = fileChunk.relativePath;
      setFiles((prevFiles) => ({
        ...prevFiles,
        [filename]: (prevFiles[filename] || '') + fileChunk.chunk,
      }));

      if(!manuallyClickedFileRef.current) {
        setSelectedFile(filename);
      }
    });

    socket.on('file-full', (fileChunk: FileChunk) => {
      const filename = fileChunk.relativePath;
      setFiles((prevFiles) => ({
        ...prevFiles,
        [filename]: fileChunk.chunk,
      }));

      if(!manuallyClickedFileRef.current) {
        setSelectedFile(filename);
      }
    });

    socket.on('done', () => {
      setDone(true);
      setInProgress(false);
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
      <h1 className="main-title">
        AppCrapper.com
        <img src="/client/beta.png" style={{ height: '40px', position: 'relative', top: '10px', left: '10px' }} alt="beta" />
      </h1>
      <div className="api-key-form">
        <p>
          This generates <b>full-stack TypeScript</b> apps with express, react, sqlite, and socket.io in ~2 mins.
        </p>
        <p> Hopefully it will be ready to run (with <a href="https://bun.sh" target="_blank">bun</a>), but no guarantees.<br />Try rewording your prompt to get alterantive versions.</p>
        <p>
          You will need your own Antropic API key. <a href="https://console.anthropic.com/" target="_blank">https://console.anthropic.com/</a>.

        </p>
        <input type="text" className="api-key" placeholder="sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" value={apiKey} onChange={(e) => saveApiKey(e.target.value)} />
        <p><em>Make sure to <b>delete the API key</b> from your Antropic account when you're done.</em></p>
      </div>
      <div className="form-container">
        <img src="/client/appcrapper.svg" alt="logo" />

        <div style={{ position: 'absolute', top: 0, left: 150, width: '100%', height: '100%' }}>
          <svg width="150" height="100" xmlns="http://www.w3.org/2000/svg">
            <polygon points="0,50 150,60 150,30" style={{fill: '#000'}} />
          </svg>
        </div>
        
        <div className="form">
          <textarea
            placeholder="Enter app description"
            className="app-desc"

            disabled={!apiKey || inProgress || done}
            onChange={(e) => {
              setAppDesc(e.target.value);
            }}
          ></textarea>
          {!inProgress && !done && (
            <button
              className="generate"
              disabled={!apiKey || !appDesc || inProgress || done}
              onClick={() => {
                socket.emit('generate', { app_desc: appDesc, api_key: apiKey });
                setInProgress(true);
              }}
            >
              Generate
            </button>
          )}
        </div>
      </div>

      {false && (
        <div className="wait-list">

          {!emailSent && (
            <div>
              <p style={{ fontStyle: 'italic' }}>Enter your email to get notified when< br /> AppCrapper launches in the next few days.
              </p>
              <form onSubmit={(e) => {
                e.preventDefault();
                fetch('/api/joinWaitlist', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ email }),
                })
                  .then(() => {

                    setEmailSent(true);
                  })
                  .catch((err) => {
                    alert('Error submitting email:', err);
                  });
              }}>
              <input className="enter-email" type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
              <button className="submit-email" type="submit">Join waitlist</button>
              </form>

              <img src="/client/depressed.svg" style={{ height: '50px', marginTop: '20px', }} alt="depressed" />
            </div>
          )}

          {emailSent && (
            <div>
              <p style={{ fontStyle: 'italic' }}>OK you are on the waitlist, {email}.</p>
              <img src="/client/carrot.svg" style={{ height: '250px', marginTop: '20px', }} alt="happy" />
            </div>
          )}
        </div>
      )}
      
      {(inProgress || done) && (
        <div>
          <div className="status">
            {inProgress && (
              <div>
                <img src="/client/construction.gif" style={{height: '50px', marginRight: 10}} alt="loading" />
                <span style={{ lineHeight: '50px', verticalAlign: 'top' }}>
                  Under construction...
                </span>
              </div>
            )}
            {done && (
              <div className='done'>
                Done! <a href="#" className="download" onClick={e => {
                  e.preventDefault();
                  createAndDownloadZip(files)
                }}>Download .zip file</a>
                <div style={{ color: '#aaa' }}>
                  Disclaimer: it may work, it may not work.
                </div>
                <div>
                  <ul>
                    <li>Unzip the file</li>
                    <li>Install <a href="https://bun.sh/" target="_blank">bun</a></li>
                    <li>Run <code>bun i && bun --watch server/index.ts</code> from the folder</li>
                    <li>Open <a href="http://localhost:8001" target="_blank">http://localhost:8001</a></li>
                  </ul>
                </div>
              </div>
            )} 
          </div>

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
      )}

    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
